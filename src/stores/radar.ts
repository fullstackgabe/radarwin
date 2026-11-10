import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as db from '@/lib/db'
import { DIAS_SEMANA } from '@/lib/config'
import { maiorNivel } from '@/lib/catalogo'
import { proximosPregoes } from '@/lib/dias'
import type { DayRadar, EventType, RadarEvent, RadarItem } from '@/types'

export const useRadarStore = defineStore('radar', () => {
  const tipos = ref<EventType[]>([])
  const eventos = ref<RadarEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  const pregoes = computed(() => proximosPregoes(DIAS_SEMANA))

  const tipoPorCode = computed(() => new Map(tipos.value.map((t) => [t.code, t])))

  const dias = computed<DayRadar[]>(() =>
    pregoes.value.map((data) => {
      const doDia: RadarItem[] = eventos.value
        .filter((e) => e.data === data && tipoPorCode.value.has(e.code))
        .map((e) => ({ ...e, tipo: tipoPorCode.value.get(e.code)! }))
        .sort((a, b) => a.tipo.ordem - b.tipo.ordem)
      return { data, nivel: maiorNivel(doDia.map((e) => e.nivel)), eventos: doDia }
    }),
  )

  const hoje = computed(() => dias.value[0] ?? null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [t, e] = await Promise.all([db.eventTypes(), db.eventsBetween(pregoes.value[0]!, pregoes.value[pregoes.value.length - 1]!)])
      tipos.value = t
      eventos.value = e
      loaded.value = true
    } catch {
      error.value = 'Não consegui carregar a agenda. Puxe para atualizar.'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    tipos.value = []
    eventos.value = []
    loaded.value = false
  }

  return { tipos, eventos, loading, error, loaded, dias, hoje, tipoPorCode, load, reset }
})
