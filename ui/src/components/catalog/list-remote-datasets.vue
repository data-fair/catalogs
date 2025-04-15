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
      {{ t('datasetsInCatalog', 0) }}
    </h4>
    <template v-else>
      <h4 class="text-h5 mb-2">
        {{ t('datasetsInCatalog', catalogDatasets.data.value.count) }}
      </h4>
      <v-card
        v-for="dataset in catalogDatasets.data.value.results"
        :key="dataset.id"
        class="mb-4"
      >
        <v-card-item>
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
          <template #append>
            <v-btn
              v-if="!catalog.datasets.find(d => d.id === dataset.id)"
              color="primary"
              density="comfortable"
              variant="text"
              :loading="createDataset.loading.value"
              :icon="mdiImport"
              :title="t('createMetadataOnlyDataset')"
              @click="createDataset.execute(dataset)"
            />
            <template v-else>
              <v-menu
                v-model="showDeleteMenu[dataset.id]"
                :close-on-content-click="false"
                max-width="500"
              >
                <template #activator="{ props: deleteDatasetProps }">
                  <v-btn
                    v-bind="deleteDatasetProps"
                    color="warning"
                    density="comfortable"
                    variant="text"
                    :loading="deleteDataset.loading.value"
                    :icon="mdiDelete"
                    :title="t('deleteDataset')"
                  />
                </template>
                <v-card
                  rounded="lg"
                  variant="elevated"
                  :loading="deleteDataset.loading.value ? 'warning' : undefined"
                  :title="t('deleteDataset')"
                >
                  <v-card-text>
                    {{ t('confirmDeleteDataset') }}
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      variant="text"
                      :disabled="deleteDataset.loading.value"
                      @click="showDeleteMenu[dataset.id] = false"
                    >
                      {{ t('no') }}
                    </v-btn>
                    <v-btn
                      color="warning"
                      variant="flat"
                      :loading="deleteDataset.loading.value ? 'warning' : false"
                      @click="deleteDataset.execute(dataset.id)"
                    >
                      {{ t('yes') }}
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
              <v-menu
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
                    :icon="mdiImport"
                    :title="t('createMetadataOnlyDataset')"
                  />
                </template>
                <v-card
                  rounded="lg"
                  variant="elevated"
                  :loading="createDataset.loading.value ? 'warning' : false"
                  :title="t('overwriteDataset')"
                  :text="t('confirmOverwriteDataset')"
                >
                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      variant="text"
                      :disabled="createDataset.loading.value"
                      @click="showOverwriteMenu[dataset.id] = false"
                    >
                      {{ t('no') }}
                    </v-btn>
                    <v-btn
                      color="warning"
                      variant="flat"
                      :loading="createDataset.loading.value ? 'warning' : false"
                      @click="createDataset.execute(dataset)"
                    >
                      {{ t('yes') }}
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
            </template>
          </template>
        </v-card-item>

        <v-card-text>
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
                  variant="text"
                  :icon="mdiDownload"
                  :loading="createDataset.loading.value"
                  :title="t('createRemoteFileDataset')"
                  @click="createDataset.execute(dataset, resource)"
                />
                <template v-else>
                  <v-menu
                    v-model="showDeleteMenu[resource.id]"
                    :close-on-content-click="false"
                    max-width="500"
                  >
                    <template #activator="{ props: deleteResourceProps }">
                      <v-btn
                        v-bind="deleteResourceProps"
                        color="warning"
                        density="comfortable"
                        variant="text"
                        :loading="deleteDataset.loading.value"
                        :icon="mdiDelete"
                        :title="t('deleteDataset')"
                      />
                    </template>
                    <v-card
                      rounded="lg"
                      variant="elevated"
                      :loading="deleteDataset.loading.value ? 'warning' : false"
                      :title="t('deleteDataset')"
                      :text="t('confirmDeleteDataset')"
                    >
                      <v-card-actions>
                        <v-spacer />
                        <v-btn
                          variant="text"
                          :disabled="deleteDataset.loading.value"
                          @click="showDeleteMenu[resource.id] = false"
                        >
                          {{ t('no') }}
                        </v-btn>
                        <v-btn
                          color="warning"
                          variant="flat"
                          :loading="deleteDataset.loading.value ? 'warning' : false"
                          @click="deleteDataset.execute(resource.id)"
                        >
                          {{ t('yes') }}
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-menu>
                  <v-menu
                    v-model="showOverwriteMenu[resource.id]"
                    :close-on-content-click="false"
                    max-width="500"
                  >
                    <template #activator="{ props: createResourceProps }">
                      <v-btn
                        v-bind="createResourceProps"
                        color="warning"
                        density="comfortable"
                        variant="text"
                        :icon="mdiDownload"
                        :title="t('createRemoteFileDataset')"
                      />
                    </template>
                    <v-card
                      rounded="lg"
                      variant="elevated"
                      :loading="createDataset.loading.value ? 'warning' : false"
                      :title="t('overwriteDataset')"
                      :text="t('confirmOverwriteDataset')"
                    >
                      <v-card-actions>
                        <v-spacer />
                        <v-btn
                          variant="text"
                          :disabled="createDataset.loading.value"
                          @click="showOverwriteMenu[resource.id] = false"
                        >
                          {{ t('no') }}
                        </v-btn>
                        <v-btn
                          color="warning"
                          variant="flat"
                          :loading="createDataset.loading.value ? 'warning' : false"
                          @click="createDataset.execute(dataset, resource)"
                        >
                          {{ t('yes') }}
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-menu>
                </template>
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

const { t } = useI18n()
const { catalog } = toRefs(props)
const showDeleteMenu = ref<Record<string, boolean>>({})
const showOverwriteMenu = ref<Record<string, boolean>>({})
const catalogDatasets = useFetch<{ count: number, results: CatalogDataset[] }>(`${$apiPath}/catalogs/${catalog.value._id}/datasets`)

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
    success: t('datasetCreated'),
    error: t('errorCreatingDataset'),
  }
)

const deleteDataset = useAsyncAction(
  async (resourceId: string) => {
    const dataFairId = catalog.value.datasets.find(d => d.id === resourceId)?.dataFairId
    if (dataFairId) {
      try {
        await $fetch(`/data-fair/api/v1/datasets/${dataFairId}`, {
          method: 'DELETE',
          baseURL: $sitePath
        })
      } catch (error: any) {
        if (error.status !== 404) throw error
      }
    }
    catalog.value.datasets = catalog.value.datasets.filter(d => d.id !== resourceId)
    await $fetch(`${$apiPath}/catalogs/${catalog.value._id}`, {
      method: 'PATCH',
      body: {
        datasets: catalog.value.datasets
      }
    })
    showDeleteMenu.value[resourceId] = false
  },
  {
    success: t('datasetDeleted'),
    error: t('errorDeletingDataset'),
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

<i18n lang="yaml">
  en:
    confirmDeleteDataset: Do you really want to delete this dataset?
    confirmOverwriteDataset: Do you really want to overwrite the already imported information?
    createMetadataOnlyDataset: Create a "metadata only" type dataset
    createRemoteFileDataset: Create a "remote file" type dataset
    datasetCreated: Dataset created!
    datasetDeleted: Dataset deleted!
    datasetIsPrivate: The dataset is private
    datasetIsPublic: The dataset is public
    datasetNotFound: Dataset not found
    datasetsInCatalog: datasets in the catalog
    deleteDataset: Delete dataset
    errorCreatingDataset: Error while creating the dataset
    errorDeletingDataset: Error while deleting the dataset
    no: No
    overwriteDataset: Overwrite dataset
    yes: Yes

  fr:
    confirmDeleteDataset: Voulez-vous vraiment supprimer ce jeu de données ?
    confirmOverwriteDataset: Voulez-vous vraiment écraser les informations déjà importées ?
    createMetadataOnlyDataset: Créer un jeu de données de type "métadonnées seul"
    createRemoteFileDataset: Créer un jeu de données de type "fichier distant"
    datasetCreated: Jeu de données créé !
    datasetDeleted: Jeu de données supprimé !
    datasetIsPrivate: Le jeu de données est privé
    datasetIsPublic: Le jeu de données est public
    datasetNotFound: Jeu de données non trouvé
    datasetsInCatalog: Aucun jeu de données sur le catalogue | {n} jeu de données dans le catalogue | {n} jeux de données dans le catalogue
    deleteDataset: Supprimer le jeu de données
    errorCreatingDataset: Erreur lors de la création du jeu de données
    errorDeletingDataset: Erreur lors de la suppression du jeu de données
    no: Non
    overwriteDataset: Écraser le jeu de données
    yes: Oui
</i18n>

<style scoped>
</style>
