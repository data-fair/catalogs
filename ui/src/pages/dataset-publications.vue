<template>
  <v-container data-iframe-height>
    <span
      v-if="!catalogsFetch.data.value?.results.length"
      class="d-flex justify-center text-h6"
    >
      {{ t('noCatalogs') }}
    </span>
    <span
      v-if="!hasPublicationSites"
      class="d-flex justify-center text-h6"
    >
      {{ t('noPublicationSites') }}
    </span>
    <template v-else>
      <!-- Create new publication -->
      <v-card
        rounded="lg"
        variant="elevated"
        class="mb-4"
      >
        <v-card-text>
          <v-autocomplete
            v-model="selectedCatalogId"
            :label="t('selectCatalog')"
            :items="catalogsFetch.data.value?.results || []"
            :rules="[v => !!v || t('catalogRequired')]"
            item-title="title"
            item-value="_id"
            density="comfortable"
            hide-details="auto"
            required
            clearable
          />
          <v-btn
            :disabled="!selectedCatalogId"
            color="primary"
            variant="flat"
            class="mt-2"
            :href="`/data-fair/catalogs/${selectedCatalogId}/publications/new?datasetId=${datasetId}`"
            target="_top"
          >
            {{ t('createNewPublication') }}
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- List of publications -->
      <publication-list :data-fair-dataset-id="datasetId" />
    </template>
  </v-container>
</template>

<script setup lang="ts">
import type { CatalogsGetRes } from '#api/doc'

const { t } = useI18n()
const datasetId = useStringSearchParam('dataset-id')

const selectedCatalogId = ref<string | null>(null)

const catalogsFetch = useFetch<CatalogsGetRes>(`${$apiPath}/catalogs`, {
  query: {
    sort: 'updated.date:-1',
    select: '_id,title,plugin,capabilities',
    capabilities: 'publication'
  }
})

// Check que le dataset est publié sur un jeu de données
const datasetFetch = useFetch<{ publicationSites?: any[] }>(
  `${window.location.origin}/data-fair/api/v1/datasets/${datasetId.value}`,
  { query: { select: 'publicationSites' } }
)

const hasPublicationSites = computed(() => {
  return !!datasetFetch.data.value?.publicationSites?.length
})

</script>

<i18n lang="yaml">
  en:
    createNewPublication: Create a new publication
    noCatalogs: You have not yet configured any catalog that supports dataset publication.
    noPublicationSites: This dataset is not published on any portal, you cannot publish it to a catalog.
    selectCatalog: Select a catalog
    catalogRequired: Please select a catalog

  fr:
    createNewPublication: Créer une nouvelle publication
    noCatalogs: Vous n'avez pas encore configuré de catalogue qui supporte la publication de jeux de données.
    noPublicationSites: Ce jeu de données n'est publié sur aucun portail, vous ne pouvez donc pas le publier sur un catalogue.
    selectCatalog: Sélectionner un catalogue
    catalogRequired: Veuillez sélectionner un catalogue

</i18n>

<style scoped>
</style>
