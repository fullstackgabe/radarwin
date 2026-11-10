<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ExternalLink } from '@lucide/vue'
import { useRadarStore } from '@/stores/radar'
import * as db from '@/lib/db'
import { dataCurta, diaSemanaCurto, hojeBRT, horaCurta } from '@/lib/dias'
import NivelBadge from '@/components/NivelBadge.vue'
import Spinner from '@/components/Spinner.vue'
import type { RadarEvent } from '@/types'

const route = useRoute()
const radar = useRadarStore()
const datas = ref<RadarEvent[]>([])
const carregando = ref(true)

const code = computed(() => String(route.params.code))
const tipo = computed(() => radar.tipoPorCode.get(code.value) ?? null)
const hoje = hojeBRT()
const proximas = computed(() => datas.value.filter((d) => d.data >= hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6))

const brl = (v: number) => `${v < 0 ? '−' : '+'}R$ ${Math.abs(v).toFixed(2).replace('.', ',')}`

async function carregar() {
  carregando.value = true
  try {
    if (!radar.loaded) await radar.load()
    datas.value = await db.eventsOfType(code.value)
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)
watch(code, carregar)
</script>

<template>
  <div class="flex-1 overflow-y-auto bg-page p-4">
    <div v-if="carregando && !tipo" class="flex justify-center py-16"><Spinner /></div>
    <p v-else-if="!tipo" class="py-10 text-center text-[14px] text-muted">Notícia não encontrada.</p>
    <template v-else>
      <section class="card">
        <NivelBadge :nivel="tipo.nivel" />
        <h2 class="mt-2 text-[21px] font-extrabold leading-tight text-ink">{{ tipo.nome }}</h2>
        <p class="mt-1 text-[13px] font-semibold text-faint">{{ tipo.pais }} · {{ tipo.horario_texto }} (Brasília)</p>
        <p class="mt-3 text-[14.5px] leading-snug text-ink-2">{{ tipo.o_que_e }}</p>
        <a
          :href="tipo.fonte_url"
          target="_blank"
          rel="noopener"
          class="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-primary"
        >
          Fonte oficial: {{ tipo.fonte }} <ExternalLink :size="14" />
        </a>
      </section>

      <section class="card">
        <h3 class="card-title">O que muda na nossa abertura</h3>
        <p class="text-[15px] leading-snug text-ink">{{ tipo.impacto_texto }}</p>
        <div v-if="tipo.hist_trades" class="mt-4 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-[12px] bg-line-soft px-2 py-2.5">
            <p class="text-[18px] font-extrabold text-ink">{{ tipo.hist_trades }}</p>
            <p class="text-[11px] font-semibold text-muted">dias no histórico</p>
          </div>
          <div class="rounded-[12px] bg-line-soft px-2 py-2.5">
            <p class="text-[18px] font-extrabold text-ink">{{ tipo.hist_acerto?.toFixed(0) }}%</p>
            <p class="text-[11px] font-semibold text-muted">acerto do OPENING</p>
          </div>
          <div class="rounded-[12px] bg-line-soft px-2 py-2.5">
            <p class="text-[16px] font-extrabold" :class="(tipo.hist_media ?? 0) < 0 ? 'text-danger' : 'text-success'">
              {{ brl(tipo.hist_media ?? 0) }}
            </p>
            <p class="text-[11px] font-semibold text-muted">média por trade</p>
          </div>
        </div>
        <p class="mt-3 text-[11.5px] leading-snug text-faint">
          OPENING 5 min, corpo 40, 1 contrato, 2022–2026 (dias normais: ~55% de acerto). Amostra pequena: use como alerta, não como regra.
        </p>
      </section>

      <section class="card">
        <h3 class="card-title">Próximas datas</h3>
        <div v-if="carregando" class="flex justify-center py-3"><Spinner :size="20" /></div>
        <ul v-else-if="proximas.length" class="divide-y divide-line-soft">
          <li v-for="d in proximas" :key="d.id" class="flex items-center justify-between py-2 text-[14px]">
            <span class="font-semibold text-ink">{{ diaSemanaCurto(d.data) }}, {{ dataCurta(d.data) }}</span>
            <span class="text-muted">{{ horaCurta(d.hora_brt) }}</span>
          </li>
        </ul>
        <p v-else class="text-[13.5px] text-faint">Nenhuma data cadastrada ainda.</p>
      </section>
    </template>
  </div>
</template>
