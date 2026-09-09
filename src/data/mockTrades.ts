import { TradeOffer } from '../types';
import { INITIAL_CHARACTERS } from './mockCharacters';
import { INITIAL_ITEMS } from './mockItems';

export const INITIAL_TRADES: TradeOffer[] = [
  {
    id: 'trd-1',
    senderId: 'usr_shadow',
    senderName: 'Ghost_Protocol',
    receiverId: 'usr_me',
    receiverName: 'Kaelen_Prime',
    offeredItems: [INITIAL_ITEMS[12]], // Bússola Quântica de Navegação (Incomum)
    offeredNXA: 150,
    requestedItems: [INITIAL_ITEMS[2]], // Katana Ciber-Cinética (Incomum)
    requestedNXA: 0,
    status: 'PENDING',
    createdAt: '2026-03-05T10:30:00Z',
    expiresAt: '2026-03-07T10:30:00Z',
    note: 'Saudações Kaelen! Preciso da Katana para minha build de agilidade. Cubro a diferença com 150 NXA.',
  },
  {
    id: 'trd-2',
    senderId: 'usr_me',
    senderName: 'Kaelen_Prime',
    receiverId: 'usr_nova',
    receiverName: 'Nova_Spark',
    offeredItems: [INITIAL_ITEMS[1]], // Canhão de Pulso Iônico (Raro)
    offeredNXA: 100,
    requestedItems: [INITIAL_ITEMS[11]], // Prisma Temporal de Chronos (Lendário)
    requestedNXA: 0,
    status: 'PENDING',
    createdAt: '2026-03-04T15:00:00Z',
    expiresAt: '2026-03-06T15:00:00Z',
    note: 'Proposta de permuta para relíquia temporal com adição de fundos em NXA.',
  },
  {
    id: 'trd-3',
    senderId: 'usr_valkyrie',
    senderName: 'Valkyrie_99',
    receiverId: 'usr_me',
    receiverName: 'Kaelen_Prime',
    offeredItems: [INITIAL_CHARACTERS[1]], // Sombra de Nyx
    offeredNXA: 200,
    requestedItems: [INITIAL_ITEMS[0]], // Lâmina Quântica
    requestedNXA: 0,
    status: 'ACCEPTED',
    createdAt: '2026-03-01T12:00:00Z',
    expiresAt: '2026-03-03T12:00:00Z',
    note: 'Troca concluída com sucesso no setor Alfa.',
  },
];
