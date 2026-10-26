export interface Deal {
  readonly id: string;
  readonly agencyId: string;
  readonly agentId: string;
  readonly leadId: string;
  readonly listingId: string;
  readonly amount: number;
  readonly commissionRate: number;
  readonly closedAt: string;
}

export interface DealSummary {
  readonly count: number;
  readonly volume: number;
  readonly commission: number;
}

export const commissionOf = (deal: Pick<Deal, "amount" | "commissionRate">): number =>
  Math.round((deal.amount * deal.commissionRate) / 100);

export function summarizeDeals(deals: readonly Deal[]): DealSummary {
  return {
    count: deals.length,
    volume: deals.reduce((total, deal) => total + deal.amount, 0),
    commission: deals.reduce((total, deal) => total + commissionOf(deal), 0),
  };
}

export interface MonthBucket {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly volume: number;
}

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Last `months` calendar months ending at `now`, oldest first, including empty months. */
export function dealsByMonth(deals: readonly Deal[], now: Date, months: number, labelOf: (date: Date) => string): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKey(date);
    const inMonth = deals.filter((deal) => monthKey(new Date(deal.closedAt)) === key);
    buckets.push({
      key,
      label: labelOf(date),
      count: inMonth.length,
      volume: inMonth.reduce((total, deal) => total + deal.amount, 0),
    });
  }
  return buckets;
}

export function isInMonth(deal: Pick<Deal, "closedAt">, now: Date): boolean {
  return monthKey(new Date(deal.closedAt)) === monthKey(now);
}
