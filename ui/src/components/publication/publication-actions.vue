<template>
  <!-- Link to remote publication -->
  <v-list-item
    v-if="publication.remoteFolder?.url || publication.remoteResource?.url"
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

  <!-- Notifications menu -->
  <v-menu
    v-if="eventsSubscribeUrl"
    v-model="showNotifMenu"
    :close-on-content-click="false"
    max-width="500"
  >
    <template #activator="{ props }">
      <v-list-item v-bind="props">
        <template #prepend>
          <v-icon
            color="primary"
            :icon="mdiBell"
          />
        </template>
        {{ t('notifications') }}
      </v-list-item>
    </template>
    <v-card :title="t('notifications')">
      <v-card-text class="pa-0">
        <d-frame :src="eventsSubscribeUrl" />
      </v-card-text>
    </v-card>
  </v-menu>

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
      :title="t('rePublish')"
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
      :title="t('deletePublication')"
      :loading="deletePublication.loading.value ? 'warning' : undefined"
    >
      <v-card-text class="pb-0">
        <div class="mb-4">
          {{ t('deletePublicationConfirm') }}
        </div>
        <v-radio-group
          v-model="keepRemotePublication"
          hide-details
        >
          <v-radio
            :value="false"
            class="align-start mb-2"
          >
            <template #label>
              <div>
                <div class="font-weight-medium">
                  {{ t('deleteRemotePublication') }}
                </div>
                <div class="text-caption font-italic">
                  {{ t('deleteRemotePublicationNote') }}
                </div>
              </div>
            </template>
          </v-radio>

          <v-radio
            :value="true"
            class="align-start"
          >
            <template #label>
              <div>
                <div class="font-weight-medium">
                  {{ t('keepRemotePublication') }}
                </div>
                <div class="text-caption font-italic">
                  {{ t('keepRemotePublicationNote') }}
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          :disabled="deletePublication.loading.value"
          @click="showDeleteMenu = false; keepRemotePublication = true"
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
</template>

<script setup lang="ts">
import type { Publication } from '#api/types'
import '@data-fair/frame/lib/d-frame.js'

const { t } = useI18n()
const router = useRouter()

const { publication } = defineProps<{
  publication: Publication
}>()

const showDeleteMenu = ref(false)
const showRePublishMenu = ref(false)
const showNotifMenu = ref(false)
/** If true, keep the remote publication (only remove sync link) */
const keepRemotePublication = ref(false)

const eventsSubscribeUrl = computed(() => {
  if (!publication?._id || !publication.catalog?.id) return ''
  const topics = [
    { key: `catalogs:publication-error:${publication._id}`, title: t('publicationError') }
  ]

  // catalogId => the id of the catalog
  // type => "import" or "publication"
  // itemId => the id of the import or publication
  const urlTemplate = window.parent.location.origin + '/data-fair/catalogs/{catalogId}/{type}/{itemId}'
  return `/events/embed/subscribe?key=${encodeURIComponent(topics.map(t => t.key).join(','))}&title=${encodeURIComponent(topics.map(t => t.title).join(','))}&url-template=${encodeURIComponent(urlTemplate)}&register=false`
})

const deletePublication = useAsyncAction(
  async () => {
    await $fetch(`/publications/${publication?._id}?onlyLink=${keepRemotePublication.value}`, {
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
  deletePublicationConfirm: 'What do you want to do with the publication on the remote catalog ?'
  deletePublication: 'Delete Publication'
  deleteRemotePublication: 'Also delete the publication on the remote catalog'
  deleteRemotePublicationNote: '(The publication will be deleted in both DataFair and the remote catalog.)'
  deletePublicationError: 'Error deleting publication'
  error: 'Error'
  keepRemotePublication: 'Keep the publication on the remote catalog'
  keepRemotePublicationNote: '(Only the synchronization link between the dataset and the remote catalog will be removed. The publication will remain accessible on the catalog.)'
  lastPublicationDate: 'Last Publication Date'
  no: 'No'
  notifications: Notifications
  rePublish: 'Re-Publish'
  rePublishConfirm: 'Are you sure you want to re-publish this dataset? The remote dataset will be overwritten.'
  publicationError: A publication failed.
  viewPublication: 'View Publication'
  viewSourceDataset: 'View Source Dataset'
  yes: 'Yes'

fr:
  createPublicationError: 'Erreur lors de la republication'
  deletePublicationConfirm: 'Que souhaitez-vous faire pour la publication sur le catalogue distant ?'
  deletePublication: 'Supprimer la publication'
  deletePublicationError: 'Erreur lors de la demande de suppression'
  deleteRemotePublication: 'Supprimer aussi la publication sur le catalogue distant'
  deleteRemotePublicationNote: '(La publication sera supprimée à la fois dans DataFair et sur le catalogue distant.)'
  error: 'Erreur'
  keepRemotePublication: 'Conserver la publication sur le catalogue distant'
  keepRemotePublicationNote: '(Seul le lien de synchronisation entre le jeu de données et le catalogue distant sera supprimé. La publication restera accessible sur le catalogue.)'
  lastPublicationDate: 'Date de la dernière publication'
  no: 'Non'
  notifications: Notifications
  rePublish: 'Re-publier'
  rePublishConfirm: 'Êtes-vous sûr de vouloir republier ce jeu de données ? Le jeu de données distant sera écrasé.'
  publicationError: Une publication a échoué.
  viewPublication: 'Voir la publication'
  viewSourceDataset: 'Voir le jeu de données source'
  yes: 'Oui'

</i18n>
