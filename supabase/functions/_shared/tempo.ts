export const TZ_BR = 'America/Sao_Paulo'

export function partesEm(tz: string, d = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  const hora = g('hour') === '24' ? '00' : g('hour')
  return { data: `${g('year')}-${g('month')}-${g('day')}`, hm: `${hora}:${g('minute')}` }
}

export function agoraBR() {
  return partesEm(TZ_BR)
}

function offsetMin(tz: string, utc: Date): number {
  const { data, hm } = partesEm(tz, utc)
  const local = Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), +hm.slice(0, 2), +hm.slice(3, 5))
  return Math.round((local - utc.getTime()) / 60000)
}

export function localParaBR(data: string, hora: string, tz: string): { data: string; hm: string } {
  const base = Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), +hora.slice(0, 2), +hora.slice(3, 5))
  const utc = new Date(base - offsetMin(tz, new Date(base)) * 60000)
  return partesEm(TZ_BR, utc)
}

export function somaDias(data: string, n: number): string {
  const d = new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10)))
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function diaSemana(data: string): number {
  return new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10))).getUTCDay()
}

export function proximoPregao(data: string, feriados: Set<string>): string {
  let d = somaDias(data, 1)
  while (diaSemana(d) === 0 || diaSemana(d) === 6 || feriados.has(d)) d = somaDias(d, 1)
  return d
}

export function minutos(hm: string): number {
  return +hm.slice(0, 2) * 60 + +hm.slice(3, 5)
}

export function horaCurta(hm: string | null): string {
  if (!hm) return 'Dia todo'
  const h = Number(hm.slice(0, 2))
  const m = hm.slice(3, 5)
  return m === '00' ? `${h}h` : `${h}h${m}`
}

export function dataBR(data: string): string {
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
  return `${dias[diaSemana(data)]}, ${data.slice(8, 10)}/${data.slice(5, 7)}`
}
