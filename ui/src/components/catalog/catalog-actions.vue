<template>
  <v-list
    data-iframe-height
    density="compact"
    style="background-color: transparent;"
  >
    <v-menu
      v-if="canAdmin"
      v-model="showDeleteMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          rounded
        >
          <template #prepend>
            <v-icon
              color="warning"
              :icon="mdiDelete"
            />
          </template>
          {{ t('delete') }}
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        :title="t('deleteCatalog')"
        variant="elevated"
        :loading="deleteCatalog.loading.value ? 'warning' : undefined"
      >
        <v-card-text>
          {{ t('confirmDeleteCatalog', { title: catalog?.title }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="deleteCatalog.loading.value"
            @click="showDeleteMenu = false"
          >
            {{ t('no') }}
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="deleteCatalog.loading.value"
            @click="deleteCatalog.execute()"
          >
            {{ t('yes') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>

    <v-menu
      v-if="canAdmin"
      v-model="showChangeOwnerMenu"
      :close-on-content-click="false"
      max-width="500"
    >
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          rounded
        >
          <template #prepend>
            <v-icon
              color="warning"
              :icon="mdiAccount"
            />
          </template>
          {{ t('changeOwner') }}
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        variant="elevated"
      >
        <v-card-title primary-title>
          {{ t('changeOwner') }}
        </v-card-title>
        <v-progress-linear
          v-if="changeOwner.loading.value"
          indeterminate
          color="warning"
        />
        <v-card-text>
          <owner-pick
            v-model="newOwner"
            v-model:ready="ownersReady"
            message=" "
            other-accounts
          />
          <v-alert
            type="warning"
            :title="t('sensitiveOperation')"
            :text="t('changeOwnerWarning')"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="changeOwner.loading.value"
            @click="showChangeOwnerMenu = false"
          >
            {{ t('cancel') }}
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :disabled="!ownersReady"
            :loading="changeOwner.loading.value"
            @click="changeOwner.execute()"
          >
            {{ t('confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </v-list>
</template>

<script setup lang="ts">
import type { Catalog } from '#api/types'
import ownerPick from '@data-fair/lib-vuetify/owner-pick.vue'

const { canAdmin, catalog } = defineProps<{
  canAdmin: boolean
  catalog: Catalog
}>()

const { t } = useI18n()
const showDeleteMenu = ref(false)
const showChangeOwnerMenu = ref(false)
const ownersReady = ref(false)
const newOwner = ref<Record<string, string> | null>(null)

const router = useRouter()

const changeOwner = useAsyncAction(
  async () => {
    await $fetch(`/catalogs/${catalog?._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ owner: newOwner.value })
    })
    showChangeOwnerMenu.value = false
  },
  {
    success: t('ownerChanged'),
    error: t('errorChangingOwner'),
  }
)

const deleteCatalog = useAsyncAction(
  async () => {
    await $fetch(`/catalogs/${catalog?._id}`, {
      method: 'DELETE'
    })
    await router.replace('/catalogs')
    showDeleteMenu.value = false
  },
  {
    success: t('catalogDeleted'),
    error: t('errorDeletingCatalog'),
  }
)
</script>

<i18n lang="yaml">
  en:
    cancel: Cancel
    catalogDeleted: Catalog deleted!
    changeOwner: Change owner
    changeOwnerWarning: Changing the owner of a catalog may have consequences on the execution of the catalog.
    confirm: Confirm
    confirmDeleteCatalog: "Do you really want to delete the catalog \"{title}\"? Deletion is permanent and data cannot be recovered."
    delete: Delete
    deleteCatalog: Delete catalog
    errorChangingOwner: Error while changing the owner
    errorDeletingCatalog: Error while deleting the catalog
    no: No
    ownerChanged: Owner changed!
    sensitiveOperation: Sensitive operation
    yes: Yes

  fr:
    cancel: Annuler
    catalogDeleted: Catalogue supprimé !
    changeOwner: Changer le propriétaire
    changeOwnerWarning: Changer le propriétaire d'un catalogue peut avoir des conséquences sur l'execution du catalogue.
    confirm: Confirmer
    confirmDeleteCatalog: "Voulez-vous vraiment supprimer le catalogue \"{title}\" ? La suppression est définitive et les données ne pourront pas être récupérées."
    delete: Supprimer
    deleteCatalog: Suppression du catalogue
    errorChangingOwner: Erreur lors de le changement de propriétaire
    errorDeletingCatalog: Erreur lors de la suppression du catalogue
    no: Non
    ownerChanged: Propriétaire changé !
    sensitiveOperation: Opération sensible
    yes: Oui
</i18n>

<style scoped>
</style>
