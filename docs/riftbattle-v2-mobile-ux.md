# RiftBattle V2 — UX mobile

Branch: `codex/riftbattle-v2-mobile-combat`, baseada no código local de `riftbattle-v2`.

Revisão curta: o painel ficava no fluxo normal abaixo de 640 px e sticky somente a partir de sm.
O campo inimigo precede o campo do jogador; escolher uma ação exigia percorrer a arena de volta.

Alteração restrita à apresentação do RiftBattle V2 abaixo de 1024 px:
- Painel fixo no rodapé, fora dos ancestrais com perspectiva/animação via portal.
- Altura real medida por ResizeObserver e espaço equivalente reservado no fim da página.
- Safe-area inferior/lateral, viewport-fit durante a partida e restauração ao sair.
- Ações com área de toque mínima de 44 px, status legível e indicação explícita de alvo aliado/adversário.
- Ao escolher ação, o campo alvo entra em vista; ao cancelar/concluir animação, volta ao campo humano.
- Orientação paisagem mantém o campo relevante visível; imagens ficam compactas em telas baixas.
- Chat fica acima do painel. Painel desaparece no resultado e não aparece no desktop.

Nenhuma alteração em handlers/regras de combate, IA, economia, recompensas, persistência,
reconnect/checkpoint, encerramento de turno ou Nexus Duel.

Verificação visual com o componente real e estado sintético injetado apenas num servidor temporário:
- Chromium 360×800 e 390×844: selecionar carta → Atacar → alvo sem rolagem manual.
- 393×852: arena 3×3; 360×800: arena 4×4; nenhum overflow horizontal.
- 844×390: painel compacto, campo alvo 4×4 totalmente acima do painel.
- 1440×900: painel mobile oculto, os dois painéis desktop continuam visíveis.
- Ataque sintético executado sem acesso a contas/serviços remotos; retorno ao campo confirmado.

Essas verificações são emulação de viewport, não testes físicos em Android ou Safari/iPhone.
O Preview deve ser testado nos aparelhos reais, incluindo notch, barra do navegador e gestos do sistema.
