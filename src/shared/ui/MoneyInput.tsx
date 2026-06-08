import { type InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  value: number;
  onValueChange: (value: number) => void;
}

function normalizeDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

function formatMoneyInput(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  return String(safeValue).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function MoneyInput({ value, onValueChange, ...props }: Props) {
  return (
    <input
      {...props}
      inputMode="numeric"
      type="text"
      value={formatMoneyInput(value)}
      onChange={(event) => {
        const digits = normalizeDigits(event.target.value);
        onValueChange(digits === '' ? 0 : Number(digits));
      }}
    />
  );
}
