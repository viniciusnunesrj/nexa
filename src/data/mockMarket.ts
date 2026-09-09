import { Listing, NexaTransaction, MarketStats, Card } from '../types';
import { INITIAL_CHARACTERS } from './mockCharacters';
import { INITIAL_ITEMS } from './mockItems';
import { GUARDIANS_TEMPLATES } from '../config/collectionsData';

const stormCardSnapshot: Card = {
  id: 'card-market-storm-1',
  name: 'Guardião da Tempestade',
  type: 'Card',
  templateId: 'card-storm-guardian',
  collectionId: 'guardians',
  collectionName: 'Os Quatro Guardiões',
  element: 'lightning',
  elementIcon: '⚡',
  rarity: 'Épico',
  image: GUARDIANS_TEMPLATES[2].image,
  edition: 'Coleção Guardiões',
  ownerId: 'usr_nova',
  ownerName: 'Nova_Spark',
  createdAt: '2026-03-04T10:00:00Z',
  description: GUARDIANS_TEMPLATES[2].description,
  status: 'LISTED',
  cardStatus: 'FREE',
  synthesisRate: 12,
  synthesisCap: 12000,
  totalGenerated: 0,
  marketValue: 380,
  tradeable: true,
  synthesizable: true,
};

export const INITIAL_LISTINGS: Listing[] = [
  {
    id: 'list-1',
    itemId: 'char-4',
    sellerId: 'usr_valkyrie',
    sellerName: 'Valkyrie_99',
    sellerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    price: 1850,
    status: 'ACTIVE',
    createdAt: '2026-03-01T14:22:00Z',
    itemSnapshot: INITIAL_CHARACTERS[3], // Ignis Prime (Lendário)
  },
  {
    id: 'list-card-storm',
    itemId: 'card-market-storm-1',
    sellerId: 'usr_nova',
    sellerName: 'Nova_Spark',
    sellerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    price: 380,
    status: 'ACTIVE',
    createdAt: '2026-03-04T15:10:00Z',
    itemSnapshot: stormCardSnapshot,
  },
  {
    id: 'list-2',
    itemId: 'wpn-7',
    sellerId: 'usr_valkyrie',
    sellerName: 'Valkyrie_99',
    sellerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    price: 950,
    status: 'ACTIVE',
    createdAt: '2026-03-02T10:15:00Z',
    itemSnapshot: INITIAL_ITEMS[6], // Espada do Leviatã Estelar (Lendário)
  },
  {
    id: 'list-3',
    itemId: 'arm-3',
    sellerId: 'usr_aegis',
    sellerName: 'Aegis_Titan',
    sellerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    price: 4200,
    status: 'ACTIVE',
    createdAt: '2026-03-03T08:40:00Z',
    itemSnapshot: INITIAL_ITEMS[9], // Carapaça de Bismuto Mítico (Mítico)
  },
  {
    id: 'list-4',
    itemId: 'art-2',
    sellerId: 'usr_nova',
    sellerName: 'Nova_Spark',
    sellerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    price: 1100,
    status: 'ACTIVE',
    createdAt: '2026-03-04T12:00:00Z',
    itemSnapshot: INITIAL_ITEMS[11], // Prisma Temporal de Chronos (Lendário)
  },
  {
    id: 'list-5',
    itemId: 'skn-2',
    sellerId: 'usr_shadow',
    sellerName: 'Ghost_Protocol',
    sellerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    price: 320,
    status: 'ACTIVE',
    createdAt: '2026-03-04T16:45:00Z',
    itemSnapshot: INITIAL_ITEMS[14], // Skin Mecha Vermilion da Guarda (Raro)
  },
];

export const INITIAL_TRANSACTIONS: NexaTransaction[] = [
  {
    id: 'tx-1',
    listingId: 'list-old-1',
    buyerId: 'usr_me',
    buyerName: 'Kaelen_Prime',
    sellerId: 'usr_shadow',
    sellerName: 'Ghost_Protocol',
    itemSnapshot: INITIAL_ITEMS[0], // Lâmina Quântica
    amount: 580,
    fee: 11.6,
    timestamp: '2026-03-02T18:30:00Z',
  },
  {
    id: 'tx-2',
    listingId: 'list-old-2',
    buyerId: 'usr_valkyrie',
    buyerName: 'Valkyrie_99',
    sellerId: 'usr_nova',
    sellerName: 'Nova_Spark',
    itemSnapshot: INITIAL_ITEMS[1], // Canhão de Pulso Iônico
    amount: 340,
    fee: 6.8,
    timestamp: '2026-03-03T11:15:00Z',
  },
  {
    id: 'tx-3',
    listingId: 'list-old-3',
    buyerId: 'usr_aegis',
    buyerName: 'Aegis_Titan',
    sellerId: 'usr_valkyrie',
    sellerName: 'Valkyrie_99',
    itemSnapshot: INITIAL_CHARACTERS[1], // Sombra de Nyx
    amount: 720,
    fee: 14.4,
    timestamp: '2026-03-04T09:20:00Z',
  },
  {
    id: 'tx-4',
    listingId: 'list-old-4',
    buyerId: 'usr_shadow',
    buyerName: 'Ghost_Protocol',
    sellerId: 'usr_me',
    sellerName: 'Kaelen_Prime',
    itemSnapshot: INITIAL_ITEMS[7], // Exoesqueleto de Grafeno Titan
    amount: 490,
    fee: 9.8,
    timestamp: '2026-03-04T14:10:00Z',
  },
  {
    id: 'tx-5',
    listingId: 'list-old-5',
    buyerId: 'usr_nova',
    buyerName: 'Nova_Spark',
    sellerId: 'usr_aegis',
    sellerName: 'Aegis_Titan',
    itemSnapshot: INITIAL_ITEMS[10], // Núcleo de Singularidade
    amount: 650,
    fee: 13.0,
    timestamp: '2026-03-05T07:45:00Z',
  },
];

export const INITIAL_MARKET_STATS: MarketStats = {
  currentFloorPrice: 320,
  lastSalePrice: 650,
  allTimeHigh: 4800,
  allTimeLow: 80,
  salesVolume: 142,
  totalVolumeNXA: 184500,
  totalSupply: 840,
  listedCount: INITIAL_LISTINGS.length,
  priceHistory: [
    { date: '01/02', price: 290, volume: 4200 },
    { date: '05/02', price: 340, volume: 6100 },
    { date: '10/02', price: 410, volume: 8900 },
    { date: '15/02', price: 380, volume: 7300 },
    { date: '20/02', price: 490, volume: 11200 },
    { date: '25/02', price: 580, volume: 14800 },
    { date: '01/03', price: 540, volume: 12400 },
    { date: '03/03', price: 620, volume: 16900 },
    { date: '05/03', price: 650, volume: 19500 },
  ],
};
