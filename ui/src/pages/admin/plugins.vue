<template>
  <v-container data-iframe-height>
    <v-list-subheader>
      <v-progress-circular
        v-if="installedPluginsFetch.loading.value"
        indeterminate
        size="16"
        width="2"
        color="primary"
      />
      <span v-else-if="installedPluginsFetch.data.value">
        {{ installedPluginsFetch.data.value.count }}
      </span>
      plugins installés
    </v-list-subheader>
    <v-skeleton-loader
      v-if="installedPluginsFetch.loading.value"
      type="list-item-two-line"
    />

    <v-card
      v-for="result in installedPluginsFetch.data.value?.results"
      :key="'installed-' + result.id"
      :loading="pluginLocked === `${result.id}` ? 'primary' : false"
      class="mb-4"
    >
      <v-toolbar
        density="compact"
        :title="result.name"
      >
        <v-spacer />
        Utilisé {{ installedPluginsFetch.data.value?.facets.usages[result.id] }} fois -
        {{ result.version }}
        <!-- <v-btn
          v-if="updateAvailable(result)[0]"
          :title="`Mettre à jour (${updateAvailable(result)[1]})`"
          :icon="mdiUpdate"
          color="primary"
          :disabled="!!pluginLocked"
          @click="update(result)"
        /> -->
        <v-menu
          :model-value="showDeleteMenu === result.id"
          :close-on-content-click="false"
          max-width="500"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              color="warning"
              title="Désinstaller"
              :icon="mdiDelete"
              :disabled="!!pluginLocked"
              @click="showDeleteMenu = result.id"
            />
          </template>
          <v-card
            title="Désinstaller le plugin"
            :text="`Voulez-vous vraiment désinstaller le plugin ${result.name} ?`"
            :loading="pluginLocked === result.id ? 'warning' : false"
          >
            <v-card-actions>
              <v-spacer />
              <v-btn
                :disabled="!!pluginLocked"
                @click="showDeleteMenu = null"
              >
                Non
              </v-btn>
              <v-btn
                color="warning"
                :disabled="!!pluginLocked"
                @click="uninstall.execute(result.id)"
              >
                Oui
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
      </v-toolbar>
    </v-card>

    <v-list-subheader>
      <v-progress-circular
        v-if="availablePluginsFetch.loading.value"
        indeterminate
        size="16"
        width="2"
        color="primary"
      />
      <span v-else-if="availablePluginsFetch.data.value">
        {{ availablePluginsFetch.data.value.count }}
      </span>
      plugins disponibles
    </v-list-subheader>
    <v-skeleton-loader
      v-if="availablePluginsFetch.loading.value"
      type="list-item-two-line"
    />
    <v-card
      v-for="result in availablePluginsFetch.data.value?.results"
      :key="'available-' + result.id"
      :loading="pluginLocked === `${result.id}` ? 'primary' : false"
      class="mb-4"
    >
      <v-toolbar
        density="compact"
        variant="outlined"
        :title="result.name"
        flat
      >
        <v-spacer />
        <v-btn
          color="primary"
          title="Installer"
          :icon="mdiDownload"
          :disabled="!!pluginLocked"
          @click="install.execute(result)"
        />
      </v-toolbar>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import type { Plugin } from '#api/types'
import type { PluginPost } from '../../../../api/doc/plugins/post-req/index.js'

const session = useSession()
const pluginLocked = ref<string | null>(null)
const showDeleteMenu = ref<string | null>(null)

if (!session.state.user?.adminMode) throw new Error('Vous n\'avez pas la permission d\'accéder à cette page, il faut être connecté et avoir activé le mode super-administration.')

const installedPluginsFetch = useFetch<{
  results: Plugin[],
  facets: { usages: Record <string, number> },
  count: number
}>(`${$apiPath}/plugins`)

const availablePluginsFetch = useFetch<{
  results: PluginPost[],
  count: number
}>(`${$apiPath}/plugins-registry`)

const install = useAsyncAction(
  async (plugin: PluginPost) => {
    pluginLocked.value = plugin.id
    await $fetch(`/plugins/${plugin.id}`, {
      method: 'POST',
      body: JSON.stringify(plugin)
    })
    pluginLocked.value = null
  },
  {
    success: 'Plugin installé !',
    error: 'Erreur lors de l\'installation du plugin',
  }
)

const uninstall = useAsyncAction(
  async (pluginId: string) => {
    pluginLocked.value = pluginId
    await $fetch(`/plugins/${pluginId}`, {
      method: 'DELETE'
    })
    pluginLocked.value = null
    showDeleteMenu.value = null
  },
  {
    success: 'Plugin désinstallé !',
    error: 'Erreur lors de la désinstallation du plugin',
  }
)

</script>

<style scoped>
</style>
