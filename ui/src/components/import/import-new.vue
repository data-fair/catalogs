<template>
  <tutorial-alert
    id="tutorial-imports"
    :text="t('tutorialMessage')"
  />

  <v-stepper
    v-model="step"
    flat
  >
    <v-stepper-header>
      <v-stepper-item
        :title="t('selectResource')"
        value="1"
        :color="step === '1' ? 'primary' : ''"
        :complete="!!selectedResource"
        editable
      />

      <v-divider />
      <v-stepper-item
        :title="t('importConfiguration')"
        value="2"
        :color="step === '2' ? 'primary' : ''"
        :editable="!!selectedResource"
      />
    </v-stepper-header>

    <v-stepper-window>
      <v-stepper-window-item value="1">
        <import-select-resource v-model="selectedResource" />
      </v-stepper-window-item>

      <v-stepper-window-item value="2">
        TODO
      </v-stepper-window-item>
    </v-stepper-window>

    <template #actions="{ prev, next }">
      <v-stepper-actions
        :prev-text="t('previous')"
        :next-text="step === '2' ? t('createImport') : t('next')"
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
            :disabled="step === '1' ? !selectedResource : (!validConfig || !selectedResource)"
            :loading="step === '2' ? createImport.loading.value : false"
          >
            {{ step === '2' ? t('createImport') : t('next') }}
          </v-btn>
        </template>
      </v-stepper-actions>
    </template>
  </v-stepper>
</template>

<script setup lang="ts">
import tutorialAlert from '@data-fair/lib-vuetify/tutorial-alert.vue'

const { t } = useI18n()

// Optional default values
defineProps<{
  catalog?: {
    id: string
    title?: string
  }
}>()

const emit = defineEmits(['onPublish'])

const step = ref('1')
const selectedResource = ref(null)
const validConfig = ref(false)

const createImport = useAsyncAction(async () => {
  if (!selectedResource.value || !validConfig.value) return

  await new Promise(resolve => setTimeout(resolve, 1000))

  emit('onPublish', selectedResource.value)

  selectedResource.value = null
  validConfig.value = false
})

const handleNext = (next: () => void) => {
  if (step.value === '2') {
    createImport.execute()
  } else {
    next()
  }
}

</script>

<i18n lang="yaml">
  en:
    import: Import
    next: Next
    previous: Previous
    selectResource: Select Resource
    importConfiguration: Import Configuration
    tutorialMessage: You can publish your datasets to one or more catalogs. This publication will make your data easier to find and allow the Open Data community to engage with you.
    createImport: Create Import
    searchInTree: Search in tree
    searchPlaceholder: Search by title or description...
    selectedResource: Selected Resource
    fullPath: Full path
    continue: Continue
    back: Back
    finalizeImport: Finalize Import
    importSuccess: Resource imported successfully
    importError: Error importing resource
    step1:
      title: Resource Selection
      subtitle: Browse and select a resource to import
    step2:
      title: Import Configuration
      subtitle: Configure import settings
      placeholder: This step will allow you to configure import settings.
      comingSoon: Coming Soon
      description: Import configuration options will be available here in a future version.

  fr:
    import: Importer
    next: Suivant
    previous: Précédent
    selectResource: Sélectionner une ressource
    importConfiguration: Configuration de l'import
    tutorialMessage: Vous pouvez publier vos jeux de données sur un ou plusieurs catalogues. Cette publication rendra vos données plus faciles à trouver et permettra à la communauté Open Data d'échanger avec vous.
    createImport: Créer un Import
    searchInTree: Rechercher dans l'arborescence
    searchPlaceholder: Rechercher par titre ou description...
    selectedResource: Ressource Sélectionnée
    fullPath: Chemin complet
    continue: Continuer
    back: Retour
    finalizeImport: Finaliser l'Import
    importSuccess: Ressource importée avec succès
    importError: Erreur lors de l'import de la ressource
    step1:
      title: Sélection de Ressource
      subtitle: Parcourez et sélectionnez une ressource à importer
    step2:
      title: Configuration de l'Import
      subtitle: Configurez les paramètres d'import
      placeholder: Cette étape permettra de configurer les paramètres d'import.
      comingSoon: Bientôt Disponible
      description: Les options de configuration d'import seront disponibles ici dans une future version.

</i18n>

<style scoped>
</style>
