<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { horaCurta } from '@/lib/dias'
import { frases } from '@/lib/format'
import type { RadarItem } from '@/types'

defineProps<{ item: RadarItem; aberto: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const barra: Record<string, string> = { normal: 'bg-success', atencao: 'bg-[#eab308]', forte: 'bg-danger' }
</script>

<template>
  <div class="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
    <button
      type="button"
      class="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line-soft"
      :aria-expanded="aberto"
      @click="emit('toggle')"
    >
      <span class="w-1 shrink-0 self-stretch rounded-full" :class="barra[item.nivel]" />
      <span class="min-w-0 flex-1">
        <span class="block text-[15px] font-extrabold leading-snug text-ink">{{ item.tipo.nome }}</span>
        <span class="mt-0.5 block text-[12px] font-medium text-faint">{{ item.tipo.pais }} · {{ item.tipo.fonte }}</span>
      </span>
      <span class="shrink-0 rounded-full bg-chip px-2.5 py-1 text-[13px] font-extrabold text-ink">{{ horaCurta(item.hora_brt) }}</span>
      <ChevronDown :size="18" class="-ml-1 shrink-0 text-faint transition-transform duration-200" :class="{ 'rotate-180': aberto }" />
    </button>

    <div v-if="aberto" class="flex gap-3 px-3.5 pb-3.5">
      <span class="w-1 shrink-0" />
      <div class="min-w-0 flex-1 border-t border-line-soft pt-2.5">
        <p class="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-ink">Resumo</p>
        <p class="mt-1 text-[13.5px] leading-snug text-muted">{{ item.tipo.o_que_e }}</p>
        <p class="mt-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-ink">Na abertura</p>
        <p v-for="(f, i) in frases(item.tipo.impacto_texto)" :key="i" class="text-[13.5px] leading-snug text-muted" :class="{ 'mt-1': i === 0 }">{{ f }}</p>
      </div>
    </div>
  </div>
</template>
