export function calculateDifferentiated(
  loanAmount: number,
  annualRate: number,
  termMonths: number,
  monthIndex: number,
): number {
  if (loanAmount <= 0 || annualRate <= 0 || termMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 12 / 100;
  const principalPart = loanAmount / termMonths;
  const remainingBeforePayment = loanAmount - principalPart * monthIndex;
  const interestPart = remainingBeforePayment * monthlyRate;

  return Number((principalPart + interestPart).toFixed(2));
}
