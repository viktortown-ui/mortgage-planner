import { useEffect, useState, type InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onValueChange: (value: number) => void;
  decimals?: number;
}

function format(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals).replace(/\.0+$/, '') : String(Math.trunc(value));
}

function sanitize(raw: string, decimals: number): string {
  const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '');
  const [intPartRaw, decPartRaw = ''] = normalized.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '');
  if (decimals <= 0) return intPart;
  return `${intPart}${normalized.includes('.') ? `.${decPartRaw.slice(0, decimals)}` : ''}`;
}

export function NumericField({ value, onValueChange, decimals = 0, onBlur, ...props }: Props) {
  const [text, setText] = useState<string>(format(value, decimals));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep editable text synchronized with external recalculations.
    setText(format(value, decimals));
  }, [value, decimals]);

  return (
    <input
      {...props}
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        const next = sanitize(event.target.value, decimals);
        setText(next);
        if (next === '' || next === '.') {
          onValueChange(0);
          return;
        }
        onValueChange(Number(next));
      }}
      onBlur={(event) => {
        const next = sanitize(text, decimals);
        const parsed = next === '' || next === '.' ? 0 : Number(next);
        onValueChange(parsed);
        setText(format(parsed, decimals));
        onBlur?.(event);
      }}
    />
  );
}
