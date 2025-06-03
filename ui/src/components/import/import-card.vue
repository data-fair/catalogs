<template>
  <v-card
    :title="t('importTitle', { title: imp.remoteResource?.title ?? imp.remoteResource?.id })"
    :subtitle="t(`importStatus.${imp.status}`)"
    class="h-100 d-flex flex-column"
  >
    <v-card-text class="pb-0">
      <div
        v-if="imp.error"
        class="text-error"
      >
        {{ t('error') }}: {{ imp.error }}
      </div>
      <div v-if="imp.lastImportDate">
        {{ t('lastImportDate') }} {{ dayjs(imp.lastImportDate).format('LLL') }}
      </div>
      <div v-if="imp.nextImportDate">
        {{ t('nextImportDate') }} {{ dayjs(imp.nextImportDate).format('LLL') }}
      </div>
    </v-card-text>
    <v-card-actions class="mt-auto">
      <v-spacer />
      <v-menu
        v-model="showReImportMenu"
        :close-on-content-click="false"
        max-width="500"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            color="warning"
            density="comfortable"
            variant="text"
            :icon="mdiUpload"
            :title="t('reImport')"
          />
        </template>
        <v-card
          rounded="lg"
          :title="t('reImport')"
          variant="elevated"
          :loading="reImport.loading.value ? 'warning' : undefined"
        >
          <v-card-text class="pb-0">
            {{ t('reImportComfirm') }}
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              :disabled="reImport.loading.value"
              @click="showReImportMenu = false;"
            >
              {{ t('no') }}
            </v-btn>
            <v-btn
              color="warning"
              variant="flat"
              :loading="reImport.loading.value"
              @click="reImport.execute()"
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
            :icon="mdiDelete"
            :title="t('deleteDataset')"
          />
        </template>
        <v-card
          rounded="lg"
          :title="t('deleteDataset')"
          variant="elevated"
          :loading="deleteImport.loading.value ? 'warning' : undefined"
        >
          <v-card-text class="pb-0">
            {{ t('deleteDatasetConfirm') }}
            <v-checkbox
              v-model="deleteOnlyLink"
              base-color="warning"
              color="warning"
              hide-details
              :label="t('deleteOnlyLink')"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              :disabled="deleteImport.loading.value"
              @click="showDeleteMenu = false; deleteOnlyLink = false"
            >
              {{ t('no') }}
            </v-btn>
            <v-btn
              color="warning"
              variant="flat"
              :loading="deleteImport.loading.value"
              @click="deleteImport.execute()"
            >
              {{ t('yes') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Import } from '#api/types'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const { imp } = defineProps<{
  imp: Import
}>()

const emit = defineEmits<{
  (e: 'onDelete'): void
}>()

const showDeleteMenu = ref(false)
const showReImportMenu = ref(false)
/** If true, delete only the link between the local dataset and the remote resource */
const deleteOnlyLink = ref(false)

const deleteImport = useAsyncAction(
  async () => {
    await $fetch(`/imports/${imp._id}?onlyLink=${deleteOnlyLink.value}`, {
      method: 'DELETE'
    })

    if (!deleteOnlyLink.value) {
      await $fetch(`/data-fair/api/v1/datasets/${imp.dataFairDataset?.id}`, {
        method: 'DELETE',
        baseURL: $sitePath
      })
    }
    emit('onDelete')
    showDeleteMenu.value = false
  },
  {
    error: t('deleteImportError')
  }
)

const reImport = useAsyncAction(
  async () => {
    await $fetch('/imports', {
      method: 'POST',
      body: {
        catalog: imp.catalog,
        remoteResource: imp.remoteResource,
        scheduling: imp.scheduling,
        config: imp.config
      }
    })

    // TODO: subscribe ws
    showReImportMenu.value = false
  },
  {
    error: t('createImportError')
  }
)

</script>

<i18n lang="yaml">
  en:
    createImportError: 'Error creating import'
    deleteOnlyLink: 'Delete only the link'
    deleteDataset: 'Delete Dataset'
    deleteDatasetConfirm: 'Are you sure you want to delete this import? This action will also delete the imported dataset. However, you can choose to delete only the import: the link between the remote resource and the imported dataset will be removed.'
    deleteImportError: 'Error deleting import'
    error: 'Error'
    importTitle: '{title}'
    lastImportDate: 'Last Import Date:'
    nextImportDate: 'Next Import Date:'
    no: 'No'
    importStatus:
      waiting: 'Waiting for import'
      running: 'Import in progress'
      done: 'Dataset imported'
      error: 'Import error'
    reImport: 'Re-import'
    reImportComfirm: 'Are you sure you want to re-import this resource? The already imported data will be overwritten.'
    viewDataset: 'View Dataset'
    yes: 'Yes'

  fr:
    createImportError: "Erreur lors de la création de l'import"
    deleteOnlyLink: 'Supprimer uniquement le lien'
    deleteDataset: 'Supprimer le jeu de données'
    deleteDatasetConfirm: "Êtes-vous sûr de vouloir supprimer cet import ? Cette action supprimera également le jeu de données importé. Vous pouvez cependant choisir de supprimer uniquement l'import : le lien entre la ressource distante et jeu de données importé."
    deleteImportError: 'Erreur lors de la demande de suppression'
    error: 'Erreur'
    importTitle: '{title}'
    lastImportDate: 'Date du dernier import :'
    nextImportDate: 'Date du prochain import :'
    no: 'Non'
    importStatus:
      waiting: "En attente d'import"
      running: 'Import en cours'
      done: 'Jeu de données importé'
      error: 'Import en erreur'
    reImport: 'Importer à nouveau'
    reImportComfirm: 'Êtes-vous sûr de vouloir réimporter cette resource ? Les données déjà importées seront écrasées.'
    viewDataset: 'Voir le jeu de données'
    yes: 'Oui'

</i18n>

<style scoped>
</style>
