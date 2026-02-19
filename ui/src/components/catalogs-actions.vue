<template>
  <!-- Create new Catalog -->
  <v-list-item to="/catalogs/new">
    <template #prepend>
      <v-icon
        color="primary"
        :icon="mdiPlusCircle"
      />
    </template>
    {{ t('createNewCatalog') }}
  </v-list-item>

  <!-- Notifications menu -->
  <v-menu
    v-if="eventsSubscribeUrl"
    v-model="showNotifMenu"
    :close-on-content-click="false"
    max-width="500"
  >
    <template #activator="{ props }">
      <v-list-item v-bind="props">
        <template #prepend>
          <v-icon
            color="primary"
            :icon="mdiBell"
          />
        </template>
        {{ t('notifications') }}
      </v-list-item>
    </template>
    <v-card
      :title="t('notifications')"
    >
      <v-card-text class="pa-0">
        <d-frame :src="eventsSubscribeUrl" />
      </v-card-text>
    </v-card>
  </v-menu>

  <!-- Search field -->
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

  <!-- Plugin filters -->
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

  <!-- Show all switch (admin only) -->
  <v-switch
    v-if="adminMode"
    v-model="showAll"
    color="admin"
    :label="t('showAllCatalogs')"
    hide-details
    class="mt-2 mx-4 text-admin"
  />

  <!-- Owner filters (only if showAll and admin) -->
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
</template>

<script setup lang="ts">
import type { Plugin } from '#api/types'
import type { CatalogsFacets } from '#api/doc'
import '@data-fair/frame/lib/d-frame.js'

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
const showNotifMenu = ref(false)

const eventsSubscribeUrl = computed(() => {
  const topics = [
    { key: 'catalogs:import-error', title: t('importError') },
    { key: 'catalogs:publication-error', title: t('publicationError') },
  ]

  // catalogId => the id of the catalog
  // type => "import" or "publication"
  // itemId => the id of the import or publication
  const urlTemplate = window.parent.location.origin + '/data-fair/catalogs/{catalogId}/{type}/{itemId}'
  return `/events/embed/subscribe?key=${encodeURIComponent(topics.map(t => t.key).join(','))}&title=${encodeURIComponent(topics.map(t => t.title).join(','))}&url-template=${encodeURIComponent(urlTemplate)}&register=false`
})

const pluginsItems = computed(() => {
  if (!plugins || !facets.plugins) return []

  return Object.entries(facets.plugins)
    .map(
      ([pluginKey, count]) => {
        // Remove 'Catalog ' from the title for retrocompatibility
        const title = plugins.find((plugin) => plugin.id === pluginKey)?.metadata.title.replace('Catalog ', '')
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
    importError: An import failed.
    notifications: Notifications
    owner: Owner
    plugin: Plugin
    publicationError: A publication failed.
    search: Search...
    showAllCatalogs: Show all catalogs

  fr:
    createNewCatalog: Créer un nouveau catalogue
    deletedPlugin: "Supprimé - {key}"
    importError: Un import a échoué.
    notifications: Notifications
    owner: Propriétaire
    plugin: Plugin
    publicationError: Une publication a échoué.
    search: Rechercher...
    showAllCatalogs: Voir tous les catalogues

</i18n>

<style scoped>
</style>
