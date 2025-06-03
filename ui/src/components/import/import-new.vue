<template>
  <v-expansion-panels
    v-model="expandedPanel"
    class="px-1"
  >
    <v-expansion-panel
      color="primary"
      static
      :title="t('createNewImport')"
      :expand-icon="mdiPlusCircle"
      value="0"
    >
      <v-expansion-panel-text>
        <v-stepper
          v-model="step"
          flat
        >
          <v-stepper-header>
            <v-stepper-item
              :title="t('step1.title')"
              value="1"
              :color="step === '1' ? 'primary' : ''"
              :complete="!!selectedResource"
              editable
            />

            <v-divider />
            <v-stepper-item
              :title="t('step2.title')"
              value="2"
              :color="step === '2' ? 'primary' : ''"
              :editable="!!selectedResource"
            />
          </v-stepper-header>

          <v-stepper-window class="mb-4">
            <v-stepper-window-item value="1">
              <import-select-resource
                v-model="selectedResource"
                :catalog-id="catalog.id"
              />
            </v-stepper-window-item>

            <v-stepper-window-item
              value="2"
              class="ma-1"
            >
              <v-defaults-provider
                :defaults="{
                  global: {
                    hideDetails: 'auto'
                  }
                }"
              >
                <v-form v-model="validImportConfig">
                  <vjsf
                    v-model="importConfig"
                    :schema="importSchema"
                    :options="vjsfOptions"
                    @update:model-value="'todo'"
                  >
                    <template #scheduling-summary="{ node }">
                      {{ t(`frequency.${node.data.type}`) }}
                      {{ cronstrue.toString(toCRON(node.data), { locale: session.lang.value }) }}
                    </template>
                  </vjsf>
                </v-form>
              </v-defaults-provider>
            </v-stepper-window-item>
          </v-stepper-window>

          <template #actions="{ prev, next }">
            <v-stepper-actions
              @click:prev="prev"
              @click:next="handleNext(next)"
            >
              <template #prev="{ props }">
                <v-btn
                  v-if="step === '2'"
                  v-bind="props"
                >
                  {{ t('previous') }}
                </v-btn>
              </template>

              <template #next="{ props }">
                <v-spacer v-if="step === '1'" />
                <v-btn
                  v-bind="props"
                  color="primary"
                  variant="flat"
                  :disabled="step === '1' ? !selectedResource : (!validImportConfig || !selectedResource)"
                  :loading="step === '2' ? createImport.loading.value : false"
                >
                  {{ t(`step${step}.next`) }}
                </v-btn>
              </template>
            </v-stepper-actions>
          </template>
        </v-stepper>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import type { Resource } from '@data-fair/lib-common-types/catalog'
import type { Plugin, Import } from '#api/types'

import cronstrue from 'cronstrue'
import 'cronstrue/locales/en'
import 'cronstrue/locales/fr'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as importSchemaBase } from '#api/types/import/index.ts'
import { toCRON } from '@data-fair/catalogs-shared/cron.ts'

const { t } = useI18n()
const session = useSessionAuthenticated()

const { catalog, plugin } = defineProps<{
  catalog: {
    id: string
    title?: string
  },
  plugin: Plugin
}>()

const emit = defineEmits(['onPublish'])

const step = ref('1')
const selectedResource = ref<Resource | null>(null)
const validImportConfig = ref(false)
const importConfig = ref<Partial<Import>>({})
const expandedPanel = ref([])

const importSchema = computed(() => {
  const schema = jsonSchema(importSchemaBase)

  if (plugin.metadata.capabilities.includes('importConfig')) {
    schema.addProperty('config', { ...plugin.importConfigSchema })
  }
  return schema.makePatchSchema().schema
})

const createImport = useAsyncAction(async () => {
  if (!selectedResource.value || !validImportConfig.value) return

  // Construct the body for the API request
  const body = {
    catalog: {
      id: catalog.id,
      title: catalog.title
    },
    remoteResource: {
      id: selectedResource.value.id,
      title: selectedResource.value.title
    },
    scheduling: importConfig.value.scheduling,
    config: importConfig.value.config || {}
  }

  // Create the import via API
  await $fetch('/imports', {
    method: 'POST',
    body
  })

  emit('onPublish', selectedResource.value)

  selectedResource.value = null
  validImportConfig.value = false
  importConfig.value = {}
  step.value = '1'
  expandedPanel.value = []
})

const handleNext = (next: () => void) => {
  if (step.value === '2') createImport.execute()
  else next()
}

const vjsfOptions: VjsfOptions = {
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  readOnlyPropertiesMode: 'hide',
  titleDepth: 4,
  validateOn: 'blur',
  xI18n: true
}

</script>

<i18n lang="yaml">
  en:
    createNewImport: Import a new dataset
    frequency:
      monthly: Every month,
      weekly: Every week,
      daily: Every day,
    previous: Previous
    step1:
      title: Select Resource
      next: Next
    step2:
      title: Import Configuration
      next: Import

  fr:
    createNewImport: Importer un nouveau jeu de données
    frequency:
      monthly: Tous les mois,
      weekly: Toutes les semaines,
      daily: Tous les jours,
    previous: Précédent
    step1:
      title: Sélection d'une ressource
      next: Suivant
    step2:
      title: Configuration de l'import
      next: Importer

</i18n>

<style scoped>
</style>
