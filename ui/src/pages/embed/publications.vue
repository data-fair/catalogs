<template>
  <v-container data-iframe-height>
    <p v-if="!catalogs.length">
      Vous n'avez pas encore configuré de calalogue.
    </p>
    <template v-else>
      <tutorial-alert
        id="tutorial-publications"
        text="Vous pouvez publier vos jeux de données sur un ou plusieurs catalogues Open Data. Cette publication rendra vos données plus faciles à trouver et permettra à la communauté Open Data d'échanger avec vous."
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
            Publier sur un catalogue
          </v-btn>
        </template>
        <v-card
          rounded="lg"
          title="Publication sur un catalogue"
          variant="elevated"
          :loading="publishCatalog.loading.value ? 'primary' : undefined"
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
              Annuler
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :loading="publishCatalog.loading.value"
              @click="publishCatalog.execute()"
            >
              Publier
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>

      <p
        v-if="!publications.length"
        class="font-italic mt-4"
      >
        Aucune publication pour le moment
      </p>
      <template v-else>
        <h3 class="text-h5 mt-4">
          Liste des publications
        </h3>
      </template>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import tutorialAlert from '@data-fair/lib-vuetify/tutorial-alert.vue'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'

const session = useSessionAuthenticated()

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

<style scoped>
</style>
