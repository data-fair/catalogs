<template>
  <v-list
    data-iframe-height
    density="compact"
    style="background-color: transparent;"
  >
    <v-menu
      v-if="canAdmin"
      v-model="showDuplicateMenu"
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
              color="primary"
              :icon="mdiContentDuplicate"
            />
          </template>
          {{ t('duplicate') }}
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        :title="t('duplicateCatalog')"
        variant="elevated"
        :loading="duplicateCatalog.loading.value ? 'warning' : undefined"
      >
        <v-card-text class="pb-0">
          {{ t('descriptionDuplicateCatalog', { title: catalog.title }) }}
          <v-text-field
            v-model="duplicateTitle"
            :label="t('newCatalogTitle')"
            :placeholder="catalog.title + t('copy')"
            class="mt-2"
            hide-details="auto"
            clearable
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            :disabled="duplicateCatalog.loading.value"
            @click="showDuplicateMenu = false"
          >
            {{ t('cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="duplicateCatalog.loading.value"
            @click="duplicateCatalog.execute()"
          >
            {{ t('duplicate') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>

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
const showDuplicateMenu = ref(false)
const showDeleteMenu = ref(false)
const showChangeOwnerMenu = ref(false)
const ownersReady = ref(false)
const newOwner = ref<Record<string, string> | null>(null)
const duplicateTitle = ref(catalog?.title + t('copy'))

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

const duplicateCatalog = useAsyncAction(
  async () => {
    const newCatalog = await $fetch('/catalogs', {
      method: 'POST',
      body: JSON.stringify({
        title: duplicateTitle.value || catalog?.title + t('copy'),
        description: catalog?.description,
        plugin: catalog?.plugin,
        owner: catalog?.owner,
        config: catalog?.config,
      })
    })
    await router.push(`/catalogs/${newCatalog._id}`)
    router.go(0) // Refresh the page to get the new catalog
    showDuplicateMenu.value = false
  },
  {
    success: t('catalogDuplicated'),
    error: t('errorDuplicatingCatalog'),
  }
)
</script>

<i18n lang="yaml">
  en:
    cancel: Cancel
    catalogDeleted: Catalog deleted!
    catalogDuplicated: Catalog duplicated!
    changeOwner: Change owner
    changeOwnerWarning: Changing the owner of a catalog may have consequences on the execution of the catalog.
    confirm: Confirm
    confirmDeleteCatalog: Do you really want to delete the catalog "{title}"? Deletion is permanent and data cannot be recovered.
    copy: " (copy)"
    delete: Delete
    deleteCatalog: Delete catalog
    duplicate: Duplicate
    duplicateCatalog: Duplicate catalog
    descriptionDuplicateCatalog: You are about to create a copy of the catalog "{title}".
    errorChangingOwner: Error while changing the owner
    errorDeletingCatalog: Error while deleting the catalog
    errorDuplicatingCatalog: Error while duplicating the catalog
    newCatalogTitle: New catalog title
    no: No
    ownerChanged: Owner changed!
    sensitiveOperation: Sensitive operation
    yes: Yes

  fr:
    cancel: Annuler
    catalogDeleted: Catalogue supprimé !
    catalogDuplicated: Catalogue dupliqué !
    changeOwner: Changer le propriétaire
    changeOwnerWarning: Changer le propriétaire d'un catalogue peut avoir des conséquences sur l'execution du catalogue.
    confirm: Confirmer
    confirmDeleteCatalog: Voulez-vous vraiment supprimer le catalogue "{title}" ? La suppression est définitive et les données ne pourront pas être récupérées.
    copy: " (copie)"
    delete: Supprimer
    deleteCatalog: Suppression du catalogue
    duplicate: Dupliquer
    duplicateCatalog: Duplication du catalogue
    descriptionDuplicateCatalog: Vous êtes sur le point de créer une copie du catalogue "{title}".
    errorChangingOwner: Erreur lors de le changement de propriétaire
    errorDeletingCatalog: Erreur lors de la suppression du catalogue
    errorDuplicatingCatalog: Erreur lors de la duplication du catalogue
    newCatalogTitle: Titre du nouveau catalogue
    no: Non
    ownerChanged: Propriétaire changé !
    sensitiveOperation: Opération sensible
    yes: Oui
</i18n>

<style scoped>
</style>
