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
      {{ t('installedPlugins') }}
    </v-list-subheader>
    <v-skeleton-loader
      v-if="installedPluginsFetch.loading.value"
      type="list-item-two-line"
    />

    <v-card
      v-for="plugin in installedPluginsFetch.data.value?.results"
      :key="'installed-' + plugin.id"
      :loading="pluginLocked === `${plugin.id}` ? 'primary' : false"
      class="mb-4"
    >
      <v-toolbar
        density="compact"
        :title="plugin.name"
      >
        <v-spacer />
        {{ t('usedTimesVersion', { count: installedPluginsFetch.data.value?.facets.usages[plugin.id], version: plugin.version }) }}
        <v-btn
          v-if="updateAvailable(plugin)"
          color="warning"
          :title="t('update')"
          :icon="mdiUpdate"
          :disabled="!!pluginLocked"
          @click="update(plugin.id)"
        />
        <v-menu
          :model-value="showDeleteMenu === plugin.id"
          :close-on-content-click="false"
          max-width="500"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              color="warning"
              :title="t('uninstall')"
              :icon="mdiDelete"
              :disabled="!!pluginLocked"
              @click="showDeleteMenu = plugin.id"
            />
          </template>
          <v-card
            :title="t('uninstallPlugin')"
            :text="t('confirmUninstallPlugin', { name: plugin.name })"
            :loading="pluginLocked === plugin.id ? 'warning' : false"
          >
            <v-card-actions>
              <v-spacer />
              <v-btn
                :disabled="!!pluginLocked"
                @click="showDeleteMenu = null"
              >
                {{ t('no') }}
              </v-btn>
              <v-btn
                color="warning"
                :disabled="!!pluginLocked"
                @click="uninstall.execute(plugin.id)"
              >
                {{ t('yes') }}
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
      <span v-else-if="availablePlugins">
        {{ availablePlugins.length }}
      </span>
      {{ t('availablePlugins') }}
    </v-list-subheader>
    <v-skeleton-loader
      v-if="availablePluginsFetch.loading.value"
      type="list-item-two-line"
    />
    <v-card
      v-for="plugin in availablePlugins"
      :key="'available-' + plugin.id"
      :loading="pluginLocked === `${plugin.id}` ? 'primary' : false"
      class="mb-4"
    >
      <v-toolbar
        density="compact"
        variant="outlined"
        :title="plugin.name"
        flat
      >
        <v-spacer />
        <v-btn
          color="primary"
          :title="t('install')"
          :icon="mdiDownload"
          :disabled="!!pluginLocked"
          @click="install.execute(plugin)"
        />
      </v-toolbar>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import type { Plugin } from '#api/types'
import type { PluginPost } from '../../../../api/doc/plugins/post-req/index.js'

const session = useSession()
const { t } = useI18n()
const pluginLocked = ref<string | null>(null)
const showDeleteMenu = ref<string | null>(null)

if (!session.state.user?.adminMode) throw new Error(t('noPermissionAdminPage'))

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
    await $fetch('/plugins', {
      method: 'POST',
      body: JSON.stringify(plugin)
    })
    pluginLocked.value = null
  },
  {
    success: t('pluginInstalled'),
    error: t('errorInstallingPlugin'),
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
    success: t('pluginUninstalled'),
    error: t('errorUninstallingPlugin'),
  }
)

const availablePlugins = computed(() => {
  const installedPluginIds = installedPluginsFetch.data.value?.results.map(plugin => plugin.id)
  return availablePluginsFetch.data.value?.results.filter(plugin =>
    !installedPluginIds?.includes(plugin.id)
  )
})

const update = (pluginId: string) => {
  const plugin = availablePluginsFetch.data.value?.results.find(p => p.id === pluginId)
  if (!plugin) return
  install.execute(plugin)
}

const updateAvailable = (plugin: PluginPost) => {
  const availablePlugin = availablePluginsFetch.data.value?.results.find(r => (r.name === plugin.name && r.version === plugin.version))
  if (availablePlugin?.version !== plugin.version) return availablePlugin
  else return null
}
</script>

<i18n lang="yaml">
  en:
    availablePlugins: plugins to install
    confirmUninstallPlugin: "Do you really want to uninstall the plugin {name}?"
    errorInstallingPlugin: Error installing the plugin
    errorUninstallingPlugin: Error uninstalling the plugin
    install: Install
    installedPlugins: installed plugins
    no: No
    noPermissionAdminPage: You don't have permission to access this page, you need to be connected and have super-admin mode enabled.
    pluginInstalled: Plugin installed!
    pluginUninstalled: Plugin uninstalled!
    uninstall: Uninstall
    uninstallPlugin: Uninstall plugin
    update: Update
    usedTimesVersion: "Used {count} times - {version}"
    yes: Yes

  fr:
    availablePlugins: plugins à installer
    confirmUninstallPlugin: "Voulez-vous vraiment désinstaller le plugin {name} ?"
    errorInstallingPlugin: Erreur lors de l'installation du plugin
    errorUninstallingPlugin: Erreur lors de la désinstallation du plugin
    install: Installer
    installedPlugins: plugins installés
    no: Non
    noPermissionAdminPage: Vous n'avez pas la permission d'accéder à cette page, il faut être connecté et avoir activé le mode super-administration.
    pluginInstalled: Plugin installé !
    pluginUninstalled: Plugin désinstallé !
    uninstall: Désinstaller
    uninstallPlugin: Désinstaller le plugin
    update: Mettre à jour
    usedTimesVersion: "Jamais utilisé - {version} | Utilisé {count} fois - {version} | Utilisé {count} fois - {version}"
    yes: Oui
</i18n>

<style scoped>
</style>
