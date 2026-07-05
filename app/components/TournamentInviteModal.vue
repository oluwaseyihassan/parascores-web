<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTournamentInviteStore } from '~/stores/tournamentInvite'
import { useToast } from '#imports'

const props = defineProps<{
  tournamentId: string
}>()

const isOpen = defineModel<boolean>()
const inviteStore = useTournamentInviteStore()
const toast = useToast()
const config = useRuntimeConfig()

const loading = ref(false)
const copiedId = ref<string | null>(null)

const newInviteSettings = ref({
  maxUses: null as number | null,
  expiresInDays: null as number | null,
})

const activeInvites = computed(() => {
  return inviteStore.invites.filter(i => i.isActive)
})

onMounted(async () => {
  if (props.tournamentId) {
    loading.value = true
    await inviteStore.loadInvitesForTournament(props.tournamentId)
    loading.value = false
  }
})

const generateLink = async () => {
  try {
    const expiresAt = newInviteSettings.value.expiresInDays 
      ? new Date(Date.now() + newInviteSettings.value.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined

    await inviteStore.createInvite(props.tournamentId, {
      maxUses: newInviteSettings.value.maxUses || undefined,
      expiresAt
    })
    
    toast.add({ title: 'Invite link generated', color: 'success' })
    // Reset form
    newInviteSettings.value.maxUses = null
    newInviteSettings.value.expiresInDays = null
  } catch (err) {
    // Error handled by store
  }
}

const { toMain } = useHost()

const getInviteUrl = (token: string) => {
  return toMain(`/t-join/${token}`, { absolute: true })
}

const copyLink = async (invite: any) => {
  const url = getInviteUrl(invite.token)
  try {
    await navigator.clipboard.writeText(url)
    copiedId.value = invite.id
    toast.add({ title: 'Link copied to clipboard', color: 'success' })
    setTimeout(() => {
      if (copiedId.value === invite.id) copiedId.value = null
    }, 2000)
  } catch (err) {
    toast.add({ title: 'Failed to copy link', color: 'error' })
  }
}

const revokeInvite = async (id: string) => {
  try {
    await inviteStore.revokeInvite(id)
    toast.add({ title: 'Link revoked', color: 'success' })
  } catch (err) {
    // handled by store
  }
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Tournament Invites
            </h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isOpen = false;" />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Generate New Link -->
          <div>
            <h4 class="text-sm font-medium mb-3">Create New Invite Link</h4>
            <div class="grid grid-cols-2 gap-4 mb-3">
              <UFormField label="Max Uses (Optional)" class="text-gray-900 dark:text-white">
                <UInput v-model="newInviteSettings.maxUses" type="number" min="1" placeholder="Unlimited" />
              </UFormField>
              <UFormField label="Expires In (Days)" class="text-gray-900 dark:text-white">
                <UInput v-model="newInviteSettings.expiresInDays" type="number" min="1" placeholder="Never" />
              </UFormField>
            </div>
            <UButton 
              @click="generateLink" 
              :loading="inviteStore.loading && !loading"
              icon="i-heroicons-link" 
              block
            >
              Generate Link
            </UButton>
          </div>

          <UDivider />

          <!-- Active Links -->
          <div>
            <h4 class="text-sm font-medium mb-3">Active Links</h4>
            <div v-if="loading" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
            </div>
            <div v-else-if="activeInvites.length === 0" class="text-sm text-gray-500 text-center py-4">
              No active invite links
            </div>
            <div v-else class="space-y-3 max-h-60 overflow-y-auto">
              <div 
                v-for="invite in activeInvites" 
                :key="invite.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div class="flex-1 min-w-0 pr-4">
                  <div class="text-xs text-gray-500 truncate mb-1">
                    {{ getInviteUrl(invite.token) }}
                  </div>
                  <div class="flex gap-2 text-xs text-gray-400">
                    <span v-if="invite.maxUses">
                      {{ invite.usedCount }} / {{ invite.maxUses }} uses
                    </span>
                    <span v-else>
                      {{ invite.usedCount }} uses
                    </span>
                    <span v-if="invite.expiresAt">
                      • Expires {{ new Date(invite.expiresAt).toLocaleDateString() }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <UButton 
                    size="xs" 
                    :color="copiedId === invite.id ? 'success' : 'neutral'" 
                    :variant="copiedId === invite.id ? 'solid' : 'ghost'"
                    :icon="copiedId === invite.id ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                    @click="copyLink(invite)"
                    title="Copy link"
                  />
                  <UButton 
                    size="xs" 
                    color="error" 
                    variant="ghost"
                    icon="i-heroicons-trash"
                    @click="revokeInvite(invite.id)"
                    title="Revoke link"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
