<script setup lang="ts">
import { NIVEL_EMOJI, NIVEL_LABEL } from '@/lib/catalogo'
import type { Nivel } from '@/types'

defineProps<{ nivel: Nivel; small?: boolean }>()

const classes: Record<Nivel, string> = {
  normal: 'bg-success-soft text-success',
  atencao: 'bg-warn-soft text-warn-text border border-warn-border',
  forte: 'bg-danger-fill text-danger border border-danger-border',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full font-bold"
    :class="[classes[nivel], small ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]']"
  >
    {{ NIVEL_EMOJI[nivel] }} {{ NIVEL_LABEL[nivel] }}
  </span>
</template>
