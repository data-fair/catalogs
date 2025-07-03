<template>
  <v-card
    :title="t('importTitle', { title: imp.remoteResource?.title ?? imp.remoteResource?.id })"
    :subtitle="t(`importStatus.${imp.status}`)"
    :to="`/catalogs/${imp.catalog.id}/imports/${imp._id}`"
    class="h-100 d-flex flex-column"
  >
    <v-card-text>
      <!-- TODO: Show the last error if present -->
      <div v-if="imp.lastImportDate">
        {{ t('lastImportDate') }} {{ dayjs(imp.lastImportDate).format('LLL') }}
      </div>
      <div v-if="imp.nextImportDate">
        {{ t('nextImportDate') }} {{ dayjs(imp.nextImportDate).format('LLL') }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Import } from '#api/types'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const { imp } = defineProps<{
  imp: Import
}>()

</script>

<i18n lang="yaml">
  en:
    error: 'Error'
    importStatus:
      done: 'Dataset imported'
      error: 'Import error'
      running: 'Import in progress'
      waiting: 'Waiting for import'
    importTitle: '{title}'
    lastImportDate: 'Last Import Date:'
    nextImportDate: 'Next Import Date:'

  fr:
    error: 'Erreur'
    importStatus:
      done: 'Jeu de données importé'
      error: 'Import en erreur'
      running: 'Import en cours'
      waiting: "En attente d'import"
    importTitle: '{title}'
    lastImportDate: 'Date du dernier import :'
    nextImportDate: 'Date du prochain import :'

</i18n>

<style scoped>
</style>
