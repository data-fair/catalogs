import { ref, type Ref } from 'vue'
import { ofetch } from 'ofetch'
import { $sitePath } from '../context'
import { fetchAllPages, type RegistryPage } from '../utils/registry-pages'

/**
 * The catalog plugins of the registry the session's account can see, every page of them. Same domain, so the
 * browser sends the simple-directory session cookie and the registry filters by its active account.
 *
 * `includeDeprecated`: the list of catalogs keeps a deprecated plugin, whose catalogs still work (shown as "deleted"
 * otherwise); the creation page does not offer it.
 *
 * Same shape as useFetch's (`data.results`, `loading`), for the pages that read it.
 */
export const useRegistryPlugins = <T>(opts: { includeDeprecated: boolean }) => {
  const data = ref<{ results: T[] } | null>(null) as Ref<{ results: T[] } | null>
  const loading = ref(true)
  fetchAllPages(skip => ofetch<RegistryPage<T>>(`${$sitePath}/registry/api/v1/artefacts`, {
    query: { format: 'npm', category: 'catalog', size: 100, skip, ...(opts.includeDeprecated ? { includeDeprecated: true } : {}) }
  }))
    .then(results => { data.value = { results } })
    // as the previous single fetch with notifError: false, a registry failure leaves the list empty
    .catch(() => { data.value = { results: [] } })
    .finally(() => { loading.value = false })
  return { data, loading }
}

export default useRegistryPlugins
