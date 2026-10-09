import type { Ref } from 'vue'
import type { Catalog } from '#api/types'
import { until } from '@vueuse/core'
import { useAgentTool } from '@data-fair/lib-vue-agents'
import type { RemoteListing } from '~/utils/agent-state'

export const useAgentRemoteCatalog = (catalog: Ref<Catalog | null>) => {
  const session = useSession()

  useAgentTool({
    name: 'search_remote_catalog',
    description: 'List the folders and resources of the remote catalog without leaving the current page, one folder at a time: use it to check whether a remote resource still exists. To import one, open the import wizard.',
    annotations: { title: session.lang.value === 'fr' ? 'Parcourir le catalogue distant' : 'Browse the remote catalog', readOnlyHint: true },
    inputSchema: {
      type: 'object' as const,
      properties: {
        folderId: { type: 'string' as const, description: 'Folder to list, the root of the catalog when omitted' },
        q: { type: 'string' as const, description: 'Full-text search, only when the catalog has the "search" capability' },
        page: { type: 'number' as const, description: 'Page number, only when the catalog has the "pagination" capability' }
      }
    },
    execute: async ({ folderId, q, page }: { folderId?: string, q?: string, page?: number }) => {
      const current = await until(catalog).toBeTruthy()
      const listing = await $fetch<RemoteListing>(`/catalogs/${current!._id}/resources`, {
        query: {
          ...(folderId && { currentFolderId: folderId }),
          ...(q && current!.capabilities.includes('search') && { q }),
          ...(page && current!.capabilities.includes('pagination') && { page, size: 20 })
        }
      })
      return formatRemoteListing(listing, { page })
    }
  })
}
