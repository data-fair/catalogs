<template>
  <v-container class="pa-0">
    <v-progress-linear
      v-if="catalogDatasets.loading.value"
      color="primary"
      height="2"
      indeterminate
    />
    <h4
      v-else-if="catalogDatasets.error.value || !catalogDatasets.data.value"
      class="text-h5 mb-2"
    >
      0 jeu de données dans le catalogue
    </h4>
    <template v-else>
      <h4 class="text-h5 mb-2">
        {{ catalogDatasets.data.value.count }} jeux de données dans le catalogue
      </h4>
      <v-card
        v-for="dataset in catalogDatasets.data.value.results"
        :key="dataset.id"
        class="mb-4"
      >
        <v-card-item>
          <template #title>
            {{ dataset.title }}
          </template>
          <template #append>
            <v-btn
              v-if="!catalog.datasets.find(d => d.id === dataset.id)"
              color="primary"
              density="comfortable"
              variant="text"
              :loading="createDataset.loading.value"
              :icon="mdiDownload"
              @click="createDataset.execute(dataset)"
            />
            <v-menu
              v-else
              v-model="showOverwriteMenu[dataset.id]"
              :close-on-content-click="false"
              max-width="500"
            >
              <template #activator="{ props: createDatasetProps }">
                <v-btn
                  v-bind="createDatasetProps"
                  color="warning"
                  density="comfortable"
                  variant="text"
                  :loading="createDataset.loading.value"
                  :icon="mdiDownload"
                />
              </template>
              <v-card
                rounded="lg"
                title="Écraser le jeu de données"
                variant="elevated"
                :loading="createDataset.loading.value ? 'warning' : false"
              >
                <v-card-text>
                  Voulez-vous vraiment écraser les informations déjà importées ?
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn
                    variant="text"
                    :disabled="createDataset.loading.value"
                    @click="showOverwriteMenu[dataset.id] = false"
                  >
                    Non
                  </v-btn>
                  <v-btn
                    color="warning"
                    variant="flat"
                    :loading="createDataset.loading.value ? 'warning' : false"
                    @click="createDataset.execute(dataset)"
                  >
                    Oui
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-menu>
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
                  v-if="!catalog.datasets.find(d => d.id === resource.id)"
                  color="primary"
                  density="comfortable"
                  size="small"
                  variant="text"
                  :icon="mdiDownload"
                  :loading="createDataset.loading.value"
                  @click="createDataset.execute(dataset, resource)"
                />
                <v-menu
                  v-else
                  v-model="showOverwriteMenu[resource.id]"
                  :close-on-content-click="false"
                  max-width="500"
                >
                  <template #activator="{ props: createResourceProps }">
                    <v-btn
                      v-bind="createResourceProps"
                      color="warning"
                      density="comfortable"
                      size="small"
                      variant="text"
                      :icon="mdiDownload"
                    />
                  </template>
                  <v-card
                    rounded="lg"
                    title="Écraser le jeu de données"
                    variant="elevated"
                    :loading="createDataset.loading.value ? 'warning' : false"
                  >
                    <v-card-text>
                      Voulez-vous vraiment écraser les informations déjà importées ?
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer />
                      <v-btn
                        variant="text"
                        :disabled="createDataset.loading.value"
                        @click="showOverwriteMenu[resource.id] = false"
                      >
                        Non
                      </v-btn>
                      <v-btn
                        color="warning"
                        variant="flat"
                        :loading="createDataset.loading.value ? 'warning' : false"
                        @click="createDataset.execute(dataset, resource)"
                      >
                        Oui
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-menu>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import type { Catalog } from '#api/types'
import type { CatalogDataset, CatalogResourceDataset } from '@data-fair/lib-common-types/catalog.ts'

const props = defineProps <{
  catalog: Catalog
}>()

const { catalog } = toRefs(props)
const showOverwriteMenu = ref<Record<string, boolean>>({})
const catalogDatasets = useFetch<{ count: string, results: CatalogDataset[] }>(`${$apiPath}/catalogs/${catalog.value._id}/datasets`)

const createDataset = useAsyncAction(
  async (dataset: CatalogDataset, resource?: CatalogResourceDataset) => {
    let datasetPost: Record<string, any>
    let resourceId: string

    if (resource) { // Case when creating dataset from a specific resource
      resourceId = resource.id
      datasetPost = {
        title: resource.title,
        remoteFile: {
          url: resource.url,
          // catalog: catalog._id // TODO Activate it when data-fair is ready
        }
      }
      if (resource.mimeType) datasetPost.remoteFile.mimeType = resource.mimeType
      if (resource.fileName) datasetPost.remoteFile.name = resource.fileName
      if (resource.size) datasetPost.remoteFile.size = resource.size
    } else { // Case when creating a meta-only dataset with all resources as attachments
      resourceId = dataset.id
      datasetPost = {
        title: dataset.title,
        isMetaOnly: true
      }
      const attachments = dataset.resources.map((res) => {
        return {
          title: res.title,
          type: 'url',
          url: res.url
        }
      })
      if (attachments.length > 0) datasetPost.attachments = attachments
    }
    addProps(dataset, datasetPost) // Add common properties

    const dataFairId = catalog.value.datasets.find(d => d.id === resourceId)?.dataFairId
    if (dataFairId) await updateDataFairDataset(resourceId, datasetPost, dataFairId)
    else await createDataFairDataset(resourceId, datasetPost)
  },
  {
    success: 'Jeu de données créé !',
    error: 'Erreur lors de la création du jeu de données',
  }
)

/**
 * Create a dataset in Data-Fair
 * @param {string} resourceId - The ID of the catalog resource or catalog dataset
 * @param {any} datasetPost - The dataset data to be created
 */
const createDataFairDataset = async (resourceId: string, datasetPost: any) => {
  const createdDataset = await $fetch('/data-fair/api/v1/datasets', {
    method: 'POST',
    body: datasetPost,
    baseURL: $sitePath
  })

  catalog.value.datasets.push({
    id: resourceId,
    dataFairId: createdDataset.id,
    title: createdDataset.title
  })

  await $fetch(`${$apiPath}/catalogs/${catalog.value._id}`, {
    method: 'PATCH',
    body: {
      datasets: catalog.value.datasets
    }
  })
}

/**
 * Update a dataset in Data-Fair or create it if it doesn't exist
 * @param {string} resourceId - The ID of the catalog resource or catalog dataset
 * @param {any} datasetPost - The dataset data to be updated
 */
const updateDataFairDataset = async (resourceId: string, datasetPost: any, dataFairId: string) => {
  try {
    const datasetPostCopy = { ...datasetPost }
    delete datasetPostCopy.isMetaOnly
    await $fetch(`/data-fair/api/v1/datasets/${dataFairId}`, {
      method: 'PATCH',
      body: datasetPostCopy,
      baseURL: $sitePath
    })
  } catch (error: any) {
    if (error.status === 404) {
      // Delete the dataset from the catalog
      catalog.value.datasets = catalog.value.datasets.filter(d => d.dataFairId !== dataFairId)
      await $fetch(`${$apiPath}/catalogs/${catalog.value._id}`, {
        method: 'PATCH',
        body: {
          datasets: catalog.value.datasets
        }
      })
      // Create the dataset again
      await createDataFairDataset(resourceId, datasetPost)
    } else {
      throw error
    }
  }
  showOverwriteMenu.value[resourceId] = false
}

/**
 * Add properties to the dataset post or resource post
 * @param {any} dataset - The dataset object
 * @param {any} resourcePost - The resource post object
 */
const addProps = (dataset: any, resourcePost: any) => {
  if (dataset.description) resourcePost.description = dataset.description
  if (dataset.origin) resourcePost.origin = dataset.origin
  if (dataset.keywords) resourcePost.keywords = dataset.keywords
  if (dataset.image) resourcePost.image = dataset.image
  if (dataset.frequency) resourcePost.frequency = dataset.frequency
  if (dataset.license) resourcePost.license = dataset.license
}

</script>

<style scoped>
</style>
