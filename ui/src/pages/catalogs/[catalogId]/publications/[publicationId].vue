<template>
  <v-container
    v-if="publication"
    data-iframe-height
    style="min-height:500px"
  >
    <h2 class="text-h5 mb-2">
      Publication {{ publication.dataFairDataset?.title ?? publication.dataFairDataset.id }}
    </h2>

    <h3 class="text-h6 mt-6">
      {{ t('logSection') }}
    </h3>
    <logs
      type="publication"
      :item="publication"
    />
    <navigation-right>
      <publication-actions :publication />
    </navigation-right>
  </v-container>
</template>

<script setup lang="ts">
import type { Log } from '@data-fair/types-catalogs'
import type { Publication } from '#api/types'
import NavigationRight from '@data-fair/lib-vuetify/navigation-right.vue'

const { t } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/publications/[publicationId]'>()
const ws = useWS('/catalogs/api/')

const publication = ref<Publication | null>(null)

const publicationFetch = useFetch<Publication>(`${$apiPath}/publications/${route.params.publicationId}`)
watch(publicationFetch.data, (newPublication) => {
  if (!newPublication) return
  publication.value = newPublication

  setBreadcrumbs([
    { text: t('catalogs'), to: '/catalogs' },
    { text: newPublication.catalog.title ?? newPublication.catalog.id, to: `/catalogs/${newPublication.catalog.id}` },
    { text: t('publications'), to: `/catalogs/${newPublication.catalog.id}?tab=publications` },
    { text: newPublication.dataFairDataset.title ?? newPublication.dataFairDataset.id }
  ])
})

ws?.subscribe<Partial<Publication>>(
  `publication/${route.params.publicationId}`,
  (patch) => { if (publication.value) Object.assign(publication.value, patch) }
)
ws?.subscribe<Log>(`publication/${route.params.publicationId}/logs`, (log) => {
  if (!publication.value) return
  if (!publication.value.logs) publication.value.logs = []
  if (log.type === 'task') {
    const existingLogIndex = publication.value.logs.findIndex(l => l.type === 'task' && l.key === log.key)
    if (existingLogIndex !== -1) return Object.assign(publication.value.logs[existingLogIndex], log)
  }
  publication.value.logs.push(log)
})

</script>

<i18n lang="yaml">
en:
  catalogs: Catalogs
  logSection: Publication log
  publications: Publications
  publicationStatus:
    waiting: Waiting for publication
    running: Publication in progress
    done: Last publication completed
    error: Last publication failed
  publicationStatusDelete:
    waiting: Waiting for deletion
    running: Deletion in progress
    done: Deletion completed
    error: Deletion failed

fr:
  catalogs: Catalogues
  logSection: Journal de publication
  publications: Publications
  publicationStatus:
    waiting: En attente de publication
    running: Publication en cours
    done: Dernière publication terminée
    error: Dernière publication en erreur
  publicationStatusDelete:
    waiting: En attente de suppression
    running: Suppression en cours
    done: Suppression terminée
    error: Suppression en erreur

</i18n>

<style scoped>
</style>
