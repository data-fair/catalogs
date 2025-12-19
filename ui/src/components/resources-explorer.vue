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
    :item-selectable="!shouldSelectFolder ? (item: any) => item.type === 'resource' : () => false"
    :loading="fetchFolders.loading.value ? 'primary' : false"
    :loading-text="t('loading')"
    :row-props="(data: any) => ({
      onClick: () => handleRowClick(data.item),
      style: !shouldSelectFolder && data.item.type === 'resource' ? 'cursor: pointer' : 'cursor: default'
    })"
    :show-select="!shouldSelectFolder && levelData.some((item: any) => item.type === 'resource')"
    item-value="id"
    select-strategy="single"
  >
    <template #top>
      <v-form v-if="additionalFiltersSchema">
        <vjsf
          v-model="additionalFilters"
          :schema="additionalFiltersSchema"
          :options="vjsfOptions"
          class="ma-2"
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
          v-if="mode === 'import' && isResourceImported(item.id)"
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

    <template #item.updatedAt="{ item }">
      {{ item.updatedAt ? dayjs(item.updatedAt).format('lll') : '-' }}
    </template>
  </tableComponent>
</template>

<script setup lang="ts">
import type CatalogPlugin from '@data-fair/types-catalogs'
import type { Catalog, Plugin, Import, Publication } from '#api/types'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import { VDataTable, VDataTableServer } from 'vuetify/components'
import formatBytes from '@data-fair/lib-vue/format/bytes.js'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()
const session = useSessionAuthenticated()
const { catalog, plugin, mode } = defineProps<{
  catalog: Catalog
  plugin: Plugin
  mode: 'import' | Publication['action']
}>()

// Navigation state
const currentFolderId = ref<string | null>(null)
const selected = ref<string[]>([])
const resourceSelected = defineModel<{ id: string, title: string, type: 'resource' | 'folder' } | null>()

// Determine selection mode based on mode
const shouldSelectFolder = computed(() => {
  return mode !== 'import' && mode !== 'replaceResource'
})

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
      ...(mode !== 'import' && { action: mode }),
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

// Watch for folder navigation in folder selection mode
watch([currentFolderId, () => fetchFolders.data.value], ([currentFolder, data]) => {
  if (shouldSelectFolder.value && currentFolder && data?.path && data.path.length > 0) {
    // When navigating to a folder in folder selection mode,
    // consider the current folder as selected
    const currentFolderFromPath = data.path[data.path.length - 1]
    resourceSelected.value = {
      id: currentFolderFromPath.id,
      title: currentFolderFromPath.title,
      type: 'folder'
    }
  } else if (shouldSelectFolder.value && !currentFolder) {
    // If we're in folder selection mode and at root, select null (root folder could be considered as selected)
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
  if (shouldSelectFolder.value || item.type !== 'resource') return
  // if (isResourceImported(item.id)) return // Don't allow selection of already imported resources
  if (selected.value.includes(item.id)) selected.value = []
  else selected.value = [item.id]
}

/** Computed property for the additional filters schema */
const additionalFiltersSchema = computed(() => {
  if (mode === 'import') {
    if (catalog.capabilities.includes('additionalFilters')) return plugin.listFiltersSchema
    if (catalog.capabilities.includes('importFilters')) return plugin.importFiltersSchema
  } else if (catalog.capabilities.includes('publicationFilters')) return plugin.publicationFiltersSchema
  return null
})

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

/** Navigation methods */
const navigate = (folderId: string | null) => {
  currentFolderId.value = folderId
  currentPage.value = 1
  search.value = '' // Clear search when navigating
}

/** Computed property to get current level data */
const levelData = computed(() => {
  const results = fetchFolders.data.value?.results
  if (!results) return []

  return results
})

/** Computed property for breadcrumb items */
const breadcrumbItems = computed(() => {
  if (!fetchFolders.data.value?.path) return []
  return fetchFolders.data.value?.path.map((item, index) => ({
    title: item.title,
    path: item.id,
    disabled: index === fetchFolders.data.value!.path.length - 1
  }))
})

const headers = computed(() => {
  const headers: Record<string, string>[] = [
    { title: t('name'), key: 'title', align: 'start' }
  ]
  if (mode === 'import') {
    headers.push(
      { title: t('size'), key: 'size' },
      { title: t('updatedAt'), key: 'updatedAt' },
      { title: t('format'), key: 'format' }
    )
  }
  return headers
})

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    catalogConfig: catalog.config, // Provide catalog configuration to Vjsf
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
  alreadyImported: Already imported
  format: Format
  import: Import
  loading: Loading resources...
  name: Name
  noItemsFound: No items found at this level
  search: Search...
  size: Size
  updatedAt: Updated At

fr:
  alreadyImported: Déjà importé
  format: Format
  import: Importer
  loading: Chargement des ressources...
  name: Nom
  noItemsFound: Aucun élément trouvé à ce niveau
  search: Rechercher...
  size: Taille
  updatedAt: Mis à jour le
</i18n>

<style scoped>
</style>
