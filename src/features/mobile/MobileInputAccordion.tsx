import { useState } from 'react';
import type { InsuranceRule, MortgageInput, Prepayment } from '../../core/mortgage/types';
import { expandPrepaymentRules } from '../../core/mortgage/prepaymentRules';
import { formatMoney } from '../../shared/formatMoney';
import { DateInput } from '../../shared/ui/DateInput';
import { Icon } from '../../shared/ui/Icon';
import { MoneyInput } from '../../shared/ui/MoneyInput';
import { NumericField } from '../../shared/ui/NumericField';
import { PaymentCalendar } from '../calendar/PaymentCalendar';
import type { MortgageSnapshot } from '../../core/mortgage/types';

type SectionId = 'loan' | 'income' | 'prepayments' | 'insurance' | 'calendar';

interface Props {
  input: MortgageInput;
  error: string;
  onChange: (next: MortgageInput) => void;
  snapshot: MortgageSnapshot | null;
}

const frequencyLabels = { once: 'Один раз', monthly: 'Каждый месяц', quarterly: 'Раз в 3 месяца', semiAnnual: 'Раз в 6 месяцев', annual: 'Раз в год' } as const;
const insuranceTypeLabels = { propertyInsurance: 'Недвижимость', lifeInsurance: 'Жизнь', titleInsurance: 'Титул', other: 'Другое' } as const;
const sections: Array<{ id: SectionId; title: string; subtitle: string }> = [
  { id: 'loan', title: 'Параметры кредита', subtitle: 'Цена, взнос, ставка и срок' },
  { id: 'income', title: 'Доход', subtitle: 'Индикатор нагрузки' },
  { id: 'prepayments', title: 'Досрочные платежи', subtitle: 'Разовые и регулярные' },
  { id: 'insurance', title: 'Страховки', subtitle: 'Расходы сверх платежа' },
  { id: 'calendar', title: 'Календарь', subtitle: 'События по месяцам' },
];

function newId(prefix: string) { return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`; }

export function MobileInputAccordion({ input, error, onChange, snapshot }: Props) {
  const [openSection, setOpenSection] = useState<SectionId>('loan');
  const updateNumber = (field: keyof Pick<MortgageInput, 'propertyPrice' | 'downPayment' | 'annualRate' | 'termYears'>) => (value: number) => onChange({ ...input, [field]: value });
  const updatePrepayment = (index: number, patch: Partial<Prepayment>) => { const next = [...input.prepayments]; next[index] = { ...next[index], ...patch }; onChange({ ...input, prepayments: next }); };
  const updateInsurance = (index: number, patch: Partial<InsuranceRule>) => { const next = [...input.insuranceRules]; next[index] = { ...next[index], ...patch }; onChange({ ...input, insuranceRules: next }); };
  const addPrepayment = (kind: 'once' | 'regular') => onChange({ ...input, prepayments: [...input.prepayments, { id: newId('prepay'), kind, date: input.firstPaymentDate, amount: 0, mode: 'reduceTerm', frequency: kind === 'regular' ? 'monthly' : undefined }] });
  const addInsurance = () => onChange({ ...input, insuranceRules: [...input.insuranceRules, { id: newId('insurance'), title: 'Страховка', type: 'propertyInsurance', amount: 0, startDate: input.firstPaymentDate, frequency: 'annual', enabled: true }] });
  const monthlyPayment = snapshot?.comparison.withPrepayments.monthlyPayment ?? snapshot?.tableData[0]?.payment ?? 0;
  const loadRatio = input.incomeMonthly && input.incomeMonthly > 0 ? monthlyPayment / input.incomeMonthly : undefined;

  return <section className="mobile-section mobile-input-accordion" aria-label="Ввод данных">
    <div className="mobile-section-title"><Icon name="home" /><div><h2>Ввод</h2><p>Все параметры кредита собраны в раскрываемые блоки.</p></div></div>
    {error ? <p className="error">{error}</p> : null}
    {sections.map((section) => <article className="mobile-accordion-card" key={section.id}>
      <button type="button" className="mobile-accordion-card__header" aria-expanded={openSection === section.id} onClick={() => setOpenSection((current) => current === section.id ? 'loan' : section.id)}>
        <span><b>{section.title}</b><small>{section.subtitle}</small></span><span aria-hidden="true">{openSection === section.id ? '−' : '+'}</span>
      </button>
      {openSection === section.id ? <div className="mobile-accordion-card__body">
        {section.id === 'loan' ? <div className="mobile-form-stack">
          <label><span>Стоимость недвижимости</span><MoneyInput value={input.propertyPrice} onValueChange={updateNumber('propertyPrice')} /></label>
          <label><span>Первоначальный взнос</span><MoneyInput value={input.downPayment} onValueChange={updateNumber('downPayment')} /></label>
          <div className="readonly-info"><span>Сумма кредита</span><strong>{formatMoney(input.loanAmount)}</strong></div>
          <label><span>Годовая ставка, %</span><NumericField decimals={2} value={input.annualRate} onValueChange={updateNumber('annualRate')} /></label>
          <label><span>Срок, лет</span><NumericField value={input.termYears} onValueChange={updateNumber('termYears')} /></label>
          <label><span>Дата первого платежа</span><DateInput value={input.firstPaymentDate} onValueChange={(firstPaymentDate) => onChange({ ...input, firstPaymentDate })} /></label>
          <label><span>Тип платежа</span><select value={input.paymentType} onChange={(e) => onChange({ ...input, paymentType: e.target.value as MortgageInput['paymentType'] })}><option value="annuity">Аннуитетный</option><option value="differentiated">Дифференцированный</option></select></label>
        </div> : null}
        {section.id === 'income' ? <div className="mobile-form-stack">
          <label><span>Мой доход в месяц</span><MoneyInput value={input.incomeMonthly ?? 0} onValueChange={(incomeMonthly) => onChange({ ...input, incomeMonthly: incomeMonthly > 0 ? incomeMonthly : undefined })} /><small>Используется только для локального индикатора.</small></label>
          <div className="mobile-load-card"><span>Текущая нагрузка</span><strong>{loadRatio === undefined ? '—' : `${Math.round(loadRatio * 100)}%`}</strong><div className="progress-track"><span style={{ width: `${Math.min(100, (loadRatio ?? 0) * 100)}%` }} /></div></div>
        </div> : null}
        {section.id === 'prepayments' ? <div className="mobile-form-stack">
          <div className="button-row"><button type="button" onClick={() => addPrepayment('once')}>+ Разовая</button><button type="button" onClick={() => addPrepayment('regular')}>+ Регулярная</button></div>
          {input.prepayments.length === 0 ? <p className="muted-note">Досрочек пока нет.</p> : null}
          {input.prepayments.map((p, i) => {
            const count = p.kind === 'regular' ? expandPrepaymentRules([p], input).length : 1;
            return <div key={p.id ?? `${p.date}-${i}`} className={`mobile-event-card ${p.kind === 'regular' ? 'is-regular' : 'is-once'}`}><strong>{p.kind === 'regular' ? 'Регулярная досрочка' : 'Разовая досрочка'}</strong>
              <label><span>Дата старта</span><DateInput value={p.date} onValueChange={(date) => updatePrepayment(i, { date })} /></label>
              <label><span>Сумма</span><MoneyInput value={p.amount} onValueChange={(amount) => updatePrepayment(i, { amount })} /></label>
              {p.kind === 'regular' ? <label><span>Частота</span><select value={p.frequency ?? 'monthly'} onChange={(e) => updatePrepayment(i, { frequency: e.target.value as Prepayment['frequency'] })}>{Object.entries(frequencyLabels).filter(([value]) => value !== 'once').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>Будет создано событий: {count}</small></label> : null}
              <label><span>Режим</span><select value={p.mode} onChange={(e) => updatePrepayment(i, { mode: e.target.value as Prepayment['mode'] })}><option value="reduceTerm">Уменьшать срок</option><option value="reducePayment">Уменьшать платёж</option></select></label>
              <button type="button" className="danger-action" onClick={() => onChange({ ...input, prepayments: input.prepayments.filter((_, idx) => idx !== i) })}>Удалить досрочку</button>
            </div>;
          })}
        </div> : null}
        {section.id === 'insurance' ? <div className="mobile-form-stack">
          <button type="button" onClick={addInsurance}>+ Добавить страховку</button>
          {input.insuranceRules.length === 0 ? <p className="muted-note">Страховок пока нет.</p> : null}
          {input.insuranceRules.map((rule, i) => <div key={rule.id} className="mobile-insurance-card"><label className="mobile-toggle"><input type="checkbox" checked={rule.enabled} onChange={(e) => updateInsurance(i, { enabled: e.target.checked })} /><span>{rule.enabled ? 'Включена' : 'Выключена'}</span></label>
            <label><span>Название</span><input value={rule.title} onChange={(e) => updateInsurance(i, { title: e.target.value })} /></label>
            <label><span>Тип</span><select value={rule.type} onChange={(e) => updateInsurance(i, { type: e.target.value as InsuranceRule['type'] })}>{Object.entries(insuranceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>Сумма</span><MoneyInput value={rule.amount} onValueChange={(amount) => updateInsurance(i, { amount })} /></label>
            <label><span>Дата начала</span><DateInput value={rule.startDate} onValueChange={(startDate) => updateInsurance(i, { startDate })} /></label>
            <label><span>Частота</span><select value={rule.frequency} onChange={(e) => updateInsurance(i, { frequency: e.target.value as InsuranceRule['frequency'] })}>{Object.entries(frequencyLabels).filter(([value]) => value !== 'once').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button type="button" className="danger-action" onClick={() => onChange({ ...input, insuranceRules: input.insuranceRules.filter((_, idx) => idx !== i) })}>Удалить страховку</button>
          </div>)}
        </div> : null}
        {section.id === 'calendar' ? snapshot ? <PaymentCalendar schedule={snapshot.calendarEvents} prepayments={input.prepayments} insuranceEvents={snapshot.scenarioSummary.active.insuranceEvents} /> : <p className="muted-note">Календарь появится после корректного расчёта.</p> : null}
      </div> : null}
    </article>)}
  </section>;
}
