<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { horaCurta } from '@/lib/dias'
import { frases } from '@/lib/format'
import type { RadarItem } from '@/types'

const props = defineProps<{ item: RadarItem; detalhe?: boolean }>()
const router = useRouter()

const barra: Record<string, string> = { normal: 'bg-success', atencao: 'bg-warn-icon', forte: 'bg-danger' }
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-[16px] bg-white px-3.5 py-4 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] active:bg-line-soft"
    @click="router.push(`/evento/${props.item.code}`)"
  >
    <span class="w-1 shrink-0 self-stretch rounded-full" :class="barra[item.nivel]" />
    <span class="w-[52px] shrink-0 text-center text-[14px] font-extrabold text-ink">{{ horaCurta(item.hora_brt) }}</span>
    <span class="min-w-0 flex-1">
      <span class="block text-[15px] font-bold leading-snug text-ink">{{ item.tipo.nome }}</span>
      <span class="mt-0.5 block text-[12px] font-semibold text-faint">{{ item.tipo.pais }} · {{ item.tipo.fonte }}</span>
      <span v-if="detalhe" class="mt-3 flex flex-col gap-0.5 border-t border-line-soft pt-3">
        <span v-for="(f, i) in frases(item.tipo.impacto_texto)" :key="i" class="block text-[13.5px] leading-snug text-ink-3">{{ f }}</span>
      </span>
    </span>
    <ChevronRight :size="18" class="shrink-0 text-faint" />
  </button>
</template>
