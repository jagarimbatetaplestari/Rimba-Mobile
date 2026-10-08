import { CurrencyLedgerEntry, CurrencyType } from '@/types/game';
import { BUILD_CATALOG } from './config';
import { getManifestItem } from './assetManifest';

export interface Balances {
  gold: number;
  xp: number;
}

/**
 * Calculates current user balances strictly by aggregating currency ledger entries.
 */
export function calculateBalances(ledger: CurrencyLedgerEntry[]): Balances {
  let gold = 0;
  let xp = 0;

  for (const entry of ledger) {
    if (entry.currency === 'gold') {
      gold += entry.amount;
    } else if (entry.currency === 'xp') {
      xp += entry.amount;
    }
  }

  return {
    gold: Math.max(0, gold),
    xp: Math.max(0, xp),
  };
}

/**
 * Creates an immutable ledger entry.
 */
export function createLedgerEntry(
  currency: CurrencyType,
  amount: number,
  reason: string,
  referenceId: string
): CurrencyLedgerEntry {
  return {
    id: `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    currency,
    amount,
    reason,
    reference_id: referenceId,
    created_at: new Date().toISOString(),
  };
}

/**
 * Validates whether user can afford a specified cost.
 */
export function canAfford(ledger: CurrencyLedgerEntry[], cost: number): boolean {
  const { gold } = calculateBalances(ledger);
  return gold >= cost;
}

/**
 * Resolves base purchase cost of an existing world object for 50% refund calculation.
 * Checks BUILD_CATALOG and ASSET_MANIFEST by model_variant first so structures/bridges refund accurately.
 */
export function getObjectBaseCost(object: { object_type: 'tree' | 'rock' | 'path'; model_variant?: string }): number {
  if (object.model_variant) {
    const catalogMatch = BUILD_CATALOG.find(
      (c) => c.id === object.model_variant || c.model === object.model_variant
    );
    if (catalogMatch) {
      return catalogMatch.cost;
    }

    const manifestMatch = getManifestItem(object.model_variant);
    if (manifestMatch) {
      return manifestMatch.cost;
    }
  }

  const baseMap: Record<string, number> = {
    tree: 20,
    rock: 15,
    path: 5,
  };
  return baseMap[object.object_type] || 20;
}

