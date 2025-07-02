<template>
  <layout-error
    v-if="session.state.accountRole !== 'admin' && !session.state.user.adminMode"
    :text="t('noRightsToCreateCatalog')"
  />
  <v-container
    v-else
    data-iframe-height
    class="pa-0"
    fluid
  >
    <v-stepper
      v-model="step"
      style="background-color: transparent"
      flat
    >
      <v-stepper-header>
        <v-stepper-item
          :title="t('selectCatalogType')"
          value="1"
          :color="step === '1' ? 'primary' : ''"
          :complete="!!newPlugin"
          editable
        />
        <template v-if="hasDepartments">
          <v-divider />
          <v-stepper-item
            value="2"
            :title="t('selectOwner')"
            :color="step === '2' ? 'primary' : ''"
            :editable="!!newPlugin"
          />
        </template>
        <v-divider />
        <v-stepper-item
          value="3"
          :title="t('information')"
          :color="step === '3' ? 'primary' : ''"
          :editable="!!newPlugin"
        />
      </v-stepper-header>

      <v-stepper-window>
        <!-- Step 1: Select catalog type -->
        <v-stepper-window-item
          value="1"
        >
          <v-row class="d-flex align-stretch">
            <v-col
              v-for="plugin in installedPluginsFetch.data.value?.results"
              :key="plugin.id"
              md="3"
              sm="4"
              xs="6"
              cols="12"
            >
              <v-card
                class="h-100"
                :color="newPlugin === plugin.id ? 'primary' : ''"
                @click="newPlugin = plugin.id; step = hasDepartments ? '2' : '3'"
              >
                <template #title>
                  <span :class="newPlugin !== plugin.id ? 'text-primary' : ''">
                    {{ plugin.metadata.title }}
                  </span>
                </template>
                <template #append>
                  <v-avatar
                    v-if="plugin.metadata.capabilities.includes('thumbnail')"
                    :image="`${$apiPath}/plugins/${plugin.id}/thumbnail`"
                    rounded="0"
                    class="ml-2"
                    size="32"
                  />
                </template>
                <v-card-text>{{ plugin.metadata.description }}</v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-stepper-window-item>

        <!-- Step 2: Select owner (optional) -->
        <v-stepper-window-item value="2">
          <owner-pick
            v-model="newOwner"
            v-model:ready="ownersReady"
          />
        </v-stepper-window-item>

        <!-- Step 3: Catalog configuration -->
        <v-stepper-window-item value="3">
          <v-defaults-provider
            :defaults="{
              global: {
                hideDetails: 'auto'
              }
            }"
          >
            <v-form v-model="valid">
              <vjsf
                v-model="newCatalog"
                class="mr-2"
                :schema="catalogSchema"
                :options="vjsfOptions"
              />
            </v-form>
          </v-defaults-provider>
        </v-stepper-window-item>
      </v-stepper-window>

      <v-stepper-actions
        v-if="step !== '1'"
        :prev-text="t('previous')"
        @click:prev="step = step === '3' ? (hasDepartments ? '2' : '1') : '1'"
      >
        <template #next>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="step === '3' && (!valid || !newPlugin)"
            :loading="createCatalog.loading.value"
            @click="step === '2' ? step = '3' : createCatalog.execute()"
          >
            {{ step === '2' ? t('next') : t('create') }}
          </v-btn>
        </template>
      </v-stepper-actions>
    </v-stepper>
  </v-container>
</template>

<script setup lang="ts">
import type { Account } from '@data-fair/lib-common-types/session'
import type { Plugin } from '#api/types'
import type { CatalogPostReq } from '#api/doc'

import { computedAsync } from '@vueuse/core'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import OwnerPick from '@data-fair/lib-vuetify/owner-pick.vue'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog/index.ts'

const session = useSessionAuthenticated()
const router = useRouter()
const { t } = useI18n()

const installedPluginsFetch = useFetch<{ results: Plugin[], count: number }>(`${$apiPath}/plugins`, { notifError: false })

const step = ref('1')
const showCreateMenu = ref(false)
const newCatalog = ref<Partial<CatalogPostReq['body']>>({})
const newPlugin = ref<string | undefined>(undefined)
const newOwner = ref<Account | undefined>(session.state.account)
const ownersReady = ref(false)
const valid = ref(false)

/** `True` if the active account isn't in a department and his organization has departments */
const hasDepartments = computedAsync(async (): Promise<boolean> => {
  if (session.state.account.department || session.state.account.type === 'user') return false
  const org = await $fetch(`/simple-directory/api/organizations/${session.state.account.id}`, { baseURL: $sitePath }) // Fetch the organization departments
  return !!org.departments?.length // Check if the organization has departments
}, false)

const catalogSchema = computed(() => {
  const configSchema = installedPluginsFetch.data.value?.results.find(p => p.id === newPlugin.value)?.configSchema
  if (!configSchema) return
  catalogSchemaBase.layout.children = ['title', 'description', 'config'] // Remove activity layout

  const schema = jsonSchema(catalogSchemaBase)
    .addProperty('config', { ...configSchema, title: t('configuration') })
    .schema

  schema.required = ['title', 'config']
  return schema
})

const createCatalog = useAsyncAction(
  async () => {
    const catalog = await $fetch('/catalogs', {
      method: 'POST',
      body: {
        owner: newOwner.value,
        plugin: newPlugin.value,
        ...newCatalog.value
      },
    })

    await router.replace({ path: `/catalogs/${catalog._id}` })
    showCreateMenu.value = false
  },
  {
    error: t('errorCreatingCatalog'),
  }
)

setBreadcrumbs([{
  text: t('catalogs'),
  to: '/catalogs'
}, {
  text: t('createCatalog')
}])

const vjsfOptions: VjsfOptions = {
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  titleDepth: 3,
  validateOn: 'blur',
  xI18n: true
}

</script>

<i18n lang="yaml">
  en:
    catalogs: Catalogs
    configuration: Configuration
    create: Create
    createCatalog: Create a catalog
    errorCreatingCatalog: Error while creating the catalog
    information: Information
    next: Next
    noRightsToCreateCatalog: You don't have the rights to create a catalog
    previous: Previous
    selectCatalogType: Select catalog type
    selectOwner: Select owner

  fr:
    catalogs: Catalogues
    configuration: Configuration
    create: Créer
    createCatalog: Créer un catalogue
    errorCreatingCatalog: Erreur lors de la création du catalogue
    information: Informations
    next: Suivant
    noRightsToCreateCatalog: Vous n'avez pas les droits pour créer un catalogue
    previous: Précédent
    selectCatalogType: Sélection du type de catalogue
    selectOwner: Sélection du propriétaire

</i18n>

<style scoped>
</style>
