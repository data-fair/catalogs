<template>
  <v-container data-iframe-height>
    <p v-if="!catalogsFetch.data.value?.results.length">
      {{ t('noCatalogs') }}
    </p>
    <publications-list
      v-else
      :data-fair-dataset-slug="datasetSlug"
    />
  </v-container>
</template>

<script setup lang="ts">
import type { CatalogsGetRes } from '#api/doc'

const { t } = useI18n()
const datasetSlug = useStringSearchParam('dataset-slug')

// TODO: Filter by catalogs that have the capability to publish
const catalogsFetch = useFetch<CatalogsGetRes>(`${$apiPath}/catalogs`, {
  query: {
    sort: 'updated.date:-1',
    select: '_id,title,plugin',
  }
})

</script>

<i18n lang="yaml">
  en:
    noCatalogs: You have not yet configured any catalog.

  fr:
    noCatalogs: Vous n'avez pas encore configuré de calalogue.

</i18n>

<style scoped>
</style>
