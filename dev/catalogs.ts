import type { AssertValidOptions } from '@data-fair/lib-validation'

export interface CatalogPlugin {
  listDatasets: () => Promise<{
    count: number
    results: {
      title: string
    }[]
  }>,
  metadata: {
    title: string
    description: string
    icon: string
  },
  configSchema: Record<string, unknown>
  assertConfigValid(data: any, options?: AssertValidOptions): asserts data is Record<string, unknown>
}
