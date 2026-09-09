export interface NexaUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
  level: number;
  experience: number;
  maxExperience: number;
  balanceNEX: number;
  balanceNXA: number;
  createdAt: string;
  victories: number;
  defeats: number;
  seasonLevel: number;
  seasonXP: number;
  claimedSeasonRewards: number[];
  bio?: string;
  title?: string;
  isFirstAccess?: boolean;
  starterPackClaimed?: boolean;
  unlockedSlots?: number;
  levelRewardsClaimed?: number[];
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthResult {
  success: boolean;
  user?: NexaUser;
  error?: string;
}

export interface StoredAuthAccount extends NexaUser {
  passwordHash: string;
  salt: string;
}

export interface UserStats {
  totalPower: number;
  winRate: number;
  totalAssets: number;
  rareAssetsCount: number;
  totalBattles: number;
  totalTrades: number;
}
