import { provide, inject } from 'vue'
import type { Import } from '#api/types'

export type ImportsStore = ReturnType<typeof createImportsStore>
export const importsStoreKey = Symbol('imports-store')

export const createImportsStore = (catalogId: string) => {
  // First fetch imports
  const importsFetch = useFetch<{ results: Import[], count: number }>(`${$apiPath}/imports`, {
    query: { catalogId }
  })

  // Copy of fetch data, that can be edited
  const imports = ref<Import[]>([])
  // Update imports when fetch data changes
  watch(importsFetch.data, () => { imports.value = importsFetch.data.value?.results || [] })

  const count = computed(() => importsFetch.data.value?.count || 0)

  return {
    imports,
    importsFetch,
    refresh: importsFetch.refresh,
    count
  }
}

export const provideImportsStore = (catalogId: string) => {
  const store = createImportsStore(catalogId)
  provide(importsStoreKey, store)
  return store
}

export const useImportsStore = () => {
  const store = inject(importsStoreKey) as ImportsStore | undefined
  if (!store) throw new Error('imports store was not initialized')
  return store
}

export default useImportsStore
