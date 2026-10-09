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
      <template
        v-if="hasDiff"
        #actions
      >
        <v-btn
          color="warning"
          variant="tonal"
          :disabled="save.loading.value"
          @click="resetEdit"
        >
          {{ t('cancel') }}
        </v-btn>
        <v-btn
          class="ml-2"
          color="accent"
          variant="flat"
          :disabled="!valid"
          :loading="save.loading.value"
          @click="save.execute()"
        >
          {{ t('save') }}
        </v-btn>
      </template>

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
          <catalog-config
            v-model="editCatalog"
            v-model:valid="valid"
          />
        </v-tabs-window-item>
      </template>
    </df-section-tabs>

    <navigation-right>
      <catalog-actions />
    </navigation-right>
  </v-container>
</template>

<script setup lang="ts">
import type { Catalog } from '#api/types'
import DfLayoutFetchError from '@data-fair/lib-vuetify/layout-fetch-error.vue'
import DfSectionTabs from '@data-fair/lib-vuetify/section-tabs.vue'
import NavigationRight from '@data-fair/lib-vuetify/navigation-right.vue'
import clone from '@data-fair/lib-utils/clone.js'
import equal from 'fast-deep-equal'
import { until } from '@vueuse/core'
import { emitAgentEvent, useAgentTool } from '@data-fair/lib-vue-agents'

const route = useRoute<'/catalogs/[catalogId]/'>()
const router = useRouter()
const session = useSessionAuthenticated()
const { t } = useI18n()
const { catalog, catalogFetch, plugin, pluginFetch, supportPublication } = provideCatalogStore(route.params.catalogId)
const activeTab = useStringSearchParam('tab', { default: 'imports' })

const valid = ref<boolean | null>(false)
const editCatalog: Ref<Partial<Catalog> | null> = ref(null)

const buildEdit = (source: Catalog): Partial<Catalog> => {
  const edit: Partial<Catalog> = {
    title: source.title,
    config: clone(source.config)
  }
  if (source.description) edit.description = source.description
  return edit
}

const resetEdit = () => {
  if (catalog.value) editCatalog.value = buildEdit(catalog.value)
}

watch(catalog, (newCatalog, oldCatalog) => {
  // Initialize editCatalog on first load only; preserve user edits on subsequent
  // catalog refreshes (e.g. websocket updates).
  if (newCatalog && !oldCatalog) resetEdit()
}, { immediate: true })

const hasDiff = computed(() => {
  if (!editCatalog.value || !catalog.value) return false
  return !equal(editCatalog.value, buildEdit(catalog.value))
})

useLeaveGuard(hasDiff, { locale: session.lang })

const save = useAsyncAction(
  async () => {
    if (!editCatalog.value || !valid.value || !catalog.value) return
    const res = await $fetch(`/catalogs/${catalog.value._id}`, {
      method: 'PATCH',
      body: {
        ...editCatalog.value,
        ...(!editCatalog.value.description ? { description: null } : {})
      }
    })

    Object.assign(catalog.value, res)
    resetEdit()
    emitAgentEvent('catalog-saved', { catalog: catalog.value._id })
  },
  {
    success: t('catalogSaved'),
    error: t('errorSavingCatalog')
  }
)

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

useAgentPage({
  key: 'catalog',
  state: () => catalog.value && {
    catalog: {
      id: catalog.value._id,
      title: catalog.value.title,
      type: plugin.value?.metadata?.title ?? catalog.value.plugin,
      capabilities: catalog.value.capabilities
    }
  },
  activeTab,
  tabs,
  saveLabel: () => t('save')
})

useAgentRemoteCatalog(catalog)

useAgentTool({
  name: 'list_catalog_items',
  description: 'List the imports or the publications of this catalog, with their id and status, to open one with open_catalog_item.',
  annotations: { title: t('agentListItems'), readOnlyHint: true },
  inputSchema: {
    type: 'object' as const,
    properties: { kind: { type: 'string' as const, enum: ['import', 'publication'] } },
    required: ['kind'] as const
  },
  execute: async ({ kind }) => {
    const { results } = await $fetch<{ results: any[] }>(`/${kind}s`, { query: { catalogId: route.params.catalogId, size: 100 } })
    if (!results.length) return `This catalog has no ${kind}s.`
    return results.map(item => kind === 'import'
      ? `- ${item.remoteResource.title ?? item.remoteResource.id} (id: \`${item._id}\`) — ${item.status}${item.nextImportDate ? `, next run ${item.nextImportDate.slice(0, 10)}` : ''}`
      : `- ${item.dataFairDataset.title ?? item.dataFairDataset.id} (id: \`${item._id}\`) — ${item.status}`
    ).join('\n')
  }
})

useAgentTool({
  name: 'open_catalog_item',
  description: 'Open the page of an import or a publication of this catalog: its state, its last run logs and its configuration.',
  annotations: { title: t('agentOpenItem'), readOnlyHint: true },
  inputSchema: {
    type: 'object' as const,
    properties: {
      kind: { type: 'string' as const, enum: ['import', 'publication'] },
      id: { type: 'string' as const, description: 'The id given by list_catalog_items' }
    },
    required: ['kind', 'id'] as const
  },
  execute: async ({ kind, id }) => {
    await router.push(`/catalogs/${route.params.catalogId}/${kind}s/${encodeURIComponent(id)}`)
    await untilToolsSettle()
    return `The ${kind} page is open, its tools are registered and callable from your next step.`
  }
})

useAgentTool({
  name: 'open_catalog_wizard',
  description: 'Open the wizard that imports a resource of this remote catalog as a dataset, or that publishes a dataset to it. The wizard tools are registered when this returns.',
  annotations: { title: t('agentOpenWizard'), readOnlyHint: true },
  inputSchema: {
    type: 'object' as const,
    properties: { wizard: { type: 'string' as const, enum: ['import', 'publication'] } },
    required: ['wizard'] as const
  },
  execute: async ({ wizard }) => {
    const capabilities = (await until(catalog).toBeTruthy())?.capabilities ?? []
    if (wizard === 'import' ? !capabilities.includes('import') : !supportPublication.value) {
      return { content: [{ type: 'text' as const, text: `This catalog does not support ${wizard}s.` }], isError: true }
    }
    await router.push(`/catalogs/${route.params.catalogId}/${wizard}s/new`)
    await untilToolsSettle()
    return `The ${wizard} wizard is open, its tools are registered and callable from your next step.`
  }
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

// The registry artefact carries the id of its uploaded thumbnail (if any),
// which is needed to build the registry thumbnail URL.
const artefactFetch = useFetch<{ thumbnail?: { id: string } }>(
  () => `${$sitePath}/registry/api/v1/artefacts/${encodeURIComponent(catalog.value?.plugin ?? '')}`,
  { immediate: false, watch: false, notifError: false }
)
watch(() => catalog.value?.plugin, async (plugin) => {
  if (plugin) await artefactFetch.refresh()
})

const assetsUrl = computed(() => {
  if (catalog.value?.capabilities.includes('thumbnailUrl') && catalog.value?.thumbnailUrl) return catalog.value.thumbnailUrl
  const thumbnailId = artefactFetch.data.value?.thumbnail?.id
  if (thumbnailId) return `${$sitePath}/registry/api/v1/thumbnails/${thumbnailId}/data`
  return new URL('~/assets/www.svg', import.meta.url).href
})
</script>

<i18n lang="yaml">
  en:
    agentListItems: List the imports or publications
    agentOpenItem: Open an import or publication
    agentOpenWizard: Open an import or publication wizard
    backToCatalogs: Back to catalogs
    cancel: Cancel
    catalogDeleted: Catalog deleted!
    catalogSaved: Configuration saved!
    catalogs: Catalogs
    delete: Delete Catalog
    errorDeletingCatalog: Error deleting the catalog.
    errorSavingCatalog: Error while saving the catalog
    save: Save
    tab:
      configuration: Configuration
      imports: Imports
      publications: Publications
  fr:
    agentListItems: Lister les imports ou les publications
    agentOpenItem: Ouvrir un import ou une publication
    agentOpenWizard: Ouvrir un assistant d'import ou de publication
    backToCatalogs: Retour aux catalogues
    cancel: Annuler
    catalogDeleted: Catalogue supprimé !
    catalogSaved: Configuration enregistrée !
    catalogs: Catalogues
    delete: Supprimer le catalogue
    errorDeletingCatalog: Erreur lors de la suppression du catalogue.
    errorSavingCatalog: Erreur lors de la modification du catalogue
    save: Enregistrer
    tab:
      configuration: Configuration
      imports: Imports
      publications: Publications
</i18n>

<style scoped>
</style>
