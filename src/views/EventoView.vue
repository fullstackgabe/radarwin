<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ExternalLink } from '@lucide/vue'
import { useRadarStore } from '@/stores/radar'
import * as db from '@/lib/db'
import { dataCurta, diaSemanaCurto, hojeBRT, horaCurta } from '@/lib/dias'
import { frases } from '@/lib/format'
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
const horaProxima = computed(() => proximas.value.find((d) => d.hora_brt)?.hora_brt ?? null)

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
      <section class="card text-center">
        <NivelBadge :nivel="tipo.nivel" />
        <h2 class="mt-3 text-[21px] font-extrabold leading-tight text-ink">{{ tipo.nome }}</h2>
        <p class="mt-2 text-[13px] font-semibold text-faint">
          {{ tipo.pais }}<template v-if="horaProxima"> · sai às {{ horaCurta(horaProxima) }}</template>
        </p>
        <p class="mx-auto mt-4 max-w-[320px] text-[14.5px] leading-relaxed text-ink-2">{{ tipo.o_que_e }}</p>
        <a
          :href="tipo.fonte_url"
          target="_blank"
          rel="noopener"
          class="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-primary"
        >
          Fonte oficial: {{ tipo.fonte }} <ExternalLink :size="14" />
        </a>
      </section>

      <section class="card text-center">
        <h3 class="card-title">O que muda na abertura</h3>
        <div class="mx-auto mt-1 flex max-w-[320px] flex-col gap-0.5">
          <p v-for="(f, i) in frases(tipo.impacto_texto)" :key="i" class="text-[15px] leading-snug text-ink">{{ f }}</p>
        </div>
      </section>

      <section class="card">
        <h3 class="card-title text-center">Próximas datas</h3>
        <div v-if="carregando" class="flex justify-center py-3"><Spinner :size="20" /></div>
        <ul v-else-if="proximas.length" class="divide-y divide-line-soft">
          <li v-for="d in proximas" :key="d.id" class="flex items-center justify-between py-2.5 text-[14px]">
            <span class="font-semibold text-ink">{{ diaSemanaCurto(d.data) }}, {{ dataCurta(d.data) }}</span>
            <span class="text-muted">{{ horaCurta(d.hora_brt) }}</span>
          </li>
        </ul>
        <p v-else class="text-[13.5px] text-faint">Nenhuma data cadastrada ainda.</p>
      </section>
    </template>
  </div>
</template>
