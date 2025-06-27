<template>
  <v-card
    class="h-100 d-flex flex-column"
    :to="`/catalogs/${catalog._id}`"
  >
    <v-card-item>
      <!-- Owner -->
      <template #append>
        <owner-avatar
          v-if="showOwner"
          :owner="catalog.owner"
        />
      </template>

      <!-- Catalog title -->
      <template #title>
        <span class="font-weight-bold text-primary">
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
    </v-card-item>
    <!-- <v-divider /> -->
    <v-card-text class="pb-0">
      <v-list-item
        v-if="catalog.description"
        class="my-n2 pa-0"
        density="compact"
        lines="three"
        :subtitle="catalog.description"
      />
      <!-- <v-list-item class="my-n2 pa-0">
        <template #prepend>
          <v-icon :icon="mdiPuzzle" />
        </template>
        {{ pluginName }}
      </v-list-item> -->
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <template v-if="catalog.capabilities.includes('import')">
        <v-icon
          color="primary"
          :icon="mdiDownload"
          class="me-2"
        />
        {{ t('imports', catalog.importsCount || 0 ) }}
      </template>
      <v-spacer v-if="catalog.capabilities.includes('import') && catalog.capabilities.includes('publishDataset')" />
      <template v-if="catalog.capabilities.includes('publishDataset')">
        <v-icon
          color="primary"
          :icon="mdiUpload"
          class="me-2"
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
