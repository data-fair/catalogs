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
import formatBytes from '@data-fair/lib-vue/format/bytes.js'

// Type definitions for the new tree structure
interface Resource {
  id: string
  title: string
  description?: string
  keywords?: string[]
  image?: string
  license?: string
  frequency?: string
  private?: boolean
  format: string
  url: string
  fileName?: string
  mimeType?: string
  size?: number
  fullPath: string
}

interface Folder {
  id: string
  title: string
  folders: Record<string, Folder>
  resources: Record<string, Resource>
}

// Enhanced mock data with new structure
const treeData = ref<Folder>({
  id: 'root',
  title: 'Jeux de données',
  folders: {
    'category-geospatial': {
      id: 'category-geospatial',
      title: 'Données Géospatiales',
      folders: {
        'subcategory-transport': {
          id: 'subcategory-transport',
          title: 'Transport',
          folders: {},
          resources: {
            'resource-metro-stations': {
              id: 'resource-metro-stations',
              title: 'Stations de métro Paris',
              description: 'Liste complète des stations de métro parisien avec coordonnées',
              format: 'geojson',
              url: 'https://example.com/metro-stations.geojson',
              mimeType: 'application/geo+json',
              size: 2048000,
              fullPath: 'Données Géospatiales / Transport / Stations de métro Paris'
            },
            'resource-bus-lines': {
              id: 'resource-bus-lines',
              title: 'Lignes de bus Paris',
              description: 'Tracés des lignes de bus avec horaires',
              format: 'csv',
              url: 'https://example.com/bus-lines.csv',
              mimeType: 'text/csv',
              size: 1024000,
              fullPath: 'Données Géospatiales / Transport / Lignes de bus Paris'
            },
            'resource-tram-lines': {
              id: 'resource-tram-lines',
              title: 'Lignes de tramway Paris',
              description: 'Tracés des lignes de tramway avec arrêts',
              format: 'geojson',
              url: 'https://example.com/tram-lines.geojson',
              mimeType: 'application/geo+json',
              size: 1536000,
              fullPath: 'Données Géospatiales / Transport / Lignes de tramway Paris'
            },
            'resource-bike-stations': {
              id: 'resource-bike-stations',
              title: 'Stations Vélib Paris',
              description: 'Emplacements et disponibilités des stations Vélib',
              format: 'json',
              url: 'https://example.com/velib-stations.json',
              mimeType: 'application/json',
              size: 512000,
              fullPath: 'Données Géospatiales / Transport / Stations Vélib Paris'
            },
            'resource-parking-lots': {
              id: 'resource-parking-lots',
              title: 'Parkings publics Paris',
              description: 'Localisation et capacité des parkings publics',
              format: 'csv',
              url: 'https://example.com/parking-lots.csv',
              mimeType: 'text/csv',
              size: 768000,
              fullPath: 'Données Géospatiales / Transport / Parkings publics Paris'
            },
            'resource-taxi-stations': {
              id: 'resource-taxi-stations',
              title: 'Stations de taxi Paris',
              description: 'Emplacements des stations de taxi officielles',
              format: 'geojson',
              url: 'https://example.com/taxi-stations.geojson',
              mimeType: 'application/geo+json',
              size: 256000,
              fullPath: 'Données Géospatiales / Transport / Stations de taxi Paris'
            },
            'resource-traffic-data': {
              id: 'resource-traffic-data',
              title: 'Données de trafic temps réel',
              description: 'Informations de trafic en temps réel sur les axes principaux',
              format: 'json',
              url: 'https://example.com/traffic-data.json',
              mimeType: 'application/json',
              size: 2048000,
              fullPath: 'Données Géospatiales / Transport / Données de trafic temps réel'
            },
            'resource-road-works': {
              id: 'resource-road-works',
              title: 'Travaux de voirie Paris',
              description: 'Informations sur les travaux en cours et à venir',
              format: 'csv',
              url: 'https://example.com/road-works.csv',
              mimeType: 'text/csv',
              size: 384000,
              fullPath: 'Données Géospatiales / Transport / Travaux de voirie Paris'
            },
            'resource-speed-limits': {
              id: 'resource-speed-limits',
              title: 'Limitations de vitesse',
              description: 'Cartographie des limitations de vitesse par rue',
              format: 'shapefile',
              url: 'https://example.com/speed-limits.zip',
              mimeType: 'application/zip',
              size: 3072000,
              fullPath: 'Données Géospatiales / Transport / Limitations de vitesse'
            },
            'resource-pedestrian-zones': {
              id: 'resource-pedestrian-zones',
              title: 'Zones piétonnes Paris',
              description: 'Délimitation des zones réservées aux piétons',
              format: 'geojson',
              url: 'https://example.com/pedestrian-zones.geojson',
              mimeType: 'application/geo+json',
              size: 1024000,
              fullPath: 'Données Géospatiales / Transport / Zones piétonnes Paris'
            },
            'resource-cycle-lanes': {
              id: 'resource-cycle-lanes',
              title: 'Pistes cyclables Paris',
              description: 'Réseau des pistes cyclables et voies vertes',
              format: 'geojson',
              url: 'https://example.com/cycle-lanes.geojson',
              mimeType: 'application/geo+json',
              size: 1792000,
              fullPath: 'Données Géospatiales / Transport / Pistes cyclables Paris'
            },
            'resource-public-transport-schedules': {
              id: 'resource-public-transport-schedules',
              title: 'Horaires transports publics',
              description: 'Horaires théoriques des lignes de transport public',
              format: 'gtfs',
              url: 'https://example.com/schedules.zip',
              mimeType: 'application/zip',
              size: 25600000,
              fullPath: 'Données Géospatiales / Transport / Horaires transports publics'
            }
          }
        },
        'subcategory-boundaries': {
          id: 'subcategory-boundaries',
          title: 'Délimitations administratives',
          folders: {},
          resources: {
            'resource-communes': {
              id: 'resource-communes',
              title: 'Limites communales',
              description: 'Délimitations des communes françaises',
              format: 'shapefile',
              url: 'https://example.com/communes.zip',
              mimeType: 'application/zip',
              size: 15360000,
              fullPath: 'Données Géospatiales / Délimitations administratives / Limites communales'
            }
          }
        }
      },
      resources: {}
    },
    'category-demographic': {
      id: 'category-demographic',
      title: 'Données Démographiques',
      folders: {
        'subcategory-population': {
          id: 'subcategory-population',
          title: 'Population',
          folders: {},
          resources: {
            'resource-population-2023': {
              id: 'resource-population-2023',
              title: 'Population par commune 2023',
              description: 'Données démographiques détaillées par commune',
              format: 'xlsx',
              url: 'https://example.com/population-2023.xlsx',
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              size: 5120000,
              fullPath: 'Données Démographiques / Population / Population par commune 2023'
            }
          }
        }
      },
      resources: {}
    },
    'category-economic': {
      id: 'category-economic',
      title: 'Données Économiques',
      folders: {},
      resources: {
        'resource-gdp-data': {
          id: 'resource-gdp-data',
          title: 'PIB par région',
          description: 'Produit intérieur brut par région française',
          format: 'json',
          url: 'https://example.com/gdp-data.json',
          mimeType: 'application/json',
          size: 512000,
          fullPath: 'Données Économiques / PIB par région'
        }
      }
    }
  },
  resources: {}
})

// Navigation state
const currentPath = ref<string[]>([])
const selected = ref<string[]>([])
const resourceSelected = defineModel<Resource | null>()

// Surveiller les changements de sélection
watch(selected, (newSelected) => {
  if (newSelected.length > 0) {
    // Trouver la ressource sélectionnée
    const selectedId = newSelected[0]
    let currentFolder = treeData.value

    // Naviguer vers le dossier actuel
    for (const pathSegment of currentPath.value) {
      if (currentFolder.folders && currentFolder.folders[pathSegment]) {
        currentFolder = currentFolder.folders[pathSegment]
      }
    }

    // Trouver la ressource dans les ressources du dossier actuel
    if (currentFolder.resources && currentFolder.resources[selectedId]) {
      resourceSelected.value = currentFolder.resources[selectedId]
    }
  } else {
    resourceSelected.value = null
  }
})

// Function to get the appropriate icon for a resource based on its mimeType
const getResourceIcon = (mimeType?: string | null): string => {
  const iconMap: Record<string, string> = {
    'application/json': mdiCodeJson,
    'application/geo+json': mdiCodeJson,
    'application/pdf': mdiFilePdfBox,
    'application/zip': mdiZipBox,
    'text/csv': mdiFileTableOutline,
    'text/plain': mdiFileDocumentOutline,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': mdiFileTableOutline
  }
  return iconMap[mimeType || ''] || mdiFileOutline
}

// Computed property to get current level data
const data = computed(() => {
  let currentLevel = treeData.value

  // Navigate to current path
  for (const pathSegment of currentPath.value) {
    if (currentLevel.folders && currentLevel.folders[pathSegment]) {
      currentLevel = currentLevel.folders[pathSegment]
    } else {
      return []
    }
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
  const items: Array<{ title: string; path: string[]; disabled: boolean }> = [
    {
      title: treeData.value.title,
      path: [],
      disabled: currentPath.value.length === 0
    }
  ]

  let path: string[] = []
  for (let i = 0; i < currentPath.value.length; i++) {
    path = [...path, currentPath.value[i]]
    let folder = treeData.value

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

const headers = [
  { title: 'Nom', key: 'title', align: 'start' as const },
  { title: 'Taille', key: 'size' },
  { title: 'Format', key: 'format' }
]
</script>

<i18n lang="yaml">
en:
  import: Import
  noItemsFound: No items found at this level

fr:
  import: Importer
  noItemsFound: Aucun élément trouvé à ce niveau
</i18n>

<style scoped>
</style>
