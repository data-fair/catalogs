<template>
  <div>
    <div class="d-flex text-break">
      <span
        v-if="['info', 'warning', 'error'].includes(log.type)"
        :class="log.type === 'warning' ? 'text-info' : log.type === 'error' ? 'text-error' : ''"
      >
        {{ log.msg }}
      </span>
      <span
        v-else-if="log.type === 'task'"
        :class="`${taskColor(log)}--text`"
      >
        {{ log.msg }} ({{ (log.progress || 0) }} / {{ log.total }})
        <v-progress-linear
          rounded
          :color="taskColor(log)"
          :indeterminate="!log.progress || !log.total"
          :model-value="log.total ? ((log.progress || 0) / log.total) * 100 : 0"
        />
      </span>
      <v-spacer />
      <v-btn
        v-if="isSuperadmin && hasExtra"
        class="align-self-center"
        variant="text"
        size="small"
        color="admin"
        :append-icon="expanded ? mdiChevronUp : mdiChevronDown"
        @click="expanded = !expanded"
      >
        {{ t('viewExtra') }}
      </v-btn>
      <span class="pl-2 text-no-wrap text-body-small align-self-center">
        {{ formatDate(log.date) }}
        <span v-if="log.progressDate">- {{ formatDate(log.progressDate) }}</span>
      </span>
    </div>
    <v-expand-transition>
      <v-card
        v-if="isSuperadmin && hasExtra && expanded"
        color="surface-variant"
        class="overflow-auto"
        max-height="300"
      >
        <v-btn
          :prepend-icon="mdiContentCopy"
          variant="text"
          size="small"
          @click="copyExtra"
        >
          {{ t('copy') }}
        </v-btn>
        <v-card-text class="pt-0">
          <pre class="text-body-small"><code>{{ formattedExtra }}</code></pre>
        </v-card-text>
      </v-card>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
import type { Log } from '@data-fair/types-catalogs'

const { log } = defineProps <{ log: Log }>()
const { t } = useI18n()
const { dayjs } = useLocaleDayjs()
const session = useSession()
const { sendUiNotif } = useUiNotif()

const expanded = ref(false)

const isSuperadmin = computed(() => !!session.state.user?.adminMode)

const hasExtra = computed(() => !!log.extra && Object.keys(log.extra).length > 0)

const formattedExtra = computed(() => JSON.stringify(log.extra, null, 2))

const copyExtra = async () => {
  await navigator.clipboard.writeText(formattedExtra.value)
  sendUiNotif({ type: 'success', msg: t('extraCopied') })
}

const taskColor = (log: Log) => {
  if (log.progress && log.progress === log.total) return 'success'
  return 'primary'
}

const formatDate = (date: string) => dayjs(date).format('lll')
</script>

<i18n lang="yaml">
en:
  viewExtra: View extra
  copy: Copy
  extraCopied: Extra copied to clipboard

fr:
  viewExtra: Voir l'extra
  copy: Copier
  extraCopied: Extra copié dans le presse-papier
</i18n>

<style scoped>
</style>
