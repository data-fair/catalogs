<template>
  <v-list
    v-if="imp"
    data-iframe-height
    density="compact"
    style="background-color: transparent;"
  >
    <!-- Link to data-fair dataset -->
    <v-list-item
      v-if="imp.dataFairDataset"
      rounded
      :href="`${$sitePath}/data-fair/dataset/${imp.dataFairDataset.id}`"
      target="_blank"
    >
      <template #prepend>
        <v-icon
          color="primary"
          :icon="mdiOpenInNew"
        />
      </template>
      {{ t('viewDataset') }}
    </v-list-item>

    <!-- Link to remote resource -->
    <v-list-item
      v-if="imp.remoteResource.origin"
      rounded
      :href="imp.remoteResource.origin"
      target="_blank"
    >
      <template #prepend>
        <v-icon
          color="primary"
          :icon="mdiOpenInNew"
        />
      </template>
      {{ t('viewRemoteResource') }}
    </v-list-item>

    <!-- Re-import action -->
    <v-menu
      v-model="showReImportMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          :title="t('reImport')"
          :disabled="loading"
          rounded
        >
          <template #prepend>
            <v-icon
              color="warning"
              :icon="mdiDownload"
            />
          </template>
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        variant="elevated"
        :title="t('reImport')"
        :loading="reImport.loading.value ? 'warning' : undefined"
      >
        <v-card-text class="pb-0">
          {{ t('reImportConfirm') }}
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

    <!-- Delete import action -->
    <v-menu
      v-model="showDeleteMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          :title="t('deleteImport')"
          :disabled="loading"
          rounded
        >
          <template #prepend>
            <v-icon
              color="warning"
              :icon="mdiDelete"
            />
          </template>
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        variant="elevated"
        :title="t('deleteImport')"
        :loading="deleteImport.loading.value ? 'warning' : undefined"
      >
        <v-card-text class="pb-0">
          {{ t('deleteImportConfirm') }}
          <v-checkbox
            v-model="deleteImportedDataset"
            base-color="warning"
            color="warning"
            hide-details
            :label="t('deleteImportedDataset')"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            :disabled="deleteImport.loading.value"
            @click="showDeleteMenu = false; deleteImportedDataset = false"
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
  </v-list>
</template>

<script setup lang="ts">
import type { Import } from '#api/types'

const { t } = useI18n()
const router = useRouter()

const { imp } = defineProps<{
  imp: Import
}>()

const showDeleteMenu = ref(false)
const showReImportMenu = ref(false)
/** If true, delete the imported dataset */
const deleteImportedDataset = ref(false)

const deleteImport = useAsyncAction(
  async () => {
    await $fetch(`/imports/${imp._id}`, {
      method: 'DELETE'
    })

    if (deleteImportedDataset.value && imp.dataFairDataset) {
      await $fetch(`/data-fair/api/v1/datasets/${imp.dataFairDataset.id}`, {
        method: 'DELETE',
        baseURL: $sitePath // Because data-fair is served from the same origin
      })
    }
    await router.replace(`/catalogs/${imp.catalog.id}`)
    showDeleteMenu.value = false
  },
  {
    error: t('deleteImportError')
  }
)

const reImport = useAsyncAction(
  async () => {
    await $fetch(`/imports/${imp._id}`, {
      method: 'PATCH',
      body: { status: 'waiting' }
    })

    showReImportMenu.value = false
  }
)

const loading = computed(() => deleteImport.loading.value || reImport.loading.value || imp.status === 'running' || imp.status === 'waiting')

</script>

<i18n lang="yaml">
  en:
    deleteImport: 'Delete Import'
    deleteImportConfirm: 'Are you sure you want to delete this import?'
    deleteImportError: 'Error deleting import'
    deleteImportedDataset: 'Delete also imported dataset'
    no: 'No'
    reImport: 'Re-import'
    reImportConfirm: 'Are you sure you want to re-import this resource? The already imported data will be overwritten.'
    viewDataset: 'View imported dataset'
    viewRemoteResource: 'View remote resource'
    yes: 'Yes'

  fr:
    deleteImport: "Supprimer l'import"
    deleteImportConfirm: "Êtes-vous sûr de vouloir supprimer cet import ?"
    deleteImportError: 'Erreur lors de la demande de suppression'
    deleteImportedDataset: 'Supprimer également le jeu de données importé'
    no: 'Non'
    reImport: 'Re-importer'
    reImportConfirm: 'Êtes-vous sûr de vouloir réimporter cette ressource ? Les données déjà importées seront écrasées.'
    viewDataset: 'Voir le jeu de données importé'
    viewRemoteResource: 'Voir la source des données'
    yes: 'Oui'

</i18n>

<style scoped>
</style>
