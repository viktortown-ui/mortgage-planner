import type { ChangeEvent } from 'react';
import type { MortgageInput, Prepayment } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

interface Props {
  input: MortgageInput;
  error: string;
  onChange: (next: MortgageInput) => void;
}

export function MortgageInputForm({ input, error, onChange }: Props) {
  const updateNumber = (field: keyof MortgageInput) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...input, [field]: Number(event.target.value) });
  };

  const updatePrepayment = (index: number, patch: Partial<Prepayment>) => {
    const next = [...input.prepayments];
    next[index] = { ...next[index], ...patch };
    onChange({ ...input, prepayments: next });
  };

  return <div className="panel"><h2>Параметры кредита</h2>{error && <p className="error">{error}</p>}<div className="grid">
    {[
      ['Стоимость недвижимости', 'propertyPrice'], ['Первоначальный взнос', 'downPayment'], ['Годовая ставка, %', 'annualRate'], ['Срок, лет', 'termYears'],
    ].map(([label, field]) => <label key={field}><span>{label}</span><input type="number" value={input[field as keyof MortgageInput] as number} onChange={updateNumber(field as keyof MortgageInput)} /></label>)}
    <div className="readonly-info">Сумма кредита: <strong>{formatMoney(input.loanAmount)}</strong></div>
    <label><span>Дата первого платежа</span><input type="date" value={input.firstPaymentDate} onChange={(e) => onChange({ ...input, firstPaymentDate: e.target.value })} /></label>
    <label><span>Тип платежа</span><select value={input.paymentType} onChange={(e) => onChange({ ...input, paymentType: e.target.value as MortgageInput['paymentType'] })}><option value="annuity">Аннуитетный</option><option value="differentiated">Дифференцированный</option></select></label>
  </div>
    <div className="prepayments"><h3>Досрочные платежи</h3>{input.prepayments.map((p, i) => <div key={`${p.date}-${i}`} className="prepay-row"><label><span>Дата</span><input type="date" value={p.date} onChange={(e) => updatePrepayment(i, { date: e.target.value })} /></label><label><span>Сумма</span><input type="number" value={p.amount} onChange={(e) => updatePrepayment(i, { amount: Number(e.target.value) })} /></label><label><span>Что уменьшать</span><select value={p.mode} onChange={(e) => updatePrepayment(i, { mode: e.target.value as Prepayment['mode'] })}><option value="reduceTerm">Уменьшить срок</option><option value="reducePayment">Уменьшить платёж</option></select></label><button type="button" onClick={() => onChange({ ...input, prepayments: input.prepayments.filter((_, idx) => idx !== i) })}>Удалить</button></div>)}
      <button type="button" onClick={() => onChange({ ...input, prepayments: [...input.prepayments, { date: input.firstPaymentDate, amount: 0, mode: 'reduceTerm' }] })}>+ Добавить досрочный</button>
    </div></div>;
}
