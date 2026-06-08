export const SHORT_RU_MONTHS = [
  'янв.',
  'февр.',
  'март',
  'апр.',
  'май',
  'июнь',
  'июль',
  'авг.',
  'сент.',
  'окт.',
  'нояб.',
  'дек.',
] as const;

export function formatShortMonthYear(date: string): string {
  const parsedDate = new Date(date);
  const month = SHORT_RU_MONTHS[parsedDate.getMonth()] ?? '';
  const year = String(parsedDate.getFullYear()).slice(-2);

  return `${month} ${year}`;
}

export function formatFullMonth(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function formatExactDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getMonthTickStep(pointsCount: number): number {
  if (pointsCount <= 36) return 3;
  if (pointsCount <= 120) return 6;
  return 12;
}

export function shouldShowMonthTick(monthIndex: number, pointsCount: number, tickStep: number): boolean {
  return monthIndex === 1 || monthIndex === pointsCount || (monthIndex - 1) % tickStep === 0;
}
