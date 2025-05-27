<template>
  <v-btn
    v-if="!imp"
    color="primary"
    density="comfortable"
    variant="text"
    :loading="importDataset.loading.value"
    :icon="remoteResource ? mdiDownload : mdiFolderDownload"
    :title="remoteResource ? t('createRemoteFileDataset') : t('createMetadataOnlyDataset')"
    @click="importDataset.execute()"
  />
  <template v-else>
    <v-menu
      v-model="showOverwriteMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          color="warning"
          density="comfortable"
          variant="text"
          :loading="importLoading"
          :icon="remoteResource ? mdiDownload : mdiFolderDownload"
          :title="remoteResource ? t('createRemoteFileDataset') : t('createMetadataOnlyDataset')"
        />
      </template>
      <v-card
        rounded="lg"
        variant="elevated"
        :loading="importLoading ? 'warning' : undefined"
        :title="t('overwriteDataset')"
        :text="t('confirmOverwriteDataset')"
      >
        <v-card-actions>
          <v-spacer />
          <v-btn
            :disabled="overwriteImport.loading.value"
            @click="showOverwriteMenu = false"
          >
            {{ t('no') }}
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="importLoading"
            @click="overwriteImport.execute()"
          >
            {{ t('yes') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
    <v-menu
      v-model="showDeleteMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          color="warning"
          density="comfortable"
          variant="text"
          :loading="deleteImport.loading.value"
          :icon="mdiDelete"
          :title="t('deleteDataset')"
        />
      </template>
      <v-card
        rounded="lg"
        variant="elevated"
        :loading="deleteImport.loading.value ? 'warning' : false"
        :title="t('deleteDataset')"
        :text="t('confirmDeleteDataset')"
      >
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="deleteImport.loading.value"
            @click="showDeleteMenu = false"
          >
            {{ t('no') }}
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="deleteImport.loading.value ? 'warning' : false"
            @click="deleteImport.execute()"
          >
            {{ t('yes') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </template>
</template>

<script setup lang="ts">
import type { CatalogDataset, CatalogResourceDataset } from '@data-fair/lib-common-types/catalog/index.ts'
import type { Catalog, Import } from '#api/types'

const { catalog, remoteDataset, remoteResource, imp } = defineProps <{
  catalog: Catalog
  remoteDataset: CatalogDataset
  remoteResource?: CatalogResourceDataset
  imp?: Import
}>()

const { t } = useI18n()
const showDeleteMenu = ref<boolean>(false)
const showOverwriteMenu = ref<boolean>(false)
const importLoading = computed(() =>
  importDataset.loading.value ||
  overwriteImport.loading.value ||
  deleteImport.loading.value ||
  (imp && ['waiting', 'running'].includes(imp.status))
)

const importDataset = useAsyncAction(
  async () => {
    const body: Record<string, any> = {
      catalog: {
        id: catalog._id,
        title: catalog.title
      },
      remoteDataset: {
        id: remoteDataset.id,
        title: remoteDataset.title
      }
    }
    if (remoteResource) {
      body.remoteResource = {
        id: remoteResource.id,
        title: remoteResource.title
      }
    }

    await $fetch(`${$apiPath}/imports`, { method: 'POST', body })
  },
  {
    error: t('errorCreatingDataset'),
  }
)

const overwriteImport = useAsyncAction(
  async () => {
    if (!imp) return // The import document was not found
    await $fetch(`${$apiPath}/imports/${imp._id}`, { method: 'PATCH' })
    showOverwriteMenu.value = false // Close the overwrite menu
  },
  {
    error: t('errorCreatingDataset'),
  }
)

const deleteImport = useAsyncAction(
  async () => {
    if (!imp?.dataFairDataset) return // The import was never processed or was not found

    // Delete the data fair dataset
    try {
      await $fetch(`/data-fair/api/v1/datasets/${imp.dataFairDataset.id}`, {
        method: 'DELETE',
        baseURL: $sitePath
      })
    } catch (error: any) {
      if (error.status !== 404) throw error
    }

    // Delete the import document
    await $fetch(`${$apiPath}/imports/${imp._id}`, { method: 'DELETE' })
    showDeleteMenu.value = false // Close the delete menu
  },
  {
    error: t('errorDeletingDataset'),
  }
)

</script>

<i18n lang="yaml">
  en:
    confirmDeleteDataset: Do you really want to delete this dataset? Warning, this action will permanently delete the dataset from the platform.
    confirmOverwriteDataset: Do you really want to overwrite the already imported information?
    createMetadataOnlyDataset: Create a "metadata only" type dataset
    createRemoteFileDataset: Create a dataset from the remote resource
    deleteDataset: Delete imported dataset
    errorCreatingDataset: Error while creating the dataset
    errorDeletingDataset: Error while deleting the dataset
    no: No
    overwriteDataset: Overwrite dataset
    yes: Yes

  fr:
    confirmDeleteDataset: Voulez-vous vraiment supprimer ce jeu de données ? Attention, cette action supprime définitivement le jeu de données de la plateforme.
    confirmOverwriteDataset: Voulez-vous vraiment écraser les données déjà importées ?
    createMetadataOnlyDataset: Créer un jeu de données de type "métadonnées seul"
    createRemoteFileDataset: Créer un jeu de données depuis la ressource distante
    deleteDataset: Supprimer le jeu de données importé
    errorCreatingDataset: Erreur lors de la création du jeu de données
    errorDeletingDataset: Erreur lors de la suppression du jeu de données
    no: Non
    overwriteDataset: Écraser le jeu de données
    yes: Oui
</i18n>

<style scoped>
</style>
