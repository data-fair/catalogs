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
          <div
            v-for="category in orderedCategories"
            :key="category"
            class="mb-4"
          >
            <template v-if="categorizedPlugins[category]?.length">
              <h3>{{ category }}</h3>
              <v-row class="d-flex align-stretch">
                <v-col
                  v-for="plugin in categorizedPlugins[category]"
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
                        {{ plugin.metadata.name }}
                      </span>
                    </template>
                    <template
                      v-if="plugin.metadata.icon"
                      #prepend
                    >
                      <v-icon
                        :color="newCatalog.plugin !== plugin.id ? 'primary' : ''"
                        :icon="plugin.metadata.icon.svgPath"
                      />
                    </template>
                    <v-card-text>{{ plugin.metadata.description }}</v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </template>
          </div>
        </v-stepper-window-item>
        <v-stepper-window-item value="2">
          <v-text-field
            v-model="newCatalog.title"
            label="Titre"
          />
          <owner-pick
            v-model="newCatalog.owner"
            v-model:ready="ownersReady"
          />
          <v-btn
            :disabled="!ownersReady || !newCatalog.title || !newCatalog.plugin || inCreate"
            color="primary"
            @click="createCatalog()"
          >
            Créer
          </v-btn>
          <v-btn
            :disabled="inCreate"
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
import OwnerPick from '@data-fair/lib-vuetify/owner-pick.vue'

type InstalledPlugin = {
  name: string
  description: string
  version: string
  distTag: string
  id: string
  pluginConfigSchema: any
  catalogConfigSchema: any
  metadata: {
    name: string
    description: string
    category: string
    icon: Record<string, string>
  }
}

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
const ownerFilter = computed(() => `${owner.value.type}:${owner.value.id}${owner.value.department ? ':' + owner.value.department : ''}`)
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
const canAdmin = computed(() => {
  return ownerRole.value === 'admin' || !!session.state.user?.adminMode
})
if (!canAdmin.value) throw new Error('Vous n\'avez pas les droits pour créer un traitement')

const installedPluginsFetch = useFetch<{ results: InstalledPlugin[], count: number }>(`${$apiPath}/plugins?privateAccess=${ownerFilter.value}`)
const installedPlugins = computed(() => installedPluginsFetch.data.value?.results)

const step = ref('1')
const inCreate = ref(false)
const showCreateMenu = ref(false)
const newCatalog: Ref<Record<string, string>> = ref({})
const ownersReady = ref(false)

const categorizedPlugins = computed(() => {
  const categories: Record<string, InstalledPlugin[]> = {}
  orderedCategories.forEach(category => {
    categories[category] = []
  })
  installedPlugins.value?.forEach(plugin => {
    const category = plugin.metadata.category || 'Autres'
    if (!categories[category]) categories[category] = []
    categories[category].push(plugin)
  })
  return categories
})

const createCatalog = withUiNotif(
  async () => {
    inCreate.value = true

    const catalog = await $fetch('/catalogs', {
      method: 'POST',
      body: JSON.stringify(newCatalog.value)
    })

    await router.push({ path: `/catalogs/${catalog._id}` })
    showCreateMenu.value = false
    inCreate.value = false
  },
  'Erreur pendant la création du traitement',
  { msg: 'Traitement créé avec succès !' }
)

onMounted(() => {
  setBreadcrumbs([{
    text: 'Traitements',
    to: '/catalogs'
  }, {
    text: 'Créer un traitement'
  }])
})

</script>

<style scoped>
</style>
