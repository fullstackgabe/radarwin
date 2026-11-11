import { dataBR, horaCurta } from './tempo.ts'

const frases = (t: string) => (t || '').split(/(?<=\.)\s+/).filter(Boolean)

export type Tipo = { code: string; nome: string; nivel: string; impacto_texto: string; ordem: number }
export type Evento = { id: string; code: string; data: string; hora_brt: string | null; nivel: string }

const ORDEM: Record<string, number> = { normal: 0, atencao: 1, forte: 2 }

export function nivelDoDia(eventos: Evento[]): string {
  return eventos.reduce((a, e) => (ORDEM[e.nivel]! > ORDEM[a]! ? e.nivel : a), 'normal')
}

const CABECALHO: Record<string, string> = {
  normal: '🟢 *Dia tranquilo*\nNada atrapalhando a abertura. Pode operar normalmente.',
  atencao: '🟡 *Dia agitado*\nTem evento que pode mexer na abertura. Opere com cautela.',
  forte: '🔴 *Dia arriscado*\nSuper quarta: Copom e Fed no mesmo dia. Considere não operar.',
}

export function textoAgenda(data: string, eventos: Evento[], tipos: Map<string, Tipo>, link: string): string {
  const nivel = nivelDoDia(eventos)
  const linhas = [`📡 *Radar WIN — ${dataBR(data)}*`, '', CABECALHO[nivel]!]
  const lista = eventos
    .filter((e) => e.code !== 'super_quarta')
    .sort((a, b) => (a.hora_brt || '00:00').localeCompare(b.hora_brt || '00:00'))
  if (lista.length) {
    linhas.push('')
    for (const e of lista) {
      const t = tipos.get(e.code)
      if (!t) continue
      linhas.push(`🕘 *${horaCurta(e.hora_brt ? e.hora_brt.slice(0, 5) : null)} — ${t.nome}*`, ...frases(t.impacto_texto), '')
    }
  } else {
    linhas.push('Nenhuma notícia relevante hoje.')
  }
  if (linhas[linhas.length - 1] !== '') linhas.push('')
  linhas.push(`🔗 ${link}`)
  return linhas.join('\n')
}

export function textoLembrete(e: Evento, t: Tipo, link: string): string {
  const hora = horaCurta(e.hora_brt ? e.hora_brt.slice(0, 5) : null)
  return [`⏰ *${hora} — ${t.nome}*`, '', ...frases(t.impacto_texto), '', `🔗 ${link}/evento/${t.code}`].join('\n')
}
