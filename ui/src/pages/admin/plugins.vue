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
      :key="'installed-' + plugin.name"
      :loading="pluginLocked === `${plugin.name}` ? 'primary' : false"
      class="mb-4"
    >
      <v-toolbar
        density="compact"
      >
        <template #title>
          {{ plugin.name }}
          <v-avatar
            v-if="plugin.metadata.capabilities.includes('thumbnail')"
            :image="`${$apiPath}/plugins/${plugin.id}/thumbnail`"
            rounded="0"
            class="ml-2"
            size="24"
          />
        </template>
        <v-spacer />
        {{ t('usedTimesVersion', { count: installedPluginsFetch.data.value?.facets.usages[plugin.id] || 0, version: plugin.version }) }}
        <v-btn
          v-if="hasUpdateAvailable(plugin)"
          color="warning"
          :title="t('update', { version: hasUpdateAvailable(plugin)!.version })"
          :icon="mdiUpdate"
          :disabled="!!pluginLocked"
          @click="install.execute({ name: plugin.name, version: hasUpdateAvailable(plugin)!.version })"
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
      <v-card-text>
        {{ plugin.description }}
      </v-card-text>
    </v-card>

    <v-list-subheader class="mb-2">
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

      <v-menu
        v-model="showForceInstall"
        :close-on-content-click="false"
        max-width="500"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="ml-4"
            size="x-small"
            variant="tonal"
            :disabled="!!pluginLocked"
          >
            {{ t('forceInstall') }}
          </v-btn>
        </template>
        <v-card
          :title="t('forceInstall')"
          :loading="install.loading.value ? 'warning' : false"
        >
          <v-card-text class="pb-0">
            <div class="mb-4">
              <p class="text-body-2 font-italic mb-2">
                {{ t('installFromNpm') }}
              </p>
              <v-text-field
                v-model="forceInstallPlugin.name"
                class="mb-2"
                placeholder="@data-fair/catalog-my-catalog"
                :label="t('pluginName')"
                :loading="availablePluginsFetch.loading.value"
                :disabled="!!pluginLocked || !!selectedFile"
                autofocus
                hide-details
              />
              <v-text-field
                v-model="forceInstallPlugin.version"
                placeholder="0.0.0"
                :label="t('pluginVersion')"
                :disabled="!!pluginLocked || !!selectedFile"
                hide-details
              />
            </div>

            <div>
              <p class="text-body-2 font-italic mb-2">
                {{ t('installFromFile') }}
              </p>
              <v-file-input
                v-model="selectedFile"
                accept=".tgz"
                :label="t('selectTgzFile')"
                :disabled="!!pluginLocked || hasNpmFields"
                chips
                hide-details
                show-size
              />
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              :disabled="!!pluginLocked || install.loading.value"
              @click="showForceInstall = false"
            >
              {{ t('cancel') }}
            </v-btn>
            <v-btn
              color="warning"
              :disabled="!!pluginLocked || !canForceInstall || install.loading.value"
              @click="install.execute()"
            >
              {{ t('install') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </v-list-subheader>
    <v-skeleton-loader
      v-if="availablePluginsFetch.loading.value"
      type="list-item-two-line"
    />
    <v-card
      v-for="plugin in availablePlugins"
      :key="'available-' + plugin.name"
      :loading="pluginLocked === `${plugin.name}` ? 'primary' : false"
      class="mb-4"
    >
      <v-toolbar
        density="compact"
        variant="outlined"
        :title="plugin.name"
        flat
      >
        <v-spacer />
        {{ plugin.version }}
        <v-btn
          color="primary"
          :title="t('install')"
          :icon="mdiDownload"
          :disabled="!!pluginLocked"
          @click="install.execute({ name: plugin.name, version: plugin.version })"
        />
      </v-toolbar>
      <v-card-text>
        {{ plugin.description }}
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import type { PluginsGetRes, PluginPost } from '#api/doc'
import { gt as semverGt } from 'semver'

const session = useSession()
const { sendUiNotif } = useUiNotif()
const { t } = useI18n()

if (!session.state.user?.adminMode) throw new Error(t('noPermissionAdminPage'))

const pluginLocked = ref<string | null>(null)
const showDeleteMenu = ref<string | null>(null)
const showForceInstall = ref<boolean>(false)
const forceInstallPlugin = ref<PluginPost>({ name: '', version: '' })
const selectedFile = ref<File>()

const hasNpmFields = computed(() =>
  !!(forceInstallPlugin.value.name?.trim() || forceInstallPlugin.value.version?.trim())
)

const canForceInstall = computed(() => {
  if (hasNpmFields.value) return forceInstallPlugin.value.name && forceInstallPlugin.value.version
  else if (selectedFile.value) return true
  return false
})

const installedPluginsFetch = useFetch<PluginsGetRes>(`${$apiPath}/plugins`)
const availablePluginsFetch = useFetch<{
  results: (PluginPost & { description: string })[],
  count: number
}>(`${$apiPath}/plugins-registry`)

/**
 * Installs a plugin.
 * -> Installs from a file if a file is selected.
 * -> Installs from npm if a plugin is provided.
 *   -> If the plugin is provided, it will be installed directly.
 *   -> If not, the plugin will be installed from the forceInstallPlugin reference.
 * @param plugin - PluginPost object if installing from npm, otherwise undefined.
 */
const install = useAsyncAction(
  async (plugin?: PluginPost) => {
    if (!canForceInstall.value && !plugin) return

    let body: FormData | PluginPost

    // Installation depuis un fichier
    if (selectedFile.value) {
      body = new FormData()
      body.append('file', selectedFile.value)

    // Installation depuis npm
    } else {
      const pluginPost = plugin || forceInstallPlugin.value
      pluginLocked.value = pluginPost.name
      body = pluginPost
    }

    await $fetch('/plugins', {
      method: 'POST',
      body
    })

    await installedPluginsFetch.refresh()
    pluginLocked.value = null
    showForceInstall.value = false
    selectedFile.value = undefined
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
    await installedPluginsFetch.refresh()
    pluginLocked.value = null
    showDeleteMenu.value = null
  },
  {
    success: t('pluginUninstalled'),
    error: t('errorUninstallingPlugin'),
  }
)

const availablePlugins = computed(() => {
  const installedPluginNames = installedPluginsFetch.data.value?.results.map(plugin => plugin.name)
  return availablePluginsFetch.data.value?.results.filter(plugin =>
    !installedPluginNames?.includes(plugin.name)
  )
})

const hasUpdateAvailable = (plugin: PluginPost) => {
  const availablePlugin = availablePluginsFetch.data.value?.results.find(r => r.name === plugin.name)
  if (!availablePlugin) return null
  return semverGt(availablePlugin.version, plugin.version) ? availablePlugin : null
}

watch(installedPluginsFetch.data, (newData) => {
  if (newData?.errors && newData.errors.length > 0) {
    const errorDetails = newData.errors.map(error => `${error.dir}: ${error.error}`).join('\n')
    sendUiNotif({
      type: 'error',
      msg: t('errorFetchingPlugins'),
      error: errorDetails
    })
  }
})

</script>

<i18n lang="yaml">
  en:
    availablePlugins: plugins to install
    cancel: Cancel
    confirmUninstallPlugin: "Do you really want to uninstall the plugin {name}?"
    errorFetchingPlugins: Error fetching some plugins
    errorInstallingPlugin: Error installing the plugin
    errorUninstallingPlugin: Error uninstalling the plugin
    forceInstall: Install a plugin manually
    install: Install
    installFromFile: Install from file
    installFromNpm: Install from npm
    installedPlugins: installed plugins
    no: No
    noPermissionAdminPage: You don't have permission to access this page, you need to be connected and have super-admin mode enabled.
    pluginInstalled: Plugin installed!
    pluginName: Plugin name
    pluginUninstalled: Plugin uninstalled!
    pluginVersion: Plugin version
    selectTgzFile: Select .tgz file
    uninstall: Uninstall
    uninstallPlugin: Uninstall plugin
    update: Update to {version}
    usedTimesVersion: "Used {count} times - {version}"
    yes: Yes

  fr:
    availablePlugins: plugins à installer
    cancel: Annuler
    confirmUninstallPlugin: "Voulez-vous vraiment désinstaller le plugin {name} ?"
    errorFetchingPlugins: Erreur lors du chargement de certains plugins
    errorInstallingPlugin: Erreur lors de l'installation du plugin
    errorUninstallingPlugin: Erreur lors de la désinstallation du plugin
    forceInstall: Installer un plugin manuellement
    install: Installer
    installFromFile: Installer depuis un fichier
    installFromNpm: Installer depuis npm
    installedPlugins: plugins installés
    no: Non
    noPermissionAdminPage: Vous n'avez pas la permission d'accéder à cette page, il faut être connecté et avoir activé le mode super-administration.
    pluginInstalled: Plugin installé !
    pluginName: Nom du plugin
    pluginUninstalled: Plugin désinstallé !
    pluginVersion: Version du plugin
    selectTgzFile: Sélectionner un fichier .tgz
    uninstall: Désinstaller
    uninstallPlugin: Désinstaller le plugin
    update: Mettre à jour vers {version}
    usedTimesVersion: "Jamais utilisé - {version} | Utilisé {count} fois - {version} | Utilisé {count} fois - {version}"
    yes: Oui

</i18n>

<style scoped>
</style>
