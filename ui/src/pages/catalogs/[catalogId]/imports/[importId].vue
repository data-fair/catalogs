<template>
  <v-container
    v-if="imp"
    data-iframe-height
    style="min-height:500px"
  >
    <df-section-tabs
      id="import"
      v-model="activeTab"
      :title="imp.remoteResource?.title ?? imp.remoteResource.id"
      :src="importIllustration"
      :tabs="tabs"
    >
      <template
        v-if="activeTab === 'configuration' && hasDiff"
        #actions
      >
        <v-btn
          color="warning"
          variant="tonal"
          :disabled="save.loading.value"
          @click="resetEdit"
        >
          {{ t('cancel') }}
        </v-btn>
        <v-btn
          class="ml-2"
          color="accent"
          variant="flat"
          :disabled="!valid"
          :loading="save.loading.value"
          @click="save.execute()"
        >
          {{ t('save') }}
        </v-btn>
      </template>

      <template #windows>
        <v-tabs-window-item value="logs">
          <logs
            type="import"
            :item="imp"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="configuration">
          <v-defaults-provider
            :defaults="{
              global: {
                hideDetails: 'auto'
              },
              VNumberInput: {
                inset: true
              }
            }"
          >
            <v-form v-model="valid">
              <vjsf
                v-if="importSchema && editImport"
                v-model="editImport"
                :schema="importSchema"
                :options="vjsfOptions"
              >
                <template #scheduling-summary="{ node }">
                  {{ t(`frequency.${node.data.type}`) }}
                  {{ cronstrue.toString(toCRON(node.data), { locale: session.lang.value }) }}
                  {{ timezoneLabel(node.data.timeZone) }}
                </template>
              </vjsf>
            </v-form>
          </v-defaults-provider>
        </v-tabs-window-item>
      </template>
    </df-section-tabs>

    <navigation-right>
      <import-actions :imp />
    </navigation-right>
  </v-container>
</template>

<script setup lang="ts">
import type { Log } from '@data-fair/types-catalogs'
import type { Import } from '#api/types'

import DfSectionTabs from '@data-fair/lib-vuetify/section-tabs.vue'
import NavigationRight from '@data-fair/lib-vuetify/navigation-right.vue'
import timeZones from 'timezones.json'
import cronstrue from 'cronstrue'
import 'cronstrue/locales/en'
import 'cronstrue/locales/fr'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import clone from '@data-fair/lib-utils/clone.js'
import equal from 'fast-deep-equal'
import { toCRON } from '@data-fair/catalogs-shared/cron.ts'
import { resolvedSchema as importSchemaBase } from '#api/types/import'

const { t } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/imports/[importId]'>()
const session = useSessionAuthenticated()
const ws = useWS('/catalogs/api/')
const { catalog, plugin } = createCatalogStore(route.params.catalogId)
const activeTab = useStringSearchParam('tab', { default: 'logs' })

const valid = ref(false)
const imp = ref<Import | null>(null)
const editImport: Ref<Partial<Import> | null> = ref(null)

const importIllustration = new URL('~/assets/import.svg', import.meta.url).href

const buildEdit = (source: Import): Partial<Import> => ({
  config: clone(source.config),
  scheduling: clone(source.scheduling),
  isSchedulingActive: source.isSchedulingActive,
  shouldUpdateMetadata: source.shouldUpdateMetadata,
  shouldUpdateSchema: source.shouldUpdateSchema
})

const resetEdit = () => {
  if (imp.value) editImport.value = buildEdit(imp.value)
}

const hasDiff = computed(() => {
  if (!editImport.value || !imp.value) return false
  return !equal(editImport.value, buildEdit(imp.value))
})

useLeaveGuard(hasDiff, { locale: session.lang })

const importFetch = useFetch<Import>(`${$apiPath}/imports/${route.params.importId}`)
watch(importFetch.data, (newImp, oldImp) => {
  if (!newImp) return
  imp.value = newImp
  if (!oldImp) resetEdit()

  setBreadcrumbs([
    { text: t('catalogs'), to: '/catalogs' },
    { text: newImp.catalog.title ?? newImp.catalog.id, to: `/catalogs/${newImp.catalog.id}` },
    { text: t('imports'), to: `/catalogs/${newImp.catalog.id}` },
    { text: newImp.remoteResource.title ?? newImp.remoteResource.id }
  ])
})

ws?.subscribe<Partial<Import>>(
  `import/${route.params.importId}`,
  (patch) => { if (imp.value) Object.assign(imp.value, patch) }
)
ws?.subscribe<Log>(`import/${route.params.importId}/logs`, (log) => {
  if (!imp.value) return
  if (!imp.value.logs) imp.value.logs = []
  if (log.type === 'task') {
    const existingLogIndex = imp.value.logs.findIndex(l => l.type === 'task' && l.key === log.key)
    if (existingLogIndex !== -1) return Object.assign(imp.value.logs[existingLogIndex], log)
  }
  imp.value.logs.push(log)
})

const save = useAsyncAction(
  async () => {
    if (!editImport.value || !valid.value || !imp.value) return
    const res = await $fetch<Import>(`${$apiPath}/imports/${route.params.importId}`, {
      method: 'PATCH',
      body: editImport.value,
    })

    Object.assign(imp.value, res)
    resetEdit()
  },
  {
    success: t('importSaved'),
    error: t('errorSavingImport')
  }
)

const importSchema = computed(() => {
  if (!catalog.value || !plugin.value) return undefined
  const base = jsonSchema(importSchemaBase)
    .pickProperties(['config', 'isSchedulingActive', 'shouldUpdateMetadata', 'shouldUpdateSchema', 'scheduling'])

  if (catalog.value.capabilities.includes('importConfig') && plugin.value.importConfigSchema) {
    base.addProperty('config', plugin.value.importConfigSchema)
  }
  return base.schema
})

const tabs = computed(() => [
  { key: 'logs', title: t('tab.logs'), icon: mdiCalendarText },
  { key: 'configuration', title: t('tab.configuration'), icon: mdiCog }
])

const timezoneLabel = (timeZone: string) => {
  if (timeZone === 'Europe/Paris') return ''
  return ' — ' + t('timezone') + ' ' + (timeZone ?? 'UTC')
}

const utcs: string[] = []
for (const tz of timeZones) {
  for (const utc of tz.utc) {
    if (!utcs.includes(utc)) utcs.push(utc)
  }
}

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    resourceId: imp.value?.remoteResource.id,
    catalogConfig: catalog.value?.config,
    origin: window.location.origin,
    utcs
  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  removeAdditional: true,
  titleDepth: 4,
  updateOn: 'blur',
  validateOn: 'blur',
  xI18n: true
}))

</script>

<i18n lang="yaml">
  en:
    cancel: Cancel
    catalogs: Catalogs
    errorSavingImport: Error while saving the import
    frequency:
      daily: Every day,
      hourly: ''
      monthly: Every month,
      weekly: Every week,
    importSaved: Import configuration saved!
    imports: Imports
    save: Save
    tab:
      configuration: Import configuration
      logs: Execution log
    timezone: 'Timezone:'

  fr:
    cancel: Annuler
    catalogs: Catalogues
    errorSavingImport: Erreur lors de la modification de l'import
    frequency:
      daily: Tous les jours,
      hourly: ''
      monthly: Tous les mois,
      weekly: Toutes les semaines,
    importSaved: Configuration de l'import enregistrée !
    imports: Imports
    save: Enregistrer
    tab:
      configuration: Configuration de l'import
      logs: Journal d'exécution
    timezone: 'Fuseau horaire :'

</i18n>

<style scoped>
</style>
