<template>
  <v-container
    data-iframe-height
  >
    <publication-new
      v-if="catalog"
      :catalog="{ id: catalog._id, title: catalog.title, owner: catalog.owner }"
      @on-create="router.push(`/catalogs/${route.params.catalogId}?tab=publications`)"
    />
  </v-container>
</template>

<script setup lang="ts">

const { t } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/imports/[importId]'>()
const router = useRouter()

const { catalog } = createCatalogStore(route.params.catalogId)

watch(catalog, (newCatalog) => {
  if (!newCatalog) return
  setBreadcrumbs([
    { text: t('catalogs'), to: '/catalogs' },
    { text: newCatalog.title ?? route.params.catalogId, to: `/catalogs/${route.params.catalogId}` },
    { text: t('publications'), to: `/catalogs/${route.params.catalogId}` },
    { text: t('createNewPublication') }
  ])
})

</script>

<i18n lang="yaml">
  en:
    catalogs: Catalogs
    publications: Publications
    createNewPublication: Create new publication

  fr:
    catalogs: Catalogues
    publications: Publications
    createNewPublication: Créer une nouvelle publication

</i18n>

<style scoped>
</style>
