<template>
  <v-container
    data-iframe-height
    style="min-height:500px"
    class="pa-0"
    fluid
  >
    <v-stepper
      v-model="step"
      hide-actions
    >
      <v-stepper-header>
        <v-stepper-item
          title="Sélection du type de catalogue"
          value="1"
          :color="step === '1' ? 'primary' : ''"
          :complete="!!newCatalog.plugin"
          editable
        />
        <v-divider />
        <v-stepper-item
          title="Informations"
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
                <template
                  v-if="plugin.metadata.icon"
                  #prepend
                >
                  <v-icon
                    :color="newCatalog.plugin !== plugin.id ? 'primary' : ''"
                    :icon="plugin.metadata.icon"
                  />
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
                v-model="newCatalog.title"
                :schema="{
                  type: 'string',
                  title: 'Titre',
                  minLength: 3,
                  maxLength: 50
                }"
                :options="vjsfOptions"
              />
              <vjsf
                v-model="newCatalog.config"
                :schema="installedPluginsFetch.data.value?.results.find(p => p.id === newCatalog.plugin)?.configSchema"
                :options="vjsfOptions"
                class="mr-2"
              />
              <owner-pick
                v-model="newCatalog.owner"
                v-model:ready="ownersReady"
              />
            </v-defaults-provider>
          </v-form>
          <v-btn
            :disabled="!ownersReady || !valid || !newCatalog.plugin || createCatalog.loading.value"
            color="primary"
            variant="flat"
            @click="createCatalog.execute()"
          >
            Créer
          </v-btn>
          <v-btn
            :disabled="createCatalog.loading.value"
            variant="text"
            @click="step = '1'"
          >
            Retour
          </v-btn>
        </v-stepper-window-item>
      </v-stepper-window>
    </v-stepper>
  </v-container>
</template>

<script setup lang="ts">
import type { Plugin } from '#api/types'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import OwnerPick from '@data-fair/lib-vuetify/owner-pick.vue'

const session = useSessionAuthenticated(() => new Error('Authentification nécessaire'))
const router = useRouter()

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
if (!canAdmin.value) throw new Error('Vous n\'avez pas les droits pour créer un catalogue')

const installedPluginsFetch = useFetch<{ results: Plugin[], count: number }>(`${$apiPath}/plugins`)

const step = ref('1')
const showCreateMenu = ref(false)
const newCatalog: Ref<Record<string, string>> = ref({})
const ownersReady = ref(false)
const valid = ref(false)

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
    success: 'Catalogue créé !',
    error: 'Erreur pendant la création du catalogue',
  }
)

onMounted(() => {
  setBreadcrumbs([{
    text: 'Catalogues',
    to: '/catalogs'
  }, {
    text: 'Créer un catalogue'
  }])
})

const vjsfOptions: VjsfOptions = {
  density: 'comfortable',
  validateOn: 'blur',
  locale: session.lang.value,
  readOnlyPropertiesMode: 'remove',
  titleDepth: 4,
  xI18n: true
}

</script>

<style scoped>
</style>
