<script setup lang="ts">
import { onMounted } from 'vue'
import { useRadarStore } from '@/stores/radar'
import { dataCurta, rotuloDia } from '@/lib/dias'
import NivelBadge from '@/components/NivelBadge.vue'
import EventoRow from '@/components/EventoRow.vue'
import Spinner from '@/components/Spinner.vue'

const radar = useRadarStore()
onMounted(() => {
  if (!radar.loaded) radar.load()
})
</script>

<template>
  <div class="flex-1 overflow-y-auto bg-page p-4">
    <div v-if="!radar.loaded && radar.loading" class="flex justify-center py-16"><Spinner /></div>
    <p v-else-if="radar.error" class="py-10 text-center text-[14px] text-danger">{{ radar.error }}</p>
    <div v-else class="flex flex-col gap-5">
      <section v-for="d in radar.dias" :key="d.data">
        <div class="mb-2 flex items-center justify-between px-1">
          <h2 class="text-[15px] font-extrabold text-ink">
            {{ rotuloDia(d.data) }} <span class="font-semibold text-faint">{{ dataCurta(d.data) }}</span>
          </h2>
          <NivelBadge :nivel="d.nivel" small />
        </div>
        <div v-if="d.eventos.length" class="flex flex-col gap-2">
          <EventoRow v-for="e in d.eventos" :key="e.id" :item="e" />
        </div>
        <p v-else class="rounded-[14px] bg-white px-4 py-3 text-[13.5px] text-faint shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          Sem notícias relevantes.
        </p>
      </section>
    </div>
  </div>
</template>
