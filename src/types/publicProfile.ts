/** Public contracts must never be widened to NexaUser or a raw profiles row. */
export interface PublicProfile {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  title: string | null;
  level: number;
  victories: number;
  defeats: number;
}

export interface PublicRankingEntry {
  userId: string;
  username: string;
  avatar: string | null;
  title: string | null;
  level: number;
  victories: number;
  defeats: number;
  rankingScore: number;
  rank: number;
}

export interface PublicRankingPage {
  entries: PublicRankingEntry[];
  totalUsers: number;
}
