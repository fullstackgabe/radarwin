import { supabase, currentUserId } from '@/lib/supabase'
import { demoStore } from '@/lib/demoStore'
import { isDemo } from '@/lib/config'
import type { EventType, Profile, RadarEvent, SendResult } from '@/types'

const PROFILE_COLS = 'user_id,phone,callmebot_key,callmebot_phone,whatsapp_verified,avisa_agenda,avisa_lembrete,so_alerta_forte'
const EVENT_COLS = 'id,code,data,hora_brt,nivel'

async function uidOrThrow(): Promise<string> {
  const uid = await currentUserId()
  if (!uid) throw new Error('Sem sessão')
  return uid
}

export async function profileGet(): Promise<Profile | null> {
  if (isDemo) return demoStore.profileGet()
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).maybeSingle()
  if (error) throw error
  return (data as Profile | null) ?? null
}

export async function profileUpsert(patch: Partial<Profile>): Promise<Profile> {
  if (isDemo) return demoStore.profileUpsert(patch)
  const uid = await uidOrThrow()
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: uid, ...patch, updated_at: new Date().toISOString() })
    .select(PROFILE_COLS)
    .single()
  if (error) throw error
  return data as Profile
}

export async function mySubscriptionActive(): Promise<boolean> {
  if (isDemo) return true
  const { data, error } = await supabase.from('subscribers').select('active').maybeSingle()
  if (error) throw error
  return data?.active === true
}

export async function recordLead(): Promise<void> {
  if (isDemo) return
  const { data } = await supabase.auth.getUser()
  const email = data?.user?.email
  if (!email) return
  await supabase.from('leads').upsert({ email: email.toLowerCase() }, { onConflict: 'email', ignoreDuplicates: true })
}

export async function whatsappTest(): Promise<SendResult> {
  if (isDemo) return demoStore.whatsappTest()
  const { data, error } = await supabase.functions.invoke('whatsapp-test', { body: {} })
  if (error) throw error
  if (data?.error) throw new Error(String(data.error))
  return data as SendResult
}

export async function eventTypes(): Promise<EventType[]> {
  if (isDemo) return demoStore.eventTypes()
  const { data, error } = await supabase.from('event_types').select('*').order('ordem')
  if (error) throw error
  return (data as EventType[]) || []
}

export async function eventsBetween(from: string, to: string): Promise<RadarEvent[]> {
  if (isDemo) return demoStore.eventsBetween(from, to)
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLS)
    .gte('data', from)
    .lte('data', to)
    .order('data')
    .order('hora_brt', { nullsFirst: true })
  if (error) throw error
  return (data as RadarEvent[]) || []
}

export async function eventsOfType(code: string): Promise<RadarEvent[]> {
  if (isDemo) return demoStore.eventsOfType(code)
  const { data, error } = await supabase.from('events').select(EVENT_COLS).eq('code', code).order('data', { ascending: false }).limit(40)
  if (error) throw error
  return (data as RadarEvent[]) || []
}
