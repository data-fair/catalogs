<template>
  <layout-error
    v-if="catalogFetch.error.value"
    :title="t('errorFetchingCatalogTitle')"
    :text="t('errorFetchingCatalogText')"
  />
  <layout-error
    v-else-if="pluginFetch.error.value"
  >
    {{ t('errorFetchingPlugin') }}
    <v-spacer />
    <v-btn
      v-if="session.state.user.adminMode"
      color="warning"
      class="mt-2"
      density="comfortable"
      :prepend-icon="mdiDelete"
      @click="deleteCatalog.execute()"
    >
      {{ t('delete') }}
    </v-btn>
  </layout-error>
  <v-container
    v-else-if="catalog"
    data-iframe-height
  >
    <layout-section-tabs
      v-if="tabs.length"
      v-model="activeTab"
      class="mt-4"
      :title="catalog.title"
      :src="assetsUrl"
      :tabs="tabs"
    />

    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="import">
        <import-list
          v-if="catalog.capabilities.includes('import') && plugin"
          :catalog-id="catalog._id"
        />
      </v-tabs-window-item>

      <v-tabs-window-item value="publication">
        <publication-list
          v-if="catalog.capabilities.includes('publishDataset')"
          :catalog="{
            id: catalog._id,
            title: catalog.title,
            owner: catalog.owner
          }"
        />
      </v-tabs-window-item>

      <v-tabs-window-item value="configuration">
        <catalog-config />
      </v-tabs-window-item>
    </v-tabs-window>

    <layout-actions>
      <catalog-actions />
    </layout-actions>
  </v-container>
</template>

<script setup lang="ts">

const route = useRoute<'/catalogs/[catalogId]/'>()
const router = useRouter()
const session = useSessionAuthenticated()
const { t } = useI18n()
const { catalog, catalogFetch, plugin, pluginFetch } = provideCatalogStore(route.params.catalogId)
const activeTab = useStringSearchParam('tab', { default: 'import' })

const tabs = computed(() => {
  const capabilities = catalog.value?.capabilities ?? []
  const tabs = []
  if (capabilities.includes('import')) {
    tabs.push({ id: 'import', title: t('import'), icon: mdiDownload })
  }
  if (capabilities.includes('publishDataset')) {
    tabs.push({ id: 'publication', title: t('publication'), icon: mdiUpload })
  }
  tabs.push({ id: 'configuration', title: t('configuration'), icon: mdiCog })
  return tabs
})

const deleteCatalog = useAsyncAction(
  async () => {
    await $fetch(`/catalogs/${catalog.value?._id}?deletePublications=true`, { method: 'DELETE' })
    await router.replace('/catalogs')
  },
  {
    success: t('catalogDeleted'),
    error: t('errorDeletingCatalog'),
  }
)

watch(
  () => catalog.value?.title,
  (title) => {
    setBreadcrumbs([
      { text: t('catalogs'), to: '/catalogs' },
      { text: title ?? '' }
    ])
  }
)

const assetsUrl = new URL('~/assets/www.svg', import.meta.url).href
</script>

<i18n lang="yaml">
  en:
    catalogs: Catalogs
    catalogDeleted: Catalog deleted!
    configuration: Configuration
    delete: Delete Catalog
    errorDeletingCatalog: Error deleting the catalog.
    errorFetchingCatalogText: The catalog may not exist or you may not have access rights to it (Did you select the wrong active account?).
    errorFetchingCatalogTitle: Error fetching the catalog.
    errorFetchingPlugin: Error fetching the plugin. Please contact us if the problem persists.
    import: Import
    publication: Publications
  fr:
    catalogs: Catalogues
    catalogDeleted: Catalogue supprimé !
    configuration: Configuration
    delete: Supprimer le catalogue
    errorDeletingCatalog: Erreur lors de la suppression du catalogue.
    errorFetchingCatalogText: Il est possible que le catalogue n'existe pas ou que vous n'ayez pas les droits d'accès sur ce dernier (Vous avez peut-être sélectionné le mauvais compte actif ?).
    errorFetchingCatalogTitle: Erreur lors du chargement du catalogue.
    errorFetchingPlugin: Erreur lors du chargement du plugin. Merci de nous contacter si le problème persiste.
    import: Import
    publication: Publications

</i18n>

<style scoped>
</style>
