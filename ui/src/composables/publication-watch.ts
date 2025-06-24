import type { Publication } from '#api/types'
import type { PublicationsStore } from './publications-store'

export type WatchKey = 'delete' | 'update'

export const usePublicationWatch = (publicationsStore: PublicationsStore, publicationId: string, keys: WatchKey | WatchKey[]) => {
  // const { sendUiNotif } = useUiNotif()

  if (!Array.isArray(keys)) keys = [keys]
  const ws = useWS('/catalogs/api/')

  // Subscribe to updates of this publication
  if (keys.includes('update')) {
    ws?.subscribe(`publication/${publicationId}`, async (patch: Partial<Publication>) => {
      const publication = publicationsStore.publications.value.find(pub => pub._id === publicationId)
      if (!publication) return
      Object.assign(publication, patch)
    })
  }

  // Subscribe to deletion of this publication
  if (keys.includes('delete')) {
    ws?.subscribe(`publication/${publicationId}/deleted`, async () => {
      publicationsStore.refresh()
      // TODO: ui notif ?
      ws?.unsubscribe(`publication/${publicationId}`, () => { })
      ws?.unsubscribe(`publication/${publicationId}/deleted`, () => { })
    })
  }
}
