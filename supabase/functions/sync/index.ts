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

async function ibge(de: string, ate: string): Promise<Linha[]> {
  const out: Linha[] = []
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v3/calendario/?qtd=1000&page=${page}`, { signal: AbortSignal.timeout(30000) })
    if (!r.ok) throw new Error(`IBGE HTTP ${r.status}`)
    const j = await r.json()
    for (const x of j.items as { titulo: string; data_divulgacao: string }[]) {
      const code = x.titulo === 'Índice Nacional de Preços ao Consumidor Amplo' ? 'ipca' : x.titulo === 'Índice Nacional de Preços ao Consumidor Amplo 15' ? 'ipca15' : null
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
  const fontes: [string, () => Promise<Linha[]>][] = [
    ['ibge', () => ibge(hoje, ate)],
    ['fed', fomc],
    ['oficiais', () => oficiais(hoje, ate)],
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

  const { data: fer } = await sb.from('feriados').select('data')
  const feriados = new Set((fer || []).map((f) => f.data as string))
  const uteis = linhas.filter((l) => diaSemana(l.data) !== 0 && diaSemana(l.data) !== 6)
  const unicas = new Map<string, Linha>()
  for (const l of uteis) unicas.set(`${l.code}|${l.data}`, l)
  const datasFomc = [...unicas.values()].filter((l) => l.code === 'fomc').map((l) => l.data)
  const datasCopom = new Set([...unicas.values()].filter((l) => l.code === 'copom').map((l) => l.data))
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
