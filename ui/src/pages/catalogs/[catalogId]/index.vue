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
    style="min-height:500px"
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
      <v-tabs-window-item value="imports">
        <import-list
          v-if="catalog.capabilities.includes('import') && plugin"
          :catalog-id="catalog._id"
        />
      </v-tabs-window-item>

      <v-tabs-window-item value="publications">
        <publication-list
          v-if="catalog.capabilities.includes('publication')"
          :catalog-id="catalog._id"
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
const activeTab = useStringSearchParam('tab', { default: 'imports' })

const tabs = computed(() => {
  const capabilities = catalog.value?.capabilities ?? []
  const tabs = []
  if (capabilities.includes('import')) {
    tabs.push({ id: 'imports', title: t('tab.imports'), icon: mdiDownload })
  }
  if (capabilities.includes('publication')) {
    tabs.push({ id: 'publications', title: t('tab.publications'), icon: mdiUpload })
  }
  tabs.push({ id: 'configuration', title: t('tab.configuration'), icon: mdiCog })
  return tabs
})

const deleteCatalog = useAsyncAction(
  async () => {
    await $fetch(`/catalogs/${catalog.value?._id}`, { method: 'DELETE' })
    await router.replace('/catalogs')
  },
  {
    success: t('catalogDeleted'),
    error: t('errorDeletingCatalog'),
  }
)

watch(
  [activeTab, () => catalog.value?.title],
  ([tab, title]) => {
    setBreadcrumbs([
      { text: t('catalogs'), to: '/catalogs' },
      { text: title ?? '' },
      { text: t(`tab.${tab}`) },
    ])
  }
)

const assetsUrl = computed(() => {
  if (catalog.value?.capabilities.includes('thumbnailUrl') && catalog.value?.thumbnailUrl) return catalog.value.thumbnailUrl
  if (catalog.value?.capabilities.includes('thumbnail')) return `${$apiPath}/plugins/${catalog.value.plugin}/thumbnail`
  return new URL('~/assets/www.svg', import.meta.url).href
})
</script>

<i18n lang="yaml">
  en:
    catalogDeleted: Catalog deleted!
    catalogs: Catalogs
    delete: Delete Catalog
    errorDeletingCatalog: Error deleting the catalog.
    errorFetchingCatalogText: The catalog may not exist or you may not have access rights to it (Did you select the wrong active account?).
    errorFetchingCatalogTitle: Error fetching the catalog.
    errorFetchingPlugin: Error fetching the plugin. Please contact us if the problem persists.
    tab:
      configuration: Configuration
      imports: Imports
      publications: Publications
  fr:
    catalogDeleted: Catalogue supprimé !
    catalogs: Catalogues
    delete: Supprimer le catalogue
    errorDeletingCatalog: Erreur lors de la suppression du catalogue.
    errorFetchingCatalogText: Il est possible que le catalogue n'existe pas ou que vous n'ayez pas les droits d'accès sur ce dernier (Vous avez peut-être sélectionné le mauvais compte actif ?).
    errorFetchingCatalogTitle: Erreur lors du chargement du catalogue.
    errorFetchingPlugin: Erreur lors du chargement du plugin. Merci de nous contacter si le problème persiste.
    tab:
      configuration: Configuration
      imports: Imports
      publications: Publications
</i18n>

<style scoped>
</style>
