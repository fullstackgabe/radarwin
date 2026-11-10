export type Profile = {
  user_id: string
  phone: string | null
  callmebot_key: string | null
  callmebot_phone: string | null
  whatsapp_verified: boolean
  avisa_agenda: boolean
  avisa_lembrete: boolean
  so_alerta_forte: boolean
}

export type SendResult = { ok: boolean; status: number; body: string }

export type ConnectStep = 1 | 2 | 3

export type AuthUser = { name: string; email: string; avatar: string | null }

export type Nivel = 'normal' | 'atencao' | 'forte'

export type EventType = {
  code: string
  nome: string
  pais: string
  fonte: string
  fonte_url: string
  horario_texto: string
  nivel: Nivel
  o_que_e: string
  impacto_texto: string
  hist_trades: number | null
  hist_acerto: number | null
  hist_media: number | null
  ordem: number
}

export type RadarEvent = {
  id: string
  code: string
  data: string
  hora_brt: string | null
  nivel: Nivel
}

export type RadarItem = RadarEvent & { tipo: EventType }

export type DayRadar = {
  data: string
  nivel: Nivel
  eventos: RadarItem[]
}
