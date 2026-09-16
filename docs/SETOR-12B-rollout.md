# SETOR 12B — revisão antes do rollout

Ainda não aplicar em produção. A implementação online usa Cards e NXA inteiros (a UI anterior usa `parseInt`), sem taxa nova e sem NEX. Personagens/itens continuam apenas offline. Até 10 Cards por lado, 1.000.000 NXA por lado, mensagem de 500 caracteres, 20 propostas pendentes por remetente e validade de 48h. Os limites são verificados novamente pelo servidor.

## Modelo

Proposta pendente não reserva carta nem saldo. Isso evita que ofertas não solicitadas bloqueiem inventário do destinatário. Uma carta pode aparecer em intenções concorrentes, mas sua liquidação exige ownership e disponibilidade oficiais sob lock. Depois da primeira transferência, outra proposta que dependia do proprietário anterior falha integralmente. A proposta não troca os estados existentes de Cards, não acrescenta estado `TRADING` ao banco e não altera RPCs existentes.

O catálogo `fetch_trade_cards_v2` é uma nova leitura autenticada, específica para negociação. Mostra somente Cards livres/negociáveis de um jogador, com projeção visual explícita e paginação; não mostra cartas em síntese, saldo, perfil privado ou deck. Isso significa que cartas elegíveis passam a ser descobertas por outros jogadores para formar propostas. Os snapshots da proposta são históricos, nunca fonte de ownership ou preço. Perfis públicos permanecem inalterados.

## Segurança, locks e retries

As quatro RPCs mutáveis chamam um dispatcher privado com `auth.uid()`, `SECURITY DEFINER`, `search_path=pg_catalog,public` e `READ COMMITTED` obrigatório. Ordem: advisory transacional por caller → proposta `FOR UPDATE NOWAIT` (quando existente) → profiles ordenados → lock de tabela `ROW EXCLUSIVE NOWAIT` → Cards ordenadas `FOR UPDATE NOWAIT`. REJECT/CANCEL precisam apenas dos dois primeiros locks. Nenhuma espera por lock de linha/tabela explícito é admitida: concorrência retorna erro para retry, inclusive contra claim que trava Card antes do perfil. O lock de tabela não é exclusivo global: evita esperar pelo lock mais forte do fluxo de caixas após adquirir profiles.

Ownership, estado FREE/IDLE, `tradeable`, timestamps de síntese, anúncios ativos/reservas e saldos são revalidados no aceite. Transferência, saldos das duas partes, lançamentos, estado terminal e recibo estão na mesma transação; erros não são capturados para produzir sucesso parcial. Não há RPC de edição da proposta.

`trade_requests_v2` usa `(user_id,request_id)` único e compara a intenção completa. Retry confirmado retorna o recibo anterior, sem liquidar novamente. Outro request ID para uma proposta já encerrada é rejeitado. O frontend conserva o token até RPC e refresh terem sucesso, inclusive quando a resposta se perde; nunca aplica snapshots de replay ao inventário. `localStorage` guarda somente tokens de retry online, não propostas autoritativas.

## Validação local e suas limitações

`node scripts/test-trade-v2.cjs`: executa serviço e handler reais com transporte simulado, verifica contrato SQL estaticamente, sessão, falhas, retry e ausência de mutação antecipada. Não executa PostgreSQL e não prova os locks reais.

`supabase/tests/trade_offers_v2.sql`: assertions de integração preparadas para banco descartável com schema compatível e migration aplicada. Cria fixtures e faz ROLLBACK; não é migration. Exige marcador explícito de sessão `nexa.p2p_test_database=disposable`. Se o banco descartável tiver FK adicional em profiles para auth.users, preparar usuários de teste compatíveis antes de adaptar/executar as fixtures. Nunca executar em produção. Confere ownership e saldos realmente persistidos, RLS, replay, erros e terminais.

Teste obrigatório adicional com duas conexões no banco descartável: segurar uma transação de aceite sem commit; na segunda tentar (1) mesmo aceite com request ID novo, (2) CANCEL pelo remetente, (3) outra proposta com as mesmas cartas, (4) CREATE Marketplace, (5) start/claim síntese e (6) abertura de caixa. A chamada concorrente deve falhar rapidamente ou o fluxo existente esperar sem ciclo. Após commit, repetir e verificar estado final e somente um conjunto de lançamentos. Repetir com rollback da primeira conexão. Nenhum teste simulado substitui essa checagem.

## Conferências de produção somente leitura antes de aplicar

1. Confirmar que os nomes novos da migration não existem e que o executor será postgres/BYPASSRLS. Conferir todas as colunas/constraints/defaults de profiles, user_cards, transactions, marketplace_listings e marketplace_reservations_v2. `transactions.type` precisa aceitar `TRADE_TRANSFER`, já definido no ledger frontend. O preflight aborta em objetos conflitantes, tipos principais incompatíveis e guards ausentes.
2. Conferir os guards habilitados `guard_marketplace_card_v2`, `guard_marketplace_listing_v2` e `synthesis_fields_v1`, incluindo seus corpos/owners. Confirmar que a proteção de ownership/economia direta do cliente está aplicada e que as RPCs legadas inseguras foram retiradas. Esta migration não tenta corrigir outros sistemas nem seus grants.
3. Conferir triggers adicionais de profiles/user_cards/transactions que possam bloquear transferência ou introduzir outra ordem de locks. Sem esse catálogo real, revisão estática não é aprovação de produção.
4. Revisar a projeção do catálogo negociável e aprovar os limites operacionais. Rate limiting distribuído para criação/cancelamento e retenção de recibos/histórico ainda precisam de política futura; o limite de pendentes não limita criação seguida de cancelamento repetido.
5. Rodar integração e concorrência em banco descartável; somente depois aprovar a migration aditiva. Publicar frontend apenas após backend disponível. Não copiar ofertas antigas do localStorage para o banco.
6. Testar com duas contas reais de teste: criar → ver no destinatário → aceitar → conferir ambos inventários/saldos/históricos; depois recusar/cancelar, saldo insuficiente, carta vendida/iniciada em síntese, expiração e retry. A tela possui atualização manual e polling a cada 30s enquanto visível. Não usa Realtime.

## Pendências conhecidas

O histórico e tokens de retry não são apagados automaticamente para não quebrar idempotência. A paginação por offset pode deslocar itens com novas propostas; atualizar a primeira página ressincroniza. A formação pode conservar preferências com IDs de cartas transferidas, assim como no Marketplace; a batalha deve continuar revalidando ownership como já faz. Cards em operações concorrentes podem exigir tentar novamente. A leitura após RPC é remota, mas várias consultas não constituem uma fotografia SQL única diante de novas operações feitas em outro dispositivo.
