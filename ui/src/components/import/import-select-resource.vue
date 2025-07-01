<template>
  <tableComponent
    v-model="selected"
    v-model:items-per-page="itemsPerPage"
    v-model:page="currentPage"
    :disable-sort="supportsPagination"
    :headers="headers"
    :hide-default-footer="(fetchFolders.data.value?.count || 0) <= 5"
    :items="levelData"
    :items-length="fetchFolders.data.value?.count || 0"
    :items-per-page-options="[5, 10, 20]"
    :item-selectable="(item: any) => item.type === 'resource'"
    :loading="fetchFolders.loading.value ? 'primary' : false"
    :loading-text="t('loading')"
    :row-props="(data: any) => ({
      onClick: () => handleRowClick(data.item),
      style: data.item.type === 'resource' ? 'cursor: pointer' : 'cursor: default'
    })"
    :show-select="levelData.some(item => item.type === 'resource')"
    item-value="id"
    select-strategy="single"
  >
    <template #top>
      <v-form v-if="catalog?.capabilities.includes('additionalFilters')">
        <vjsf
          v-model="additionalFilters"
          class="ma-2"
          :schema="plugin?.listFiltersSchema"
          :options="vjsfOptions"
        />
      </v-form>
      <div class="d-flex align-center">
        <v-breadcrumbs
          :items="breadcrumbItems"
          class="pa-0 ml-4"
          divider="/"
        >
          <template #prepend>
            <v-icon
              :icon="mdiHome"
              class="mb-1 mr-2"
              @click="navigate(null)"
            />/
          </template>
          <template #item="{ item, index }">
            <v-breadcrumbs-item
              :title="item.title"
              :color="item.disabled ? 'primary' : undefined"
              @click="navigate(breadcrumbItems[index].path)"
            />
          </template>
        </v-breadcrumbs>
        <v-spacer />
        <v-text-field
          v-if="supportsSearch"
          v-model="search"
          class="mx-4"
          color="primary"
          density="compact"
          max-width="400"
          variant="outlined"
          :append-inner-icon="mdiMagnify"
          :placeholder="t('search')"
          autofocus
          hide-details
          clearable
        />
      </div>
    </template>

    <template #item.data-table-select="{ internalItem, isSelected, toggleSelect }">
      <v-checkbox-btn
        v-if="internalItem.selectable"
        :model-value="isSelected(internalItem)"
        color="primary"
        @update:model-value="toggleSelect(internalItem)"
      />
    </template>

    <template #item.title="{ item }">
      <v-chip
        v-if="item.type === 'folder'"
        :text="item.title"
        :prepend-icon="mdiFolder"
        label
        @click="navigate(item.id)"
      />
      <div
        v-else
        class="d-flex align-center"
      >
        <v-icon
          :icon="getResourceIcon(item.mimeType)"
          class="mr-2"
        />
        {{ item.title }}
        <v-chip
          v-if="isResourceImported(item.id)"
          class="ml-2"
          color="grey"
          size="x-small"
          variant="outlined"
        >
          {{ t('alreadyImported') }}
        </v-chip>
      </div>
    </template>

    <template #item.size="{ item }">
      {{ item.type === 'resource' && item.size ? formatBytes(item.size) : '-' }}
    </template>

    <template #item.format="{ item }">
      {{ item.type === 'resource' ? item.format : '-' }}
    </template>
  </tableComponent>
</template>

<script setup lang="ts">
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'
import type { Catalog, Plugin, Import } from '#api/types'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import { VDataTable, VDataTableServer } from 'vuetify/components'
import formatBytes from '@data-fair/lib-vue/format/bytes.js'

const { t } = useI18n()
const session = useSessionAuthenticated()
const { catalog, plugin } = defineProps<{
  catalog: Catalog
  plugin: Plugin
}>()

// Navigation state
const currentFolderId = ref<string | null>(null)
const selected = ref<string[]>([])
const resourceSelected = defineModel<{ id: string, title: string } | null>()

// Pagination state
const currentPage = ref<number>(1)
const itemsPerPage = ref<number>(10)

const search = ref<string>('')
const additionalFilters = ref<Record<string, any>>({})
const supportsSearch = computed(() => catalog.capabilities.includes('search'))
const supportsPagination = computed(() => catalog.capabilities.includes('pagination'))
const tableComponent = computed(() => supportsPagination.value ? VDataTableServer : VDataTable)

// Fetch folder data based on current folder ID
const fetchFolders = useFetch<Awaited<ReturnType<CatalogPlugin['list']>>>(
  `${$apiPath}/catalogs/${catalog._id}/resources`, {
    query: computed(() => ({
      ...(currentFolderId.value && { currentFolderId: currentFolderId.value }),
      ...(supportsSearch.value && { q: search.value }),
      ...(supportsPagination.value && {
        page: currentPage.value,
        size: itemsPerPage.value
      }),
      ...additionalFilters.value
    }))
  })

// Check if the selected resource changes
watch(selected, (newSelected) => {
  // Find the selected resource
  if (newSelected.length > 0) {
    const selectedId = newSelected[0]
    const results = fetchFolders.data.value?.results
    if (!results) {
      resourceSelected.value = null
      return
    }

    // Find the resource in the current results
    const selectedResource = results.find((item: any) => item.type === 'resource' && item.id === selectedId)
    if (!selectedResource) return
    resourceSelected.value = selectedResource
  } else {
    resourceSelected.value = null
  }
})

// Check if a resource is already imported
const existingImports = useFetch<{ results: Pick<Import, 'remoteResource'>[] }>(`${$apiPath}/imports`, {
  query: {
    catalogId: catalog._id,
    select: 'remoteResource'
  }
})
const isResourceImported = (resourceId: string): boolean => {
  return existingImports.data.value?.results.some(imp => imp.remoteResource.id === resourceId)!!
}

/** Function to handle row click for resource selection */
const handleRowClick = (item: any) => {
  if (item.type !== 'resource') return
  // if (isResourceImported(item.id)) return // Don't allow selection of already imported resources
  if (selected.value.includes(item.id)) selected.value = []
  else selected.value = [item.id]
}

/** Function to get the appropriate icon for a resource based on its mimeType */
const getResourceIcon = (mimeType?: string | null): string => {
  const iconMap: Record<string, string> = {
    'application/json': mdiCodeJson,
    'application/geo+json': mdiCodeJson,
    'application/pdf': mdiFilePdfBox,
    'application/zip': mdiZipBox,
    'text/csv': mdiFileTableOutline,
    'text/plain': mdiFileDocumentOutline,
  }
  return iconMap[mimeType || ''] || mdiFileOutline
}

// Navigation methods
const navigate = (folderId: string | null) => {
  currentFolderId.value = folderId
  currentPage.value = 1
}

/** Computed property to get current level data */
const levelData = computed(() => {
  const results = fetchFolders.data.value?.results
  if (!results) return []

  return results
})

// Computed property for breadcrumb items
const breadcrumbItems = computed(() => {
  if (!fetchFolders.data.value?.path) return []
  return fetchFolders.data.value?.path.map((item, index) => ({
    title: item.title,
    path: item.id,
    disabled: index === fetchFolders.data.value!.path.length - 1
  }))
})

const headers = computed(() => [
  { title: t('name'), key: 'title', align: 'start' as const },
  { title: t('size'), key: 'size' },
  { title: t('format'), key: 'format' }
])

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    catalogConfig: catalog.config || {}, // Provide catalog configuration to Vjsf
  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  titleDepth: 3,
  updateOn: 'blur',
  validateOn: 'blur',
  xI18n: true
}))
</script>

<i18n lang="yaml">
en:
  import: Import
  noItemsFound: No items found at this level
  name: Name
  search: Search...
  size: Size
  format: Format
  loading: Loading resources...
  alreadyImported: Already imported

fr:
  import: Importer
  noItemsFound: Aucun élément trouvé à ce niveau
  name: Nom
  search: Rechercher...
  size: Taille
  format: Format
  loading: Chargement des ressources...
  alreadyImported: Déjà importé
</i18n>

<style scoped>
</style>
