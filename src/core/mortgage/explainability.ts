import type { ComparisonResult, PaymentRow } from './types';

export interface ExplainabilityInsights {
  expensiveMonths: PaymentRow[];
  noticeableDropMonth: PaymentRow | null;
}

export function buildExplainability(result: ComparisonResult): ExplainabilityInsights {
  const schedule = result.withPrepayments.schedule;
  const expensiveMonths = [...schedule].sort((a, b) => b.interest - a.interest).slice(0, 3);

  const firstInterest = schedule[0]?.interest ?? 0;
  const noticeableDropMonth = schedule.find((row) => row.interest <= firstInterest * 0.7) ?? null;

  return { expensiveMonths, noticeableDropMonth };
}
