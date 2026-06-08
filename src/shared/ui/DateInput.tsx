import { type InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function DateInput({ value, onValueChange, ...props }: Props) {
  return (
    <input
      {...props}
      type="date"
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (nextValue === '' || ISO_DATE_PATTERN.test(nextValue)) {
          onValueChange(nextValue);
        }
      }}
    />
  );
}
