import { provide, inject } from 'vue'
import type { Catalog, Plugin } from '#api/types'

export type CatalogStore = ReturnType<typeof createCatalogStore>
export const catalogStoreKey = Symbol('catalog-store')

export const createCatalogStore = (catalogId: string) => {
  const catalogFetch = useFetch<Catalog>(`${$apiPath}/catalogs/${catalogId}`)
  const catalog = ref<Catalog | null>(null)
  watch(catalogFetch.data, () => { catalog.value = catalogFetch.data.value })

  const pluginFetch = useFetch<Plugin>(() => `${$apiPath}/plugins/${catalog.value?.plugin}`, {
    immediate: false,
    watch: false
  })
  watch(() => catalogFetch.data.value?.plugin, async (plugin) => {
    if (plugin) await pluginFetch.refresh()
  })

  const supportPublication = computed(() => catalog.value?.capabilities.some(c => ['createFolderInRoot', 'createFolder', 'createResource', 'replaceFolder', 'replaceResource'].includes(c)))

  return {
    catalog,
    catalogFetch,
    refresh: catalogFetch.refresh,
    plugin: pluginFetch.data,
    pluginFetch,
    supportPublication
  }
}

export const provideCatalogStore = (catalogId: string) => {
  const store = createCatalogStore(catalogId)
  provide(catalogStoreKey, store)
  return store
}

export const useCatalogStore = () => {
  const store = inject(catalogStoreKey) as CatalogStore | undefined
  if (!store) throw new Error('catalog store was not initialized')
  return store
}

export default useCatalogStore
