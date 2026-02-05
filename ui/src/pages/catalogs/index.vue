<template>
  <layout-error
    v-if="session.state.accountRole !== 'admin' && !session.state.user.adminMode"
    :text="t('noPermissions')"
  />
  <v-container
    v-else
    data-iframe-height
    style="min-height:500px"
  >
    <!-- Skeleton loader-->
    <v-row
      v-if="catalogsFetch.loading.value"
      class="d-flex align-stretch"
    >
      <v-col
        v-for="i in 9"
        :key="i"
        md="4"
        sm="6"
        cols="12"
        class="d-flex"
      >
        <v-skeleton-loader
          :class="$vuetify.theme.current.dark ? 'w-100' : 'w-100 skeleton'"
          type="heading"
        />
      </v-col>
    </v-row>
    <!-- No catalogs created -->
    <span
      v-else-if="!catalogsFetch.data.value?.results.length"
      class="d-flex justify-center text-h6 mt-4"
    >
      {{ t('noCatalogsCreated') }}
    </span>
    <!-- No catalogs displayed (filters) -->
    <span
      v-else-if="!displayCatalogs.length"
      class="d-flex justify-center text-h6 mt-4"
    >
      {{ t('noCatalogsDisplayed') }}
    </span>
    <!-- List of catalogs -->
    <template v-else>
      <v-row class="d-flex align-stretch">
        <v-col
          v-for="catalog in displayCatalogs"
          :key="catalog._id"
          md="4"
          sm="6"
          cols="12"
        >
          <catalog-card
            :catalog="catalog"
            :plugin-name="pluginsFetch.data.value?.results.find(p => p.id === catalog.plugin)?.metadata.title || ''"
            :show-owner="showAll || !!(catalog.owner.department && !session.state.account.department)"
          />
        </v-col>
      </v-row>
    </template>
    <navigation-right v-if="catalogsFetch.data.value && getAccountRole(session.state, session.state.account) === 'admin'">
      <catalogs-actions
        v-model:search="search"
        v-model:show-all="showAll"
        v-model:plugins-selected="plugins"
        v-model:owners-selected="owners"
        :admin-mode="session.state.user?.adminMode === 1"
        :facets="catalogsFetch.data.value?.facets || {}"
        :plugins="pluginsFetch.data.value?.results || []"
      />
    </navigation-right>
  </v-container>
</template>

<script setup lang="ts">
import type { CatalogsGetRes, PluginsGetRes } from '#api/doc'
import { getAccountRole } from '@data-fair/lib-vue/session'
import NavigationRight from '@data-fair/lib-vuetify/navigation-right.vue'

const session = useSessionAuthenticated()
const showAll = useBooleanSearchParam('showAll')
const search = useStringSearchParam('q')
const plugins = useStringsArraySearchParam('plugin')
const owners = useStringsArraySearchParam('owner')
const { t } = useI18n()

const catalogsParams = computed(() => {
  const params: Record<string, any> = {
    showAll: showAll.value,
    size: 1000
  }
  if (plugins.value.length) params.plugins = plugins.value.join(',')
  if (owners.value.length) params.owners = owners.value.join(',')
  return params
})

const catalogsFetch = useFetch<CatalogsGetRes>(`${$apiPath}/catalogs`, { query: catalogsParams, notifError: false })
const pluginsFetch = useFetch<PluginsGetRes>(`${$apiPath}/plugins`, { notifError: false })

const displayCatalogs = computed(() => {
  const catalogs = (catalogsFetch.data.value?.results ?? [])
  if (!search.value) return catalogs
  return catalogs.filter(catalog => catalog.title.toLowerCase().includes(search.value.toLowerCase()))
})

watch(
  [() => catalogsFetch.data.value?.count, () => displayCatalogs.value.length],
  ([count, displayed]) => {
    setBreadcrumbs([{ text: t('catalogDisplayed', { count: count ?? 0, displayed }) }])
  },
  { immediate: true }
)

</script>

<i18n lang="yaml">
  en:
    catalogDisplayed: No catalogs | {displayed}/{count} catalog displayed | {displayed}/{count} catalogs displayed
    noCatalogsCreated: You haven't created any catalogs yet.
    noCatalogsDisplayed: No results match the search criteria.
    noPermissions: You don't have permission to access this page.

  fr:
    catalogDisplayed: Aucun catalogue | {displayed}/{count} catalogue affiché | {displayed}/{count} catalogues affichés
    noCatalogsCreated: Vous n'avez pas encore créé de catalogue.
    noCatalogsDisplayed: Aucun résultat ne correspond aux critères de recherche.
    noPermissions: Vous n'avez pas la permission d'accéder à cette page.

</i18n>

<style scoped>
</style>
