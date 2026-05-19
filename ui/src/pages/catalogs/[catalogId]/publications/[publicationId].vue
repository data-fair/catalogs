<template>
  <v-container
    v-if="publication"
    data-iframe-height
    style="min-height:500px"
  >
    <df-section-tabs
      id="publication"
      v-model="activeTab"
      :title="publication.dataFairDataset?.title ?? publication.dataFairDataset.id"
      :src="publicationIllustration"
      :tabs="tabs"
    >
      <template #windows>
        <v-tabs-window-item value="logs">
          <logs
            type="publication"
            :item="publication"
          />
        </v-tabs-window-item>
      </template>
    </df-section-tabs>

    <navigation-right>
      <publication-actions :publication />
    </navigation-right>
  </v-container>
</template>

<script setup lang="ts">
import type { Log } from '@data-fair/types-catalogs'
import type { Publication } from '#api/types'

import DfSectionTabs from '@data-fair/lib-vuetify/section-tabs.vue'
import NavigationRight from '@data-fair/lib-vuetify/navigation-right.vue'

const { t } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/publications/[publicationId]'>()
const ws = useWS('/catalogs/api/')
const activeTab = useStringSearchParam('tab', { default: 'logs' })

const publication = ref<Publication | null>(null)

const publicationIllustration = new URL('~/assets/publication.svg', import.meta.url).href

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

const tabs = computed(() => [
  { key: 'logs', title: t('tab.logs'), icon: mdiCalendarText }
])

</script>

<i18n lang="yaml">
en:
  catalogs: Catalogs
  publications: Publications
  tab:
    logs: Execution log

fr:
  catalogs: Catalogues
  publications: Publications
  tab:
    logs: Journal d'exécution

</i18n>

<style scoped>
</style>
