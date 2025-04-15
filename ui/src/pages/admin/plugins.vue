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
        {{ t('usedTimesVersion', { count: installedPluginsFetch.data.value?.facets.usages[result.id], version: result.version }) }}
        <v-menu
          :model-value="showDeleteMenu === result.id"
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
              @click="showDeleteMenu = result.id"
            />
          </template>
          <v-card
            :title="t('uninstallPlugin')"
            :text="t('confirmUninstallPlugin', { name: result.name })"
            :loading="pluginLocked === result.id ? 'warning' : false"
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
                @click="uninstall.execute(result.id)"
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
      <span v-else-if="availablePluginsFetch.data.value">
        {{ availablePluginsFetch.data.value.count }}
      </span>
      {{ t('availablePlugins') }}
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
          :title="t('install')"
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
    await $fetch(`/plugins/${plugin.id}`, {
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
</script>

<i18n lang="yaml">
  en:
    availablePlugins: available plugins
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
    usedTimesVersion: "Used {count} times - {version}"
    yes: Yes

  fr:
    availablePlugins: plugins disponibles
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
    usedTimesVersion: "Utilisé {count} fois - {version}"
    yes: Oui
</i18n>

<style scoped>
</style>
