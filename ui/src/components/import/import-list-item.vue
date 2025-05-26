<template>
  <v-card>
    <!-- Dataset level -->
    <v-card-item class="pb-0">
      <!-- Private ? -->
      <template
        v-if="dataset.private !== undefined"
        #prepend
      >
        <v-icon
          :title="dataset.private ? t('datasetIsPrivate') : t('datasetIsPublic')"
          :icon="dataset.private ? mdiLock : mdiLockOpen"
          color="primary"
        />
      </template>

      <template #title>
        {{ dataset.title }}
      </template>

      <template #subtitle>
        <a
          v-if="dataset.origin"
          :href="dataset.origin"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('seeDistantDataset') }}
        </a>
      </template>

      <template #append>
        <import-action
          :catalog="catalog"
          :remote-dataset="dataset"
          :imp="getImport(dataset.id)"
        />
      </template>
    </v-card-item>

    <!-- Resources level -->
    <v-card-text v-if="dataset.resources?.length">
      <v-list>
        <v-list-item
          v-for="resource in dataset.resources"
          :key="resource.id"
          :title="resource.title"
        >
          <template #subtitle>
            {{ resource.format }} |
            <a
              v-if="resource.url"
              :href="resource.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t('seeDistantResource') }}
            </a>
          </template>
          <template #append>
            <import-action
              :catalog="catalog"
              :remote-dataset="dataset"
              :remote-resource="resource"
              :imp="getImport(dataset.id, resource.id)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { CatalogDataset } from '@data-fair/lib-common-types/catalog/index.ts'
import type { Catalog, Import } from '#api/types'

const { imports, catalog, dataset } = defineProps <{
  imports: Import[] | undefined,
  catalog: Catalog,
  dataset: CatalogDataset
}>()

const { t } = useI18n()

const getImport = (datasetId: string, resourceId?: string): Import | undefined => {
  return imports?.find((d) => {
    return d.remoteDataset.id === datasetId &&
      (resourceId ? d.remoteResource?.id === resourceId : true)
  })
}

</script>

<i18n lang="yaml">
  en:
    datasetIsPrivate: The dataset is private
    datasetIsPublic: The dataset is public
    seeDistantDataset: See the remote dataset
    seeDistantResource: See the remote resource

  fr:
    datasetIsPrivate: Le jeu de données est privé
    datasetIsPublic: Le jeu de données est public
    seeDistantDataset: Voir le jeu de données distant
    seeDistantResource: Voir la ressource distante
</i18n>

<style scoped>
</style>
