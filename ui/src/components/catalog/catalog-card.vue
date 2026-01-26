<template>
  <v-card
    class="h-100 d-flex flex-column"
    :to="`/catalogs/${ catalog._id }` + ($route.query.showAll ? `?showAll=${$route.query.showAll}` : '')"
  >
    <v-card-item class="text-primary">
      <!-- Plugin thumbnail -->
      <template
        v-if="thumbnailCapability"
        #prepend
      >
        <v-avatar
          v-if="thumbnailCapability === 'url'"
          :image="catalog.thumbnailUrl"
          rounded="0"
          size="32"
        />
        <v-avatar
          v-else-if="thumbnailCapability === 'path'"
          :image="`${$apiPath}/plugins/${catalog.plugin}/thumbnail`"
          rounded="0"
          size="32"
        />
      </template>

      <!-- Catalog title -->
      <template #title>
        <span class="font-weight-bold">
          {{ catalog.title || catalog._id }}
        </span>
        <v-tooltip
          v-if="catalog.title && catalog.title.length > 15"
          activator="parent"
          location="top left"
          open-delay="300"
          :text="catalog.title"
        />
      </template>

      <!-- Owner -->
      <template #append>
        <owner-avatar
          v-if="showOwner"
          :owner="catalog.owner"
        />
      </template>
    </v-card-item>
    <v-card-text class="pb-0 text-truncate">
      {{ catalog.description }}
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <template v-if="catalog.capabilities.includes('import')">
        <v-icon
          color="primary"
          :icon="mdiDownload"
        />
        {{ t('imports', catalog.importsCount || 0 ) }}
      </template>
      <v-spacer v-if="catalog.capabilities.includes('import') && catalog.capabilities.some(c => ['createFolderInRoot', 'createFolder', 'createResource', 'replaceFolder', 'replaceResource'].includes(c))" />
      <template v-if="catalog.capabilities.some(c => ['createFolderInRoot', 'createFolder', 'createResource', 'replaceFolder', 'replaceResource'].includes(c))">
        <v-icon
          color="primary"
          :icon="mdiUpload"
        />
        {{ t('publications', catalog.publicationsCount || 0 ) }}
      </template>
      <v-spacer />
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { CatalogsGetRes } from '#api/doc'
import ownerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'

const { t } = useI18n()
const { catalog, showOwner } = defineProps<{
  catalog: CatalogsGetRes['results'][number]
  pluginName: string
  showOwner?: boolean
}>()

const thumbnailCapability = computed(() => {
  if (catalog.capabilities.includes('thumbnailUrl')) return 'url'
  if (catalog.capabilities.includes('thumbnail')) return 'path'
  return null
})

</script>

<i18n lang="yaml">
  en:
    imports: 'No import | {count} import | {count} imports'
    publications: 'No publication | {count} publication | {count} publications'

  fr:
    imports: 'Aucun import | {count} import | {count} imports'
    publications: 'Aucune publication | {count} publication | {count} publications'

</i18n>

<style scoped>
</style>
