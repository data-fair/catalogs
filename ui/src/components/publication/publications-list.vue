<template>
  <publication-new
    :catalog-id="catalogId"
    :data-fair-dataset-slug="dataFairDatasetSlug"
    @on-publish="publicationsFetch.refresh()"
  />
  <p
    v-if="!publicationsFetch.data.value?.results.length"
    class="font-italic mt-4"
  >
    {{ t('noPublications') }}
  </p>
  <template v-else>
    <h3 class="text-h5 mt-4">
      {{ t('publicationsList') }}
    </h3>
    <v-row
      v-if="publicationsFetch.loading.value"
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
          v-for="publication in publicationsFetch.data.value.results"
          :key="publication._id"
          md="4"
          sm="6"
          cols="12"
        >
          <publication-card :publication="publication" />
        </v-col>
      </v-row>
    </template>
  </template>
</template>

<script setup lang="ts">
import type { PublicationsGetRes } from '#api/doc'

const { t } = useI18n()

/** Filter by */
const { catalogId, dataFairDatasetSlug } = defineProps<{
  catalogId?: string,
  dataFairDatasetSlug?: string,
}>()

const publicationsFetch = useFetch<PublicationsGetRes>(`${$apiPath}/publications`, {
  query: {
    sort: 'updated.date:-1',
    catalogId,
    dataFairDatasetSlug
  }
})

</script>

<i18n lang="yaml">
  en:
    noPublications: This dataset is not yet published on any catalog
    publicationsList: List of publications

  fr:
    noPublications: Ce jeu de données n'est publié sur un aucun catalogue
    publicationsList: Liste des publications

</i18n>

<style scoped>
</style>
