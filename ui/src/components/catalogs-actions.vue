<template>
  <v-list
    data-iframe-height
    density="compact"
    style="background-color: transparent;"
  >
    <v-list-item
      to="/catalogs/new"
      rounded
    >
      <template #prepend>
        <v-icon
          color="primary"
          :icon="mdiPlusCircle"
        />
      </template>
      {{ t('createNewCatalog') }}
    </v-list-item>
    <v-text-field
      v-model="search"
      :append-inner-icon="mdiMagnify"
      class="mt-4 mx-4"
      color="primary"
      density="compact"
      :placeholder="t('search')"
      variant="outlined"
      autofocus
      hide-details
      clearable
    />
    <v-autocomplete
      v-model="pluginsSelected"
      :items="pluginsItems"
      item-title="display"
      item-value="pluginKey"
      class="mt-4 mx-4"
      density="compact"
      :label="t('plugin')"
      rounded="xl"
      variant="outlined"
      hide-details
      chips
      clearable
      closable-chips
      multiple
    />
    <v-switch
      v-if="adminMode"
      v-model="showAll"
      color="admin"
      :label="t('showAllCatalogs')"
      hide-details
      class="mt-2 mx-4 text-admin"
    />
    <v-autocomplete
      v-if="showAll"
      v-model="ownersSelected"
      :items="ownersItems"
      item-title="display"
      item-value="ownerKey"
      :label="t('owner')"
      chips
      class="mt-2 mx-4 text-admin"
      clearable
      closable-chips
      density="compact"
      hide-details
      multiple
      rounded="xl"
      variant="outlined"
    />
  </v-list>
</template>

<script setup lang="ts">
import type { Plugin, CatalogsFacets } from '#api/types'

const { adminMode, plugins, facets } = defineProps<{
  adminMode: boolean
  plugins: Plugin[]
  facets: CatalogsFacets
}>()

const { t } = useI18n()
const search = defineModel('search', { type: String, default: '' })
const showAll = defineModel('showAll', { type: Boolean, default: false })
const pluginsSelected = defineModel('pluginsSelected', { type: Array, required: true })
const ownersSelected = defineModel('ownersSelected', { type: Array, required: true })

const pluginsItems = computed(() => {
  if (!plugins || !facets.plugins) return []

  return Object.entries(facets.plugins)
    .map(
      ([pluginKey, count]) => {
        const title = plugins.find((plugin) => plugin.id === pluginKey)?.metadata.title
        return {
          display: `${title || t('deletedPlugin', { key: pluginKey })} (${count})`,
          pluginKey
        }
      }
    )
    .sort((a, b) => a.display.localeCompare(b.display))
})

const ownersItems = computed(() => {
  if (!facets.owners) return []

  return Object.entries(facets.owners)
    .flatMap(([, owner]) => {
      const items = []
      owner.departments?.forEach(department => {
        items.push({
          display: `${owner.name} - ${department.departmentName || department.department} (${department.count})`,
          ownerKey: `organization:${owner.id}:${department.department}`
        })
      })
      items.push({
        display: `${owner.name} (${owner.count})`,
        ownerKey: `${owner.type}:${owner.id}`
      })
      return items
    })
    .sort((a, b) => a.display.localeCompare(b.display))
})
</script>

<i18n lang="yaml">
  en:
    createNewCatalog: Create a new catalog
    deletedPlugin: "Deleted - {key}"
    owner: Owner
    plugin: Plugin
    search: Search...
    showAllCatalogs: Show all catalogs

  fr:
    createNewCatalog: Créer un nouveau catalogue
    deletedPlugin: "Supprimé - {key}"
    owner: Propriétaire
    plugin: Plugin
    search: Rechercher...
    showAllCatalogs: Voir tous les catalogues
</i18n>

<style scoped>
</style>
