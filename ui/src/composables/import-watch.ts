import type { Import } from '#api/types'
import type { ImportsStore } from './imports-store'

export const useImportWatch = (importsStore: ImportsStore, importId: string) => {
  const ws = useWS('/catalogs/api/')

  // Subscribe to updates of this import
  ws?.subscribe(`import/${importId}`, async (patch: Partial<Import>) => {
    const imp = importsStore.imports.value.find(pub => pub._id === importId)
    if (!imp) return
    Object.assign(imp, patch)
  })
}
