<template>
  <v-list
    v-if="imp"
    data-iframe-height
    density="compact"
    style="background-color: transparent;"
  >
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

    <v-menu
      v-model="showReImportMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          rounded
          :disabled="deleteImport.loading.value || imp.status === 'running' || imp.status === 'waiting'"
        >
          <template #prepend>
            <v-icon
              color="warning"
              :icon="mdiUpload"
            />
          </template>
          {{ t('reImport') }}
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        :title="t('reImport')"
        variant="elevated"
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

    <v-menu
      v-model="showDeleteMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          rounded
          :disabled="imp.status === 'waiting'"
        >
          <template #prepend>
            <v-icon
              color="warning"
              :icon="mdiDelete"
            />
          </template>
          {{ t('deleteImport') }}
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        :title="t('deleteImport')"
        variant="elevated"
        :loading="deleteImport.loading.value ? 'warning' : undefined"
      >
        <v-card-text class="pb-0">
          {{ t('deleteImportConfirm') }}
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
  </v-list>
</template>

<script setup lang="ts">
import type { Import } from '#api/types'

const { t } = useI18n()
const router = useRouter()
// const importsStore = useImportsStore()

const { imp } = defineProps<{
  imp: Import
}>()

const showDeleteMenu = ref(false)
const showReImportMenu = ref(false)
/** If true, delete only the link between the local dataset and the remote resource */
const deleteOnlyLink = ref(false)

const deleteImport = useAsyncAction(
  async () => {
    await $fetch(`/imports/${imp._id}`, {
      method: 'DELETE'
    })

    if (!deleteOnlyLink.value && imp.dataFairDataset) {
      await $fetch(`/data-fair/api/v1/datasets/${imp.dataFairDataset.id}`, {
        method: 'DELETE',
        baseURL: $sitePath
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
    await $fetch(`${$apiPath}/imports/${imp._id}`, {
      method: 'PATCH',
      body: {
        status: 'waiting'
      }
    })

    // useImportWatch(importsStore, imp._id)
    showReImportMenu.value = false
  }
)

</script>

<i18n lang="yaml">
  en:
    deleteImport: 'Delete Import'
    deleteImportConfirm: 'Are you sure you want to delete this import? This action will also delete the imported dataset. However, you can choose to delete only the import: the link between the remote resource and the imported dataset will be removed.'
    deleteImportError: 'Error deleting import'
    deleteOnlyLink: 'Delete only the link'
    no: 'No'
    reImport: 'Re-import'
    reImportConfirm: 'Are you sure you want to re-import this resource? The already imported data will be overwritten.'
    viewDataset: 'View imported dataset'
    yes: 'Yes'

  fr:
    deleteImport: "Supprimer l'import"
    deleteImportConfirm: "Êtes-vous sûr de vouloir supprimer cet import ? Cette action supprimera également le jeu de données importé. Vous pouvez cependant choisir de supprimer uniquement l'import : le lien entre la ressource distante et jeu de données importé."
    deleteImportError: 'Erreur lors de la demande de suppression'
    deleteOnlyLink: 'Supprimer uniquement le lien'
    no: 'Non'
    reImport: 'Importer à nouveau'
    reImportConfirm: 'Êtes-vous sûr de vouloir réimporter cette resource ? Les données déjà importées seront écrasées.'
    viewDataset: 'Voir le jeu de données importé'
    yes: 'Oui'

</i18n>

<style scoped>
</style>
