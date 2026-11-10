import { DEMO_UID } from '@/lib/config'
import { CATALOGO } from '@/lib/catalogo'
import { hojeBRT, proximosPregoes } from '@/lib/dias'
import type { EventType, Profile, RadarEvent, SendResult } from '@/types'

const K_PROFILE = 'radar_demo_profile_v1'

const PERFIL_VAZIO: Profile = {
  user_id: DEMO_UID,
  phone: null,
  callmebot_key: null,
  callmebot_phone: null,
  whatsapp_verified: false,
  avisa_agenda: true,
  avisa_lembrete: true,
  so_alerta_forte: false,
}

function lerPerfil(): Profile | null {
  try {
    const raw = localStorage.getItem(K_PROFILE)
    return raw ? { ...PERFIL_VAZIO, ...(JSON.parse(raw) as Partial<Profile>) } : null
  } catch {
    return null
  }
}

function eventosDemo(): RadarEvent[] {
  const d = proximosPregoes(8, hojeBRT())
  const ev = (i: number, code: string, data: string, hora: string | null): RadarEvent => {
    const t = CATALOGO.find((c) => c.code === code)!
    return { id: `demo-${i}`, code, data, hora_brt: hora, nivel: t.nivel }
  }
  return [
    ev(1, 'ipca15', d[0]!, '09:00'),
    ev(2, 'cpi', d[1]!, '10:30'),
    ev(3, 'super_quarta', d[2]!, null),
    ev(4, 'copom', d[2]!, '18:30'),
    ev(5, 'fomc', d[2]!, '16:00'),
    ev(6, 'pos_fomc', d[3]!, null),
    ev(7, 'payroll', d[4]!, '10:30'),
    ev(8, 'ipca', d[6]!, '09:00'),
  ]
}

export const demoStore = {
  async profileGet(): Promise<Profile | null> {
    return lerPerfil()
  },
  async profileUpsert(patch: Partial<Profile>): Promise<Profile> {
    const p = { ...(lerPerfil() ?? PERFIL_VAZIO), ...patch }
    localStorage.setItem(K_PROFILE, JSON.stringify(p))
    return p
  },
  async whatsappTest(): Promise<SendResult> {
    const p = lerPerfil()
    if (!p?.phone || !p.callmebot_key) return { ok: false, status: 0, body: 'Cadastre o telefone e a API key primeiro.' }
    return { ok: true, status: 200, body: 'simulado' }
  },
  async eventTypes(): Promise<EventType[]> {
    return CATALOGO
  },
  async eventsBetween(from: string, to: string): Promise<RadarEvent[]> {
    return eventosDemo().filter((e) => e.data >= from && e.data <= to)
  },
  async eventsOfType(code: string): Promise<RadarEvent[]> {
    return eventosDemo().filter((e) => e.code === code)
  },
}
