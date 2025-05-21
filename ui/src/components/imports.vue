<template>
  <div class="d-flex align-center mb-4">
    <v-text-field
      v-if="hasCapability('search')"
      v-model="search"
      class="mr-4"
      color="primary"
      density="compact"
      max-width="200"
      variant="outlined"
      :append-inner-icon="mdiMagnify"
      :placeholder="t('search')"
      autofocus
      clearable
      hide-details
    />
    <h4 class="text-h5 mb-0">
      {{ t('datasetsInCatalog', (catalogDatasets.data.value?.count || 0)) }}
    </h4>

    <v-spacer />
    <v-pagination
      v-if="hasCapability('pagination') && (catalogDatasets.data.value?.count || 0) > size"
      v-model="page"
      density="comfortable"
      total-visible="3"
      :length="Math.ceil((catalogDatasets.data.value?.count || 0) / size)"
    />
  </div>
  <v-form>
    <vjsf
      v-if="hasCapability('additionalFilters')"
      v-model="additionalFilters"
      :schema="plugin.filtersSchema"
      :options="vjsfOptions"
    />
  </v-form>
  <v-progress-linear
    v-if="catalogDatasets.loading.value"
    color="primary"
    height="2"
    indeterminate
  />
  <template v-else>
    <v-card
      v-for="dataset in catalogDatasets.data.value?.results"
      :key="dataset.id"
      class="mb-4"
    >
      <v-card-item class="pb-0">
        <template
          v-if="dataset.private !== undefined"
          #prepend
        >
          <v-icon
            :title="dataset.private ? t('datasetIsPrivate') : t('datasetIsPublic')"
            :icon="dataset.private ? mdiLock : mdiLockOpen"
            color="primary"
          />
        </template>
        <template #title>
          {{ dataset.title }}
        </template>
        <template #subtitle>
          <a
            v-if="dataset.origin"
            :href="dataset.origin"
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir le jeu de données distant
          </a>
        </template>
        <template #append>
          <v-btn
            color="primary"
            density="comfortable"
            variant="text"
            :loading="importDataset.loading.value"
            :icon="mdiFolderDownload"
            :title="t('createMetadataOnlyDataset')"
            @click="importDataset.execute(dataset)"
          />
        </template>
      </v-card-item>

      <v-card-text v-if="dataset.resources?.length">
        <v-list>
          <v-list-item
            v-for="resource in dataset.resources"
            :key="resource.id"
            :title="resource.title"
          >
            <template #subtitle>
              {{ resource.format }} |
              <a
                v-if="resource.url"
                :href="resource.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                Voir la ressource distante
              </a>
            </template>
            <template #append>
              <v-btn
                color="primary"
                density="comfortable"
                variant="text"
                :icon="mdiDownload"
                :loading="importDataset.loading.value"
                :title="t('createRemoteFileDataset')"
                @click="importDataset.execute(dataset, resource)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </template>
  <v-pagination
    v-if="hasCapability('pagination') && (catalogDatasets.data.value?.count || 0) > size"
    v-model="page"
    :length="Math.ceil((catalogDatasets.data.value?.count || 0) / size)"
  />
</template>

<script setup lang="ts">
import type { CatalogDataset, CatalogResourceDataset, Capability } from '@data-fair/lib-common-types/catalog/index.ts'
import type { Catalog, Plugin } from '#api/types'

import Vjsf from '@koumoul/vjsf'

const props = defineProps <{
  catalog: Catalog,
  plugin: Plugin
}>()

const { t } = useI18n()
const { catalog } = toRefs(props)
const additionalFilters = ref({})
const search = ref<string>('')
const page = ref<number>(1)
const size = 10

/**
 * Check if the plugin has a specific capability
 * @param {Capability} capability - The capability to check
 * @returns {boolean} - True if the plugin has the capability, false otherwise
 */
const hasCapability = (capability: Capability): boolean => {
  return props.plugin.metadata.capabilities.includes(capability)
}

const fetchQuery = computed(() => ({
  q: hasCapability('search') ? search.value : undefined,
  ...(hasCapability('pagination')
    ? { page: page.value, size }
    : {}
  ),
  ...(hasCapability('additionalFilters')
    ? additionalFilters.value
    : {}
  ),
}))

const catalogDatasets = useFetch<{
  count: number
  results: CatalogDataset[]
}>(`${$apiPath}/catalogs/${catalog.value._id}/datasets`, { query: fetchQuery })

const importDataset = useAsyncAction(
  async (dataset: CatalogDataset, resource?: CatalogResourceDataset) => {
    await $fetch(`${$apiPath}/imports`, {
      method: 'POST',
      body: {
        catalog: catalog.value,
        remoteDataset: {
          id: dataset.id,
          title: dataset.title
        },
        remoteResource: {
          id: resource?.id,
          title: resource?.title
        }
      }
    })
  },
  {
    error: t('errorCreatingDataset'),
  }
)

const vjsfOptions = {
  density: 'comfortable',
  initialValidation: 'always',
  removeAdditional: true,
  titleDepth: 4,
  updateOn: 'blur',
  validateOn: 'blur',
  xI18n: true
}

</script>

<i18n lang="yaml">
  en:
    confirmDeleteDataset: Do you really want to delete this dataset? Warning, this action will permanently delete the dataset from the platform.
    confirmOverwriteDataset: Do you really want to overwrite the already imported information?
    createMetadataOnlyDataset: Create a "metadata only" type dataset
    createRemoteFileDataset: Create a dataset from the remote resource
    datasetDeleted: Dataset deleted!
    datasetIsPrivate: The dataset is private
    datasetIsPublic: The dataset is public
    datasetNotFound: Dataset not found
    datasetsInCatalog: No datasets on the catalog | {n} remote dataset | {n} remote datasets
    deleteDataset: Delete local dataset
    errorCreatingDataset: Error while creating the dataset
    errorDeletingDataset: Error while deleting the dataset
    no: No
    overwriteDataset: Overwrite dataset
    search: Search...
    yes: Yes

  fr:
    confirmDeleteDataset: Voulez-vous vraiment supprimer ce jeu de données ? Attention, cette action supprime définitivement le jeu de données de la plateforme.
    confirmOverwriteDataset: Voulez-vous vraiment écraser les informations déjà importées ?
    createMetadataOnlyDataset: Créer un jeu de données de type "métadonnées seul"
    createRemoteFileDataset: Créer un jeu de données depuis la ressource distante
    datasetDeleted: Jeu de données supprimé !
    datasetIsPrivate: Le jeu de données est privé
    datasetIsPublic: Le jeu de données est public
    datasetNotFound: Jeu de données non trouvé
    datasetsInCatalog: Aucun jeu de données sur le catalogue | {n} jeu de données distant | {n} jeux de données distants
    deleteDataset: Supprimer le jeu de données local
    errorCreatingDataset: Erreur lors de la création du jeu de données
    errorDeletingDataset: Erreur lors de la suppression du jeu de données
    no: Non
    overwriteDataset: Écraser le jeu de données
    search: Rechercher...
    yes: Oui
</i18n>

<style scoped>
</style>
