<template data-iframe-height>
  <v-list-item
    class="my-4"
    :title="t(`status.${imp.status}`, { statusDate })"
  >
    <template #prepend>
      <v-icon
        :color="colorsByStatus[imp.status]"
        :icon="iconsByStatus[imp.status]"
      />
    </template>
  </v-list-item>

  <v-expansion-panels
    :model-value="[steps.length - 1]"
    variant="accordion"
    multiple
    static
  >
    <v-expansion-panel
      v-for="(step, i) in steps"
      :key="step.date"
    >
      <v-expansion-panel-title>
        <v-progress-circular
          v-if="i === steps.length - 1 && imp.status === 'running'"
          color="primary"
          size="24"
          indeterminate
        />
        <v-icon
          v-else-if="step.children.length"
          :color="getColor(step.children)"
          :icon="getIcon(step.children)"
        />
        <span class="ml-6">{{ step.msg }}</span>
      </v-expansion-panel-title>
      <v-expansion-panel-text
        v-if="step.children.length"
        class="px-2"
      >
        <import-log
          v-for="log in step.children"
          :key="log.date"
          :log="log"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import type { Log } from '@data-fair/types-catalogs'
import type { Import } from '#api/types'
import { mdiAlertCircle, mdiCheckCircle, mdiClockOutline, mdiLoading } from '@mdi/js'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const { imp } = defineProps<{
  imp: Import
}>()

/**
 * Get each step's from the import logs
 */
const steps = computed(() => {
  if (!imp.logs) return []

  const steps = []
  let lastStep: { date: string, msg: string, children: Log[] } | undefined
  for (const log of imp.logs) {
    if (log.type === 'step') {
      lastStep = { date: log.date, msg: log.msg, children: [] }
      steps.push(lastStep)
    } else {
      if (!lastStep) {
        lastStep = { date: '', msg: '', children: [] }
        steps.push(lastStep)
      }
      lastStep.children.push(log)
    }
  }
  return steps
})

const statusDate = computed(() => {
  return imp.lastImportDate ? formatDate(imp.lastImportDate) : ''
})

const getColor = (logs: Log[]) => {
  const error = logs.some((log) => log.type === 'error')
  if (error) return 'error'

  const warning = logs.some((log) => log.type === 'warning')
  if (warning) return 'info'

  return 'success'
}

const getIcon = (logs: Log[]) => {
  const error = logs.some((log) => log.type === 'error')
  if (error) return mdiAlert

  const warning = logs.some((log) => log.type === 'warning')
  if (warning) return mdiAlertCircle

  return mdiCheckCircle
}

const formatDate = (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm')

const iconsByStatus = {
  waiting: mdiClockOutline,
  running: mdiLoading,
  done: mdiCheckCircle,
  error: mdiAlert
}

const colorsByStatus = {
  waiting: 'primary',
  running: 'primary',
  done: 'success',
  error: 'error'
}
</script>

<i18n lang="yaml">
en:
  status:
    waiting: Waiting for import
    running: Import in progress
    done: Last import completed - {statusDate}
    error: Last import failed - {statusDate}

fr:
  status:
    waiting: En attente d'import
    running: En cours d'import
    done: Dernier import terminé - {statusDate}
    error: Dernier import en erreur - {statusDate}
</i18n>

<style scoped>
</style>
