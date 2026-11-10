<template>
  <card-shell
    :title="fromCatalog ? (publication.dataFairDataset.title ?? publication.dataFairDataset.id) : (publication.catalog.title ?? publication.catalog.id)"
    :to="fromCatalog ? `/catalogs/${publication.catalog.id}/publications/${publication._id}` : undefined"
    :href="fromCatalog ? undefined : `/data-fair/catalogs/${publication.catalog.id}/publications/${publication._id}`"
    target="_top"
  >
    <!-- Publication mode: a deletion replaces the action, the publication mode is not known anymore -->
    <card-meta-line
      v-if="publication.action !== 'delete'"
      :icon="mdiUpload"
      icon-color="primary"
      :text="publication.action === 'createResource' || publication.action === 'replaceResource' ? t('asResource') : t('asDataset')"
    />

    <!-- Remote folder -->
    <card-meta-line
      v-if="publication.remoteFolder"
      :icon="mdiFolder"
      :text="publication.remoteFolder.title ?? publication.remoteFolder.id"
    />

    <template #footer>
      <!-- Last publication date -->
      <span class="px-1">
        {{ publication.lastPublicationDate ? t('published', { date: dayjs(publication.lastPublicationDate).format('L') }) : t('neverPublished') }}
      </span>
      <!-- Publication status, on the right -->
      <v-spacer />
      <card-state-info
        v-bind="state"
        :help="statusHelp"
      />
    </template>
  </card-shell>
</template>

<script setup lang="ts">
import type { Publication } from '#api/types'
import { mdiClockOutline, mdiDeleteClock, mdiSync } from '@mdi/js'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const { publication } = defineProps<{
  publication: Publication
  fromCatalog?: boolean
}>()

const isDelete = computed(() => publication.action === 'delete')

const state = computed(() => ({
  done: { icon: mdiCheckCircle, color: 'success', text: t(isDelete.value ? 'status.deleted' : 'status.done') },
  error: { icon: mdiAlert, color: 'error', text: t('status.error'), strong: true },
  running: { icon: mdiSync, color: 'primary', text: t('status.running'), loading: true },
  waiting: isDelete.value
    ? { icon: mdiDeleteClock, color: 'warning', text: t('status.toDelete'), strong: true }
    : { icon: mdiClockOutline, text: t('status.waiting') }
})[publication.status])

const statusHelp = computed(() => {
  if (isDelete.value) return t(`publicationStatusDelete.${publication.status}`)
  if (publication.status === 'error') {
    const error = publication.logs?.filter(log => log.type === 'error').pop()
    if (error) return t('errorAt', { date: dayjs(error.date).format('L'), msg: error.msg })
  }
  if (publication.status === 'done' && publication.lastPublicationDate) {
    return t('lastPublication', { date: dayjs(publication.lastPublicationDate).format('L'), time: dayjs(publication.lastPublicationDate).format('LT') })
  }
  if (publication.status === 'waiting' && !publication.lastPublicationDate) return t('firstWaiting')
  return t(`publicationStatus.${publication.status}`)
})
</script>

<i18n lang="yaml">
  en:
    asResource: As a resource
    asDataset: As a dataset
    published: 'Published on {date}'
    neverPublished: Never published
    lastPublication: 'Last publication on {date} at {time}'
    errorAt: 'Publication error on {date}: {msg}'
    firstWaiting: Waiting for the first publication
    status:
      done: Published
      deleted: Deleted
      error: In error
      running: In progress
      waiting: Waiting
      toDelete: To delete
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

  fr:
    asResource: Comme ressource
    asDataset: Comme jeu de données
    published: 'Publié le {date}'
    neverPublished: Jamais publié
    lastPublication: 'Dernière publication le {date} à {time}'
    errorAt: 'Publication en erreur le {date} : {msg}'
    firstWaiting: En attente de la première publication
    status:
      done: Publié
      deleted: Supprimé
      error: En erreur
      running: En cours
      waiting: En attente
      toDelete: À supprimer
    publicationStatus:
      done: 'Jeu de données publié'
      error: 'Publication en erreur'
      running: 'En cours de publication'
      waiting: 'En attente de publication'
    publicationStatusDelete:
      done: 'Publication supprimée'
      error: 'Suppression échouée'
      running: 'En cours de suppression'
      waiting: 'En attente de suppression'

</i18n>
