<template>
  <v-list
    v-if="publication"
    data-iframe-height
    density="compact"
    style="background-color: transparent;"
  >
    <!-- Link to remote publication -->
    <v-list-item
      v-if="publication.remoteFolder?.url || publication.remoteResource?.url"
      rounded
      :href="publication.remoteFolder?.url || publication.remoteResource?.url"
      target="_blank"
    >
      <template #prepend>
        <v-icon
          color="primary"
          :icon="mdiOpenInNew"
        />
      </template>
      {{ t('viewPublication') }}
    </v-list-item>

    <!-- Link to source dataset -->
    <v-list-item
      v-if="publication.dataFairDataset"
      rounded
      :href="`${$sitePath}/data-fair/dataset/${publication.dataFairDataset.id}`"
      target="_blank"
    >
      <template #prepend>
        <v-icon
          color="primary"
          :icon="mdiOpenInNew"
        />
      </template>
      {{ t('viewSourceDataset') }}
    </v-list-item>

    <!-- Re-publish action -->
    <v-menu
      v-model="showRePublishMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          :title="t('rePublish')"
          :disabled="loading"
          rounded
        >
          <template #prepend>
            <v-icon
              color="warning"
              :icon="mdiUpload"
            />
          </template>
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        :title="t('rePublish')"
        variant="elevated"
        :loading="rePublish.loading.value ? 'warning' : undefined"
      >
        <v-card-text class="pb-0">
          {{ t('rePublishConfirm') }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            :disabled="rePublish.loading.value"
            @click="showRePublishMenu = false;"
          >
            {{ t('no') }}
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="rePublish.loading.value"
            @click="rePublish.execute()"
          >
            {{ t('yes') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>

    <!-- Delete publication action -->
    <v-menu
      v-model="showDeleteMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          :disabled="loading"
          rounded
        >
          <template #prepend>
            <v-icon
              color="warning"
              :icon="mdiDelete"
            />
          </template>
          {{ t('deletePublication') }}
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        variant="elevated"
        :title="t('deletePublication')"
        :loading="deletePublication.loading.value ? 'warning' : undefined"
      >
        <v-card-text class="pb-0">
          {{ t('deletePublicationConfirm') }}
          <v-checkbox
            v-model="deleteRemotePublication"
            base-color="warning"
            color="warning"
            hide-details
            :label="t('deleteRemotePublication')"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            :disabled="deletePublication.loading.value"
            @click="showDeleteMenu = false; deleteRemotePublication = false"
          >
            {{ t('no') }}
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="deletePublication.loading.value"
            @click="deletePublication.execute()"
          >
            {{ t('yes') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </v-list>
</template>

<script setup lang="ts">
import type { Publication } from '#api/types'

const { t } = useI18n()
const router = useRouter()

const { publication } = defineProps<{
  publication: Publication
}>()

const showDeleteMenu = ref(false)
const showRePublishMenu = ref(false)
/** If true, delete the remote publication */
const deleteRemotePublication = ref(false)

const deletePublication = useAsyncAction(
  async () => {
    await $fetch(`/publications/${publication?._id}?onlyLink=${!deleteRemotePublication.value}`, {
      method: 'DELETE'
    })

    await router.replace(`/catalogs/${publication.catalog.id}`)
    showDeleteMenu.value = false
  },
  {
    error: t('deletePublicationError')
  }
)

const rePublish = useAsyncAction(
  async () => {
    await $fetch(`/publications/${publication?._id}`, {
      method: 'POST'
    })

    showRePublishMenu.value = false
  },
  {
    error: t('createPublicationError')
  }
)

const loading = computed(() => deletePublication.loading.value || rePublish.loading.value || publication.status === 'running' || publication.status === 'waiting')

</script>

<i18n lang="yaml">
en:
  createPublicationError: 'Error recreating publication'
  deleteRemotePublication: 'Delete also remote publication'
  deletePublication: 'Delete Publication'
  deletePublicationConfirm: 'Are you sure you want to delete this publication?'
  deletePublicationError: 'Error deleting publication'
  error: 'Error'
  lastPublicationDate: 'Last Publication Date'
  no: 'No'
  rePublish: 'Re-Publish'
  rePublishConfirm: 'Are you sure you want to re-publish this dataset? The remote dataset will be overwritten.'
  viewPublication: 'View Publication'
  viewSourceDataset: 'View Source Dataset'
  yes: 'Yes'

fr:
  createPublicationError: 'Erreur lors de la republication'
  deleteRemotePublication: 'Supprimer également la publication distante'
  deletePublication: 'Supprimer la publication'
  deletePublicationConfirm: 'Êtes-vous sûr de vouloir supprimer la publication ?'
  deletePublicationError: 'Erreur lors de la demande de suppression'
  error: 'Erreur'
  lastPublicationDate: 'Date de la dernière publication'
  no: 'Non'
  rePublish: 'Re-publier'
  rePublishConfirm: 'Êtes-vous sûr de vouloir republier ce jeu de données ? Le jeu de données distant sera écrasé.'
  viewPublication: 'Voir la publication'
  viewSourceDataset: 'Voir le jeu de données source'
  yes: 'Oui'

</i18n>

<style scoped>
</style>
