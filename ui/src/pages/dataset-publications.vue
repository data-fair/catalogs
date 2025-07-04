<template>
  <v-container data-iframe-height>
    <p v-if="!catalogsFetch.data.value?.results.length">
      {{ t('noCatalogs') }}
    </p>
    <publication-list
      v-else
      :data-fair-dataset="{ id: datasetId }"
    />
  </v-container>
</template>

<script setup lang="ts">
import type { CatalogsGetRes } from '#api/doc'

const { t } = useI18n()
const datasetId = useStringSearchParam('dataset-id')

const catalogsFetch = useFetch<CatalogsGetRes>(`${$apiPath}/catalogs`, {
  query: {
    sort: 'updated.date:-1',
    select: '_id,title,plugin,capabilities',
    capabilities: 'publishDataset'
  }
})

</script>

<i18n lang="yaml">
  en:
    noCatalogs: You have not yet configured any catalog.

  fr:
    noCatalogs: Vous n'avez pas encore configuré de catalogue.

</i18n>

<style scoped>
</style>
