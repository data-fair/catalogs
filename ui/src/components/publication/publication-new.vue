<template>
  <tutorial-alert
    id="tutorial-publications"
    :text="t('tutorialMessage')"
  />
  <v-card-text class="pb-0">
    <v-defaults-provider
      :defaults="{
        global: {
          hideDetails: 'auto'
        }
      }"
    >
      <v-form v-model="validPublication">
        <vjsf
          v-if="!publicationSites.loading.value"
          v-model="newPublication"
          :schema="publicationSchema"
          :options="vjsfOptions"
        />
      </v-form>
    </v-defaults-provider>
  </v-card-text>

  <v-card-actions>
    <v-spacer />
    <v-menu
      v-if="existingPublication"
      v-model="showPublishConfirm"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          class="mt-2"
          color="primary"
          variant="flat"
          :disabled="!validPublication"
          :loading="createPublication.loading.value"
        >
          {{ t('publish') }}
        </v-btn>
      </template>
      <v-card
        rounded="lg"
        :title="t('confirmOverwrite')"
        variant="elevated"
        :loading="createPublication.loading.value ? 'warning' : undefined"
      >
        <v-card-text class="pb-0">
          <p>
            {{ t('overwriteMessage', { datasetTitle: existingPublication?.dataFairDataset?.title || existingPublication?.dataFairDataset?.id }) }}
          </p>
          <p>
            <a
              :href="`${$sitePath}/data-fair/dataset/${existingPublication?.dataFairDataset?.id}`"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t('viewSourceDataset') }}
            </a>
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            :disabled="createPublication.loading.value"
            @click="showPublishConfirm = false;"
          >
            {{ t('no') }}
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="createPublication.loading.value"
            @click="createPublication.execute()"
          >
            {{ t('yes') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
    <v-btn
      v-else
      class="mt-2"
      color="primary"
      variant="flat"
      :disabled="!validPublication"
      :loading="createPublication.loading.value"
      @click="createPublication.execute()"
    >
      {{ t('publish') }}
    </v-btn>
  </v-card-actions>
</template>

<script setup lang="ts">
import type { Account } from '@data-fair/lib-common-types/session'
import type { PublicationsGetRes } from '#api/doc'

import tutorialAlert from '@data-fair/lib-vuetify/tutorial-alert.vue'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import clone from '@data-fair/lib-utils/clone.js'
import { resolvedSchema as publicationSchemaBase } from '#api/types/publication/index.ts'

const { t } = useI18n()
const session = useSessionAuthenticated()

// Optional default values
const { catalog, dataFairDataset } = defineProps<{
  catalog?: {
    id: string
    title?: string,
    owner?: Account
  },
  dataFairDataset?: {
    id: string
    title?: string
  }
}>()

const emit = defineEmits<{ (e: 'on-create'): void }>()

const publications = useFetch<PublicationsGetRes>(`${$apiPath}/publications`, {
  query: { catalogId: catalog?.id, dataFairDatasetId: dataFairDataset?.id },
})

/** Set / Reset default values for the new publication */
const initPublication = () => {
  const pub: Record<string, any> = {}
  if (catalog) pub.catalog = { id: catalog.id }
  if (dataFairDataset) pub.dataFairDataset = { id: dataFairDataset.id }
  return pub
}
const showPublishConfirm = ref(false)
const validPublication = ref(false)
const newPublication = ref<Record<string, any>>(initPublication())

const publicationSchema = computed(() => {
  const schema = clone(publicationSchemaBase)
  schema.required = ['catalog', 'action', 'dataFairDataset', 'publicationSite']
  // Make required the remoteDataset field only if the action
  // is 'addAsResource' or 'overwrite'
  schema.oneOf = [
    {
      properties: {
        action: { enum: ['addAsResource', 'overwrite'] }
      },
      required: ['remoteDataset']
    },
    {
      properties: {
        action: { enum: ['create', 'delete'] }
      }
    }
  ]
  return schema
})

// Check if this remote dataset is not already published
const existingPublication = computed(() => {
  if (newPublication.value?.action !== 'overwrite' || !newPublication.value?.remoteDataset) return undefined
  return publications.data.value?.results.find(pub =>
    pub.remoteDataset?.id === newPublication.value.remoteDataset.id
  )
})

// Get the list of publication sites
const publicationSites = useFetch<object[]>(`${$sitePath}/data-fair/api/v1/settings/${session.state.account.type}/${session.state.account.id}:*/publication-sites`)
const formatedPublicationSites = computed(() => {
  if (!publicationSites.data.value) return {}

  return publicationSites.data.value.reduce((acc: Record<string, any>, site: any) => {
    acc[`${site.type}:${site.id}`] = {
      title: site.title,
      url: site.url,
      datasetUrlTemplate: site.datasetUrlTemplate
    }
    return acc
  }, {})
})

const createPublication = useAsyncAction(
  async () => {
    if (!validPublication.value) return
    await $fetch('/publications', {
      method: 'POST',
      body: newPublication.value,
    })
    newPublication.value = initPublication()
    showPublishConfirm.value = false
    emit('on-create')
  }
)

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    catalog: {
      id: catalog?.id,
      title: catalog?.title
    },
    dataFairDataset: {
      id: dataFairDataset?.id,
      title: dataFairDataset?.title
    },
    origin: window.location.origin,
    publicationSites: formatedPublicationSites.value,
    ownerFilter: `${catalog?.owner?.type}:${catalog?.owner?.id}${catalog?.owner?.department ? `:${catalog?.owner.department}` : ''}`
  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  // An error related to 'oneOf' is displayed without much reason.
  // I am customizing the error message to mask the incorrect display of the error.
  messages: {
    errorOneOf: t('missingRemoteDataset'),
  } as any,
  readOnlyPropertiesMode: 'hide',
  titleDepth: 4,
  validateOn: 'blur',
  xI18n: true
}))

</script>

<i18n lang="yaml">
  en:
    confirmOverwrite: Confirm overwrite
    missingRemoteDataset: You must select a remote dataset.
    no: No
    overwriteMessage: This remote dataset is already published by the dataset "{datasetTitle}". Do you really want to overwrite this publication?
    publish: Publish
    tutorialMessage: You can publish your datasets to one or more catalogs. This publication will make your data easier to find and allow the Open Data community to engage with you.
    viewSourceDataset: View source dataset
    yes: Yes

  fr:
    confirmOverwrite: Confirmer l'écrasement
    missingRemoteDataset: Vous devez sélectionner un jeu de données distant.
    no: Non
    overwriteMessage: Ce jeu de données distant est déjà publié par le jeu de données "{datasetTitle}". Souhaitez-vous vraiment écraser cette publication ?
    publish: Publier
    tutorialMessage: Vous pouvez publier vos jeux de données sur un ou plusieurs catalogues. Cette publication rendra vos données plus faciles à trouver et permettra à la communauté Open Data d'échanger avec vous.
    viewSourceDataset: Voir le jeu de données source
    yes: Oui
</i18n>

<style scoped>
</style>
