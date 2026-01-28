<template>
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
    <span class="pl-2 text-no-wrap text-caption">
      {{ formatDate(log.date) }}
      <span v-if="log.progressDate">- {{ formatDate(log.progressDate) }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Log } from '@data-fair/types-catalogs'

defineProps <{ log: Log }>()
const { dayjs } = useLocaleDayjs()

const taskColor = (log: Log) => {
  if (log.progress && log.progress === log.total) return 'success'
  return 'primary'
}

const formatDate = (date: string) => dayjs(date).format('lll')
</script>

<style scoped>
</style>
