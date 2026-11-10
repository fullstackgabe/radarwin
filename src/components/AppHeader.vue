<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Settings } from '@lucide/vue'
import { useRadarStore } from '@/stores/radar'

const route = useRoute()
const router = useRouter()
const radar = useRadarStore()
const isTab = computed(() => !!route.meta.tab)
const title = computed(() => String(route.meta.title ?? ''))

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/hoje')
}
</script>

<template>
  <header class="shrink-0 bg-ink pt-[env(safe-area-inset-top)] text-white">
    <div class="relative flex h-14 items-center justify-center">
      <button
        v-if="!isTab"
        type="button"
        class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 active:bg-white/15"
        aria-label="Voltar"
        @click="back"
      >
        <ArrowLeft :size="24" />
      </button>
      <h1 class="text-[17px] font-extrabold">{{ title }}</h1>
      <div v-if="isTab" class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
        <button
          type="button"
          class="rounded-full p-2 active:bg-white/15"
          :class="radar.loading ? 'animate-spin' : ''"
          aria-label="Atualizar"
          @click="radar.load()"
        >
          <RefreshCw :size="21" />
        </button>
        <button type="button" class="rounded-full p-2 active:bg-white/15" aria-label="Ajustes" @click="router.push('/ajustes')">
          <Settings :size="23" />
        </button>
      </div>
    </div>
  </header>
</template>
