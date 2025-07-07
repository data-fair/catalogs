<template>
  <v-container data-iframe-height>
    <p v-if="!catalogsFetch.data.value?.results.length">
      {{ t('noCatalogs') }}
    </p>
    <template v-else>
      <!-- Create new publication -->
      <v-card
        :title="t('createNewPublication')"
        rounded="lg"
        variant="elevated"
        class="mb-4"
      >
        <publication-new
          :data-fair-dataset="{ id: datasetId }"
          @on-create="publicationListRef?.refresh()"
        />
      </v-card>

      <!-- List of publications -->
      <publication-list
        ref="publicationListRef"
        :data-fair-dataset-id="datasetId"
      />
    </template>
  </v-container>
</template>

<script setup lang="ts">
import type { CatalogsGetRes } from '#api/doc'

const { t } = useI18n()
const datasetId = useStringSearchParam('dataset-id')
const publicationListRef = ref() // Reference to the publication list component

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
    createNewPublication: Create a new publication
    noCatalogs: You have not yet configured any catalog.

  fr:
    createNewPublication: Créer une nouvelle publication
    noCatalogs: Vous n'avez pas encore configuré de catalogue.

</i18n>

<style scoped>
</style>
