<template>
  <v-container
    data-iframe-height
    class="pa-0"
    fluid
  >
    <v-stepper
      v-model="step"
      elevation="0"
      hide-actions
    >
      <v-stepper-header>
        <v-stepper-item
          :title="t('selectCatalogType')"
          value="1"
          :color="step === '1' ? 'primary' : ''"
          :complete="!!newCatalog.plugin"
          editable
        />
        <v-divider />
        <v-stepper-item
          :title="t('information')"
          value="2"
          :color="step === '2' ? 'primary' : ''"
          :editable="!!newCatalog.plugin"
        />
      </v-stepper-header>

      <v-stepper-window>
        <v-stepper-window-item value="1">
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
                :color="newCatalog.plugin === plugin.id ? 'primary' : ''"
                @click="newCatalog.plugin = plugin.id; step = '2'"
              >
                <template #title>
                  <span :class="newCatalog.plugin !== plugin.id ? 'text-primary' : ''">
                    {{ plugin.metadata.title }}
                  </span>
                </template>
                <v-card-text>{{ plugin.metadata.description }}</v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-stepper-window-item>
        <v-stepper-window-item value="2">
          <v-form v-model="valid">
            <v-defaults-provider
              :defaults="{
                global: {
                  hideDetails: 'auto'
                }
              }"
            >
              <vjsf
                v-model="newCatalog"
                class="mr-2"
                :schema="catalogSchema"
                :options="vjsfOptions"
              />
              <owner-pick
                v-model="newCatalog.owner"
                v-model:ready="ownersReady"
              />
            </v-defaults-provider>
          </v-form>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!ownersReady || !valid || !newCatalog.plugin"
            :loading="createCatalog.loading.value"
            @click="createCatalog.execute()"
          >
            {{ t('create') }}
          </v-btn>
          <v-btn
            variant="text"
            :disabled="createCatalog.loading.value"
            @click="step = '1'"
          >
            {{ t('back') }}
          </v-btn>
        </v-stepper-window-item>
      </v-stepper-window>
    </v-stepper>
  </v-container>
</template>

<script setup lang="ts">
import type { Plugin } from '#api/types'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import VjsfMarkdown from '@koumoul/vjsf-markdown'
import OwnerPick from '@data-fair/lib-vuetify/owner-pick.vue'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog/index.ts'

const session = useSessionAuthenticated()
const router = useRouter()
const { t } = useI18n()

/*
  Permissions
*/
const owners = useStringsArraySearchParam('owner')
const owner = computed(() => {
  if (owners.value && owners.value.length) {
    const parts = owners.value[0].split(':')
    return { type: parts[0], id: parts[1] } as { type: 'user' | 'organization', id: string, department?: string }
  } else {
    return session.state.account
  }
})
const ownerRole = computed(() => {
  const user = session.state.user
  if (owner.value.type === 'user') {
    if (owner.value.id === user.id) return 'admin'
    else return 'anonymous'
  }
  const userOrg = user.organizations.find(o => {
    if (o.id !== owner.value.id) return false
    if (!o.department) return true
    if (o.department === owner.value.department) return true
    return false
  })
  return userOrg ? userOrg.role : 'anonymous'
})
const canAdmin = computed(() => ownerRole.value === 'admin' || !!session.state.user?.adminMode)
if (!canAdmin.value) throw new Error(t('noRightsToCreateCatalog'))

const installedPluginsFetch = useFetch<{ results: Plugin[], count: number }>(`${$apiPath}/plugins`)

const step = ref('1')
const showCreateMenu = ref(false)
const newCatalog: Ref<Record<string, string>> = ref({})
const ownersReady = ref(false)
const valid = ref(false)

const catalogSchema = computed(() => {
  const configSchema = installedPluginsFetch.data.value?.results.find(p => p.id === newCatalog.value.plugin)?.configSchema
  if (!configSchema) return
  delete catalogSchemaBase.title

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
      body: JSON.stringify(newCatalog.value)
    })

    await router.replace({ path: `/catalogs/${catalog._id}` })
    showCreateMenu.value = false
  },
  {
    success: t('catalogCreated'),
    error: t('errorCreatingCatalog'),
  }
)

onMounted(() => {
  setBreadcrumbs([{
    text: t('catalogs'),
    to: '/catalogs'
  }, {
    text: t('createCatalog')
  }])
})

const vjsfOptions: VjsfOptions = {
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  plugins: [VjsfMarkdown],
  readOnlyPropertiesMode: 'hide',
  titleDepth: 4,
  validateOn: 'blur',
  xI18n: true
}

</script>

<i18n lang="yaml">
  en:
    back: Back
    catalogs: Catalogs
    catalogCreated: Catalog created!
    configuration: Configuration
    create: Create
    createCatalog: Create a catalog
    errorCreatingCatalog: Error while creating the catalog
    information: Information
    noRightsToCreateCatalog: You don't have the rights to create a catalog
    selectCatalogType: Select catalog type

  fr:
    back: Retour
    catalogs: Catalogues
    catalogCreated: Catalogue créé !
    configuration: Configuration
    create: Créer
    createCatalog: Créer un catalogue
    errorCreatingCatalog: Erreur lors de la création du catalogue
    information: Informations
    noRightsToCreateCatalog: Vous n'avez pas les droits pour créer un catalogue
    selectCatalogType: Sélection du type de catalogue
</i18n>

<style scoped>
</style>
