<template>
  <v-card
    :title="t('importTitle', { title: imp.remoteResource?.title ?? imp.remoteResource?.id })"
    :subtitle="t(`importStatus.${imp.status}`)"
  >
    <v-card-text class="pb-0">
      <!-- <div
        v-if="imp.error"
        class="text-error"
      >
        {{ t('error') }}: {{ imp.error }}
      </div> -->
      <div v-if="imp.lastImportDate">
        {{ t('lastImportDate') }}: {{ dayjs(imp.lastImportDate).format('LLL') }}
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        color="primary"
        density="comfortable"
        variant="text"
        :icon="mdiOpenInNew"
        :title="t('viewDataset')"
      />
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
            {{ t('rePublishComfirm') }}
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
    await $fetch(`/imports/${imp?._id}?onlyLink=${deleteOnlyLink.value}`, {
      method: 'DELETE'
    })

    if (deleteOnlyLink) emit('onDelete')
    else {
      // TODO: delete the datafair dataset
    }
    showDeleteMenu.value = false
  },
  {
    error: t('deleteImportError')
  }
)

const reImport = useAsyncAction(
  async () => {
    await $fetch(`/import/${imp?._id}`, {
      method: 'POST'
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
    deleteDatasetConfirm: 'Are you sure you want to delete this dataset?'
    deleteImportError: 'Error deleting import'
    error: 'Error'
    importTitle: '{title}'
    lastImportDate: 'Last Import Date'
    no: 'No'
    importStatus:
      waiting: 'Waiting for import'
      running: 'Import in progress'
      done: 'Dataset imported'
      error: 'Import error'
    reImport: 'Re-Import'
    rePublishComfirm: 'Are you sure you want to re-import this dataset? The local dataset will be overwritten.'
    viewDataset: 'View Dataset'
    yes: 'Yes'

  fr:
    createImportError: "Erreur lors de la création de l'import"
    deleteOnlyLink: 'Supprimer uniquement le lien'
    deleteDataset: 'Supprimer le jeu de données'
    deleteDatasetConfirm: 'Êtes-vous sûr de vouloir supprimer ce jeu de données ? Cette action supprimera le jeu de données local. Vous pouvez cependant choisir de supprimer seulement le lien entre le jeu de données local et la ressource distante.'
    deleteImportError: 'Erreur lors de la demande de suppression'
    error: 'Erreur'
    importTitle: '{title}'
    lastImportDate: 'Date de dernier import'
    no: 'Non'
    importStatus:
      waiting: "En attente d'import"
      running: 'Import en cours'
      done: 'Jeu de données importé'
      error: 'Import en erreur'
    reImport: 'Re-importer'
    rePublishComfirm: 'Êtes-vous sûr de vouloir re-importer cette resource ? Le jeu de données local sera écrasé.'
    viewDataset: 'Voir le jeu de données'
    yes: 'Oui'

</i18n>

<style scoped>
</style>
