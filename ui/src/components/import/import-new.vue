<template>
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

    <v-stepper-window>
      <v-stepper-window-item value="1">
        <import-select-resource
          v-model="selectedResource"
          :catalog-id="catalog.id"
        />
      </v-stepper-window-item>

      <v-stepper-window-item value="2">
        <v-form v-model="validImportConfig">
          <vjsf
            v-model="importConfig"
            :schema="{
              type: 'string',
              title: 'TODO'
            }"
            :options="vjsfOptions"
            @update:model-value="'todo'"
          />
        </v-form>
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
</template>

<script setup lang="ts">
import type { Resource } from '@data-fair/lib-common-types/catalog'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'

const { t } = useI18n()
const session = useSessionAuthenticated()

const { catalog } = defineProps<{
  catalog: {
    id: string
    title?: string
  }
}>()

const emit = defineEmits(['onPublish'])

const step = ref('1')
const selectedResource = ref<Resource | null>(null)
const validImportConfig = ref(false)
const importConfig = ref({})

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
    }
  }

  // Create the import via API
  await $fetch(`${$apiPath}/imports`, {
    method: 'POST',
    body
  })

  emit('onPublish', selectedResource.value)

  selectedResource.value = null
  validImportConfig.value = false
  step.value = '1'
})

const handleNext = (next: () => void) => {
  if (step.value === '2') {
    createImport.execute()
  } else {
    next()
  }
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
    previous: Previous
    step1:
      title: Select Resource
      next: Next
    step2:
      title: Import Configuration
      next: Import

  fr:
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
