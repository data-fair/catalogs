<template>
  <tableComponent
    v-model="selected"
    v-model:items-per-page="itemsPerPage"
    v-model:page="currentPage"
    :headers="headers"
    :hide-default-footer="(fetchFolders.data.value?.count || 0) <= 5"
    :items="levelData"
    :items-length="fetchFolders.data.value?.count || 0"
    :items-per-page-options="[5, 10, 20]"
    :item-selectable="(item: any) => item.type === 'resource' && !isResourceImported(item.id)"
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
      <v-breadcrumbs
        :items="breadcrumbItems"
        class="pa-0"
        divider="/"
      >
        <template #prepend>
          <v-icon
            :icon="mdiHome"
            class="mb-1 mr-2"
            @click="navigate(null)"
          />
        </template>
        <template #item="{ item, index }">
          <v-breadcrumbs-item
            :title="item.title"
            :color="item.disabled ? 'primary' : undefined"
            @click="navigate(breadcrumbItems[index].path)"
          />
        </template>
      </v-breadcrumbs>
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
        :class="{ 'text-disabled': isResourceImported(item.id) }"
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
import type { Folder, Resource } from '@data-fair/lib-common-types/catalog/index.js'
import type { Import, Plugin } from '#api/types'
import { VDataTable, VDataTableServer } from 'vuetify/components'
import formatBytes from '@data-fair/lib-vue/format/bytes.js'

const { t } = useI18n()
const { catalogId, existingImports, plugin } = defineProps<{
  catalogId: string,
  existingImports?: Import[],
  plugin: Plugin
}>()

// Navigation state
const currentFolderId = ref<string | null>(null)
const selected = ref<string[]>([])
const resourceSelected = defineModel<{ id: string, title: string } | null>()

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Check if plugin supports pagination
const supportsPagination = computed(() => plugin.metadata.capabilities.includes('pagination'))

// Fetch folder data based on current folder ID
const fetchFolders = useFetch<{
  count: number
  results: (Folder | Resource)[]
  path: Folder[]
}>(
  `${$apiPath}/catalogs/${catalogId}/resources`, {
      query: computed(() => ({
        ...(currentFolderId.value && { currentFolderId: currentFolderId.value }),
        ...(supportsPagination.value && {
          page: currentPage.value,
          size: itemsPerPage.value
        })
      }))
    })

// Function to check if a resource is already imported
const isResourceImported = (resourceId: string): boolean => {
  if (!existingImports) return false
  return existingImports.some(imp => imp.remoteResource.id === resourceId)
}

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
    if (selectedResource) {
      resourceSelected.value = selectedResource as Resource
    }
  } else {
    resourceSelected.value = null
  }
})

/** Function to handle row click for resource selection */
const handleRowClick = (item: any) => {
  if (item.type !== 'resource') return
  if (isResourceImported(item.id)) return // Don't allow selection of already imported resources
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

const tableComponent = computed(() => supportsPagination.value ? VDataTableServer : VDataTable)

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
</script>

<i18n lang="yaml">
en:
  import: Import
  noItemsFound: No items found at this level
  name: Name
  size: Size
  format: Format
  loading: Loading resources...
  alreadyImported: Already imported

fr:
  import: Importer
  noItemsFound: Aucun élément trouvé à ce niveau
  name: Nom
  size: Taille
  format: Format
  loading: Chargement des ressources...
  alreadyImported: Déjà importé
</i18n>

<style scoped>
</style>
