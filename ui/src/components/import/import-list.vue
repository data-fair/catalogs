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
      {{ t('datasetsInCatalog', (availableDatasets.data.value?.count || 0)) }}
    </h4>

    <v-spacer />
    <v-pagination
      v-if="hasCapability('pagination') && (availableDatasets.data.value?.count || 0) > size"
      v-model="page"
      density="comfortable"
      total-visible="3"
      :length="Math.ceil((availableDatasets.data.value?.count || 0) / size)"
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
    v-if="availableDatasets.loading.value"
    color="primary"
    height="2"
    indeterminate
  />
  <import-list-item
    v-for="dataset in availableDatasets.data.value?.results"
    v-else
    :key="dataset.id"
    class="mb-4"
    :imports="importedDatasets.data.value?.results"
    :catalog="catalog"
    :dataset="dataset"
  />
  <v-pagination
    v-if="hasCapability('pagination') && (availableDatasets.data.value?.count || 0) > size"
    v-model="page"
    :length="Math.ceil((availableDatasets.data.value?.count || 0) / size)"
  />
</template>

<script setup lang="ts">
import type { CatalogDataset, Capability } from '@data-fair/lib-common-types/catalog/index.ts'
import type { Catalog, Plugin, Import } from '#api/types'

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

const availableDatasets = useFetch<{
  count: number
  results: CatalogDataset[]
}>(`${$apiPath}/catalogs/${catalog.value._id}/datasets`, {
  query: fetchQuery
})

const importedDatasets = useFetch<{
  count: number
  results: Import[]
}>(`${$apiPath}/imports`, {
  query: {
    catalogId: catalog.value._id
  }
})

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
    datasetsInCatalog: No datasets on the catalog | {n} remote dataset | {n} remote datasets
    search: Search...

  fr:
    datasetsInCatalog: Aucun jeu de données sur le catalogue | {n} jeu de données distant | {n} jeux de données distants
    search: Rechercher...
</i18n>

<style scoped>
</style>
