<template>
  <v-container
    v-if="catalog"
    data-iframe-height
  >
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
          @update:model-value="patch.execute()"
        />
      </v-form>
    </v-defaults-provider>
    <layout-actions v-if="canAdmin">
      <catalog-actions
        :catalog="catalog"
        :can-admin="canAdmin"
        :is-small="true"
      />
    </layout-actions>
  </v-container>
</template>

<script setup lang="ts">
import type { Plugin, Catalog } from '#api/types'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import VjsfMarkdown from '@koumoul/vjsf-markdown'
import { getAccountRole } from '@data-fair/lib-vue/session'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog/index.ts'

const route = useRoute<'/catalogs/[id]'>()
const session = useSessionAuthenticated()

const valid = ref(false)
const editCatalog: Ref<Catalog | null> = ref(null)
const catalog = ref<Catalog | null>(null)
const plugin = ref<Plugin | null>(null)

onMounted(async () => {
  catalog.value = await $fetch(`/catalogs/${route.params.id}`)
  if (catalog.value) {
    plugin.value = await $fetch(`/plugins/${catalog.value.plugin}`)
    editCatalog.value = { ...catalog.value }
  }

  setBreadcrumbs([{
    text: 'Catalogs',
    to: '/catalogs'
  }, {
    text: catalog.value?.title || ''
  }])
})

const canAdmin = computed(() => {
  if (!catalog.value) return false
  return getAccountRole(session.state, catalog.value.owner) === 'admin'
})

const catalogSchema = computed(() => {
  if (!plugin.value) return
  const schema = jsonSchema(catalogSchemaBase)
    .addProperty('config', plugin.value.configSchema)
    .makePatchSchema()
    .schema
  return schema
})

const patch = useAsyncAction(
  async () => {
    if (!valid.value || !canAdmin.value) return
    await $fetch(`/catalogs/${route.params.id}`, {
      method: 'PATCH',
      body: editCatalog.value
    })

    Object.assign(catalog.value || {}, editCatalog.value)
  },
  {
    error: "Erreur pendant l'enregistrement du catalog"
  }
)

const vjsfOptions = computed<VjsfOptions>(() => ({
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  plugins: [VjsfMarkdown],
  readOnly: !canAdmin.value,
  removeAdditional: true,
  titleDepth: 3,
  updateOn: 'blur',
  validateOn: 'blur',
  xI18n: true
}))

</script>

<style>
</style>
