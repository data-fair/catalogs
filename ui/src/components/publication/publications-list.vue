<template>
  <publication-new
    :catalog="catalog"
    :data-fair-dataset="dataFairDataset"
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

    <v-list style="background-color: transparent;">
      <v-list-item
        v-for="publication in publicationsFetch.data.value.results"
        :key="publication._id"
        class="d-flex align-center"
        :title="catalog ?
          t('publicationTitle.catalog', { title: publication.catalog?.title || publication.catalog?.id }) :
          t('publicationTitle.dataset', { title: publication.dataFairDataset?.title || publication.dataFairDataset?.id })"
        :subtitle="t(`publicationStatus.${publication.status}`, { error: publication.error })"
      >
        <template #append>
          <v-btn
            color="warning"
            density="comfortable"
            variant="text"
            :icon="mdiDelete"
            :title="t('deletePublication')"
          />
        </template>
      </v-list-item>
    </v-list>
  </template>
</template>

<script setup lang="ts">
import type { PublicationsGetRes } from '#api/doc'

const { t } = useI18n()

// Used to filter the publications
const { catalog, dataFairDataset } = defineProps<{
  catalog?: {
    id: string
    title?: string
  },
  dataFairDataset?: {
    id: string
    title?: string
  },
}>()

const publicationsFetch = useFetch<PublicationsGetRes>(`${$apiPath}/publications`, {
  query: {
    catalogId: catalog?.id,
    dataFairDatasetId: dataFairDataset?.id
  }
})

</script>

<i18n lang="yaml">
  en:
    noPublications: This dataset is not yet published on any catalog
    publicationsList: List of publications
    publicationStatus:
      waiting: Waiting for publication
      running: Publication in progress
      done: Dataset published
      error: 'Error : {error}'
    publicationTitle:
      catalog: 'Publication of dataset "{title}"'
      dataset: 'Dataset published on catalog "{title}"'
    deletePublication: Delete publication

  fr:
    noPublications: Ce jeu de données n'est publié sur un aucun catalogue
    publicationsList: Liste des publications
    publicationStatus:
      waiting: En attente de publication
      running: En cours de publication
      done: Jeu de données publié
      error: 'Erreur : {error}'
    publicationTitle:
      catalog: 'Publication du jeu de données "{title}"'
      dataset: 'Jeu de données publié sur le catalogue "{title}"'
    deletePublication: Supprimer la publication

</i18n>

<style scoped>
</style>
