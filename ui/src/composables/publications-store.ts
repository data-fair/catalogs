import { provide, inject } from 'vue'
import type { Publication } from '#api/types'
import type { PublicationsGetRes } from '#api/doc'

export type PublicationsStore = ReturnType<typeof createPublicationsStore>
export const publicationsStoreKey = Symbol('publications-store')

export const createPublicationsStore = (catalogId?: string, dataFairDatasetId?: string) => {
  // First fetch publications
  const publicationsFetch = useFetch<PublicationsGetRes>(`${$apiPath}/publications`, {
    query: { catalogId, dataFairDatasetId }
  })

  // Copy of fetch data, that can be edited
  const publications = ref<Publication[]>([])
  // Update publications when fetch data changes
  watch(publicationsFetch.data, () => { publications.value = publicationsFetch.data.value?.results || [] })

  const count = computed(() => publicationsFetch.data.value?.count || 0)

  return {
    publications,
    publicationsFetch,
    refresh: publicationsFetch.refresh,
    count
  }
}

export const providePublicationsStore = (catalogId?: string, dataFairDatasetId?: string) => {
  const store = createPublicationsStore(catalogId, dataFairDatasetId)
  provide(publicationsStoreKey, store)
  return store
}

export const usePublicationsStore = () => {
  const store = inject(publicationsStoreKey) as PublicationsStore | undefined
  if (!store) throw new Error('publications store was not initialized')
  return store
}

export default usePublicationsStore
