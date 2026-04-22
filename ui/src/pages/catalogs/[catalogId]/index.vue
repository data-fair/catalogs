<template>
  <df-layout-fetch-error
    v-if="catalogFetch.error.value"
    :error="catalogFetch.error.value"
    back-to="/catalogs"
    :back-label="t('backToCatalogs')"
  />

  <df-layout-fetch-error
    v-else-if="pluginFetch.error.value"
    :error="pluginFetch.error.value"
    back-to="/catalogs"
    :back-label="t('backToCatalogs')"
  >
    <template #actions>
      <v-btn
        v-if="session.state.user.adminMode"
        color="warning"
        variant="flat"
        :prepend-icon="mdiDelete"
        @click="deleteCatalog.execute()"
      >
        {{ t('delete') }}
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        to="/catalogs"
        :prepend-icon="mdiChevronLeft"
      >
        {{ t('backToCatalogs') }}
      </v-btn>
    </template>
  </df-layout-fetch-error>

  <v-container
    v-else-if="catalog"
    data-iframe-height
    style="min-height:500px"
  >
    <df-section-tabs
      v-if="tabs.length"
      id="catalog"
      v-model="activeTab"
      class="mt-4"
      :title="catalog.title"
      :src="assetsUrl"
      :tabs="tabs"
    >
      <template #windows>
        <v-tabs-window-item value="imports">
          <import-list
            v-if="catalog.capabilities.includes('import') && plugin"
            :catalog-id="catalog._id"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="publications">
          <publication-list
            v-if="supportPublication"
            :catalog-id="catalog._id"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="configuration">
          <catalog-config />
        </v-tabs-window-item>
      </template>
    </df-section-tabs>

    <navigation-right>
      <catalog-actions />
    </navigation-right>
  </v-container>
</template>

<script setup lang="ts">
import DfLayoutFetchError from '@data-fair/lib-vuetify/layout-fetch-error.vue'
import DfSectionTabs from '@data-fair/lib-vuetify/section-tabs.vue'
import NavigationRight from '@data-fair/lib-vuetify/navigation-right.vue'

const route = useRoute<'/catalogs/[catalogId]/'>()
const router = useRouter()
const session = useSessionAuthenticated()
const { t } = useI18n()
const { catalog, catalogFetch, plugin, pluginFetch, supportPublication } = provideCatalogStore(route.params.catalogId)
const activeTab = useStringSearchParam('tab', { default: 'imports' })

const tabs = computed(() => {
  const capabilities = catalog.value?.capabilities ?? []
  const tabs = []
  if (capabilities.includes('import')) {
    tabs.push({ key: 'imports', title: t('tab.imports'), icon: mdiDownload })
  }
  if (supportPublication.value) {
    tabs.push({ key: 'publications', title: t('tab.publications'), icon: mdiUpload })
  }
  tabs.push({ key: 'configuration', title: t('tab.configuration'), icon: mdiCog })
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

watch(() => catalog.value?.title, (title) => {
  setBreadcrumbs([
    { text: t('catalogs'), to: '/catalogs' },
    { text: title ?? '' }
  ])
})

const assetsUrl = computed(() => {
  if (catalog.value?.capabilities.includes('thumbnailUrl') && catalog.value?.thumbnailUrl) return catalog.value.thumbnailUrl
  if (catalog.value?.capabilities.includes('thumbnail')) return `${$apiPath}/plugins/${catalog.value.plugin}/thumbnail`
  return new URL('~/assets/www.svg', import.meta.url).href
})
</script>

<i18n lang="yaml">
  en:
    backToCatalogs: Back to catalogs
    catalogDeleted: Catalog deleted!
    catalogs: Catalogs
    delete: Delete Catalog
    errorDeletingCatalog: Error deleting the catalog.
    tab:
      configuration: Configuration
      imports: Imports
      publications: Publications
  fr:
    backToCatalogs: Retour aux catalogues
    catalogDeleted: Catalogue supprimé !
    catalogs: Catalogues
    delete: Supprimer le catalogue
    errorDeletingCatalog: Erreur lors de la suppression du catalogue.
    tab:
      configuration: Configuration
      imports: Imports
      publications: Publications
</i18n>

<style scoped>
</style>
