<template>
  <layout-error
    v-if="catalogFetch.error.value"
    :title="t('errorFetchingCatalogTitle')"
    :text="t('errorFetchingCatalogText')"
  />
  <layout-error
    v-else-if="pluginFetch.error.value"
    :text="t('errorFetchingPlugin')"
  />
  <v-container
    v-else-if="catalogFetch.data.value"
    data-iframe-height
  >
    <layout-section-tabs
      :title="t('metadata')"
      :src="assetsUrls.checklist"
      :description="t('description')"
    />

    <catalog-config
      v-if="catalogFetch.data.value && pluginFetch.data.value"
      :catalog="catalogFetch.data.value"
      :plugin="pluginFetch.data.value"
      :catalog-id="route.params.id"
      :can-admin="canAdmin"
    />

    <layout-section-tabs
      v-if="tabs.length"
      v-model="activeTab"
      class="mt-4"
      title="Jeux de données"
      :src="assetsUrls.progress"
      :tabs="tabs"
    />

    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="import">
        <import-list
          v-if="pluginFetch.data.value?.metadata.capabilities.includes('import') && pluginFetch.data.value"
          :catalog="{ id: catalogFetch.data.value._id, title: catalogFetch.data.value.title, config: catalogFetch.data.value.config }"
          :plugin="pluginFetch.data.value"
        />
      </v-tabs-window-item>

      <v-tabs-window-item value="publication">
        <publication-list
          v-if="pluginFetch.data.value?.metadata.capabilities.includes('publishDataset')"
          :catalog="{ id: catalogFetch.data.value._id, title: catalogFetch.data.value.title }"
        />
      </v-tabs-window-item>
    </v-tabs-window>

    <layout-actions v-if="canAdmin">
      <catalog-actions
        :catalog="catalogFetch.data.value"
        :can-admin="canAdmin"
        :is-small="true"
      />
    </layout-actions>
  </v-container>
</template>

<script setup lang="ts">
import type { Catalog, Plugin } from '#api/types'

import { getAccountRole } from '@data-fair/lib-vue/session'

const route = useRoute<'/catalogs/[id]'>()
const session = useSessionAuthenticated()
const { t } = useI18n()

const activeTab = ref('import')

const catalogFetch = useFetch<Catalog>(`${$apiPath}/catalogs/${route.params.id}`, { notifError: false })
const pluginFetch = useFetch<Plugin>(() => `${$apiPath}/plugins/${catalogFetch.data.value?.plugin}`, {
  immediate: false,
  watch: false
})

// Useless for now, they are only admins that can see and edit catalogs
const canAdmin = computed(() => {
  if (!catalogFetch.data.value) return false
  return getAccountRole(session.state, catalogFetch.data.value.owner) === 'admin'
})

const tabs = computed(() => {
  const capabilities = pluginFetch.data.value?.metadata.capabilities ?? []
  const tabs = []
  if (capabilities.includes('import')) {
    tabs.push({ id: 'import', title: t('import'), icon: mdiDownload })
  }
  if (capabilities.includes('publishDataset')) {
    tabs.push({ id: 'publication', title: t('publication'), icon: mdiUpload })
  }
  return tabs
})

// Wait for catalogFetch to be initialized before fetching the plugin
watch(() => catalogFetch.data.value?.plugin, (plugin) => {
  if (plugin) pluginFetch.refresh()
})

watch(
  () => catalogFetch.data.value?.title,
  (title) => {
    setBreadcrumbs([
      { text: t('catalogs'), to: '/catalogs' },
      { text: title ?? '' }
    ])
  }
)

/** Urls of assets */
const assetsUrls = {
  checklist: new URL('~/assets/checklist.svg', import.meta.url).href,
  progress: new URL('~/assets/progress.svg', import.meta.url).href,
}
</script>

<i18n lang="yaml">
  en:
    catalogs: Catalogs
    description: Check the general information of the catalog or modify its configuration.
    errorFetchingCatalogText: The catalog may not exist or you may not have access rights to it (Did you select the wrong active account?).
    errorFetchingCatalogTitle: Error fetching the catalog.
    errorFetchingPlugin: Error fetching the plugin. Please contact us if the problem persists.
    import: Import
    metadata: Metadata
    publication: Publications
  fr:
    catalogs: Catalogues
    description: Consulter les informations générales du catalogue ou modifier sa configuration.
    errorFetchingCatalogText: Il est possible que le catalogue n'existe pas ou que vous n'ayez pas les droits d'accès sur ce dernier (Vous avez peut-être sélectionné le mauvais compte actif ?).
    errorFetchingCatalogTitle: Erreur lors du chargement du catalogue.
    errorFetchingPlugin: Erreur lors du chargement du plugin. Merci de nous contacter si le problème persiste.
    import: Import
    metadata: Métadonnées
    publication: Publications

</i18n>

<style scoped>
</style>
