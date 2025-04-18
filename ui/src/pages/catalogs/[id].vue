<template>
  <v-container
    v-if="catalog"
    data-iframe-height
    fluid
  >
    <layout-section-tabs
      :title="t('catalogTitle', { title: catalog.title })"
      :src="assetsUrls.checklist"
      description="Consulter les informations générales du catalogue ou modifier sa configuration."
    />

    <catalog-config
      v-if="catalog && plugin"
      :catalog="catalog"
      :plugin="plugin"
      :catalog-id="route.params.id"
      :can-admin="canAdmin"
    />

    <layout-section-tabs
      class="mt-4"
      title="Jeux de données"
      :src="assetsUrls.progress"
      :tabs="[
        { id: 'import', title: 'Import', icon: mdiDownload },
        { id: 'export', title: 'Export', icon: mdiUpload },
      ]"
    />
    <list-remote-datasets
      v-if="plugin?.metadata.capabilities.includes('listDatasets')"
      :catalog="catalog"
      :plugin="plugin"
    />
    <layout-actions v-if="canAdmin">
      <catalog-actions
        :catalog="catalog"
        :can-admin="canAdmin"
        :is-small="true"
      />
    </layout-actions>
  </v-container>
</template>

<script setup lang="ts">
import type { Catalog, Plugin } from '#api/types'

import { getAccountRole } from '@data-fair/lib-vue/session'

const route = useRoute<'/catalogs/[id]'>()
const session = useSessionAuthenticated()
const { t } = useI18n()

const catalog = ref<Catalog | null>(null)
const plugin = ref<Plugin | null>(null)

onMounted(async () => {
  catalog.value = await $fetch(`/catalogs/${route.params.id}`)
  if (catalog.value) plugin.value = await $fetch(`/plugins/${catalog.value.plugin}`)

  setBreadcrumbs([{
    text: t('catalogs'),
    to: '/catalogs'
  }, {
    text: catalog.value?.title || ''
  }])
})

const canAdmin = computed(() => {
  if (!catalog.value) return false
  return getAccountRole(session.state, catalog.value.owner) === 'admin'
})

/** Urls of assets */
const assetsUrls = {
  checklist: new URL('~/assets/checklist.svg', import.meta.url).href,
  progress: new URL('~/assets/progress.svg', import.meta.url).href,
}
</script>

<i18n lang="yaml">
  en:
    catalogs: Catalogs
    catalogTitle: Catalog {title}

  fr:
    catalogs: Catalogues
    catalogTitle: Catalogue {title}
</i18n>

<style scoped>
</style>
