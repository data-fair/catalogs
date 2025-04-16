<template>
  <v-container data-iframe-height>
    <p v-if="!catalogs.length">
      {{ t('noCatalogs') }}
    </p>
    <template v-else>
      <tutorial-alert
        id="tutorial-publications"
        :text="t('tutorialMessage')"
        persistent
      />
      <v-menu
        v-model="showPublishMenu"
        :close-on-content-click="false"
        max-width="500"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            color="primary"
          >
            {{ t('publishToCatalog') }}
          </v-btn>
        </template>
        <v-card
          rounded="lg"
          variant="elevated"
          :loading="publishCatalog.loading.value ? 'primary' : undefined"
          :title="t('publishToCatalog')"
        >
          <v-card-text>
            <v-form
              v-model="validPublication"
              autocomplete="off"
            >
              <vjsf
                v-model="newPublication"
                :schema="vjsfSchema"
                :options="vjsfOptions"
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              :disabled="publishCatalog.loading.value"
              @click="showPublishMenu = false"
            >
              {{ t('cancel') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :loading="publishCatalog.loading.value"
              @click="publishCatalog.execute()"
            >
              {{ t('publish') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>

      <p
        v-if="!publications.length"
        class="font-italic mt-4"
      >
        {{ t('noPublications') }}
      </p>
      <template v-else>
        <h3 class="text-h5 mt-4">
          {{ t('publicationsList') }}
        </h3>
      </template>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import tutorialAlert from '@data-fair/lib-vuetify/tutorial-alert.vue'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'

const session = useSessionAuthenticated()
const { t } = useI18n()

const catalogs = ref(['a'])
const publications = ref([])
const showPublishMenu = ref(false)
const validPublication = ref(false)
const newPublication = ref<Record<string, any>>({})

const publishCatalog = useAsyncAction(() => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, 2000)
  })
})

const vjsfSchema = {
  type: 'array',
  title: t('publicationsList'),
  items: {
    type: 'object',
    properties: {
      catalog: {
        type: 'object',
        title: 'Catalogue',
        layout: {
          getItems: {
            url: '/catalogs/api/catalogs',
            itemsResults: 'data.results',
            itemTitle: 'item.title',
            itemKey: 'item.id',
          }
        }
      }
    },
    required: ['catalog']
  },
  layout: {
    messages: {
      addItem: t('publishToCatalog'),
    },
    listActions: [
      'add',
      'delete'
    ]
  }
}

const vjsfOptions: VjsfOptions = {
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  titleDepth: 3,
  updateOn: 'blur',
  validateOn: 'blur',
  xI18n: true
}

</script>

<i18n lang="yaml">
  en:
    cancel: Cancel
    noCatalogs: You have not yet configured any catalog.
    noPublications: No publications at the moment
    publicationsList: List of publications
    publish: Publish
    publishToCatalog: Publish to another catalog
    tutorialMessage: You can publish your datasets to one or more Open Data catalogs. This publication will make your data easier to find and allow the Open Data community to engage with you.

  fr:
    cancel: Annuler
    noCatalogs: Vous n'avez pas encore configuré de calalogue.
    noPublications: Aucune publication pour le moment
    publicationsList: Liste des publications
    publish: Publier
    publishToCatalog: Publier sur un autre catalogue
    tutorialMessage: Vous pouvez publier vos jeux de données sur un ou plusieurs catalogues Open Data. Cette publication rendra vos données plus faciles à trouver et permettra à la communauté Open Data d'échanger avec vous.
</i18n>

<style scoped>
</style>
