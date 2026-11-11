<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRadarStore } from '@/stores/radar'
import { NIVEL_FRASE, NIVEL_EMOJI, NIVEL_LABEL } from '@/lib/catalogo'
import { dataLonga, rotuloDia } from '@/lib/dias'
import { isDemo } from '@/lib/config'
import { frases } from '@/lib/format'
import EventoAccordion from '@/components/EventoAccordion.vue'
import Spinner from '@/components/Spinner.vue'

const radar = useRadarStore()
onMounted(() => {
  if (!radar.loaded) radar.load()
})

const dia = computed(() => radar.hoje)

const aberto = ref<string | null>(null)
watch(
  () => dia.value?.eventos,
  (ev) => {
    aberto.value = ev?.length === 1 ? ev[0]!.id : null
  },
  { immediate: true },
)
function alterna(id: string) {
  aberto.value = aberto.value === id ? null : id
}

const tom: Record<string, string> = {
  normal: 'from-[#065f46] to-[#047857]',
  atencao: 'from-[#92400e] to-[#b45309]',
  forte: 'from-[#991b1b] to-[#dc2626]',
}
</script>

<template>
  <div class="flex-1 overflow-y-auto bg-page p-4">
    <p
      v-if="isDemo"
      class="mb-3 rounded-[12px] border border-warn-border bg-warn-soft px-3 py-2 text-[12.5px] font-semibold text-warn-text"
    >
      Modo demo: agenda de exemplo, WhatsApp simulado.
    </p>

    <div v-if="!radar.loaded && radar.loading" class="flex justify-center py-16"><Spinner /></div>
    <p v-else-if="radar.error" class="py-10 text-center text-[14px] text-danger">{{ radar.error }}</p>

    <template v-else-if="dia">
      <section class="flex items-center gap-4 rounded-[20px] bg-gradient-to-br px-5 py-4 text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)]" :class="tom[dia.nivel]">
        <span class="shrink-0 text-[34px] leading-none">{{ NIVEL_EMOJI[dia.nivel] }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-[12px] font-semibold opacity-85">
            <template v-if="rotuloDia(dia.data) !== 'Hoje'">{{ rotuloDia(dia.data) }} · </template>{{ dataLonga(dia.data) }}
          </p>
          <p class="text-[22px] font-extrabold leading-tight">{{ NIVEL_LABEL[dia.nivel] }}</p>
          <p v-for="(f, i) in frases(NIVEL_FRASE[dia.nivel])" :key="i" class="text-[13px] leading-snug opacity-95" :class="{ 'mt-0.5': i === 0 }">{{ f }}</p>
        </div>
      </section>

      <h2 class="mb-2.5 mt-5 px-1 text-center text-[13px] font-extrabold uppercase tracking-wide text-ink">Notícias do dia</h2>
      <div v-if="dia.eventos.length" class="flex flex-col gap-2.5">
        <EventoAccordion v-for="e in dia.eventos" :key="e.id" :item="e" :aberto="aberto === e.id" @toggle="alterna(e.id)" />
      </div>
      <p v-else class="rounded-[16px] bg-white px-4 py-5 text-center text-[14px] text-muted shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        Nenhuma notícia relevante para a abertura hoje.
      </p>

      <div class="mt-6 px-2 text-center">
        <p class="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-faint">Fontes oficiais</p>
        <p class="mx-auto mt-1.5 max-w-[300px] text-[12px] font-medium leading-relaxed text-faint">IBGE · Banco Central · FGV · B3 · Federal Reserve · BLS · BEA · Census Bureau · NYSE · Banco Central Europeu</p>
      </div>
    </template>
  </div>
</template>
