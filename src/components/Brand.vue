<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'light' | 'dark' }>(), { tone: 'light' })
</script>

<template>
  <span>Radar <span :class="tone === 'dark' ? 'text-primary' : 'text-accent'">WIN</span></span>
</template>
