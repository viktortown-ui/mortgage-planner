import type { InsuranceRule, MortgageInput, Prepayment } from '../../core/mortgage/types';
import { expandPrepaymentRules } from '../../core/mortgage/prepaymentRules';
import { formatMoney } from '../../shared/formatMoney';
import { DateInput } from '../../shared/ui/DateInput';
import { MoneyInput } from '../../shared/ui/MoneyInput';
import { NumericField } from '../../shared/ui/NumericField';

interface Props { input: MortgageInput; error: string; onChange: (next: MortgageInput) => void; }

const frequencyLabels = { once: 'Один раз', monthly: 'Каждый месяц', quarterly: 'Раз в 3 месяца', semiAnnual: 'Раз в 6 месяцев', annual: 'Раз в год' } as const;
const insuranceTypeLabels = { propertyInsurance: 'Страхование недвижимости', lifeInsurance: 'Страхование жизни', titleInsurance: 'Титульное страхование', other: 'Другое' } as const;

function newId(prefix: string) { return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`; }

export function MortgageInputForm({ input, error, onChange }: Props) {
  const updateNumber = (field: keyof Pick<MortgageInput, 'propertyPrice' | 'downPayment' | 'annualRate' | 'termYears'>) => (value: number) => onChange({ ...input, [field]: value });
  const updatePrepayment = (index: number, patch: Partial<Prepayment>) => {
    const next = [...input.prepayments]; next[index] = { ...next[index], ...patch }; onChange({ ...input, prepayments: next });
  };
  const updateInsurance = (index: number, patch: Partial<InsuranceRule>) => {
    const next = [...input.insuranceRules]; next[index] = { ...next[index], ...patch }; onChange({ ...input, insuranceRules: next });
  };
  const addPrepayment = (kind: 'once' | 'regular') => onChange({ ...input, prepayments: [...input.prepayments, { id: newId('prepay'), kind, date: input.firstPaymentDate, amount: 0, mode: 'reduceTerm', frequency: kind === 'regular' ? 'monthly' : undefined }] });
  const addInsurance = () => onChange({ ...input, insuranceRules: [...input.insuranceRules, { id: newId('insurance'), title: 'Страховка', type: 'propertyInsurance', amount: 0, startDate: input.firstPaymentDate, frequency: 'annual', enabled: true }] });

  return <div className="panel section"><h2>Центр 1. Ввод кредита</h2>{error && <p className="error">{error}</p>}<div className="grid">
    <label><span>Стоимость недвижимости</span><MoneyInput value={input.propertyPrice} onValueChange={updateNumber('propertyPrice')} /></label>
    <label><span>Первоначальный взнос</span><MoneyInput value={input.downPayment} onValueChange={updateNumber('downPayment')} /></label>
    <label><span>Годовая ставка, %</span><NumericField decimals={2} value={input.annualRate} onValueChange={updateNumber('annualRate')} /></label>
    <label><span>Срок, лет</span><NumericField value={input.termYears} onValueChange={updateNumber('termYears')} /></label>
    <div className="readonly-info">Сумма кредита: <strong>{formatMoney(input.loanAmount)}</strong></div>
    <label><span>Дата первого платежа</span><DateInput value={input.firstPaymentDate} onValueChange={(firstPaymentDate) => onChange({ ...input, firstPaymentDate })} /></label>
    <label><span>Тип платежа</span><select value={input.paymentType} onChange={(e) => onChange({ ...input, paymentType: e.target.value as MortgageInput['paymentType'] })}><option value="annuity">Аннуитетный</option><option value="differentiated">Дифференцированный</option></select></label>
    <label><span>Мой доход в месяц</span><MoneyInput value={input.incomeMonthly ?? 0} onValueChange={(incomeMonthly) => onChange({ ...input, incomeMonthly: incomeMonthly > 0 ? incomeMonthly : undefined })} /></label>
    <div className="payment-help"><strong>Как понять тип платежа:</strong><p><b>Аннуитетный</b> — платеж почти одинаковый каждый месяц, в начале больше процентов.</p><p><b>Дифференцированный</b> — в начале выше, затем снижается; переплата обычно ниже.</p></div>
  </div>
  <div className="prepayments"><h3>Досрочные платежи</h3><div className="button-row"><button type="button" onClick={() => addPrepayment('once')}>+ Разовая досрочка</button><button type="button" onClick={() => addPrepayment('regular')}>+ Регулярная досрочка</button></div>{input.prepayments.map((p, i) => {
    const count = p.kind === 'regular' ? expandPrepaymentRules([p], input).length : 1;
    return <div key={p.id ?? `${p.date}-${i}`} className="prepay-card"><strong>{p.kind === 'regular' ? 'Регулярная досрочка' : 'Разовая досрочка'}</strong><label><span>{p.kind === 'regular' ? 'Дата старта' : 'Дата'}</span><DateInput value={p.date} onValueChange={(date) => updatePrepayment(i, { date })} /></label><label><span>Сумма</span><MoneyInput value={p.amount} onValueChange={(amount) => updatePrepayment(i, { amount })} /></label>{p.amount <= 0 ? <small className="muted-note">Сумма не задана — в расчёт не попадёт.</small> : null}{p.kind === 'regular' ? <><label><span>Частота</span><select value={p.frequency ?? 'monthly'} onChange={(e) => updatePrepayment(i, { frequency: e.target.value as Prepayment['frequency'] })}><option value="monthly">каждый месяц</option><option value="quarterly">раз в 3 месяца</option><option value="semiAnnual">раз в 6 месяцев</option><option value="annual">раз в год</option></select></label><label><span>Дата окончания</span><DateInput value={p.endDate ?? ''} onValueChange={(endDate) => updatePrepayment(i, { endDate: endDate || undefined })} /></label><label><span>Количество повторов</span><NumericField value={p.repeatCount ?? 0} onValueChange={(repeatCount) => updatePrepayment(i, { repeatCount: repeatCount > 0 ? repeatCount : undefined })} /></label><small className="muted-note">Будет создано примерно {count} платежей до закрытия кредита.</small></> : null}<label><span>Режим</span><select value={p.mode} onChange={(e) => updatePrepayment(i, { mode: e.target.value as Prepayment['mode'] })}><option value="reduceTerm">Уменьшать срок</option><option value="reducePayment">Уменьшать платёж</option></select></label><button type="button" onClick={() => onChange({ ...input, prepayments: input.prepayments.filter((_, idx) => idx !== i) })}>Удалить</button></div>; })}
  </div>
  <div className="prepayments"><h3>Страховки и обязательные платежи</h3><button type="button" onClick={addInsurance}>+ Добавить страховку</button>{input.insuranceRules.map((rule, i) => <div key={rule.id} className="prepay-card insurance-card"><label><span>Название</span><input value={rule.title} onChange={(e) => updateInsurance(i, { title: e.target.value })} /></label><label><span>Тип страховки</span><select value={rule.type} onChange={(e) => updateInsurance(i, { type: e.target.value as InsuranceRule['type'] })}>{Object.entries(insuranceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Сумма</span><MoneyInput value={rule.amount} onValueChange={(amount) => updateInsurance(i, { amount })} /></label><label><span>Дата первого платежа</span><DateInput value={rule.startDate} onValueChange={(startDate) => updateInsurance(i, { startDate })} /></label><label><span>Повтор</span><select value={rule.frequency} onChange={(e) => updateInsurance(i, { frequency: e.target.value as InsuranceRule['frequency'] })}>{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Дата окончания</span><DateInput value={rule.endDate ?? ''} onValueChange={(endDate) => updateInsurance(i, { endDate: endDate || undefined })} /></label><label className="inline-check"><input type="checkbox" checked={rule.enabled} onChange={(e) => updateInsurance(i, { enabled: e.target.checked })} /> Включена</label><button type="button" onClick={() => onChange({ ...input, insuranceRules: input.insuranceRules.filter((_, idx) => idx !== i) })}>Удалить</button></div>)}</div></div>;
}
