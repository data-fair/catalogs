<template>
  <card-shell
    :title="imp.remoteResource?.title ?? imp.remoteResource?.id"
    :to="`/catalogs/${imp.catalog.id}/imports/${imp._id}`"
  >
    <!-- Target dataset -->
    <card-meta-line
      :icon="mdiDatabase"
      icon-color="primary"
      :text="imp.dataFairDataset ? (imp.dataFairDataset.title ?? imp.dataFairDataset.id) : t('newDataset')"
    />

    <!-- Scheduling -->
    <card-meta-line
      :icon="mdiSync"
      :icon-color="imp.nextImportDate ? 'primary' : undefined"
      :text="schedule"
    >
      <template
        v-if="imp.nextImportDate"
        #help
      >
        {{ t('nextImport', dateTime(imp.nextImportDate)) }}
      </template>
    </card-meta-line>

    <template #footer>
      <!-- Last import -->
      <card-hover-info
        :title="t('lastImport')"
        shrink
      >
        <span class="text-truncate">{{ lastImport.text }}</span>
        <template #help>
          {{ lastImport.help }}
          <div
            v-if="imp.shouldUpdateMetadata || imp.shouldUpdateSchema"
            class="mt-1"
          >
            {{ t(imp.shouldUpdateMetadata && imp.shouldUpdateSchema ? 'updatesBoth' : imp.shouldUpdateMetadata ? 'updatesMetadata' : 'updatesSchema') }}
          </div>
        </template>
      </card-hover-info>
      <!-- Import status, on the right -->
      <v-spacer />
      <card-state-info
        v-bind="statuses[imp.status]"
        :help="statusHelp"
      />
    </template>
  </card-shell>
</template>

<script setup lang="ts">
import type { Import } from '#api/types'
import { mdiClockOutline, mdiDatabase, mdiSync } from '@mdi/js'
import cronstrue from 'cronstrue'
import 'cronstrue/locales/en'
import 'cronstrue/locales/fr'
import { toCRON } from '@data-fair/catalogs-shared/cron.ts'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()
const session = useSession()

const { imp } = defineProps<{
  imp: Import
}>()

const dateTime = (date: string) => ({ date: dayjs(date).format('L'), time: dayjs(date).format('LT') })

const schedule = computed(() => {
  if (imp.isSchedulingActive === false || !imp.scheduling.length) return t('manual')
  return imp.scheduling.map(s => cronstrue.toString(toCRON(s), { locale: session.lang.value })).join(' · ')
})

const lastImport = computed(() => {
  if (imp.status === 'running' && imp.startedAt) return { text: t('started', { from: dayjs(imp.startedAt).fromNow() }), help: t('startedHelp', dateTime(imp.startedAt)) }
  if (imp.lastImportDate) return { text: t('imported', dateTime(imp.lastImportDate)), help: t('importedHelp', dateTime(imp.lastImportDate)) }
  return { text: t('neverImported'), help: t('createdHelp', dateTime(imp.created.date)) }
})

const statuses = computed(() => ({
  done: { icon: mdiCheckCircle, color: 'success', text: t('status.done') },
  error: { icon: mdiAlert, color: 'error', text: t('status.error'), strong: true },
  running: { icon: mdiSync, color: 'primary', text: t('status.running'), loading: true },
  waiting: { icon: mdiClockOutline, text: t('status.waiting') }
}))

const statusHelp = computed(() => {
  if (imp.status === 'error') return imp.finishedAt ? t('statusHelp.errorAt', dateTime(imp.finishedAt)) : t('statusHelp.error')
  if (imp.status === 'waiting' && !imp.lastImportDate) return t('statusHelp.firstWaiting')
  return t(`statusHelp.${imp.status}`)
})
</script>

<i18n lang="yaml">
  en:
    newDataset: New dataset
    manual: Manual import
    nextImport: 'Next import on {date} at {time}'
    lastImport: Last import
    imported: 'Imported on {date}'
    importedHelp: 'Last successful import on {date} at {time}'
    started: 'Started {from}'
    startedHelp: 'Import started on {date} at {time}'
    neverImported: Never imported
    createdHelp: 'Created on {date}'
    updatesMetadata: Overwrites the metadata
    updatesSchema: Overwrites the schema
    updatesBoth: Overwrites the metadata and the schema
    status:
      done: Imported
      error: In error
      running: In progress
      waiting: Waiting
    statusHelp:
      done: Dataset imported
      error: Import error
      errorAt: 'Import error on {date} at {time}'
      running: Import in progress
      waiting: Waiting for import
      firstWaiting: Waiting for the first import

  fr:
    newDataset: Nouveau jeu de données
    manual: Import manuel
    nextImport: 'Prochain import le {date} à {time}'
    lastImport: Dernier import
    imported: 'Importé le {date}'
    importedHelp: 'Dernier import réussi le {date} à {time}'
    started: 'Démarré {from}'
    startedHelp: 'Import démarré le {date} à {time}'
    neverImported: Jamais importé
    createdHelp: 'Créé le {date}'
    updatesMetadata: Écrase les métadonnées
    updatesSchema: Écrase le schéma
    updatesBoth: Écrase les métadonnées et le schéma
    status:
      done: Importé
      error: En erreur
      running: En cours
      waiting: En attente
    statusHelp:
      done: Jeu de données importé
      error: Import en erreur
      errorAt: 'Import en erreur le {date} à {time}'
      running: Import en cours
      waiting: "En attente d'import"
      firstWaiting: En attente du premier import

</i18n>
