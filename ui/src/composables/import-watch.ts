import type { Import } from '#api/types'
import type { ImportsStore } from './imports-store'

export type WatchKey = 'delete' | 'update'

export const useImportWatch = (importsStore: ImportsStore, importId: string, keys: WatchKey | WatchKey[]) => {
  // const { sendUiNotif } = useUiNotif()

  if (!Array.isArray(keys)) keys = [keys]
  const ws = useWS('/catalogs/api/')

  // Subscribe to updates of this import
  if (keys.includes('update')) {
    ws?.subscribe(`import/${importId}`, async (patch: Partial<Import>) => {
      const imp = importsStore.imports.value.find(pub => pub._id === importId)
      if (!imp) return
      Object.assign(imp, patch)
    })
  }
}
