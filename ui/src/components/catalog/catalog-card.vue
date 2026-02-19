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
        <span
          :title="catalog.title"
          class="font-weight-bold"
        >
          {{ catalog.title }}
        </span>
      </template>

      <!-- Owner -->
      <template #append>
        <owner-avatar
          v-if="showOwner"
          :owner="catalog.owner"
        />
      </template>
    </v-card-item>
    <v-divider />
    <v-card-text class="pa-0">
      <v-list
        density="compact"
        style="background-color: inherit;"
      >
        <!-- Catalog plugin -->
        <v-list-item :class="{ 'text-error': !pluginName }">
          <template #prepend>
            <v-icon :icon="mdiPowerPlug" />
          </template>
          {{ pluginName || `${t('deleted')} - ${pluginId}` }}
        </v-list-item>

        <!-- Import counter -->
        <v-list-item
          v-if="catalog.capabilities.includes('import')"
        >
          <template #prepend>
            <v-icon
              :icon="mdiDownload"
              color="primary"
            />
          </template>
          {{ t('imports', catalog.importsCount || 0) }}
        </v-list-item>

        <!-- Publication counter -->
        <v-list-item
          v-if="catalog.capabilities.some(c => ['createFolderInRoot', 'createFolder', 'createResource', 'replaceFolder', 'replaceResource'].includes(c))"
        >
          <template #prepend>
            <v-icon
              :icon="mdiUpload"
              color="primary"
            />
          </template>
          {{ t('publications', catalog.publicationsCount || 0) }}
        </v-list-item>

        <!-- Description -->
        <v-list-item v-if="catalog.description">
          {{ catalog.description }}
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { CatalogsGetRes } from '#api/doc'
import ownerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'
import { mdiPowerPlug } from '@mdi/js'

const { t } = useI18n()
const { catalog, showOwner, pluginName, pluginId } = defineProps<{
  catalog: CatalogsGetRes['results'][number]
  pluginName?: string
  pluginId?: string
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
    deleted: Deleted
    imports: 'No import | {count} import | {count} imports'
    publications: 'No publication | {count} publication | {count} publications'

  fr:
    deleted: Supprimé
    imports: 'Aucun import | {count} import | {count} imports'
    publications: 'Aucune publication | {count} publication | {count} publications'

</i18n>

<style scoped>
</style>
