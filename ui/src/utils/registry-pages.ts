export type RegistryPage<T> = { results: T[], count: number }

/** Read every page of a registry list. The registry caps `size` at 100, so a single call silently misses the rest. */
export const fetchAllPages = async <T>(fetchPage: (skip: number) => Promise<RegistryPage<T>>): Promise<T[]> => {
  const all: T[] = []
  for (;;) {
    const page = await fetchPage(all.length)
    all.push(...page.results)
    if (!page.results.length || all.length >= page.count) return all
  }
}
