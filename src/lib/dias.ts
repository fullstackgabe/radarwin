import { TZ } from '@/lib/config'
import { capitalize } from '@/lib/format'

export function hojeBRT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function agoraHM(): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}

function utcDate(data: string): Date {
  const [y, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!))
}

export function isoDe(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function ehDiaUtil(data: string): boolean {
  const w = utcDate(data).getUTCDay()
  return w !== 0 && w !== 6
}

export function somaDiasUteis(data: string, n: number): string {
  const d = utcDate(data)
  let falta = n
  while (falta > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (ehDiaUtil(isoDe(d))) falta--
  }
  return isoDe(d)
}

export function proximosPregoes(n: number, desde = hojeBRT()): string[] {
  const out: string[] = []
  let d = ehDiaUtil(desde) ? desde : somaDiasUteis(desde, 1)
  while (out.length < n) {
    out.push(d)
    d = somaDiasUteis(d, 1)
  }
  return out
}

export function diaSemanaLongo(data: string): string {
  return capitalize(new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(utcDate(data)))
}

export function diaSemanaCurto(data: string): string {
  return capitalize(new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(utcDate(data)).replace('.', ''))
}

export function dataCurta(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(utcDate(data))
}

export function dataLonga(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(utcDate(data))
}

export function rotuloDia(data: string): string {
  const hoje = hojeBRT()
  if (data === hoje) return 'Hoje'
  if (data === somaDiasUteis(hoje, 1) && ehDiaUtil(hoje)) return 'Próximo pregão'
  return diaSemanaLongo(data)
}

export function horaCurta(hora: string | null): string {
  if (!hora) return 'Dia todo'
  const [h, m] = hora.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}
