# Dark Sci-Fi Audio Pack — ambientes NEXA

| Arquivo local | Uso | Autor | Licença |
| --- | --- | --- | --- |
| Urgent.mp3 | Rift Battle V2 | SRG774 | CC0 1.0 Universal |
| Pulse.mp3 | Nexus Duel (PvE/PvP) | SRG774 | CC0 1.0 Universal |

Origem: https://opengameart.org/content/dark-sci-fi-audio-pack

Página do autor: https://srg774.itch.io/dark-sci-fi-audio-pack

Licença: https://creativecommons.org/publicdomain/zero/1.0/

Texto legal: https://creativecommons.org/publicdomain/zero/1.0/legalcode

Downloads originais (copiados sem reencodar, somente renomeados):
- Urgent.mp3: https://opengameart.org/sites/default/files/urgent_0.mp3
- Pulse.mp3: https://opengameart.org/sites/default/files/pulse_0.mp3

O autor declara os dois arquivos como CC0 1.0, permitindo redistribuição e uso comercial. Os arquivos são servidos localmente pelo deploy; não há streaming de URLs externas.

Na reprodução, o NEXA prepara em memória uma emenda de 250 ms entre fim e início, em um único buffer com loop nativo. O ganho ambiente é 0,20 (20%); picos do buffer são apenas atenuados, quando necessário, a 0,20 para manter os SFX existentes em primeiro plano. Nenhum SFX foi alterado. O ambiente pausa no mute e retoma da posição anterior; é encerrado ao terminar/sair da partida ou trocar de jogo. A reprodução usa o AudioContext e controle global já existentes e só começa após seu desbloqueio por interação do usuário.
