<template>
  <v-container
    v-if="catalog"
    data-iframe-height
  >
    <v-row>
      <v-col>
        <h2 class="text-h6">
          Catalogue {{ catalog.title }}
        </h2>
        <v-defaults-provider
          :defaults="{
            global: {
              hideDetails: 'auto'
            }
          }"
        >
          <v-form
            v-model="valid"
            autocomplete="off"
          >
            <vjsf
              v-if="catalogSchema"
              v-model="editCatalog"
              :schema="catalogSchema"
              :options="vjsfOptions"
              @update:model-value="patch()"
            />
          </v-form>
        </v-defaults-provider>
      </v-col>
      <!-- <template v-if="canAdminCatalog || canExecCatalog">
        <layout-navigation-right v-if="$vuetify.display.lgAndUp">
          <catalog-actions
            :catalog="catalog"
            :catalog-schema="catalogSchema"
            :can-admin="canAdminCatalog"
            :can-exec="canExecCatalog"
            :edited="edited"
            :is-small="false"
            @triggered="runs && runs.refresh()"
          />
        </layout-navigation-right>
        <layout-actions-button v-else>
          <template #actions>
            <catalog-actions
              :catalog="catalog"
              :catalog-schema="catalogSchema"
              :can-admin="canAdminCatalog"
              :can-exec="canExecCatalog"
              :edited="edited"
              :is-small="true"
              @triggered="runs && runs.refresh()"
            />
          </template>
        </layout-actions-button>
      </template> -->
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import type { Plugin, Catalog } from '#api/types'

import Vjsf from '@koumoul/vjsf'
import { getAccountRole } from '@data-fair/lib-vue/session'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog/index.ts'

const route = useRoute<'/catalogs/[id]'>()
const session = useSessionAuthenticated()

const valid = ref(false)
const edited = ref(false)
const editCatalog: Ref<Catalog | null> = ref(null)
const plugin: Ref<Plugin | null> = ref(null)

const catalogFetch = useFetch<Catalog>(`/catalogs/${route.params.id}`, { watch: false })
const pluginFetch = useFetch<Plugin>(`/plugins/${catalogFetch.data.value?.plugin}`, { watch: false })

/*
  Fetch initial data
*/

onMounted(async () => {
  setBreadcrumbs([{
    text: 'Traitements',
    to: '/catalogs'
  }, {
    text: catalogFetch.data.value?.title || ''
  }])
})

const canAdminCatalog = computed(() => {
  if (!catalogFetch.data.value) return false
  return getAccountRole(session.state, catalogFetch.data.value?.owner) === 'admin'
})

const catalogSchema = computed(() => {
  if (!pluginFetch.data.value || !catalogFetch.data.value) return
  const schema = JSON.parse(JSON.stringify(catalogSchemaBase)) // Clone

  // merge configSchema $defs and definitions into the global Catalog schema
  if (pluginFetch.data.value.configSchema.$defs) {
    schema.$defs = { ...schema.$defs, ...pluginFetch.data.value.configSchema.$defs }
    delete schema.properties.config.$defs
  }
  if (pluginFetch.data.value.configSchema.definitions) {
    schema.definitions = { ...schema.definitions, ...pluginFetch.data.value.configSchema.definitions }
    delete schema.properties.config.definitions
  }
  delete schema.properties.config.$id

  schema.required = ['title', 'config']
  schema.properties.config.required = schema.properties.config.required?.filter((s: any) => s !== 'datasetMode')

  return schema
})

let initialPatch = true
const patch = withUiNotif(
  async () => {
    // the first patch is always triggered because of removed additional properties
    if (initialPatch) {
      initialPatch = false
      return
    }

    // TODO: some problem in vjsf makes it necessary to wait when adding a permission for validity to be correct
    await new Promise(resolve => setTimeout(resolve, 1))

    if (!valid.value || !canAdminCatalog.value) return
    edited.value = true

    await $fetch(`/catalogs/${catalogId}`, {
      method: 'PATCH',
      body: editCatalog.value
    })

    if (catalog.value) Object.assign(catalog.value, editCatalog.value)

    edited.value = false
  },
  "Erreur pendant l'enregistrement du traitement"
)

const vjsfOptions = {
  density: 'comfortable',
  initialValidation: 'always',
  readOnly: !canAdminCatalog.value,
  readOnlyPropertiesMode: 'remove',
  updateOn: 'blur',
  validateOn: 'blur',
  locale: session.lang.value,
  titleDepth: 4
}

</script>

<style>
</style>
