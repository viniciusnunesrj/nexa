import { NexaUser, Card, PlayerBox, LedgerEntry, Listing, NexaAsset } from '../types';

/**
 * Maps a Supabase `profiles` row to `NexaUser`
 */
export function mapProfileToNexaUser(row: any): NexaUser {
  return {
    id: row.id,
    username: row.username || 'Piloto Anônimo',
    email: row.email || '',
    avatar:
      row.avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    level: typeof row.level === 'number' ? row.level : 1,
    experience: typeof row.experience === 'number' ? row.experience : 0,
    maxExperience: typeof row.max_experience === 'number' ? row.max_experience : 1000,
    balanceNEX: typeof row.balance_nex === 'number' ? row.balance_nex : 0,
    balanceNXA: typeof row.balance_nxa === 'number' ? row.balance_nxa : 0,
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    victories: typeof row.victories === 'number' ? row.victories : 0,
    defeats: typeof row.defeats === 'number' ? row.defeats : 0,
    seasonLevel: typeof row.season_level === 'number' ? row.season_level : 1,
    seasonXP: typeof row.season_xp === 'number' ? row.season_xp : 0,
    claimedSeasonRewards: Array.isArray(row.claimed_season_rewards)
      ? row.claimed_season_rewards
      : [],
    bio: row.bio || 'Piloto ativo na rede NEXA.',
    title: row.title || 'Recruta Neon',
    isFirstAccess: row.is_first_access !== undefined ? Boolean(row.is_first_access) : false,
    unlockedSlots: typeof row.unlocked_slots === 'number' ? row.unlocked_slots : 3,
    levelRewardsClaimed: Array.isArray(row.level_rewards_claimed)
      ? row.level_rewards_claimed
      : [1],
    starterPackClaimed: Boolean(row.starter_pack_claimed),
  };
}

/**
 * Maps `NexaUser` to a Supabase `profiles` insert/update payload
 */
export function mapNexaUserToProfileRow(user: Partial<NexaUser> & { id: string }): Record<string, any> {
  const row: Record<string, any> = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (user.username !== undefined) row.username = user.username;
  if (user.email !== undefined) row.email = user.email;
  if (user.avatar !== undefined) row.avatar = user.avatar;
  if (user.level !== undefined) row.level = user.level;
  if (user.experience !== undefined) row.experience = user.experience;
  if (user.maxExperience !== undefined) row.max_experience = user.maxExperience;
  if (user.balanceNEX !== undefined) row.balance_nex = user.balanceNEX;
  if (user.balanceNXA !== undefined) row.balance_nxa = user.balanceNXA;
  if (user.victories !== undefined) row.victories = user.victories;
  if (user.defeats !== undefined) row.defeats = user.defeats;
  if (user.seasonLevel !== undefined) row.season_level = user.seasonLevel;
  if (user.seasonXP !== undefined) row.season_xp = user.seasonXP;
  if (user.claimedSeasonRewards !== undefined) row.claimed_season_rewards = user.claimedSeasonRewards;
  if (user.bio !== undefined) row.bio = user.bio;
  if (user.title !== undefined) row.title = user.title;
  if (user.isFirstAccess !== undefined) row.is_first_access = user.isFirstAccess;
  if (user.unlockedSlots !== undefined) row.unlocked_slots = user.unlockedSlots;
  if (user.levelRewardsClaimed !== undefined) row.level_rewards_claimed = user.levelRewardsClaimed;
  if (user.starterPackClaimed !== undefined) row.starter_pack_claimed = user.starterPackClaimed;

  return row;
}

/**
 * Maps a Supabase `user_cards` row to `Card`
 */
export function mapRowToCard(row: any): Card {
  return {
    id: row.id,
    templateId: row.template_id,
    name: row.name,
    type: 'Card',
    edition: row.edition || 'Gênese',
    rarity: row.rarity,
    collectionId: row.collection_id,
    collectionName: row.collection_name,
    element: row.element,
    elementIcon: row.element_icon || '⚡',
    state: row.state || 'FREE',
    cardStatus: row.card_status || row.state || 'FREE',
    synthesisRate: Number(row.synthesis_rate) || 0,
    synthesisCap: Number(row.synthesis_cap) || 0,
    accumulatedNex: Number(row.accumulated_nex) || 0,
    totalGenerated: Number(row.total_generated) || 0,
    marketValue: Number(row.market_value) || 0,
    tradeable: Boolean(row.tradeable),
    synthesizable: Boolean(row.synthesizable),
    ownerId: row.owner_id,
    ownerName: row.owner_name || 'Piloto NEXA',
    image: row.image || '',
    description: row.description || '',
    status: row.status || 'IDLE',
    synthesizedAt: row.synthesized_at ? new Date(row.synthesized_at).getTime() : null,
    lastAccrualAt: row.last_accrual_at ? new Date(row.last_accrual_at).getTime() : null,
    exhaustedAt: row.exhausted_at ? new Date(row.exhausted_at).getTime() : null,
    lastClaimedAt: row.last_claimed_at || null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Maps `Card` to a Supabase `user_cards` row
 */
export function mapCardToRow(card: Card): Record<string, any> {
  return {
    id: card.id,
    owner_id: card.ownerId,
    owner_name: card.ownerName || 'Piloto NEXA',
    template_id: card.templateId || 'card_unknown',
    name: card.name,
    rarity: card.rarity,
    collection_id: card.collectionId || 'col_guardians',
    collection_name: card.collectionName || 'Coleção NEXA',
    element: card.element || 'lightning',
    element_icon: card.elementIcon || '⚡',
    image: card.image,
    description: card.description || '',
    state: card.state || 'FREE',
    card_status: card.cardStatus || card.state || 'FREE',
    status: card.status || 'IDLE',
    synthesis_rate: card.synthesisRate || 0,
    synthesis_cap: card.synthesisCap || 0,
    accumulated_nex: card.accumulatedNex || 0,
    total_generated: card.totalGenerated || 0,
    market_value: card.marketValue || 0,
    tradeable: card.tradeable !== undefined ? card.tradeable : true,
    synthesizable: card.synthesizable !== undefined ? card.synthesizable : true,
    synthesized_at: card.synthesizedAt ? new Date(card.synthesizedAt).toISOString() : null,
    last_accrual_at: card.lastAccrualAt ? new Date(card.lastAccrualAt).toISOString() : null,
    exhausted_at: card.exhaustedAt ? new Date(card.exhaustedAt).toISOString() : null,
    last_claimed_at: card.lastClaimedAt || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Maps a Supabase `user_boxes` row to `PlayerBox`
 */
export function mapRowToPlayerBox(row: any): PlayerBox {
  return {
    id: row.id,
    boxType: row.box_type,
    name: row.name,
    description: row.description || '',
    acquiredAt: row.acquired_at || row.created_at || new Date().toISOString(),
    ownerId: row.owner_id,
    source: row.source || 'GAMEPLAY_DROP',
  };
}

/**
 * Maps `PlayerBox` to Supabase `user_boxes` row
 */
export function mapPlayerBoxToRow(box: PlayerBox): Record<string, any> {
  return {
    id: box.id,
    owner_id: box.ownerId,
    box_type: box.boxType,
    name: box.name,
    description: box.description,
    source: box.source,
    acquired_at: box.acquiredAt,
  };
}

/**
 * Maps a Supabase `transactions` row to `LedgerEntry`
 */
export function mapRowToLedgerEntry(row: any): LedgerEntry {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || 'Piloto',
    currency: row.currency,
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    type: row.type,
    description: row.description || '',
    timestamp: row.created_at || new Date().toISOString(),
    cardId: row.metadata?.cardId,
    reason: row.metadata?.reason,
    productionBefore: row.metadata?.productionBefore,
    productionAfter: row.metadata?.productionAfter,
  };
}

/**
 * Maps `LedgerEntry` to Supabase `transactions` row
 */
export function mapLedgerEntryToRow(entry: LedgerEntry): Record<string, any> {
  return {
    id: entry.id,
    user_id: entry.userId,
    user_name: entry.userName,
    currency: entry.currency,
    amount: entry.amount,
    balance_after: entry.balanceAfter,
    type: entry.type,
    description: entry.description,
    metadata: {
      cardId: entry.cardId,
      reason: entry.reason,
      productionBefore: entry.productionBefore,
      productionAfter: entry.productionAfter,
    },
    created_at: entry.timestamp,
  };
}

/**
 * Maps a Supabase `marketplace_listings` row to `Listing`
 */
export function mapRowToListing(row: any): Listing {
  return {
    id: row.id,
    itemId: row.item_id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    sellerAvatar: row.seller_avatar || '',
    price: Number(row.price),
    status: row.status,
    createdAt: row.created_at,
    itemSnapshot: row.item_snapshot as NexaAsset,
  };
}

/**
 * Maps `Listing` to Supabase `marketplace_listings` row
 */
export function mapListingToRow(listing: Listing): Record<string, any> {
  return {
    id: listing.id,
    item_id: listing.itemId,
    seller_id: listing.sellerId,
    seller_name: listing.sellerName,
    seller_avatar: listing.sellerAvatar,
    price: listing.price,
    status: listing.status,
    item_snapshot: listing.itemSnapshot,
    created_at: listing.createdAt,
  };
}
