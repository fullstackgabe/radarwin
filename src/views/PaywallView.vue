<script setup lang="ts">
import RadarLogo from '@/components/RadarLogo.vue'
import { LogOut, Sparkles } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { SUBSCRIBE_URL } from '@/lib/config'
import Brand from '@/components/Brand.vue'

const auth = useAuthStore()

const PRESENTATION =
  'O Radar WIN é um portal de acesso restrito.\n\n' +
  'Agenda dos indicadores econômicos que afetam o mini índice,\n' +
  'com o impacto de cada um na abertura do pregão\n' +
  'e alertas no WhatsApp antes de cada divulgação.\n\n' +
  'Seu e-mail ainda não tem acesso. Solicite abaixo.'
</script>

<template>
  <div class="flex flex-1 flex-col overflow-y-auto bg-page px-6 pb-8 pt-[calc(env(safe-area-inset-top)+28px)]">
    <div class="mx-auto flex w-full max-w-[380px] flex-1 flex-col">
      <div class="mb-5 flex flex-col items-center">
        <RadarLogo :size="64" class="mb-3 drop-shadow-[0_6px_14px_rgba(0,0,0,0.25)]" />
        <h1 class="text-[24px] font-extrabold text-ink"><Brand tone="dark" /></h1>
      </div>

      <div class="rounded-[22px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p class="whitespace-pre-line text-[15px] leading-[22px] text-ink">{{ PRESENTATION }}</p>
        <a
          :href="SUBSCRIBE_URL"
          target="_blank"
          rel="noopener"
          class="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-extrabold text-white"
        >
          <Sparkles :size="17" />
          Solicitar acesso
        </a>
      </div>

      <p class="mt-5 text-center text-[12.5px] text-muted">
        Você entrou como <b class="text-ink-2">{{ auth.user?.email }}</b>.<br />
        Se o acesso foi liberado para outro e-mail, saia e entre de novo.
      </p>
      <button
        type="button"
        class="mx-auto mt-2 flex items-center gap-1.5 py-2 text-[13.5px] font-bold text-muted"
        @click="auth.signOut()"
      >
        <LogOut :size="15" />
        Sair
      </button>
    </div>
  </div>
</template>
