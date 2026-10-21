const formatter = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : formatter.format(d)
}
