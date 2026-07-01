const COUNTER_ID = import.meta.env.VITE_YANDEX_METRICA_ID;

export const metricaEvents = [
  'calculator_opened',
  'loan_parameters_changed',
  'prepayment_added',
  'regular_prepayment_added',
  'insurance_added',
  'scenario_opened',
  'strategy_compared',
  'payment_schedule_opened',
  'csv_downloaded',
  'theme_changed',
  'mobile_view_opened',
] as const;

export type MetricaEvent = (typeof metricaEvents)[number];
type YandexMetrica = (counterId: string, method: 'init' | 'reachGoal', ...params: unknown[]) => void;
type MetricaCall = Parameters<YandexMetrica>;
type QueuedMetrica = YandexMetrica & { a?: MetricaCall[]; l?: number };

declare global {
  interface Window {
    ym?: QueuedMetrica;
  }
}

export function isMetricaEnabled(): boolean {
  return typeof COUNTER_ID === 'string' && COUNTER_ID.trim().length > 0;
}

export function initMetrica(): void {
  if (!isMetricaEnabled() || typeof window === 'undefined' || window.ym) return;

  const ym: QueuedMetrica = (...args) => {
    ym.a = ym.a ?? [];
    ym.a.push(args);
  };
  ym.l = Date.now();
  window.ym = ym;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(script);

  window.ym(COUNTER_ID, 'init', {
    clickmap: false,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false,
  });
}

export function trackMetricaEvent(eventName: MetricaEvent): void {
  if (!isMetricaEnabled() || typeof window === 'undefined' || !window.ym) return;
  window.ym(COUNTER_ID, 'reachGoal', eventName);
}
