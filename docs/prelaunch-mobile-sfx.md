# Rift Battle V2 mobile e SFX compartilhados

Branch: `codex/nexa-prelaunch-mobile-sfx`, criada da main `1577bc8`.

## Interface

- Rift mobile: painel fixo no viewport, espaço reservado medido com ResizeObserver, safe areas laterais/inferior, controles com alvo mínimo de 44px e painel rolável quando o texto ampliado ocupa mais espaço.
- Seleção de ação leva ao campo relevante; o painel mantém a carta selecionada, instrução explícita e CANCELAR. Apenas cartas ativas/vivas do lado adequado recebem destaque, inclusive aliados para IMPULSO.
- O painel e seu espaçador ficam ocultos no desktop. O layout desktop e os handlers de combate existentes foram preservados.
- O botão de som existente fica acessível no mobile. Durante o Duel landscape, o mesmo botão é renderizado dentro da camada da partida; volta ao topo ao sair. Não há segundo controle ou preferência.

## Áudio e sincronização

| Jogo | Evento visual | SFX |
| --- | --- | --- |
| Rift | Seleção válida de carta | select |
| Rift | PREPARE / deploy / habilidade | confirm |
| Rift | ATTACK | attack |
| Rift | IMPACT | impact, ou resolve sem redução de HP |
| Rift | RECOVER com eliminação | destroy |
| Rift | Cinemática final visível | victory / defeat |
| Duel PvE | Seleção / investimento | select / invest |
| Duel PvE | LOCK (preparação da jogada confirmada) | confirm |
| Duel PvE | REVEAL | reveal |
| Duel PvE | IMPACT / DAMAGE | attack / impact; resolve em empate sem dano |
| Duel PvE | Resultado final visível | victory / defeat / resolve |
| Duel PvP | Seleção / investimento / envio confirmado | select / invest / confirm |
| Duel PvP | Apresentação: passos 3 / 5 / 6 | reveal / attack / impact ou resolve |
| Duel PvP | Resultado final após apresentação ou ao pulá-la | victory / defeat / resolve |

PREP → REVEAL → RESOLVE usa as fases visuais já existentes, sem novos timers de jogo. Os cues aguardam o frame de apresentação; frames muito atrasados e abas ocultas são descartados. IDs de partida/rodada/animação impedem repetição por rerender. O serviço limita a três vozes, com prioridade para impacto e resultado.

Uma única preferência: `localStorage.nexa_sound_enabled_v1`. O Topbar acompanha o singleton por assinatura, inclusive alterações de armazenamento entre abas. Desligar interrompe as vozes SFX. Eventos bloqueados/mutados não são enfileirados para tocar depois. AudioContext é preparado por interação legítima; falhas de áudio são absorvidas sem alterar o jogo.

## Origem e licença

Nenhum arquivo MP3/WAV/OGG foi adicionado. Os dez efeitos são síntese procedural original em `src/services/sfxPalette.ts`, seguindo a arquitetura Web Audio que o projeto já utilizava. Não há gravações, samples de terceiros, URLs externas, música contínua ou dependência nova. Não há licença externa de asset a obter; o código integra o próprio projeto. Buffers são gerados e armazenados uma vez por contexto de áudio.

## Validação

- `npm run build`: passou (2240 módulos). Aviso de chunk JavaScript acima de 500 kB; não bloqueia o build.
- `npm run lint`: executado; falha nos cinco diagnósticos preexistentes de `supabase/functions/riftbattle-v2-authoritative/index.ts` (import `npm:` e global `Deno`). A configuração raiz inclui código Deno na checagem do frontend. Função e tsconfig permaneceram idênticos à main.
- TypeScript de `src`, testes e configuração Vite, excluindo a função Deno: passou.
- `node --import tsx --test tests/combat-sfx.test.ts`: 3 testes passaram, cobrindo cache, mute/persistência, deduplicação, falhas, limite de vozes, fases visuais, duração/envelope e headroom dos sinais.
- Componentes reais em fixture local temporário, com inventário/rodadas sintéticos e serviços substituídos: seleção → atacar → alvo; confirmação/ataque/impacto/KO; resultado único; seleção/investimento/fases do Duel; mute pelo botão existente, troca entre jogos, reload e reativação. Fixture removido antes do build/commit; nenhuma conta ou banco usado.
- Chromium: 390×844, 320×568 com fonte 200%, 844×390, 667×375 e 1440×900. Painel rolável com texto ampliado, campo relevante acessível, sem overflow horizontal nos tamanhos medidos; painel/espaçador ocultos no desktop. Duel conserva seu aviso de rotação em portrait.
- Revisão do diff: sem alterações em regras, IA, RPCs, Supabase, recompensas, economia, rotas, Home, checkpoint/reconnect ou encerramento automático de turno. PvP recebeu somente chamadas de áudio na apresentação/eventos existentes.

## Validação manual no Preview

Safari/iPhone e Chrome/Android físicos não estavam disponíveis: confirmar notch/safe areas reais, barras do navegador, rotação, tamanho de texto do sistema e volume percebido nos aparelhos. PvP com duas contas reais não foi executado; as fases sonoras foram verificadas por testes de apresentação. O modo de som permanece sujeito às políticas normais de interação do navegador.

Entrega somente por PR e Preview. Sem merge nem publicação em produção.
