<template>
  <export-new
    :catalog-id="catalogId"
    :data-fair-dataset-id="dataFairDatasetId"
  />
  <p
    v-if="!exportsFetch.data.value?.results.length"
    class="font-italic mt-4"
  >
    {{ t('noPublications') }}
  </p>
  <template v-else>
    <h3 class="text-h5 mt-4">
      {{ t('publicationsList') }}
    </h3>
    <v-row
      v-if="exportsFetch.loading.value"
      class="d-flex align-stretch"
    >
      <v-col
        v-for="i in 9"
        :key="i"
        md="4"
        sm="6"
        cols="12"
        class="d-flex"
      >
        <v-skeleton-loader
          :class="$vuetify.theme.current.dark ? 'w-100' : 'w-100 skeleton'"
          type="heading"
        />
      </v-col>
    </v-row>
    <template v-else>
      <v-row class="d-flex align-stretch">
        <v-col
          v-for="exp in exportsFetch.data.value.results"
          :key="exp._id"
          md="4"
          sm="6"
          cols="12"
        >
          <pre>
            {{ exp }}
          </pre>
        </v-col>
      </v-row>
    </template>
  </template>
</template>

<script setup lang="ts">
import type { ExportsGetRes } from '#api/doc'

const { t } = useI18n()

const { catalogId, dataFairDatasetId } = defineProps<{
  catalogId?: string,
  dataFairDatasetId?: string,
}>()

const exportsFetch = useFetch<ExportsGetRes>(`${$apiPath}/exports`, {
  query: {
    sort: 'updated.date:-1',
    dataFairDatasetId,
    catalogId
  }
})

</script>

<i18n lang="yaml">
  en:
    noPublications: This dataset is not yet published on any catalog
    publicationsList: List of publications

  fr:
    noPublications: Ce jeu de données n'est encore publié sur aucun catalogue
    publicationsList: Liste des publications

</i18n>

<style scoped>
</style>
