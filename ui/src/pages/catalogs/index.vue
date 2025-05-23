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
    <span
      v-if="!catalogsFetch.data.value?.results.length"
      class="d-flex justify-center text-h6 mt-4"
    >
      {{ t('noCatalogsCreated') }}
    </span>
    <span
      v-if="!displayCatalogs.length"
      class="d-flex justify-center text-h6 mt-4"
    >
      {{ t('noCatalogsDisplayed') }}
    </span>
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
            :show-owner="showAll || !!(catalog.owner.department && !session.state.account.department)"
          />
        </v-col>
      </v-row>
    </template>
    <layout-actions v-if="catalogsFetch.data.value && getAccountRole(session.state, session.state.account) === 'admin'">
      <catalogs-actions
        v-model:search="search"
        v-model:show-all="showAll"
        v-model:plugins-selected="plugins"
        v-model:owners-selected="owners"
        :admin-mode="session.state.user?.adminMode === 1"
        :facets="catalogsFetch.data.value?.facets || {}"
        :plugins="pluginsFetch.data.value?.results || []"
      />
    </layout-actions>
  </v-container>
</template>

<script setup lang="ts">
import type { CatalogsGetRes, PluginsGetRes } from '#api/doc'
import { getAccountRole } from '@data-fair/lib-vue/session'

const session = useSessionAuthenticated()
const showAll = useBooleanSearchParam('showAll')
const search = useStringSearchParam('q')
const plugins = useStringsArraySearchParam('plugin')
const owners = useStringsArraySearchParam('owner')
const { t } = useI18n()

const catalogsParams = computed(() => {
  const params: Record<string, any> = {
    showAll: showAll.value,
    select: '_id,title,plugin',
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
    catalogs: Catalogs
    catalogDisplayed: No catalogs | {displayed}/{count} catalog displayed | {displayed}/{count} catalogs displayed
    noCatalogsCreated: You haven't created any catalogs yet.
    noCatalogsDisplayed: No results match the search criteria.
    noPermissions: You don't have permission to access this page.

  fr:
    catalogs: Catalogues
    catalogDisplayed: Aucun catalogue | {displayed}/{count} catalogue affiché | {displayed}/{count} catalogues affichés
    noCatalogsCreated: Vous n'avez pas encore créé de catalogue.
    noCatalogsDisplayed: Aucun résultat ne correspond aux critères de recherche.
    noPermissions: Vous n'avez pas la permission d'accéder à cette page.

</i18n>

<style scoped>
</style>
