<template>
  <v-container data-iframe-height>
    <span
      v-if="!catalogsFetch.data.value?.results.length"
      class="d-flex justify-center text-title-large"
    >
      {{ t('noCatalogs') }}
    </span>
    <template v-else>
      <!-- Create new publication -->
      <v-card class="mb-4">
        <v-card-text>
          <v-autocomplete
            v-if="!onlyCatalog"
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

          <!-- Warning message for catalogs requiring publication site -->
          <v-alert
            v-if="selectedCatalogRequiresPublicationSite && !hasPublicationSites"
            :text="t('publicationSiteRequired')"
            type="warning"
            class="mt-3"
          />

          <v-btn
            :disabled="!effectiveCatalogId || (selectedCatalogRequiresPublicationSite && !hasPublicationSites)"
            color="primary"
            variant="flat"
            class="mt-2"
            :href="`/data-fair/catalogs/${effectiveCatalogId}/publications/new?datasetId=${datasetId}`"
            target="_top"
          >
            {{ onlyCatalog ? t('createNewPublicationOn', { catalog: onlyCatalog.title }) : t('createNewPublication') }}
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

const onlyCatalog = computed(() => {
  const results = catalogsFetch.data.value?.results
  return results?.length === 1 ? results[0] : null
})

const effectiveCatalogId = computed(() =>
  onlyCatalog.value?._id ?? selectedCatalogId.value
)

const catalogsFetch = useFetch<CatalogsGetRes>(`${$apiPath}/catalogs`, {
  query: {
    sort: 'updated.date:-1',
    select: '_id,title,plugin,capabilities',
    capabilities: 'createFolderInRoot,createFolder,createResource,replaceFolder,replaceResource'
  }
})

// Check que le dataset est publié sur un site de publication
const datasetFetch = useFetch<{ publicationSites?: any[] }>(
  `${window.location.origin}/data-fair/api/v1/datasets/${datasetId.value}`,
  { query: { select: 'publicationSites' } }
)

const hasPublicationSites = computed(() => {
  return !!datasetFetch.data.value?.publicationSites?.length
})

// Check if the selected catalog requires a publication site
const selectedCatalogRequiresPublicationSite = computed(() => {
  if (!effectiveCatalogId.value || !catalogsFetch.data.value?.results) return false

  const catalog = catalogsFetch.data.value.results.find(
    (c) => c._id === effectiveCatalogId.value
  )

  return catalog?.capabilities?.includes('requiresPublicationSite') ?? false
})

</script>

<i18n lang="yaml">
  en:
    createNewPublication: Create a new publication
    createNewPublicationOn: 'Create a publication on "{catalog}"'
    noCatalogs: You have not yet configured any catalog that supports dataset publication.
    publicationSiteRequired: This catalog requires that the dataset be published on a portal. Please publish it on a portal before publishing to this catalog.
    selectCatalog: Select a catalog
    catalogRequired: Please select a catalog

  fr:
    createNewPublication: Créer une nouvelle publication
    createNewPublicationOn: 'Créer une publication sur "{catalog}"'
    noCatalogs: Vous n'avez pas encore configuré de catalogue qui supporte la publication de jeux de données.
    publicationSiteRequired: Ce catalogue nécessite que le jeu de données soit publié sur un portail. Veuillez le publier sur un portail avant de le publier sur ce catalogue.
    selectCatalog: Sélectionner un catalogue
    catalogRequired: Veuillez sélectionner un catalogue

</i18n>

<style scoped>
</style>
