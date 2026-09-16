# 11B2 — diretório público e login por username

## Arquitetura

Frontend envia somente username/password para a Edge Function. Ela normaliza o username, deriva uma chave HMAC-SHA256 e chama `consume_username_login_attempt_v1` usando credencial exclusiva do backend. Somente depois da autorização do limiter consulta `profiles` (id/email, filtro username, máximo dois resultados). Supabase Auth valida a senha em `/auth/v1/token?grant_type=password` com a chave pública. A identidade retornada deve coincidir com o profile único resolvido. O navegador recebe somente access_token/refresh_token após sucesso; o SDK instala a sessão e verifica getUser antes de hidratar o perfil próprio. Tokens da própria sessão podem conter os claims normais de e-mail.

Não há serviço externo nem pacote adicional. Falha de configuração, rede, consulta ou limiter fecha o login por username. Login por e-mail continua usando Auth diretamente, sem mudança. Nenhuma URL, tabela ou operação é escolhida pelo cliente. Não são registrados senha, e-mail, tokens, Authorization ou credenciais de serviço.

## Limiter operacional

Arquivo: `supabase/migrations/20260918000000_username_login_rate_limit.sql`. Não foi executado. Não depende do futuro hardening de profiles.

- Schema privado `username_login_private`, duas tabelas com RLS e sem acesso direto dos papéis da API. Chaves de username são HMAC, nunca e-mail/username em texto puro.
- RPC SECURITY DEFINER, owner postgres, search_path pg_catalog, objetos qualificados. EXECUTE revogado de PUBLIC/anon/authenticated; concedido somente a service_role. Verifica também auth.role() do gateway. Não aceita identidade como autorização. Outros backends com a mesma credencial privilegiada também são tecnicamente capazes de chamá-la; ela nunca deve sair do servidor.
- Janelas fixas: 10 tentativas/minuto e 50/hora por username; 300/minuto globalmente. Sucessos contam. Tentativas negadas pelo limite do username também consomem cota global. Janelas fixas permitem rajadas nas bordas, sem promessa de janela deslizante.
- Lock de uma linha global, READ COMMITTED, decisão e incremento na mesma transação curta. Limite global é verificado antes de criar qualquer estado por username. Nenhum lock econômico nem chamada HTTP dentro da transação. lock_timeout de 1 segundo: contenção excessiva falha fechada.
- Expiração de uma hora ancorada na criação, sem renovação por tentativa. Limpeza indexada antes de inserir, em cada chamada admitida globalmente. Cerca de 18.300 linhas no máximo durante uma hora, mesmo variando nomes. Em inatividade podem permanecer registros expirados, mas não crescem; próxima admissão os remove. Autovacuum continua necessário para manutenção física, como em qualquer tabela com churn. Não requer cron.
- Preflight aborta se schema/função já existem ou papéis são incompatíveis. A migration inteira tem BEGIN/COMMIT; não é um script para reaplicar silenciosamente. Pós-verificação rejeita grants herdados inesperados dos clientes.

## Erros, timing e limites

Username inexistente, ambíguo e senha incorreta recebem o mesmo 401/body genérico. Nomes inexistentes/ambíguos passam pelo Auth com endereço reservado `.invalid`. Falhas de credenciais têm piso de 400–500 ms desde o início da resolução, com jitter criptográfico e no máximo 500 ms de espera adicional, somente após admissão do limiter. Isso reduz sinal de timing, não garante constant-time: latência e processamento do Auth ainda variam. Não há criptografia própria de senha.

429 do Auth permanece 429; Retry-After é limitado a 1–3600 segundos (padrão 60). Falhas 5xx, rede ou resposta inesperada retornam 503 genérico, sem transformar indisponibilidade em senha errada. Nenhum corpo de erro upstream é encaminhado. Body limitado a 8 KiB/3 segundos; cada chamada de rede, incluindo leitura JSON de sucesso, limitada a 10 segundos. Username normalizado aceita somente a-z, 0-9, underscore e hífen, 3–128 caracteres; senha não vazia até 1024 caracteres, sem alteração do conteúdo.

CORS não autentica nem substitui rate limiting. Não há confiança em cabeçalhos de IP enviados pelo cliente. Não foi inventado limite por IP. O Auth pode aplicar limites adicionais à origem de rede compartilhada da Edge: testar capacidade no ambiente real; 429 agora é preservado. Limites globais e por nome podem ser usados para negar temporariamente disponibilidade; monitorar sem dados sensíveis e avaliar proteção de borda futuramente. Não há garantia contra DoS volumétrico apenas com este endpoint.

## Configuração manual e ordem EXATA de rollout

Nenhum passo remoto abaixo foi executado nesta entrega.

1. Manter policies/grants atuais de profiles e contratos 11B1. Revisar e aplicar manualmente SOMENTE a migration operacional do limiter após aprovação. Verificar permissões e concorrência em PostgreSQL real; testes locais são estáticos/mocks e não substituem isso. Não aplicar automaticamente outros arquivos pendentes.
2. Conferir as variáveis do runtime Supabase Edge: `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas automaticamente no runtime padrão (chaves legadas ainda suportadas). Confirmar sua disponibilidade no projeto. A implementação usa a credencial service_role exclusivamente no backend para RPC e leitura id/email/username. Não copiar valores para repositório, logs ou VITE_*.
3. Configurar manualmente somente `USERNAME_LOGIN_RATE_SECRET` (aleatório criptograficamente, pelo menos 32 caracteres, estável entre isolates) e `USERNAME_LOGIN_ALLOWED_ORIGINS` (lista exata separada por vírgulas). Rotacionar o HMAC reinicia efetivamente os buckets por username, mas não a cota global; planejar rotação.
4. Publicar SOMENTE `username-login`: `supabase functions deploy username-login --project-ref <referencia-confirmada>`. `supabase/config.toml` versiona apenas `[functions.username-login] verify_jwt = false`. É pré-login, portanto não pode exigir sessão JWT no gateway. A configuração não altera outras funções. Não publicar migrations em conjunto por conveniência.
5. Testar isoladamente origem permitida/negada, credenciais válidas/inválidas/inexistentes/ambíguas, 429/503, limites e falha fechada. Verificar sessão/getUser, confirmação de e-mail e ausência de dados sensíveis nos erros, sem gravar tokens em logs. Só prosseguir se passar.
6. Publicar frontend 11B2. Testar login por username e e-mail, signup, logout/restauração, edição própria, Topbar/destinatários paginados, Ranking e perfis públicos. Diretório usa somente list_public_profiles_v1; contratos 11B1 permanecem intactos.
7. Retirar clientes antigos. Só então revisar novamente o arquivo FUTURO `supabase/planned/20260918010000_profiles_privacy_hardening.sql` e aprovar sua aplicação separadamente. Ele não faz parte deste rollout e não deve ser aplicado agora.

## Origens exatas

Nenhum domínio Vercel de produção foi confirmado para preencher automaticamente. Usar a origem HTTPS real publicada, sem barra final. Desenvolvimento pode permitir explicitamente `http://localhost:3000`; `http://127.0.0.1:3000` é outra origem e precisa de entrada própria se usada. LAN: incluir somente o IP/porta reais do teste e retirar depois. Previews Vercel: cada origem precisa de aprovação e entrada exata; nenhum wildcard, padrão de sufixo ou Origin null. Não habilitar credenciais CORS. Clientes sem Origin ainda passam pelo limiter e pelo Auth.

## Hardening futuro (não aplicado)

Mantém transação/preflight defensivos e SECURITY DEFINER existentes. O preflight exige service_role com BYPASSRLS e SELECT efetivo somente nas colunas id/email/username necessárias, sem exigir SELECT de toda a tabela nem alterar seus grants. INSERT próprio exige id = auth.uid() e email igual ao claim email do JWT autenticado, não user_metadata. Claim ausente/vazio é rejeitado. Após mudança de e-mail, sessão desatualizada pode exigir refresh antes de criar perfil; conferir Auth/getUser/JWT em produção.

O arquivo continua fora de migrations automáticas. Revoga grants de tabela/coluna dos clientes e substitui as policies legadas por leitura/edição própria. Não altera RPCs econômicas ou seus grants, nem reativa claim suspenso. Antes de aplicação futura, verificar schema/constraints/defaults, triggers de signup, assinaturas/owners, grants herdados e possíveis views/RPCs que ainda exponham profiles. Sem reset ou DML de contas.

## Validação local

Executar `node scripts/test-profile-dependencies.cjs`, `node scripts/test-auth-online.cjs`, `node scripts/test-public-profiles.cjs`, testes existentes de Marketplace/caixas/síntese/perfil, `npm run lint`, `npm run build` e `git diff --check`. O teste do limiter inspeciona grants, ordenação dos locks/limites e expiração; NÃO executa SQL nem comprova concorrência real no PostgreSQL. Testes Edge usam respostas simuladas, sem deploy ou secrets reais.

Dois harnesses legados de batalha já falhavam no HEAD 958a4bd: test-battle-confirmation espera RPC antiga desativada; test-battle-context não fornece SupabaseService ao handler atual. Não são corrigidos nesta etapa; o handler atual tem teste no conjunto profile-dependencies.

Referências oficiais: [configuração por função](https://supabase.com/docs/guides/functions/function-configuration), [secrets do runtime](https://supabase.com/docs/guides/functions/secrets), [limites do Auth](https://supabase.com/docs/guides/auth/rate-limits).
