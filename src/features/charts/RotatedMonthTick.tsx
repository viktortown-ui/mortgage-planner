import type { SVGProps } from 'react';

interface RotatedMonthTickProps extends SVGProps<SVGTextElement> {
  angle?: number;
  dy?: number;
  payload?: {
    value?: string | number;
  };
  visibleLabels: ReadonlyMap<string | number, string>;
  x?: number;
  y?: number;
}

export function RotatedMonthTick({ angle = -60, dy = 22, x = 0, y = 0, payload, visibleLabels }: RotatedMonthTickProps) {
  const value = payload?.value;
  const label = value === undefined ? undefined : visibleLabels.get(value);

  if (!label) return null;

  const tickY = y + dy;
  const textAnchor = angle === 0 ? 'middle' : 'end';
  const transform = angle === 0 ? undefined : `rotate(${angle} ${x} ${tickY})`;

  return (
    <text
      x={x}
      y={tickY}
      fill="var(--chart-axis-text)"
      fontSize={12}
      fontWeight={700}
      textAnchor={textAnchor}
      transform={transform}
    >
      {label}
    </text>
  );
}
