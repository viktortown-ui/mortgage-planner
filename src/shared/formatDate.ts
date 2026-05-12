export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'short' }).format(date);
}
