# Mortgage Planner

Ипотечный калькулятор на Vite + React + TypeScript.

## Команды

```bash
npm install
npm run dev
npm run build
npm run preview
```

## SEO и аналитика

### Индексация

После сборки Vite публикует статические SEO-файлы из `public`:

- Sitemap: `https://viktortown-ui.github.io/mortgage-planner/sitemap.xml`
- Robots: `https://viktortown-ui.github.io/mortgage-planner/robots.txt`

Главная страница содержит базовые metadata для Google, Яндекса, Open Graph, Twitter Card, canonical URL и JSON-LD `WebApplication` без вымышленных рейтингов, отзывов или платных предложений.

### Яндекс Метрика

ID счётчика не хранится в коде. Для включения Метрики задайте переменную окружения перед сборкой:

```bash
VITE_YANDEX_METRICA_ID=12345678 npm run build
```

Для GitHub Pages добавьте `VITE_YANDEX_METRICA_ID` как secret/env variable в workflow деплоя. Если переменная не задана, приложение работает без аналитики и не загружает счётчик.

Собираются только обезличенные названия событий:

- `calculator_opened`
- `loan_parameters_changed`
- `prepayment_added`
- `regular_prepayment_added`
- `insurance_added`
- `scenario_opened`
- `strategy_compared`
- `payment_schedule_opened`
- `csv_downloaded`
- `theme_changed`
- `mobile_view_opened`

Финансовые значения пользователя не отправляются: суммы кредита, доход, даты платежей, даты страховок, страховые суммы и другие введённые параметры остаются в браузере и используются только для расчётов.

### Что сделать вручную после деплоя

1. Добавить сайт в Google Search Console.
2. Добавить сайт в Яндекс Вебмастер.
3. Подтвердить владение через реальные verification meta tags в `index.html`.
4. Отправить `sitemap.xml` в Google Search Console и Яндекс Вебмастер.
5. Создать счётчик Яндекс Метрики и добавить ID как secret/env variable `VITE_YANDEX_METRICA_ID` для production-сборки.
