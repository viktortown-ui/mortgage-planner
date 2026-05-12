import type { ChangeEvent } from 'react';
import type { MortgageInput, Prepayment } from '../../core/mortgage/types';

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

  return <div className="panel"><h2>Параметры</h2>{error && <p className="error">{error}</p>}<div className="grid">{[
    ['Стоимость недвижимости', 'propertyPrice'],['Первоначальный взнос', 'downPayment'],['Сумма кредита', 'loanAmount'],['Годовая ставка, %', 'annualRate'],['Срок, лет', 'termYears'],
  ].map(([label, field]) => <label key={field}><span>{label}</span><input type="number" value={input[field as keyof MortgageInput] as number} onChange={updateNumber(field as keyof MortgageInput)} /></label>)}
  <label><span>Дата первого платежа</span><input type="date" value={input.firstPaymentDate} onChange={(e)=>onChange({...input, firstPaymentDate:e.target.value})}/></label>
  <label><span>Тип платежа</span><select value={input.paymentType} onChange={(e)=>onChange({...input, paymentType:e.target.value as MortgageInput['paymentType']})}><option value="annuity">Annuity</option><option value="differentiated">Differentiated</option></select></label>
  </div>
  <div className="prepayments"><h3>Досрочные платежи</h3>{input.prepayments.map((p, i)=><div key={`${p.date}-${i}`} className="prepay-row"><input type="date" value={p.date} onChange={(e)=>updatePrepayment(i,{date:e.target.value})}/><input type="number" value={p.amount} onChange={(e)=>updatePrepayment(i,{amount:Number(e.target.value)})}/><select value={p.mode} onChange={(e)=>updatePrepayment(i,{mode:e.target.value as Prepayment['mode']})}><option value="reduceTerm">reduceTerm</option><option value="reducePayment">reducePayment</option></select><button type="button" onClick={()=>onChange({...input, prepayments: input.prepayments.filter((_,idx)=>idx!==i)})}>Удалить</button></div>)}
  <button type="button" onClick={()=>onChange({...input, prepayments:[...input.prepayments,{date:input.firstPaymentDate, amount:0, mode:'reduceTerm'}]})}>+ Добавить досрочный</button>
  </div></div>;
}
