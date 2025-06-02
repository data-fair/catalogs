<template>
  <v-data-table
    v-model="selected"
    :headers="headers"
    :hide-default-footer="data.length < 11"
    :items="data"
    :items-per-page-options="[5, 10, 20]"
    :item-value="(item) => item.type === 'resource' ? item.id : null"
    :show-select="data.some(item => item.type === 'resource')"
    :item-selectable="(item) => item.type === 'resource'"
    :row-props="(data) => ({
      onClick: () => handleRowClick(data.item),
      style: data.item.type === 'resource' ? 'cursor: pointer' : 'cursor: default'
    })"
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
            @click="navigateToPath([])"
          />
        </template>
        <template #item="{ item, index }">
          <v-breadcrumbs-item
            :title="item.title"
            :color="item.disabled ? 'primary' : undefined"
            @click="navigateToPath(breadcrumbItems[index].path)"
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
        @click="navigateToFolder(item.id)"
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
      </div>
    </template>

    <template #item.size="{ item }">
      {{ item.type === 'resource' && item.size ? formatBytes(item.size) : '-' }}
    </template>

    <template #item.format="{ item }">
      {{ item.type === 'resource' ? item.format : '-' }}
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import type { Folder, Resource } from '@data-fair/lib-common-types/catalog/index.js'
import formatBytes from '@data-fair/lib-vue/format/bytes.js'

const { t } = useI18n()
const { catalogId } = defineProps<{ catalogId: string }>()

const fetchFolders = useFetch<{ rootFolder: Folder }>(`${$apiPath}/catalogs/${catalogId}/resources`, {
  immediate: true,
  notifError: false
})

// Navigation state
const currentPath = ref<string[]>([])
const selected = ref<string[]>([])
const resourceSelected = defineModel<Resource | null>()

// Check if the selected resource changes
watch(selected, (newSelected) => {
  // Find the selected resource
  if (newSelected.length > 0) {
    const selectedId = newSelected[0]
    let currentFolder = fetchFolders.data.value?.rootFolder
    if (!currentFolder) {
      resourceSelected.value = null
      return
    }

    // Navigate through the current path to find the folder
    for (const pathSegment of currentPath.value) {
      if (currentFolder.folders && currentFolder.folders[pathSegment]) {
        currentFolder = currentFolder.folders[pathSegment]
      }
    }

    // Find the resource in the current folder
    if (currentFolder.resources && currentFolder.resources[selectedId]) {
      resourceSelected.value = currentFolder.resources[selectedId]
    }
  } else {
    resourceSelected.value = null
  }
})

/** Function to handle row click for resource selection */
const handleRowClick = (item: any) => {
  if (item.type !== 'resource') return
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

/** Computed property to get current level data */
const data = computed(() => {
  let currentLevel = fetchFolders.data.value?.rootFolder
  if (!currentLevel) return []

  // Navigate to current path
  for (const pathSegment of currentPath.value) {
    if (currentLevel.folders && currentLevel.folders[pathSegment]) {
      currentLevel = currentLevel.folders[pathSegment]
    } else return [] // If path segment not found, return empty array
  }

  const result = []

  // Add folders first
  if (currentLevel.folders) {
    for (const [key, folder] of Object.entries(currentLevel.folders)) {
      result.push({
        id: key,
        title: folder.title,
        type: 'folder'
      })
    }
  }

  // Add resources from current folder
  if (currentLevel.resources) {
    for (const [key, resource] of Object.entries(currentLevel.resources)) {
      result.push({
        id: key,
        title: resource.title,
        type: 'resource',
        size: resource.size,
        format: resource.format,
        mimeType: resource.mimeType
      })
    }
  }

  return result
})

// Computed property for breadcrumb items
const breadcrumbItems = computed(() => {
  if (!fetchFolders.data.value) return []
  const items: Array<{ title: string; path: string[]; disabled: boolean }> = [
    {
      title: fetchFolders.data.value?.rootFolder.title,
      path: [],
      disabled: currentPath.value.length === 0
    }
  ]

  let path: string[] = []
  for (let i = 0; i < currentPath.value.length; i++) {
    path = [...path, currentPath.value[i]]
    let folder = fetchFolders.data.value?.rootFolder

    // Navigate to the folder at this path
    for (const segment of path) {
      if (folder.folders && folder.folders[segment]) {
        folder = folder.folders[segment]
      }
    }

    items.push({
      title: folder.title,
      path: [...path],
      disabled: i === currentPath.value.length - 1
    })
  }

  return items
})

// Navigation methods
const navigateToFolder = (folderId: string) => {
  currentPath.value.push(folderId)
}

// New navigation method for breadcrumb clicks
const navigateToPath = (path: string[]) => {
  currentPath.value = [...path]
}

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

fr:
  import: Importer
  noItemsFound: Aucun élément trouvé à ce niveau
  name: Nom
  size: Taille
  format: Format
</i18n>

<style scoped>
</style>
