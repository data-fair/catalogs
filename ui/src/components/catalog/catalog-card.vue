<template>
  <v-card
    class="h-100 d-flex flex-column"
    :to="`/catalogs/${ catalog._id }` + ($route.query.showAll ? `?showAll=${$route.query.showAll}` : '')"
  >
    <v-card-item class="text-primary">
      <!-- Plugin thumbnail -->
      <template
        v-if="thumbnailUrl"
        #prepend
      >
        <v-avatar
          :image="thumbnailUrl"
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
        <v-list-item :class="{ 'text-error': !plugin }">
          <template #prepend>
            <v-icon :icon="mdiPowerPlug" />
          </template>
          {{ plugin?.title || `${t('deleted')} - ${catalog.plugin}` }}
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
          <span
            v-if="catalog.importsErrorCount"
            class="text-error"
          >
            ({{ t('importsError', catalog.importsErrorCount) }})
          </span>
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
          <span
            v-if="catalog.publicationsErrorCount"
            class="text-error"
          >
            ({{ t('publicationsError', catalog.publicationsErrorCount) }})
          </span>
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
const { catalog, showOwner, plugin } = defineProps<{
  catalog: CatalogsGetRes['results'][number]
  /** Registry artefact of this catalog's plugin — absent if it was removed from the registry. */
  plugin?: { title: string, thumbnail?: { id: string } }
  showOwner?: boolean
}>()

// Thumbnail to display, if any: a plugin-provided dynamic URL takes precedence,
// otherwise the registry-hosted thumbnail uploaded for the plugin artefact.
const thumbnailUrl = computed(() => {
  if (catalog.capabilities.includes('thumbnailUrl') && catalog.thumbnailUrl) return catalog.thumbnailUrl
  if (plugin?.thumbnail) return `${$sitePath}/registry/api/v1/thumbnails/${plugin.thumbnail.id}/data`
  return null
})

</script>

<i18n lang="yaml">
  en:
    deleted: Deleted
    imports: 'No import | {count} import | {count} imports'
    publications: 'No publication | {count} publication | {count} publications'
    importsError: '{count} import in error | {count} imports in error'
    publicationsError: '{count} publication in error | {count} publications in error'

  fr:
    deleted: Supprimé
    imports: 'Aucun import | {count} import | {count} imports'
    publications: 'Aucune publication | {count} publication | {count} publications'
    importsError: '{count} import en erreur | {count} imports en erreur'
    publicationsError: '{count} publication en erreur | {count} publications en erreur'

</i18n>

<style scoped>
</style>
