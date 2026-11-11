import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { agoraBR, diaSemana, localParaBR, proximoPregao, somaDias } from '../_shared/tempo.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const JANELA_DIAS = 90

type Linha = { code: string; data: string; hora_brt: string | null }

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

async function log(fonte: string, ok: boolean, detalhe: string) {
  await sb.from('sync_log').insert({ fonte, ok, detalhe: detalhe.slice(0, 500) })
}

const IBGE_CODES: Record<string, string> = {
  'Índice Nacional de Preços ao Consumidor Amplo': 'ipca',
  'Índice Nacional de Preços ao Consumidor Amplo 15': 'ipca15',
  'Sistema de Contas Nacionais Trimestrais': 'pib',
  'Pesquisa Industrial Mensal: Produção Física - Brasil': 'producao_industrial',
  'Pesquisa Mensal de Comércio': 'varejo',
  'Pesquisa Mensal de Serviços': 'servicos',
  'Pesquisa Nacional por Amostra de Domicílios Contínua Mensal': 'desemprego',
}

const MESES: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 }

const semTags = (t: string) => t.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim()

const iso = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function hora24(h: string, ampm: string): string {
  let [hh, mm] = h.split(':').map(Number) as [number, number]
  if (/pm/i.test(ampm) && hh < 12) hh += 12
  if (/am/i.test(ampm) && hh === 12) hh = 0
  return `${String(hh).padStart(2, '0')}:${String(mm ?? 0).padStart(2, '0')}`
}

async function pagina(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  return r.text()
}

async function bea(): Promise<Linha[]> {
  const html = await pagina('https://www.bea.gov/news/schedule')
  const out: Linha[] = []
  let ano = Number(agoraBR().data.slice(0, 4))
  let mesAnterior = 0
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const tds = [...tr[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => semTags(m[1]!))
    if (tds.length < 3) continue
    const m = tds[0]!.match(/^([A-Za-z]+) (\d{1,2}) (\d{1,2}:\d{2}) ?([AP]M)/i)
    if (!m || !MESES[m[1]!]) continue
    const mes = MESES[m[1]!]!
    if (mes < mesAnterior) ano++
    mesAnterior = mes
    const titulo = tds[tds.length - 1]!
    const code = /^GDP \((Advance|Second|Third)/.test(titulo) ? 'pib_eua' : /^Personal Income and Outlays/.test(titulo) ? 'pce' : null
    if (!code) continue
    const br = localParaBR(iso(ano, mes, Number(m[2])), hora24(m[3]!, m[4]!), 'America/New_York')
    out.push({ code, data: br.data, hora_brt: br.hm })
  }
  if (!out.length) throw new Error('BEA: nenhuma divulgação encontrada')
  return out
}

async function census(): Promise<Linha[]> {
  const html = await pagina('https://www.census.gov/economic-indicators/calendar-listview.html')
  const out: Linha[] = []
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const txt = semTags(tr[1]!)
    if (!txt.startsWith('Advance Monthly Sales for Retail and Food Services')) continue
    const m = txt.match(/([A-Za-z]+) (\d{1,2}), (\d{4}) (\d{1,2}:\d{2}) ?([AP]M)/i)
    if (!m || !MESES[m[1]!]) continue
    const br = localParaBR(iso(Number(m[3]), MESES[m[1]!]!, Number(m[2])), hora24(m[4]!, m[5]!), 'America/New_York')
    out.push({ code: 'varejo_eua', data: br.data, hora_brt: br.hm })
  }
  if (!out.length) throw new Error('Census: nenhuma divulgação encontrada')
  return out
}

async function bce(): Promise<Linha[]> {
  const html = semTags(await pagina('https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html'))
  const out: Linha[] = []
  for (const m of html.matchAll(/(\d{2})\/(\d{2})\/(\d{4}) Governing Council of the ECB: monetary policy meeting[^0-9]*?(?:Day 2\)|followed by press conference)/g)) {
    const br = localParaBR(iso(Number(m[3]), Number(m[2]), Number(m[1])), '14:15', 'Europe/Berlin')
    out.push({ code: 'bce', data: br.data, hora_brt: br.hm })
  }
  if (!out.length) throw new Error('BCE: nenhuma reunião encontrada')
  return out
}

function pascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return iso(ano, mes, dia)
}

function nEsimoDia(ano: number, mes: number, semana: number, n: number): string {
  let d = iso(ano, mes, 1)
  while (diaSemana(d) !== semana) d = somaDias(d, 1)
  return somaDias(d, 7 * (n - 1))
}

function ultimoDia(ano: number, mes: number, semana: number): string {
  let d = somaDias(iso(mes === 12 ? ano + 1 : ano, mes === 12 ? 1 : mes + 1, 1), -1)
  while (diaSemana(d) !== semana) d = somaDias(d, -1)
  return d
}

function observado(d: string): string {
  if (diaSemana(d) === 6) return somaDias(d, -1)
  if (diaSemana(d) === 0) return somaDias(d, 1)
  return d
}

function feriadosEUA(ano: number): Linha[] {
  const datas = [
    observado(iso(ano, 1, 1)),
    nEsimoDia(ano, 1, 1, 3),
    nEsimoDia(ano, 2, 1, 3),
    somaDias(pascoa(ano), -2),
    ultimoDia(ano, 5, 1),
    observado(iso(ano, 6, 19)),
    observado(iso(ano, 7, 4)),
    nEsimoDia(ano, 9, 1, 1),
    nEsimoDia(ano, 11, 4, 4),
    observado(iso(ano, 12, 25)),
  ]
  return datas.filter((d) => d.slice(0, 4) === String(ano)).map((data) => ({ code: 'feriado_eua', data, hora_brt: null }))
}

function vencimentosWin(ano: number, feriados: Set<string>): Linha[] {
  const out: Linha[] = []
  for (const mes of [2, 4, 6, 8, 10, 12]) {
    const quinze = iso(ano, mes, 15)
    let melhor = quinze
    for (let k = -3; k <= 3; k++) {
      const d = somaDias(quinze, k)
      if (diaSemana(d) === 3) melhor = d
    }
    while (diaSemana(melhor) === 0 || diaSemana(melhor) === 6 || feriados.has(melhor)) melhor = somaDias(melhor, 1)
    out.push({ code: 'vencimento_win', data: melhor, hora_brt: null })
  }
  return out
}

async function ibge(de: string, ate: string): Promise<Linha[]> {
  const out: Linha[] = []
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v3/calendario/?qtd=1000&page=${page}`, { signal: AbortSignal.timeout(30000) })
    if (!r.ok) throw new Error(`IBGE HTTP ${r.status}`)
    const j = await r.json()
    for (const x of j.items as { titulo: string; data_divulgacao: string }[]) {
      const code = IBGE_CODES[x.titulo] ?? null
      if (!code) continue
      const v = x.data_divulgacao
      const data = `${v.slice(6, 10)}-${v.slice(3, 5)}-${v.slice(0, 2)}`
      if (data >= de && data <= ate) out.push({ code, data, hora_brt: '09:00' })
    }
    if (page >= j.totalPages) break
  }
  return out
}

async function fomc(): Promise<Linha[]> {
  const r = await fetch('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(30000),
  })
  if (!r.ok) throw new Error(`Fed HTTP ${r.status}`)
  const html = await r.text()
  const nomes: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 }
  for (const [k, v] of Object.entries(nomes)) nomes[k.slice(0, 3)] = v
  const out: Linha[] = []
  for (const bloco of html.matchAll(/(20\d\d) FOMC Meetings([\s\S]*?)(?=20\d\d FOMC Meetings|$)/g)) {
    const ano = Number(bloco[1])
    const re = /fomc-meeting__month[^>]*>\s*<strong>([A-Za-z/]+)<\/strong>[\s\S]*?fomc-meeting__date[^>]*>([0-9\-*]+)/g
    for (const m of bloco[2]!.matchAll(re)) {
      const mes = nomes[m[1]!.split('/').pop()!]
      const dias = m[2]!.replace('*', '').split('-')
      if (!mes || dias.length < 2) continue
      const data = `${ano}-${String(mes).padStart(2, '0')}-${dias[dias.length - 1]!.padStart(2, '0')}`
      const br = localParaBR(data, '14:00', 'America/New_York')
      out.push({ code: 'fomc', data: br.data, hora_brt: br.hm })
    }
  }
  if (!out.length) throw new Error('Fed: nenhuma reunião encontrada')
  return out
}

async function oficiais(de: string, ate: string): Promise<Linha[]> {
  const { data, error } = await sb.from('datas_oficiais').select('code,data,hora_local,fuso').gte('data', de).lte('data', ate)
  if (error) throw error
  return (data || []).map((x) => {
    if (!x.hora_local) return { code: x.code, data: x.data, hora_brt: null }
    const br = localParaBR(x.data, String(x.hora_local).slice(0, 5), x.fuso)
    return { code: x.code, data: br.data, hora_brt: br.hm }
  })
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    const auth = req.headers.get('Authorization') || ''
    if (!auth.includes(SERVICE_KEY)) return new Response('forbidden', { status: 403 })
  }
  const hoje = agoraBR().data
  const ate = somaDias(hoje, JANELA_DIAS)
  const linhas: Linha[] = []
  const { data: fer } = await sb.from('feriados').select('data')
  const feriados = new Set((fer || []).map((f) => f.data as string))
  for (const ano of [Number(hoje.slice(0, 4)), Number(hoje.slice(0, 4)) + 1]) {
    linhas.push(...feriadosEUA(ano).filter((l) => l.data >= hoje && l.data <= ate))
    linhas.push(...vencimentosWin(ano, feriados).filter((l) => l.data >= hoje && l.data <= ate))
  }
  const fontes: [string, () => Promise<Linha[]>][] = [
    ['ibge', () => ibge(hoje, ate)],
    ['fed', fomc],
    ['oficiais', () => oficiais(hoje, ate)],
    ['bea', bea],
    ['census', census],
    ['bce', bce],
  ]
  const resumo: Record<string, string> = {}
  for (const [nome, fn] of fontes) {
    try {
      const r = (await fn()).filter((l) => l.data >= hoje && l.data <= ate)
      linhas.push(...r)
      resumo[nome] = `${r.length}`
      await log(nome, true, `${r.length} datas`)
    } catch (e) {
      resumo[nome] = `erro: ${String(e)}`
      await log(nome, false, String(e))
    }
  }

  const uteis = linhas.filter((l) => diaSemana(l.data) !== 0 && diaSemana(l.data) !== 6)
  const unicas = new Map<string, Linha>()
  for (const l of uteis) unicas.set(`${l.code}|${l.data}`, l)
  const datasFomc = [...unicas.values()].filter((l) => l.code === 'fomc').map((l) => l.data)
  const datasCopom = new Set([...unicas.values()].filter((l) => l.code === 'copom').map((l) => l.data))
  for (const d of datasCopom) {
    const ata = somaDias(d, 6)
    unicas.set(`ata_copom|${ata}`, { code: 'ata_copom', data: ata, hora_brt: '08:00' })
  }
  for (const d of datasFomc) {
    if (datasCopom.has(d)) unicas.set(`super_quarta|${d}`, { code: 'super_quarta', data: d, hora_brt: null })
    const pos = proximoPregao(d, feriados)
    unicas.set(`pos_fomc|${pos}`, { code: 'pos_fomc', data: pos, hora_brt: null })
  }

  const { data: tipos } = await sb.from('event_types').select('code,nivel')
  const nivel = new Map((tipos || []).map((t) => [t.code as string, t.nivel as string]))
  const rows = [...unicas.values()]
    .filter((l) => nivel.has(l.code) && !feriados.has(l.data))
    .map((l) => ({ code: l.code, data: l.data, hora_brt: l.hora_brt, nivel: nivel.get(l.code)!, origem: 'sync' }))
  if (rows.length) {
    const { error } = await sb.from('events').upsert(rows, { onConflict: 'code,data' })
    if (error) return Response.json({ ok: false, error: error.message, resumo }, { status: 500 })
  }
  return Response.json({ ok: true, gravados: rows.length, resumo })
})
