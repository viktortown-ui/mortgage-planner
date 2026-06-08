import type { SVGProps } from 'react';

interface RotatedMonthTickProps extends SVGProps<SVGTextElement> {
  payload?: {
    value?: string | number;
  };
  visibleLabels: ReadonlyMap<string | number, string>;
  x?: number;
  y?: number;
}

export function RotatedMonthTick({ x = 0, y = 0, payload, visibleLabels }: RotatedMonthTickProps) {
  const value = payload?.value;
  const label = value === undefined ? undefined : visibleLabels.get(value);

  if (!label) return null;

  return (
    <text
      x={x}
      y={y + 10}
      fill="var(--chart-axis-text)"
      fontSize={12}
      fontWeight={700}
      textAnchor="end"
      transform={`rotate(-60 ${x} ${y + 10})`}
    >
      {label}
    </text>
  );
}
