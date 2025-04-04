<template>
  <v-container class="pa-0">
    <v-progress-linear
      v-if="datasets.loading.value"
      color="primary"
      height="2"
      indeterminate
    />
    <h4
      v-else-if="datasets.error.value || !datasets.data.value"
      class="text-h5 mb-2"
    >
      0 jeu de données dans le catalogue
    </h4>
    <template v-else>
      <h4 class="text-h5 mb-2">
        {{ datasets.data.value.count }} jeux de données dans le catalogue
      </h4>
      <v-card
        v-for="dataset in datasets.data.value.results"
        :key="dataset.id"
        class="mb-4"
      >
        <v-card-item>
          <template #title>
            {{ dataset.title }}
          </template>
          <template #append>
            <v-btn
              color="primary"
              density="comfortable"
              variant="text"
              :loading="createDataset.loading.value"
              :icon="mdiDownload"
              @click="createDataset.execute(dataset)"
            />
          </template>
        </v-card-item>

        <v-card-text class="pa-0">
          <v-list>
            <v-list-item
              v-for="resource in dataset.resources"
              :key="resource.id"
              :title="resource.title"
              :subtitle="resource.format"
            >
              <template #append>
                <v-btn
                  color="primary"
                  density="comfortable"
                  size="small"
                  variant="text"
                  :icon="mdiDownload"
                  :loading="createResourceDataset.loading.value"
                  @click="createResourceDataset.execute(dataset, resource)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import type { CatalogDataset, CatalogResourceDataset } from '@data-fair/lib-common-types/catalog.ts'

const { catalogId } = defineProps <{
  catalogId: string
}>()

const datasets = useFetch<{ count: string, results: CatalogDataset[] }>(`${$apiPath}/catalogs/${catalogId}/datasets`)

const createDataset = useAsyncAction(
  async (dataset: CatalogDataset) => {
    const datasetPost: Record<string, any> = {
      title: dataset.title,
      isMetaOnly: true,
    }
    const attachments = dataset.resources.map((resource) => {
      return {
        title: resource.title,
        type: 'url',
        url: resource.url
      }
    })
    if (attachments.length > 0) datasetPost.attachments = attachments
    if (dataset.description) datasetPost.description = dataset.description
    if (dataset.origin) datasetPost.origin = dataset.origin
    if (dataset.keywords) datasetPost.keywords = dataset.keywords
    if (dataset.image) datasetPost.image = dataset.image
    if (dataset.frequency) datasetPost.frequency = dataset.frequency
    if (dataset.license) datasetPost.license = dataset.license

    await $fetch('/data-fair/api/v1/datasets', {
      method: 'POST',
      body: datasetPost,
      baseURL: $sitePath
    })
  },
  {
    success: 'Jeu de données créé !',
    error: 'Erreur lors de la création du jeu de données',
  }
)

const createResourceDataset = useAsyncAction(
  async (dataset: CatalogDataset, resource: CatalogResourceDataset) => {
    const resourcePost: Record<string, any> = {
      title: resource.title,
      remoteFile: {
        url: resource.url,
        catalog: catalogId,
      }
    }
    if (resource.mimeType) resourcePost.remoteFile.mimeType = resource.mimeType
    if (resource.fileName) resourcePost.remoteFile.name = resource.fileName
    if (resource.size) resourcePost.remoteFile.size = resource.size

    // Dataset level props
    if (dataset.description) resourcePost.description = dataset.description
    if (dataset.origin) resourcePost.origin = dataset.origin
    if (dataset.keywords) resourcePost.keywords = dataset.keywords
    if (dataset.image) resourcePost.image = dataset.image
    if (dataset.frequency) resourcePost.frequency = dataset.frequency
    if (dataset.license) resourcePost.license = dataset.license

    console.log($sitePath)
    await $fetch('/data-fair/api/v1/datasets', {
      method: 'POST',
      body: resourcePost,
      baseURL: $sitePath
    })
  },
  {
    success: 'Jeu de données créé !',
    error: 'Erreur lors de la création du jeu de données',
  }
)

</script>

<style scoped>
</style>
