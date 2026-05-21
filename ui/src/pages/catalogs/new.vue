<template>
  <df-layout-fetch-error
    v-if="session.state.accountRole !== 'admin' && !session.state.user.adminMode"
    :error="{ statusCode: 403 }"
    back-to="/catalogs"
    :back-label="t('catalogs')"
  />
  <v-container
    v-else
    data-iframe-height
    style="min-height:800px"
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
              v-for="artefact in pluginsFetch.data.value?.results"
              :key="artefact._id"
              md="4"
              sm="6"
              cols="12"
            >
              <v-card
                class="h-100"
                :color="newPlugin === artefact._id ? 'primary' : ''"
                @click="newPlugin = artefact._id; step = hasDepartments ? '2' : '3'"
              >
                <template #title>
                  <span :class="newPlugin !== artefact._id ? 'text-primary' : ''">
                    <!-- Remove 'Catalog ' from the title for compatibility -->
                    {{ t('catalog') }} {{ artefactTitle(artefact).replace('Catalog ', '') }}
                  </span>
                </template>
                <template #append>
                  <v-avatar
                    v-if="artefact.thumbnail"
                    :image="artefactThumbnail(artefact)"
                    rounded="0"
                    class="ml-2"
                    size="32"
                  />
                </template>
                <v-card-text>{{ artefactDescription(artefact) }}</v-card-text>
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
                v-if="catalogSchema"
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
import DfLayoutFetchError from '@data-fair/lib-vuetify/layout-fetch-error.vue'
import OwnerPick from '@data-fair/lib-vuetify/owner-pick.vue'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog'

/** Subset of a registry artefact document used by the picker. */
interface RegistryArtefact {
  _id: string
  name: string
  packageName?: string
  version?: string
  title?: { fr?: string, en?: string }
  description?: { fr?: string, en?: string }
  thumbnail?: { id: string }
}

const session = useSessionAuthenticated()
const router = useRouter()
const { t } = useI18n()

// List catalog plugins straight from the registry — same domain, so the
// browser sends the SimpleDirectory session cookie and the registry
// access-filters the results.
const pluginsFetch = useFetch<{ results: RegistryArtefact[], count: number }>(
  `${$sitePath}/registry/api/v1/artefacts?format=npm&category=catalog&size=100`,
  { notifError: false }
)

const step = ref('1')
const newCatalog = ref<Partial<CatalogPostReq['body']>>({})
const newPlugin = ref<string | undefined>(undefined)
const newOwner = ref<Account | undefined>(session.state.account)
const ownersReady = ref(false)
const valid = ref(false)

// The registry list carries no config schema or metadata — fetch the full
// plugin descriptor from the catalogs API once a plugin is picked.
const pluginFetch = useFetch<Plugin>(() => `${$apiPath}/plugins/${newPlugin.value}`, {
  immediate: false,
  watch: false
})
watch(newPlugin, async (id) => {
  if (id) await pluginFetch.refresh()
})

/** Localized title/description of a registry artefact, with sensible fallbacks. */
const artefactTitle = (a: RegistryArtefact) =>
  a.title?.[session.lang.value as 'fr' | 'en'] || a.title?.fr || a.packageName || a.name
const artefactDescription = (a: RegistryArtefact) =>
  a.description?.[session.lang.value as 'fr' | 'en'] || a.description?.fr || ''
const artefactThumbnail = (a: RegistryArtefact) =>
  `${$sitePath}/registry/api/v1/artefacts/${encodeURIComponent(a._id)}/thumbnail`

/** `True` if the active account isn't in a department and his organization has departments */
const hasDepartments = computedAsync(async (): Promise<boolean> => {
  if (session.state.account.department || session.state.account.type === 'user') return false
  const org = await $fetch(`/simple-directory/api/organizations/${session.state.account.id}`, { baseURL: $sitePath })
  return !!org.departments?.length
}, false)

const catalogSchema = computed(() => {
  const plugin = pluginFetch.data.value
  if (!plugin) return
  const props = plugin.configSchema?.properties as Record<string, unknown> | undefined
  const hasConfig = !!props && Object.keys(props).length > 0

  catalogSchemaBase.layout.children = hasConfig
    ? ['title', 'description', 'config']
    : ['title', 'description']

  const builder = jsonSchema(catalogSchemaBase)
  if (hasConfig) {
    builder.addProperty('config', { ...plugin.configSchema, title: t('configuration') })
  }
  const schema = builder.schema
  schema.required = hasConfig ? ['title', 'config'] : ['title']
  return schema
})

const createCatalog = useAsyncAction(
  async () => {
    const catalog = await $fetch('/catalogs', {
      method: 'POST',
      body: {
        owner: newOwner.value,
        plugin: newPlugin.value,
        ...newCatalog.value,
        config: newCatalog.value.config ?? {}
      },
    })

    await router.replace({ path: `/catalogs/${catalog._id}` })
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
  context: {
    owner: newOwner.value
  },
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
    catalog: Catalog
    configuration: Configuration
    create: Create
    createCatalog: Create a catalog
    errorCreatingCatalog: Error while creating the catalog
    information: Information
    next: Next
    previous: Previous
    selectCatalogType: Select catalog type
    selectOwner: Select owner

  fr:
    catalog: Catalogue
    catalogs: Catalogues
    configuration: Configuration
    create: Créer
    createCatalog: Créer un catalogue
    errorCreatingCatalog: Erreur lors de la création du catalogue
    information: Informations
    next: Suivant
    previous: Précédent
    selectCatalogType: Sélection du type de catalogue
    selectOwner: Sélection du propriétaire

</i18n>

<style scoped>
</style>
