import type { MortgageInput, Prepayment } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';
import { NumericField } from '../../shared/ui/NumericField';

interface Props { input: MortgageInput; error: string; onChange: (next: MortgageInput) => void; }

export function MortgageInputForm({ input, error, onChange }: Props) {
  const updateNumber = (field: keyof Pick<MortgageInput, 'propertyPrice' | 'downPayment' | 'annualRate' | 'termYears'>) => (value: number) => onChange({ ...input, [field]: value });
  const updatePrepayment = (index: number, patch: Partial<Prepayment>) => {
    const next = [...input.prepayments];
    next[index] = { ...next[index], ...patch };
    onChange({ ...input, prepayments: next });
  };

  return <div className="panel section"><h2>Центр 1. Ввод кредита</h2>{error && <p className="error">{error}</p>}<div className="grid">
    <label><span>Стоимость недвижимости</span><NumericField value={input.propertyPrice} onValueChange={updateNumber('propertyPrice')} /></label>
    <label><span>Первоначальный взнос</span><NumericField value={input.downPayment} onValueChange={updateNumber('downPayment')} /></label>
    <label><span>Годовая ставка, %</span><NumericField decimals={2} value={input.annualRate} onValueChange={updateNumber('annualRate')} /></label>
    <label><span>Срок, лет</span><NumericField value={input.termYears} onValueChange={updateNumber('termYears')} /></label>
    <div className="readonly-info">Сумма кредита: <strong>{formatMoney(input.loanAmount)}</strong></div>
    <label><span>Дата первого платежа</span><input type="date" value={input.firstPaymentDate} onChange={(e) => onChange({ ...input, firstPaymentDate: e.target.value })} /></label>
    <label><span>Тип платежа</span><select value={input.paymentType} onChange={(e) => onChange({ ...input, paymentType: e.target.value as MortgageInput['paymentType'] })}><option value="annuity">Аннуитетный</option><option value="differentiated">Дифференцированный</option></select></label>
    <div className="payment-help"><strong>Как понять тип платежа:</strong><p><b>Аннуитетный</b> — платеж почти одинаковый каждый месяц, в начале больше процентов.</p><p><b>Дифференцированный</b> — в начале выше, затем снижается; переплата обычно ниже.</p></div>
  </div>
  <div className="prepayments"><h3>Досрочные платежи</h3>{input.prepayments.map((p, i) => <div key={`${p.date}-${i}`} className="prepay-card"><label><span>Дата</span><input type="date" value={p.date} onChange={(e) => updatePrepayment(i, { date: e.target.value })} /></label><label><span>Сумма</span><NumericField value={p.amount} onValueChange={(value) => updatePrepayment(i, { amount: value })} /></label>{p.amount <= 0 ? <small className="muted-note">Сумма не задана — в расчёт не попадёт.</small> : null}<label><span>Режим</span><select value={p.mode} onChange={(e) => updatePrepayment(i, { mode: e.target.value as Prepayment['mode'] })}><option value="reduceTerm">Уменьшать срок</option><option value="reducePayment">Уменьшать платёж</option></select></label><button type="button" onClick={() => onChange({ ...input, prepayments: input.prepayments.filter((_, idx) => idx !== i) })}>Удалить</button></div>)}
    <button type="button" onClick={() => onChange({ ...input, prepayments: [...input.prepayments, { date: input.firstPaymentDate, amount: 0, mode: 'reduceTerm' }] })}>+ Добавить досрочный</button>
  </div></div>;
}
