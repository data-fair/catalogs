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
          Supprimer
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        title="Suppression du catalogue"
        variant="elevated"
        :loading="deleteCatalog.loading.value ? 'warning' : undefined"
      >
        <v-card-text>
          Voulez-vous vraiment supprimer le catalogue "{{ catalog?.title }}" ? La suppression est définitive et les données ne pourront pas être récupérées.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="deleteCatalog.loading.value"
            @click="showDeleteMenu = false"
          >
            Non
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="deleteCatalog.loading.value"
            @click="deleteCatalog.execute()"
          >
            Oui
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
          Changer le proriétaire
        </v-list-item>
      </template>
      <v-card
        rounded="lg"
        variant="elevated"
      >
        <v-card-title primary-title>
          Changer le proriétaire
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
            title="Opération sensible"
            text="Changer le propriétaire d'un catalogue peut avoir des conséquences sur l'execution du catalogue."
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
            Annuler
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :disabled="!ownersReady"
            :loading="changeOwner.loading.value"
            @click="changeOwner.execute()"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </v-list>
</template>

<script setup lang="ts">
import type { Catalog } from '#api/types'

import OwnerPick from '@data-fair/lib-vuetify/owner-pick.vue'

const { canAdmin, catalog } = defineProps<{
  canAdmin: boolean
  catalog: Catalog
}>()

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
    success: 'Propriétaire changé !',
    error: 'Erreur pendant le changement de propriétaire',
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
    success: 'Catalogue supprimé !',
    error: 'Erreur pendant la suppression du catalogue',
  }
)

</script>

<style scoped>
</style>
