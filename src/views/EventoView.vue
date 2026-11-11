<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ExternalLink } from '@lucide/vue'
import { NIVEL_EMOJI, NIVEL_LABEL } from '@/lib/catalogo'
import { useRadarStore } from '@/stores/radar'
import * as db from '@/lib/db'
import { dataLonga, hojeBRT, horaCurta, rotuloDia } from '@/lib/dias'
import { frases } from '@/lib/format'
import Spinner from '@/components/Spinner.vue'
import type { RadarEvent } from '@/types'

const route = useRoute()
const radar = useRadarStore()
const datas = ref<RadarEvent[]>([])
const carregando = ref(true)

const code = computed(() => String(route.params.code))
const tipo = computed(() => radar.tipoPorCode.get(code.value) ?? null)
const hoje = hojeBRT()
const proximas = computed(() => datas.value.filter((d) => d.data >= hoje).sort((a, b) => a.data.localeCompare(b.data)))
const horaProxima = computed(() => proximas.value.find((d) => d.hora_brt)?.hora_brt ?? null)
const agenda = computed(() => proximas.value.slice(0, 4))

const tom: Record<string, string> = {
  normal: 'from-[#065f46] to-[#047857]',
  atencao: 'from-[#92400e] to-[#b45309]',
  forte: 'from-[#991b1b] to-[#dc2626]',
}
const ponto: Record<string, string> = { normal: 'bg-success', atencao: 'bg-[#eab308]', forte: 'bg-danger' }

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
      <section class="rounded-[20px] bg-gradient-to-br px-5 py-5 text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)]" :class="tom[tipo.nivel]">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold">
          {{ NIVEL_EMOJI[tipo.nivel] }} {{ NIVEL_LABEL[tipo.nivel] }}
        </span>
        <h2 class="mt-3 text-[22px] font-extrabold leading-tight">{{ tipo.nome }}</h2>
        <p class="mt-1 text-[13px] font-semibold opacity-85">
          {{ tipo.pais }} · {{ tipo.fonte }}<template v-if="horaProxima"> · sai às {{ horaCurta(horaProxima) }}</template>
        </p>
      </section>

      <section class="mt-4 rounded-[16px] bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p class="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-ink">Resumo</p>
        <p class="mt-1.5 text-[14.5px] leading-snug text-ink-2">{{ tipo.o_que_e }}</p>
        <div class="mt-4 border-t border-line pt-4">
          <p class="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-ink">Na abertura</p>
          <p class="mt-1.5 text-[14.5px] leading-snug text-ink-2">{{ frases(tipo.impacto_texto).join(' ') }}</p>
        </div>
      </section>

      <template v-if="agenda.length">
        <h3 class="mb-2.5 mt-5 px-1 text-[13px] font-extrabold uppercase tracking-wide text-ink">Próximas divulgações</h3>
        <div class="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div v-for="(d, i) in agenda" :key="d.id" class="flex items-center gap-3 px-4 py-3" :class="{ 'border-t border-line-soft': i > 0 }">
            <span class="h-2 w-2 shrink-0 rounded-full" :class="ponto[d.nivel]" />
            <span class="min-w-0 flex-1">
              <span class="block text-[14px] font-bold text-ink">{{ rotuloDia(d.data) }}</span>
              <span class="block text-[12px] font-medium text-faint">{{ dataLonga(d.data) }}</span>
            </span>
            <span class="shrink-0 rounded-full bg-chip px-2.5 py-1 text-[13px] font-extrabold text-ink">{{ horaCurta(d.hora_brt) }}</span>
          </div>
        </div>
      </template>

      <a
        :href="tipo.fonte_url"
        target="_blank"
        rel="noopener"
        class="mt-5 flex items-center justify-center gap-1.5 rounded-[14px] border border-line bg-white py-3 text-[13.5px] font-bold text-ink-3 active:bg-line-soft"
      >
        Ver na fonte oficial ({{ tipo.fonte }}) <ExternalLink :size="14" />
      </a>
    </template>
  </div>
</template>
