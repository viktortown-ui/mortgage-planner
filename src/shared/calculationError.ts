import type { MortgageInput } from '../core/mortgage/types';

export function getCalculationError(input: MortgageInput, calculationIsReady: boolean): string {
  if (input.propertyPrice <= 0) return 'Укажите стоимость недвижимости больше 0.';
  if (input.downPayment >= input.propertyPrice || input.loanAmount <= 0) return 'Первоначальный взнос должен быть меньше стоимости недвижимости.';
  if (input.annualRate <= 0) return 'Укажите годовую ставку больше 0%.';
  if (input.termYears <= 0) return 'Укажите срок кредита больше 0 лет.';
  return calculationIsReady ? '' : 'Расчёт временно невозможен. Проверьте параметры кредита.';
}
