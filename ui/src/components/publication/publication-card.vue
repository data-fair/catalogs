<template>
  <v-card
    :title="fromCatalog ? t('publicationTitle.catalog', { title: publication.dataFairDataset.title ?? publication.dataFairDataset.id }) : t('publicationTitle.dataset', { title: publication.catalog.title ?? publication.catalog.id })"
    :subtitle="publication.action === 'delete' ? t(`publicationStatusDelete.${publication.status}`) : t(`publicationStatus.${publication.status}`)"
    :to="fromCatalog ? `/catalogs/${publication.catalog.id}/publications/${publication._id}` : undefined"
    :href="fromCatalog ? undefined : `/data-fair/catalogs/${publication.catalog.id}/publications/${publication._id}`"
    target="_top"
    class="h-100 d-flex flex-column"
  >
    <v-card-text>
      <div
        v-if="publication.action === 'createResource' || publication.action === 'replaceResource'"
        class="text-caption font-italic"
      >
        <!-- TODO: Use a text provided by the plugin -->
        {{ t('publishAsResource') }}
      </div>
      <!-- TODO: Show the last error if present -->
      <div v-if="publication.lastPublicationDate">
        {{ t('lastPublicationDate') }}: {{ dayjs(publication.lastPublicationDate).format('LLL') }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Publication } from '#api/types'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const { publication } = defineProps<{
  publication: Publication
  fromCatalog?: boolean
}>()

</script>

<i18n lang="yaml">
  en:
    error: 'Error'
    lastPublicationDate: 'Last Publication Date'
    publicationStatus:
      done: 'Dataset published'
      error: 'Publication error'
      running: 'Publication in progress'
      waiting: 'Waiting for publication'
    publicationStatusDelete:
      done: 'Publication deleted'
      error: 'Deletion failed'
      running: 'Deletion in progress'
      waiting: 'Waiting for deletion'
    publicationTitle:
      catalog: '{title}'
      dataset: '{title}'
    publishAsResource: 'This dataset is published as a resource of the remote dataset'

  fr:
    error: 'Erreur'
    lastPublicationDate: 'Date de la dernière publication'
    publicationStatus:
      done: 'Jeu de données publié'
      error: 'Publication en erreur'
      running: 'En cour de publication'
      waiting: 'En attente de publication'
    publicationStatusDelete:
      done: 'Publication supprimée'
      error: 'Suppression échouée'
      running: 'En cour de suppression'
      waiting: 'En attente suppression'
    publicationTitle:
      catalog: '{title}'
      dataset: '{title}'
    publishAsResource: 'Ce jeu de données est publié en tant que ressource du jeu de données distant'

</i18n>
