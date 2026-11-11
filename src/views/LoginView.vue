<script setup lang="ts">
import RadarLogo from '@/components/RadarLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { isDemo } from '@/lib/config'
import Spinner from '@/components/Spinner.vue'
import GoogleG from '@/components/GoogleG.vue'
import Brand from '@/components/Brand.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="flex flex-1 flex-col justify-center overflow-y-auto bg-white p-6">
    <div class="mb-7 flex flex-col items-center">
      <RadarLogo :size="72" class="mb-3.5 drop-shadow-[0_6px_14px_rgba(0,0,0,0.25)]" />
      <h1 class="text-[28px] font-extrabold text-ink"><Brand tone="dark" /></h1>
      <p class="mt-1.5 text-center text-[15px] text-muted">Agenda econômica e impacto na abertura do mini índice</p>
    </div>

    <button
      v-if="isDemo"
      type="button"
      class="rounded-[14px] bg-primary py-[15px] text-center text-[15px] font-bold text-white"
      @click="auth.signInDemo()"
    >
      Entrar no modo demo
    </button>
    <button
      v-else
      type="button"
      :disabled="auth.busy"
      class="flex items-center justify-center gap-2.5 rounded-[14px] bg-primary py-[15px] text-[15px] font-bold text-white shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
      :class="auth.busy ? 'opacity-70' : ''"
      @click="auth.signInGoogle()"
    >
      <Spinner v-if="auth.busy" light :size="20" />
      <template v-else>
        <GoogleG />
        Entrar com o Google
      </template>
    </button>

    <p v-if="auth.error" class="mt-3.5 text-center text-danger">{{ auth.error }}</p>
  </div>
</template>
