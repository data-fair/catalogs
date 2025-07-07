import { provide, inject } from 'vue'
import type { Publication } from '#api/types'
import type { PublicationsGetRes } from '#api/doc'

export type PublicationsStore = ReturnType<typeof createPublicationsStore>
export const publicationsStoreKey = Symbol('publications-store')

export const createPublicationsStore = (catalogId?: string, dataFairDatasetId?: string) => {
  const ws = useWS('/catalogs/api/')

  // First fetch publications
  const publicationsFetch = useFetch<PublicationsGetRes>(`${$apiPath}/publications`, {
    query: { catalogId, dataFairDatasetId }
  })

  // Copy of fetch data, that can be edited
  const publications = ref<Publication[]>([])
  // Update publications when fetch data changes
  watch(publicationsFetch.data, () => {
    publications.value = publicationsFetch.data.value?.results || []

    // Subscribe to WebSocket updates for publications with status 'waiting' or 'running'
    publications.value.forEach(publication => {
      if (publication.status === 'waiting' || publication.status === 'running') {
        ws?.subscribe(`publication/${publication._id}`, async (patch: Partial<Publication>) => {
          const existingPublication = publications.value.find(pub => pub._id === publication._id)
          if (!existingPublication) return
          Object.assign(publication, patch)
        })
      }
    })
  })

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
