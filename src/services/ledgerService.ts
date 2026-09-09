import { LedgerEntry, LedgerType } from '../types';
import { SupabaseService } from './supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

export const LEDGER_STORAGE_KEY = 'nexa_ledger_entries_v1';

const INITIAL_ENTRIES: LedgerEntry[] = [
  {
    id: 'ledg-init-1',
    userId: 'usr_me',
    userName: 'Kaelen_Prime',
    currency: 'NXA',
    amount: -580,
    balanceAfter: 850,
    type: 'MARKET_BUY',
    description: 'Compra no Marketplace: Lâmina Quântica de Taquions',
    timestamp: '2026-03-02T18:30:00Z',
  },
  {
    id: 'ledg-init-2',
    userId: 'usr_me',
    userName: 'Kaelen_Prime',
    currency: 'NEX',
    amount: 450,
    balanceAfter: 12450,
    type: 'BATTLE_REWARD',
    description: 'Recompensa de vitória: Arena de Batalha do Setor 4',
    timestamp: '2026-03-04T19:00:00Z',
  },
];

export class LedgerService {
  public static getEntries(): LedgerEntry[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(LEDGER_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
        window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(INITIAL_ENTRIES));
      }
    } catch {
      // fallback
    }

    if (isSupabaseConfigured()) {
      SupabaseService.fetchTransactions().then((txs) => {
        if (txs && txs.length > 0 && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(txs));
        }
      }).catch(() => {});
    }

    return [...INITIAL_ENTRIES];
  }

  public static recordEntry(
    userId: string,
    userName: string,
    currency: 'NEX' | 'NXA',
    amount: number,
    balanceAfter: number,
    type: LedgerType,
    description: string,
    metadata?: {
      cardId?: string;
      reason?: string;
      productionBefore?: number;
      productionAfter?: number;
    }
  ): LedgerEntry {
    const entry: LedgerEntry = {
      id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userName,
      currency,
      amount,
      balanceAfter,
      type,
      description,
      timestamp: new Date().toISOString(),
      cardId: metadata?.cardId,
      reason: metadata?.reason,
      productionBefore: metadata?.productionBefore,
      productionAfter: metadata?.productionAfter,
    };

    try {
      const existing = this.getEntries();
      const updated = [entry, ...existing];
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // fallback
    }

    if (isSupabaseConfigured()) {
      SupabaseService.recordTransaction(entry).catch(() => {});
    }

    return entry;
  }
}
