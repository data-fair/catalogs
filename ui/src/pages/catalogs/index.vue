<template>
  <v-container
    data-iframe-height
    style="min-height:500px"
  >
    <v-row>
      <v-col>
        <v-container>
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
                height="200"
                type="article"
              />
            </v-col>
          </v-row>
          <template v-else>
            <v-list-subheader v-if="displayCatalogs.length > 1">
              {{ displayCatalogs.length }}/{{ catalogsFetch.data.value?.count }} catalogues affichés
            </v-list-subheader>
            <v-list-subheader v-else>
              {{ displayCatalogs.length }}/{{ catalogsFetch.data.value?.count }} catalogue affiché
            </v-list-subheader>
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
        </v-container>
      </v-col>
      <template v-if="catalogsFetch.data.value && getAccountRole(session.state, session.state.account) === 'admin'">
        <layout-navigation-right v-if="$vuetify.display.lgAndUp">
          <catalogs-actions
            v-model:search="search"
            v-model:show-all="showAll"
            v-model:plugins-selected="plugins"
            v-model:statuses-selected="statuses"
            v-model:owners-selected="owners"
            :admin-mode="session.state.user?.adminMode === 1"
            :is-small="false"
            :facets="catalogsFetch.data.value?.facets || {}"
            :plugins="pluginsFetch.data.value?.results || []"
          />
        </layout-navigation-right>
        <layout-actions-button
          v-else
          class="pt-2"
        >
          <template #actions>
            <catalogs-actions
              v-model:search="search"
              v-model:show-all="showAll"
              v-model:plugins-selected="plugins"
              v-model:statuses-selected="statuses"
              v-model:owners-selected="owners"
              :admin-mode="session.state.user?.adminMode === 1"
              :is-small="true"
              :facets="catalogsFetch.data.value?.facets || {}"
              :plugins="pluginsFetch.data.value?.results || []"
            />
          </template>
        </layout-actions-button>
      </template>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import type { Catalog, CatalogsFacets, Plugin, PluginsFacets } from '#api/types'
import { getAccountRole } from '@data-fair/lib-vue/session'

const session = useSessionAuthenticated()
const showAll = useBooleanSearchParam('showAll')
const search = useStringSearchParam('q')
const plugins = useStringsArraySearchParam('plugin')
const statuses = useStringsArraySearchParam('status')
const owners = useStringsArraySearchParam('owner')

onMounted(() => setBreadcrumbs([{ text: 'Catalogues' }]))

/*
  fetch and filter resources
*/
const catalogsParams = computed(() => {
  return {
    size: '1000',
    showAll: showAll.value,
    sort: 'updated.date:-1',
    select: '_id,title,plugin'
  }
})

const catalogsFetch = useFetch<{
  results: Catalog[]
  facets: CatalogsFacets
  count: number
}>(`${$apiPath}/catalogs`, { query: catalogsParams })

const pluginsFetch = useFetch<{
  results: Plugin[]
  facets: PluginsFacets
  count: number
}>(`${$apiPath}/plugins`)

const displayCatalogs = computed(() => {
  const catalogs = (catalogsFetch.data.value?.results ?? [])
  if (!search.value) return catalogs
  return catalogs.filter(catalog => catalog.title.toLowerCase().includes(search.value.toLowerCase()))
})

</script>

<style scoped>
</style>
