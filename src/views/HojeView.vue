<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRadarStore } from '@/stores/radar'
import { NIVEL_FRASE, NIVEL_EMOJI, NIVEL_LABEL } from '@/lib/catalogo'
import { dataLonga, rotuloDia } from '@/lib/dias'
import { isDemo } from '@/lib/config'
import EventoRow from '@/components/EventoRow.vue'
import Spinner from '@/components/Spinner.vue'

const radar = useRadarStore()
onMounted(() => {
  if (!radar.loaded) radar.load()
})

const dia = computed(() => radar.hoje)

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
      <section class="rounded-[22px] bg-gradient-to-br p-5 text-white shadow-[0_6px_18px_rgba(15,23,42,0.18)]" :class="tom[dia.nivel]">
        <p class="text-[13px] font-semibold opacity-85">{{ rotuloDia(dia.data) }} · {{ dataLonga(dia.data) }}</p>
        <p class="mt-1 text-[26px] font-extrabold leading-tight">{{ NIVEL_EMOJI[dia.nivel] }} {{ NIVEL_LABEL[dia.nivel] }}</p>
        <p class="mt-2 text-[14.5px] leading-snug opacity-95">{{ NIVEL_FRASE[dia.nivel] }}</p>
      </section>

      <h2 class="mb-2 mt-5 px-1 text-[13px] font-extrabold uppercase tracking-wide text-muted">Notícias do dia</h2>
      <div v-if="dia.eventos.length" class="flex flex-col gap-2.5">
        <EventoRow v-for="e in dia.eventos" :key="e.id" :item="e" detalhe />
      </div>
      <p v-else class="rounded-[16px] bg-white p-4 text-[14px] text-muted shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        Nenhuma notícia relevante para a abertura hoje.
      </p>

      <p class="mt-6 px-2 text-center text-[11.5px] leading-snug text-faint">
        Horários de Brasília. Fontes oficiais: IBGE, Banco Central, BLS e Federal Reserve.
      </p>
    </template>
  </div>
</template>
