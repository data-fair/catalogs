<template>
  <publication-new
    class="mb-4"
    :catalog="catalog"
    :data-fair-dataset="dataFairDataset"
  />

  <v-row
    v-if="publicationsStore.publicationsFetch.loading.value"
    class="d-flex align-stretch"
  >
    <v-col
      v-for="i in 4"
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
  <span
    v-else-if="!publicationsStore.count.value"
    class="d-flex justify-center text-h6 mt-4"
  >
    {{ catalog
      ? t('noPublicationsFromCatalog')
      : t('noPublicationsFromDataset')
    }}
  </span>
  <template v-else>
    <h3 class="text-h5 mb-4">
      {{ t('nbPublications', publicationsStore.count.value) }}
    </h3>
    <v-row class="d-flex align-stretch">
      <v-col
        v-for="publication in publicationsStore.publications.value"
        :key="publication._id"
        md="4"
        sm="6"
        cols="12"
      >
        <publication-card
          :publication="publication"
          :from-catalog="!!catalog"
        />
      </v-col>
    </v-row>
  </template>
</template>

<script setup lang="ts">

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

const { t } = useI18n()
const publicationsStore = providePublicationsStore(catalog?.id, dataFairDataset?.id)

</script>

<i18n lang="yaml">
  en:
    nbPublications: 'No publications | 1 publication | {count} publications'
    noPublicationsFromDataset: This dataset is not yet published on any catalog
    noPublicationsFromCatalog: This catalog does not contain any publications

  fr:
    nbPublications: 'Aucune publication | 1 publication | {count} publications'
    noPublicationsFromDataset: Ce jeu de données n'est publié sur un aucun catalogue
    noPublicationsFromCatalog: Ce catalogue ne contient aucune publication

</i18n>

<style scoped>
</style>
