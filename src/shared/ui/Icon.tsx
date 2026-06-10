export type IconName = 'home' | 'shield' | 'percent' | 'calendar' | 'income' | 'rocket' | 'chart';

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} aria-hidden="true"><use href={`/mortgage-planner/icons.svg#icon-${name}`} /></svg>;
}
