import { expect, test } from '@playwright/test';

const brokenSavedInput = {
  propertyPrice: 10_000_000,
  downPayment: 2_000_000,
  loanAmount: 8_000_000,
  annualRate: 0,
  termYears: 20,
  firstPaymentDate: '2026-06-01',
  paymentType: 'annuity',
  prepayments: [],
  insuranceRules: [],
};

test('mobile users can repair parameters when a saved calculation is invalid', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript((savedInput) => {
    localStorage.setItem('mortgage-planner-v1', JSON.stringify(savedInput));
  }, brokenSavedInput);
  const page = await context.newPage();

  await page.goto('.');

  const mobileForm = page.getByRole('region', { name: 'Ввод данных' });
  await expect(mobileForm).toBeVisible();
  await expect(mobileForm.getByText('Укажите годовую ставку больше 0%.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Основная мобильная навигация' }).getByRole('button', { name: 'Ввод' })).toHaveClass(/active-switch/);
  const rateInput = mobileForm.getByLabel('Годовая ставка, %');
  await expect(rateInput).toBeEditable();
  await rateInput.fill('12');
  await expect(mobileForm).toBeVisible();
  await expect(rateInput).toHaveValue('12');
  const stickyPayment = page.getByLabel('Главные итоги').locator(':scope > div').filter({ hasText: 'Платёж' }).locator('strong');
  await expect(stickyPayment).toBeVisible();
  const paymentAtTwelvePercent = await stickyPayment.textContent();
  await rateInput.fill('10');
  await expect.poll(() => stickyPayment.textContent()).not.toBe(paymentAtTwelvePercent);
  await expect(mobileForm).toBeVisible();

  await context.close();
});

test('the production app reloads from its service worker while offline', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();

  await page.goto('.');
  await expect(page.locator('.mobile-header').getByText('Ипотечный планировщик', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cdp = await context.newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  const installability = await cdp.send('Page.getInstallabilityErrors');
  expect(manifest.errors).toEqual([]);
  expect(installability.installabilityErrors.filter((error) => error.errorId !== 'in-incognito')).toEqual([]);

  await context.setOffline(true);
  const offlineResponse = await page.reload({ waitUntil: 'domcontentloaded' });

  expect(offlineResponse?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole('navigation', { name: 'Основная мобильная навигация' })).toBeVisible();

  await context.setOffline(false);
  await context.close();
});

test('desktop keeps the calculator form available', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await page.goto('.');

  await expect(page.getByRole('heading', { name: 'Параметры кредита' })).toBeVisible();
  await expect(page.locator('.desktop-shell')).toBeVisible();
  await expect(page.locator('.mobile-shell')).toBeHidden();

  await context.close();
});

test('all core fields recalculate the desktop summary and schedule immediately', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto('.');

  const form = page.locator('.desktop-shell .featured-input');
  const summary = page.locator('.desktop-shell .hero-summary');
  const cardValue = (title: string) => summary.locator('.kpi-card').filter({ hasText: title }).locator('strong');
  const monthlyPayment = cardValue('Ежемесячный платёж');

  const initialPayment = await monthlyPayment.textContent();
  await form.getByLabel('Стоимость недвижимости').fill('12000000');
  await expect(cardValue('Сумма кредита')).toContainText('10 000 000');
  await expect.poll(() => monthlyPayment.textContent()).not.toBe(initialPayment);

  const priceAdjustedPayment = await monthlyPayment.textContent();
  await form.getByLabel('Первоначальный взнос').fill('3000000');
  await expect(cardValue('Сумма кредита')).toContainText('9 000 000');
  await expect.poll(() => monthlyPayment.textContent()).not.toBe(priceAdjustedPayment);

  const paymentBeforeRate = await monthlyPayment.textContent();
  await form.getByLabel('Годовая ставка, %').fill('9.5');
  await expect.poll(() => monthlyPayment.textContent()).not.toBe(paymentBeforeRate);

  const paymentBeforeTerm = await monthlyPayment.textContent();
  await form.getByLabel('Срок, лет').fill('15');
  await expect.poll(() => monthlyPayment.textContent()).not.toBe(paymentBeforeTerm);
  await expect(cardValue('Дата закрытия')).toContainText('2041-05-01');

  const annuityPayment = await monthlyPayment.textContent();
  await form.getByLabel('Тип платежа').selectOption('differentiated');
  await expect.poll(() => monthlyPayment.textContent()).not.toBe(annuityPayment);

  await form.getByLabel('Дата первого платежа').fill('2027-01-01');
  await expect(cardValue('Дата закрытия')).toContainText('2041-12-01');

  await page.getByRole('button', { name: 'Графики и поток платежей' }).click();
  const tableFilters = page.locator('.desktop-shell .table-wrap .filters input[type="date"]');
  await expect(tableFilters.nth(0)).toHaveValue('2027-01-01');
  await expect(tableFilters.nth(1)).toHaveValue('2041-12-01');

  await form.getByLabel('Дата первого платежа').fill('2028-01-01');
  await expect(tableFilters.nth(0)).toHaveValue('2028-01-01');
  await expect(tableFilters.nth(1)).toHaveValue('2042-12-01');

  await context.close();
});

test('income, prepayments, insurance and an open calendar detail stay reactive', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto('.');

  const shell = page.locator('.desktop-shell');
  const leftColumn = shell.locator('.left-col');
  const summary = shell.locator('.hero-summary');
  const cardValue = (title: string) => summary.locator('.kpi-card').filter({ hasText: title }).locator('strong');

  const loadGauge = summary.locator('.mini-gauge').filter({ hasText: 'нагрузка' }).locator('strong');
  await expect(loadGauge).toHaveText('0%');
  await leftColumn.getByLabel('Мой доход в месяц').fill('300000');
  await expect(loadGauge).not.toHaveText('0%');

  const closingDateBeforePrepayment = await cardValue('Дата закрытия').textContent();
  await leftColumn.getByRole('button', { name: '+ Разовая' }).click();
  const prepaymentCard = leftColumn.locator('.prepay-card').filter({ hasText: 'Разовая досрочка' });
  await prepaymentCard.getByLabel('Сумма').fill('500000');
  await expect.poll(() => cardValue('Дата закрытия').textContent()).not.toBe(closingDateBeforePrepayment);
  const savings = shell.locator('.effect-panel .metric-card').filter({ hasText: 'Вы срезали будущую переплату' }).locator('strong');
  await expect(savings).toBeVisible();
  const savingsAtFiveHundred = await savings.textContent();
  await prepaymentCard.getByLabel('Сумма').fill('700000');
  await expect.poll(() => savings.textContent()).not.toBe(savingsAtFiveHundred);

  const insuranceBefore = await cardValue('Страховки за весь срок').textContent();
  await leftColumn.getByRole('button', { name: '+ Добавить страховку' }).click();
  const insuranceCard = leftColumn.locator('.insurance-card');
  await insuranceCard.getByLabel('Сумма').fill('50000');
  await expect.poll(() => cardValue('Страховки за весь срок').textContent()).not.toBe(insuranceBefore);

  const calendar = leftColumn.locator('.calendar');
  await calendar.locator('.day').filter({ hasText: /^1$/ }).first().click();
  const selectedPayment = calendar.locator('.popover').getByText('Платёж:', { exact: false });
  await expect(selectedPayment).toBeVisible();
  const calendarPaymentBeforeRate = await selectedPayment.textContent();
  await leftColumn.getByLabel('Годовая ставка, %').fill('10');
  await expect.poll(() => selectedPayment.textContent()).not.toBe(calendarPaymentBeforeRate);

  await context.close();
});
