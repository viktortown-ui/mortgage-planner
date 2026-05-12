export function calculateAnnuity(loanAmount: number, annualRate: number, termMonths: number): number {
  if (loanAmount <= 0 || annualRate <= 0 || termMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const payment = (loanAmount * monthlyRate * factor) / (factor - 1);

  return Number(payment.toFixed(2));
}
