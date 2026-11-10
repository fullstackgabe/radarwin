<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { isDemo } from '@/lib/config'
import { phonePretty } from '@/lib/format'
import { toast } from '@/composables/useToast'
import Spinner from '@/components/Spinner.vue'
import type { Profile } from '@/types'

const auth = useAuthStore()
const profile = useProfileStore()
const router = useRouter()

const testing = ref(false)
const initial = computed(() => (auth.user?.name || auth.user?.email || '?').slice(0, 1).toUpperCase())

type Pref = 'avisa_agenda' | 'avisa_lembrete' | 'so_alerta_forte'
const prefs: { key: Pref; titulo: string; texto: string }[] = [
  { key: 'avisa_agenda', titulo: 'Agenda do dia às 8h30', texto: 'O veredito da abertura e as notícias do dia.' },
  { key: 'avisa_lembrete', titulo: 'Lembrete 5 min antes', texto: 'Aviso pouco antes de cada notícia entre 9h e 17h40.' },
  { key: 'so_alerta_forte', titulo: 'Só dias de alerta', texto: 'Recebe apenas quando o dia for de atenção ou alerta forte.' },
]

const valor = (k: Pref) => !!profile.profile?.[k as keyof Profile]

async function alternar(k: Pref) {
  try {
    await profile.savePrefs({ [k]: !valor(k) })
  } catch {
    toast('Não consegui salvar. Tenta de novo?')
  }
}

async function sendTest() {
  testing.value = true
  try {
    const r = await profile.sendTest()
    if (r.ok) toast('Mensagem de teste enviada!')
    else if (r.status === 203) toast('A API key parece inválida. Toque em Reconectar.')
    else toast('Não consegui falar com o CallMeBot agora.')
  } catch {
    toast('Não consegui falar com o CallMeBot agora.')
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="flex-1 overflow-y-auto bg-page p-4">
    <p
      v-if="isDemo"
      class="mb-3 rounded-[12px] border border-warn-border bg-warn-soft px-3 py-2 text-[12.5px] font-semibold text-warn-text"
    >
      Modo demo: dados só neste navegador, WhatsApp simulado.
    </p>

    <section class="card">
      <h2 class="card-title">Conta</h2>
      <div class="flex items-center gap-3">
        <img v-if="auth.user?.avatar" :src="auth.user.avatar" alt="" class="h-12 w-12 rounded-full" referrerpolicy="no-referrer" />
        <div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-[18px] font-extrabold text-primary">
          {{ initial }}
        </div>
        <div class="min-w-0">
          <p class="truncate text-[15.5px] font-bold text-ink">{{ auth.user?.name }}</p>
          <p class="truncate text-[13px] text-muted">{{ auth.user?.email }}</p>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">Avisos no WhatsApp</h2>
      <button
        v-for="p in prefs"
        :key="p.key"
        type="button"
        class="flex w-full items-center gap-3 border-b border-line-soft py-3 text-left last:border-0"
        @click="alternar(p.key)"
      >
        <span class="min-w-0 flex-1">
          <span class="block text-[15px] font-bold text-ink">{{ p.titulo }}</span>
          <span class="block text-[12.5px] leading-snug text-muted">{{ p.texto }}</span>
        </span>
        <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" :class="valor(p.key) ? 'bg-primary' : 'bg-line'">
          <span
            class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all"
            :class="valor(p.key) ? 'left-[21px]' : 'left-[3px]'"
          />
        </span>
      </button>
    </section>

    <section class="card">
      <h2 class="card-title">WhatsApp</h2>
      <span class="pill" :class="profile.verified ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn-text'">
        {{ profile.verified ? '✅ Conectado' : '⚠️ Não conectado' }}
      </span>
      <p class="mt-2 text-[15px] font-semibold text-ink">{{ phonePretty(profile.profile?.phone ?? null) || '—' }}</p>
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="btn-secondary flex items-center justify-center gap-2"
          :disabled="testing || !profile.verified"
          @click="sendTest"
        >
          <Spinner v-if="testing" :size="16" />
          <template v-else>Enviar teste</template>
        </button>
        <button type="button" class="btn-primary" @click="router.push('/conectar?redo=1')">Reconectar</button>
      </div>
    </section>

    <button
      type="button"
      class="btn-secondary mt-1 flex w-full items-center justify-center gap-2 !text-danger"
      @click="auth.signOut()"
    >
      <LogOut :size="18" />
      Sair
    </button>
  </div>
</template>
