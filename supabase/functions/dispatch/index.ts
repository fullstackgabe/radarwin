import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWhatsApp } from '../_shared/callmebot.ts'
import { agoraBR, diaSemana, minutos } from '../_shared/tempo.ts'
import { nivelDoDia, textoAgenda, textoLembrete, type Evento, type Tipo } from '../_shared/mensagens.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''
const PORTAL_URL = (Deno.env.get('PORTAL_URL') || 'https://radarnews-app.vercel.app').replace(/\/$/, '')
const HORA_AGENDA = '08:30'
const ANTECEDENCIA_MIN = 5
const JANELA_LEMBRETE = { de: '09:00', ate: '17:40' }

type Perfil = {
  user_id: string
  phone: string
  callmebot_key: string
  callmebot_phone: string | null
  avisa_agenda: boolean
  avisa_lembrete: boolean
  so_alerta_forte: boolean
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

async function reservar(user_id: string, tipo: string, ref: string): Promise<boolean> {
  const { data, error } = await sb
    .from('sends')
    .upsert({ user_id, tipo, ref, status: 'sending' }, { onConflict: 'user_id,tipo,ref', ignoreDuplicates: true })
    .select('id')
  return !error && !!data?.length
}

async function enviar(p: Perfil, tipo: string, ref: string, texto: string) {
  if (!(await reservar(p.user_id, tipo, ref))) return 'ja_enviado'
  let r = { ok: false, status: 0, body: '', phone: '' }
  for (let i = 0; i < 3 && !r.ok; i++) {
    if (i) await new Promise((res) => setTimeout(res, 4000 * i))
    try {
      r = await sendWhatsApp(p.callmebot_phone || p.phone, p.callmebot_key, texto)
    } catch (e) {
      r = { ok: false, status: 0, body: String(e), phone: '' }
    }
  }
  await sb.from('sends').update({ status: r.ok ? 'sent' : 'failed', resposta: r.body.slice(0, 300), enviado_em: new Date().toISOString() }).eq('user_id', p.user_id).eq('tipo', tipo).eq('ref', ref)
  if (r.ok && r.phone && r.phone !== p.callmebot_phone) await sb.from('profiles').update({ callmebot_phone: r.phone }).eq('user_id', p.user_id)
  return r.ok ? 'ok' : 'falhou'
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    const auth = req.headers.get('Authorization') || ''
    if (!auth.includes(SERVICE_KEY)) return new Response('forbidden', { status: 403 })
  }
  const agora = agoraBR()
  const forcar = new URL(req.url).searchParams.get('forcar_agenda') === '1'
  const ds = diaSemana(agora.data)
  if (ds === 0 || ds === 6) return Response.json({ ok: true, motivo: 'fim de semana' })
  const { data: fer } = await sb.from('feriados').select('data').eq('data', agora.data).maybeSingle()
  if (fer) return Response.json({ ok: true, motivo: 'feriado' })

  const { data: evs } = await sb.from('events').select('id,code,data,hora_brt,nivel').eq('data', agora.data)
  const eventos = (evs || []) as Evento[]
  const { data: tps } = await sb.from('event_types').select('code,nome,nivel,impacto_texto,ordem')
  const tipos = new Map(((tps || []) as Tipo[]).map((t) => [t.code, t]))
  const nivel = nivelDoDia(eventos)

  const agoraMin = minutos(agora.hm)
  const ehHoraAgenda = forcar || (agoraMin >= minutos(HORA_AGENDA) && agoraMin < minutos(HORA_AGENDA) + 30)
  const lembretes = eventos.filter((e) => {
    if (!e.hora_brt) return false
    const h = minutos(e.hora_brt.slice(0, 5))
    if (h < minutos(JANELA_LEMBRETE.de) || h > minutos(JANELA_LEMBRETE.ate)) return false
    return agoraMin >= h - ANTECEDENCIA_MIN && agoraMin < h
  })
  if (!ehHoraAgenda && !lembretes.length) return Response.json({ ok: true, motivo: 'nada a enviar', agora })

  const { data: pfs } = await sb
    .from('profiles')
    .select('user_id,phone,callmebot_key,callmebot_phone,avisa_agenda,avisa_lembrete,so_alerta_forte')
    .eq('whatsapp_verified', true)
  const { data: subs } = await sb.from('subscribers').select('email').eq('active', true)
  const liberados = new Set((subs || []).map((s) => String(s.email).toLowerCase()))
  const emails = new Map<string, string>()
  for (let page = 1; page <= 20; page++) {
    const { data: lista } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    for (const u of lista?.users || []) emails.set(u.id, (u.email || '').toLowerCase())
    if (!lista || lista.users.length < 1000) break
  }
  const perfis = ((pfs || []) as Perfil[]).filter((p) => p.phone && p.callmebot_key && liberados.has(emails.get(p.user_id) || ''))
  const resultado: Record<string, number> = {}
  const conta = (k: string) => (resultado[k] = (resultado[k] || 0) + 1)

  if (ehHoraAgenda) {
    const texto = textoAgenda(agora.data, eventos, tipos, PORTAL_URL)
    for (const p of perfis) {
      if (!p.avisa_agenda) continue
      if (p.so_alerta_forte && nivel === 'normal') continue
      conta(`agenda_${await enviar(p, 'agenda', agora.data, texto)}`)
    }
  }
  for (const e of lembretes) {
    const t = tipos.get(e.code)
    if (!t) continue
    const texto = textoLembrete(e, t, PORTAL_URL)
    for (const p of perfis) {
      if (!p.avisa_lembrete) continue
      if (p.so_alerta_forte && nivel === 'normal') continue
      conta(`lembrete_${await enviar(p, 'lembrete', e.id, texto)}`)
    }
  }
  return Response.json({ ok: true, agora, nivel, resultado })
})
