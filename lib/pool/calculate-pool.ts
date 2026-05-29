export interface PoolPercentages {
  first: number;
  second: number;
  third: number;
  admin: number;
}

export interface PoolPayouts {
  activeParticipants: number;
  entryFee: number;
  currency: string;
  totalPool: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  adminShare: number;
  percentages: PoolPercentages;
}

export function calculatePoolPayouts(
  activeParticipants: number,
  entryFee: number,
  currency: string,
  percentages: PoolPercentages
): PoolPayouts {
  const totalPool = activeParticipants * entryFee;

  return {
    activeParticipants,
    entryFee,
    currency,
    totalPool,
    firstPlace: totalPool * (percentages.first / 100),
    secondPlace: totalPool * (percentages.second / 100),
    thirdPlace: totalPool * (percentages.third / 100),
    adminShare: totalPool * (percentages.admin / 100),
    percentages,
  };
}

export function formatPoolAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("es-CO")} ${currency}`;
  }
}
