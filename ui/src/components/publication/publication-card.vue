<template>
  <v-card
    :title="fromCatalog ? t('publicationTitle.catalog', { title: publication.dataFairDataset.title ?? publication.dataFairDataset.id }) : t('publicationTitle.dataset', { title: publication.catalog.title ?? publication.catalog.id })"
    :subtitle="publication.action === 'delete' ? t(`publicationStatusDelete.${publication.status}`) : t(`publicationStatus.${publication.status}`)"
  >
    <v-card-text class="pb-0">
      <div
        v-if="publication.action === 'addAsResource'"
        class="text-caption font-italic"
      >
        {{ t('publishAsResource') }}
      </div>
      <div
        v-if="publication.error"
        class="text-error"
      >
        {{ t('error') }}: {{ publication.error }}
      </div>
      <div v-if="publication.lastPublicationDate">
        {{ t('lastPublicationDate') }}: {{ dayjs(publication.lastPublicationDate).format('LLL') }}
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        v-if="publication.remoteDataset?.url"
        color="primary"
        density="comfortable"
        variant="text"
        :icon="mdiOpenInNew"
        :title="t('viewPublication')"
        :href="publication.remoteDataset.url"
        target="_blank"
      />
      <v-menu
        v-model="showRePublishMenu"
        :close-on-content-click="false"
        max-width="500"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            color="warning"
            density="comfortable"
            variant="text"
            :disabled="publication.status === 'waiting' && publication.action === 'delete'"
            :loading="rePublish.loading.value || (publication.status === 'waiting' && publication.action !== 'delete')"
            :icon="mdiUpload"
            :title="t('rePublish')"
          />
        </template>
        <v-card
          rounded="lg"
          :title="t('rePublish')"
          variant="elevated"
          :loading="rePublish.loading.value ? 'warning' : undefined"
        >
          <v-card-text class="pb-0">
            {{ t('rePublishComfirm') }}
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
            :disabled="publication.status === 'waiting' && publication.action !== 'delete'"
            :loading="deletePublication.loading.value || (publication.status === 'waiting' && publication.action === 'delete')"
            :icon="mdiDelete"
            :title="t('deletePublication')"
          />
        </template>
        <v-card
          rounded="lg"
          :title="t('deletePublication')"
          variant="elevated"
          :loading="deletePublication.loading.value ? 'warning' : undefined"
        >
          <v-card-text class="pb-0">
            {{ t('deletePublicationConfirm') }}
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
              :disabled="deletePublication.loading.value"
              @click="showDeleteMenu = false; deleteOnlyLink = false"
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
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Publication } from '#api/types'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()
const publicationsStore = usePublicationsStore()

const { publication } = defineProps<{
  publication: Publication
  fromCatalog?: boolean
}>()

const showDeleteMenu = ref(false)
const showRePublishMenu = ref(false)
/** If true, delete only the link between the local and the remote catalog */
const deleteOnlyLink = ref(false)

const deletePublication = useAsyncAction(
  async () => {
    await $fetch(`/publications/${publication?._id}?onlyLink=${deleteOnlyLink.value}`, {
      method: 'DELETE'
    })

    if (deleteOnlyLink.value) publicationsStore.refresh()
    else usePublicationWatch(publicationsStore, publication._id, ['update', 'delete'])
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

    publicationsStore.refresh()
    usePublicationWatch(publicationsStore, publication._id, 'update')
    showRePublishMenu.value = false
  },
  {
    error: t('createPublicationError')
  }
)

</script>

<i18n lang="yaml">
  en:
    createPublicationError: 'Error recreating publication'
    deleteOnlyLink: 'Delete only the link'
    deletePublication: 'Delete Publication'
    deletePublicationConfirm: 'Are you sure you want to delete this publication?'
    deletePublicationError: 'Error deleting publication'
    error: 'Error'
    lastPublicationDate: 'Last Publication Date'
    no: 'No'
    publicationStatus:
      waiting: 'Waiting for publication'
      running: 'Publication in progress'
      done: 'Dataset published'
      error: 'Publication error'
    publicationStatusDelete:
      waiting: 'En attente suppression'
      running: 'En cour de suppression'
      done: 'Publication supprimée'
      error: 'Suppression echouée'
    publicationTitle:
      catalog: '{title}'
      dataset: '{title}'
    publishAsResource: 'This dataset is published as a resource of the remote dataset'
    rePublish: 'Re-Publish'
    rePublishComfirm: 'Are you sure you want to re-publish this dataset? The remote dataset will be overwritten.'
    viewPublication: 'View Publication'
    yes: 'Yes'

  fr:
    createPublicationError: 'Erreur lors de la republication'
    deleteOnlyLink: 'Supprimer uniquement le lien'
    deletePublication: 'Supprimer la publication'
    deletePublicationConfirm: 'Êtes-vous sûr de vouloir supprimer la publication ? Cette action supprimera le jeu de données distant. Vous pouvez cependant choisir de supprimer seulement le lien entre le jeu de données local et le jeu de données distant.'
    deletePublicationError: 'Erreur lors de la demande de suppression'
    error: 'Erreur'
    lastPublicationDate: 'Date de la dernière publication'
    no: 'Non'
    publicationStatus:
      waiting: 'En attente de publication'
      running: 'En cour de publication'
      done: 'Jeu de données publié'
      error: 'Publication en erreur'
    publicationStatusDelete:
      waiting: 'En attente suppression'
      running: 'En cour de suppression'
      done: 'Publication supprimée'
      error: 'Suppression echouée'
    publicationTitle:
      catalog: '{title}'
      dataset: '{title}'
    publishAsResource: 'Ce jeu de données est publié en tant que ressource du jeu de données distant'
    rePublish: 'Re-publier'
    rePublishComfirm: 'Êtes-vous sûr de vouloir republier ce jeu de données ? Le jeu de données distant sera écrasé.'
    viewPublication: 'Voir la publication'
    yes: 'Oui'

</i18n>

<style scoped>
</style>
