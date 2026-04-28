<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { OrganizationMember } from '~/types'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

const authStore = useAuthStore()
const { user: currentUser, activeOrganizationId } = storeToRefs(authStore)
const { handleError } = useErrors()

const handleSwitch = (id: string) => {
  authStore.setActiveOrganization(id)
  useToast().add({ title: 'Workspace switched', color: 'success' })
}

// Management State
const expandedOrgId = ref<string | null>(null)
const activeTabs = ref<Record<string, 'members' | 'branding' | 'settings'>>({})

// Delete Organization State
const deleteModalOpen = ref(false)
const deleteStep = ref<1 | 2>(1)
const deleteOrgId = ref<string | null>(null)
const deleteOrgName = ref('')
const deleteCounts = ref({ tournamentCount: 0, memberCount: 0 })
const deleteCode = ref('')
const requestingCode = ref(false)
const confirmingDelete = ref(false)

const toggleExpand = (id: string) => {
  if (expandedOrgId.value === id) {
    expandedOrgId.value = null
  } else {
    expandedOrgId.value = id
    if (!activeTabs.value[id]) {
        activeTabs.value[id] = 'members'
    }
    // Fetch members if not loaded
    if (activeTabs.value[id] === 'members') {
        fetchMembers(id)
    }
  }
}

// Members Logic
const membersMap = ref<Record<string, any[]>>({})
const loadingMembers = ref<Record<string, boolean>>({})

const fetchMembers = async (orgId: string) => {
  loadingMembers.value[orgId] = true
  try {
    const response = await $api<{success: boolean, data: any[]}>(`/organizations/${orgId}/members`)
    membersMap.value[orgId] = response.data
  } catch (error) {
    handleError(error, { title: 'Failed to load members', toast: false })
  } finally {
    loadingMembers.value[orgId] = false
  }
}

const inviteEmail = ref('')
const inviting = ref(false)

const handleInvite = async (orgId: string) => {
    if (!inviteEmail.value) return
    inviting.value = true
    try {
        await $api(`/organizations/${orgId}/members`, {
            method: 'POST',
            body: { email: inviteEmail.value, role: 'MEMBER' }
        })
        useToast().add({ title: 'Invitation sent', color: 'success' })
        inviteEmail.value = ''
        fetchMembers(orgId)
    } catch (error: any) {
        handleError(error, { title: 'Invite failed' })
    } finally {
        inviting.value = false
    }
}

const handleUpdateRole = async (orgId: string, userId: string, role: string) => {
    try {
        await $api(`/organizations/${orgId}/members/${userId}`, {
            method: 'PATCH',
            body: { role }
        })
        useToast().add({ title: 'Role updated', color: 'success' })
        fetchMembers(orgId)
    } catch (error: any) {
        handleError(error, { title: 'Update failed' })
    }
}

const handleRemoveMember = async (orgId: string, userId: string) => {
    openConfirmModal({
        title: 'Remove Member',
        description: 'Are you sure you want to remove this member from the organization? This action cannot be undone.',
        confirmLabel: 'Remove Member',
        color: 'error',
        onConfirm: async () => {
            try {
                await $api(`/organizations/${orgId}/members/${userId}`, {
                    method: 'DELETE'
                })
                useToast().add({ title: 'Member removed', color: 'success' })
                fetchMembers(orgId)
            } catch (error: any) {
                handleError(error, { title: 'Removal failed' })
            }
        }
    })
}

const canManage = (currentOrgMember: any, member: any) => {
    if (!currentOrgMember || !member) return false
    if (currentOrgMember.userId === member.userId) return false
    if (currentOrgMember.role === 'OWNER') return true
    if (currentOrgMember.role === 'ADMIN') return member.role === 'MEMBER'
    return false
}

const getMemberActions = (currentOrgMember: any, member: any) => {
    const sections = []
    
    if (currentOrgMember.role === 'OWNER') {
        const roleActions = []
        if (member.role !== 'ADMIN') {
            roleActions.push({
                label: 'Make Admin',
                icon: 'i-heroicons-shield-check',
                onSelect: () => handleUpdateRole(currentOrgMember.organizationId, member.userId, 'ADMIN')
            })
        }
        if (member.role !== 'MEMBER') {
            roleActions.push({
                label: 'Make Member',
                icon: 'i-heroicons-user',
                onSelect: () => handleUpdateRole(currentOrgMember.organizationId, member.userId, 'MEMBER')
            })
        }
        if (roleActions.length > 0) sections.push(roleActions)
    }
    
    sections.push([{
        label: 'Remove from Team',
        icon: 'i-heroicons-user-minus',
        color: 'secondary' as const,
        onSelect: () => handleRemoveMember(currentOrgMember.organizationId, member.userId)
    }])
    
    return sections
}

// Branding Logic
const brandingStates = ref<Record<string, any>>({})
const updatingBranding = ref(false)

const startBrandingEdit = (org: any) => {
    brandingStates.value[org.id] = {
        name: org.name || '',
        logoUrl: org.logoUrl || '',
        location: org.location || '',
        website: org.website || ''
    }
}

const handleUpdateBranding = async (orgId: string) => {
    updatingBranding.value = true
    try {
        const payload = { ...brandingStates.value[orgId] }
        if (!payload.website) delete payload.website
        if (!payload.location) delete payload.location
        if (!payload.logoUrl) delete payload.logoUrl

        await $api(`/organizations/${orgId}`, {
            method: 'PATCH',
            body: payload
        })
        useToast().add({ title: 'Branding updated', color: 'success' })
        await authStore.fetchUser()
    } catch (error: any) {
        handleError(error, { title: 'Update failed' })
    } finally {
        updatingBranding.value = false
    }
}

const handleLogoUpload = async (event: Event, orgId: string) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await $api<{data: {url: string}}>('/upload/image?folder=organizations', {
      method: 'POST',
      body: formData
    })
     brandingStates.value[orgId].logoUrl = response.data.url
  } catch (error: any) {
    handleError(error, { title: 'Upload failed' })
  }
}

const logoInput = ref<HTMLInputElement | null>(null)

const triggerUpload = (orgId: string) => {
  document.getElementById('logo-input-' + orgId)?.click()
}

// Helper to initialize branding state when switching to branding tab
watch(activeTabs, (newTabs) => {
    for (const [orgId, tab] of Object.entries(newTabs)) {
        if (tab === 'settings' && !brandingStates.value[orgId]) {
            const org = authStore.organizations.find(o => o.organizationId === orgId)?.organization
            if (org) startBrandingEdit(org)
        }
    }
}, { deep: true })

// Shared Confirmation Modal State
const confirmModalState = reactive({
  isOpen: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  color: 'primary' as 'primary' | 'error' | 'warning',
  onConfirm: async () => {},
  loading: false
})

const openConfirmModal = (options: {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  color?: 'primary' | 'error' | 'warning'
  onConfirm: () => Promise<void> | void
}) => {
  confirmModalState.title = options.title
  confirmModalState.description = options.description
  confirmModalState.confirmLabel = options.confirmLabel || 'Confirm'
  confirmModalState.cancelLabel = options.cancelLabel || 'Cancel'
  confirmModalState.color = options.color || 'primary'
  confirmModalState.onConfirm = async () => {
    confirmModalState.loading = true
    try {
      await options.onConfirm()
    } finally {
      confirmModalState.loading = false
      confirmModalState.isOpen = false
    }
  }
  confirmModalState.isOpen = true
}

// Delete Organization Handlers
const openDeleteModal = (orgId: string, orgName: string) => {
  deleteOrgId.value = orgId
  deleteOrgName.value = orgName
  deleteStep.value = 1
  deleteCode.value = ''
  deleteModalOpen.value = true
}

const handleRequestDeleteCode = async () => {
  if (!deleteOrgId.value) return
  requestingCode.value = true
  try {
    const response = await $api<{success: boolean, data: {tournamentCount: number, memberCount: number}, message: string}>(
      `/organizations/${deleteOrgId.value}/request-delete`,
      { method: 'POST' }
    )
    deleteCounts.value = response.data
    deleteStep.value = 2
    deleteStep.value = 2
    useToast().add({ title: 'Code sent', description: 'Check your email for the verification code', color: 'success' })
  } catch (error: any) {
    handleError(error, { title: 'Failed to send code' })
  } finally {
    requestingCode.value = false
  }
}

const handleConfirmDelete = async () => {
  if (!deleteOrgId.value || !deleteCode.value) return
  confirmingDelete.value = true
  try {
    await $api(`/organizations/${deleteOrgId.value}/confirm-delete`, {
      method: 'POST',
      body: { code: deleteCode.value }
    })
    useToast().add({ title: 'Organization deleted', description: `${deleteOrgName.value} has been permanently deleted.`, color: 'success' })
    deleteModalOpen.value = false
    // Refresh user data to remove the deleted org
    await authStore.fetchUser()
    // If we deleted the active org, switch to first available
    if (deleteOrgId.value === authStore.activeOrganizationId) {
      const remaining = authStore.organizations[0]
      if (remaining) {
        authStore.setActiveOrganization(remaining.organizationId)
      }
    }
    expandedOrgId.value = null
  } catch (error: any) {
    handleError(error, { title: 'Delete failed' })
  } finally {
    confirmingDelete.value = false
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto py-2">
    <!-- Header -->
    <div class="mb-8 px-2">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Organizations</h1>
      <p class="text-gray-500 mt-1 text-sm">Switch between your management workspaces</p>
    </div>

    <!-- Organizations List -->
    <div class="space-y-4 px-2">
      <div 
        v-for="orgMember in authStore.organizations" 
        :key="orgMember.organizationId"
        class="flex flex-col rounded-2xl border transition-all duration-300"
        :class="[
            authStore.activeOrganizationId === orgMember.organizationId 
                ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/10 dark:bg-indigo-500/5' 
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
        ]"
      >
        <!-- Card Header -->
        <div class="p-5 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <!-- Logo -->
                <div class="relative">
                    <UAvatar 
                        v-if="orgMember.organization?.logoUrl" 
                        :src="orgMember.organization.logoUrl" 
                        size="xl" 
                        class="rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                    />
                    <div 
                        v-else 
                        class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-500 font-bold text-xl border border-indigo-500/20"
                    >
                        {{ orgMember.organization?.name?.charAt(0) }}
                    </div>
                    
                    <!-- Active Indicator Dot -->
                    <div 
                        v-if="authStore.activeOrganizationId === orgMember.organizationId"
                        class="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"
                    ></div>
                </div>

                <!-- Info -->
                <div>
                    <p class="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        {{ orgMember.organization?.name }}
                    </p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <UBadge 
                            :label="orgMember.role" 
                            size="xs" 
                            variant="subtle" 
                            :color="orgMember.role === 'OWNER' ? 'primary' : 'neutral'"
                            class="font-bold tracking-wider"
                        />
                        <span v-if="authStore.activeOrganizationId === orgMember.organizationId" class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Active Workspace</span>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2">
                <UButton 
                    v-if="authStore.activeOrganizationId === orgMember.organizationId"
                    icon="i-heroicons-cog-6-tooth"
                    variant="ghost" 
                    color="primary"
                    square
                    class="rounded-xl transition-transform"
                    :class="{ 'rotate-90 text-indigo-600': expandedOrgId === orgMember.organizationId }"
                    @click="toggleExpand(orgMember.organizationId)"
                />

                <UButton 
                    v-if="authStore.activeOrganizationId !== orgMember.organizationId"
                    label="Switch" 
                    size="md" 
                    variant="solid" 
                    color="primary"
                    class="rounded-xl font-bold px-6 shadow-md shadow-indigo-500/20"
                    @click="handleSwitch(orgMember.organizationId)"
                />
            </div>
        </div>

        <!-- Expanded Settings Section -->
        <div v-if="expandedOrgId === orgMember.organizationId" class="border-t border-gray-200 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-white/1">
            <!-- Settings Tabs -->
            <div class="flex gap-4 border-b border-gray-200 dark:border-white/5 mb-4">
                <button 
                    v-for="tab in ['members', 'settings'] as const" 
                    :key="tab"
                    class="px-4 py-2 text-sm font-bold capitalize transition-all border-b-2 -mb-px"
                    :class="activeTabs[orgMember.organizationId] === tab ? 'text-indigo-500 border-indigo-500' : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300'"
                    @click="activeTabs[orgMember.organizationId] = tab"
                >
                    {{ tab }}
                </button>
            </div>

            <!-- Members Tab -->
            <div v-if="activeTabs[orgMember.organizationId] === 'members'" class="space-y-6 pt-2">
                        <!-- Invite Member -->
                        <div class="flex gap-2">
                            <UInput 
                                v-model="inviteEmail" 
                                placeholder="colleague@example.com" 
                                class="flex-1" 
                                size="md"
                                @keyup.enter="handleInvite(orgMember.organizationId)"
                            >
                                <template #leading>
                                    <UIcon name="i-heroicons-envelope" />
                                </template>
                            </UInput>
                            <UButton 
                                label="Invite" 
                                color="primary" 
                                class="rounded-xl font-bold px-4"
                                :loading="inviting"
                                @click="handleInvite(orgMember.organizationId)"
                            />
                        </div>

                <!-- Current Team -->
                <div class="space-y-3">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Team</h4>
                    <div v-if="loadingMembers[orgMember.organizationId]" class="flex justify-center py-4">
                        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                    <div v-else class="space-y-2">
                        <div 
                            v-for="m in membersMap[orgMember.organizationId]" 
                            :key="m.id"
                            class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <div class="flex items-center gap-3">
                                <UAvatar :src="m.user.picture" :alt="m.user.name" size="xs" />
                                <div class="flex flex-col">
                                    <span class="text-sm font-bold text-gray-900 dark:text-white">{{ m.user.name }}</span>
                                    <span class="text-[10px] text-gray-400">{{ m.user.email }}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <UBadge :label="m.role" size="xs" variant="outline" class="text-[10px] font-bold" />
                                
                                <UDropdownMenu 
                                    v-if="canManage(orgMember, m)"
                                    :items="getMemberActions(orgMember, m)"
                                    :content="{ align: 'end' }"
                                >
                                    <UButton 
                                        variant="ghost" 
                                        color="neutral" 
                                        icon="i-heroicons-ellipsis-vertical" 
                                        size="xs" 
                                        square 
                                    />
                                </UDropdownMenu>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Settings Tab -->
            <div v-if="activeTabs[orgMember.organizationId] === 'settings'" class="space-y-6 pt-2">
                <!-- Branding Section -->
                <div v-if="brandingStates[orgMember.organizationId]" class="space-y-4">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Branding</h4>
                    <UFormField label="Workspace Name">
                        <UInput v-model="brandingStates[orgMember.organizationId].name" placeholder="Organization name" />
                    </UFormField>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        
                        <div class="flex flex-col gap-2">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Workspace Logo</span>
                            <div class="flex items-center gap-4">
                                <UAvatar 
                                    :src="brandingStates[orgMember.organizationId].logoUrl" 
                                    size="lg" 
                                    class="rounded-xl border border-gray-200 dark:border-white/10" 
                                />
                                <UButton 
                                    label="Change Image" 
                                    variant="subtle" 
                                    size="xs" 
                                    icon="i-heroicons-camera" 
                                    class="rounded-lg font-bold"
                                    @click="triggerUpload(orgMember.organizationId)"
                                />
                                <input :id="'logo-input-' + orgMember.organizationId" type="file" class="hidden" accept="image/*" @change="(e) => handleLogoUpload(e, orgMember.organizationId)" />
                            </div>
                        </div>
                    </div>

                    <UButton 
                        label="Save Changes" 
                        color="primary" 
                        class="w-full rounded-xl font-bold mt-4" 
                        :loading="updatingBranding"
                        @click="handleUpdateBranding(orgMember.organizationId)"
                    />
                </div>

                <!-- Danger Zone -->
                <div v-if="orgMember.role === 'OWNER'" class="border-2 border-red-500/30 rounded-xl overflow-hidden">
                    <div class="px-5 py-3 bg-red-500/5 border-b border-red-500/20">
                        <h4 class="text-sm font-bold text-red-500 flex items-center gap-2">
                            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
                            Danger Zone
                        </h4>
                    </div>
                    <div class="p-5">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="font-bold text-gray-900 dark:text-white text-sm">Delete this organization</p>
                                <p class="text-xs text-gray-500 mt-1">Permanently delete this organization and all its tournaments, fixtures, and data. This action cannot be undone.</p>
                            </div>
                            <UButton
                                label="Delete Organization"
                                color="error"
                                variant="soft"
                                icon="i-heroicons-trash"
                                class="rounded-xl font-bold shrink-0 ml-4"
                                @click="openDeleteModal(orgMember.organizationId, orgMember.organization?.name || 'Organization')"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <!-- Create New Organization -->
      <NuxtLink 
        to="/onboarding"
        class="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group"
      >
        <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
          <UIcon name="i-heroicons-plus" class="w-6 h-6" />
        </div>
        <div class="text-center">
          <p class="font-bold text-gray-900 dark:text-white">Create New Organization</p>
          <p class="text-sm">Add another workspace to your account</p>
        </div>
      </NuxtLink>
    </div>

    <!-- Footer Help -->
    <div class="mt-12 text-center text-xs text-gray-400 dark:text-gray-600 px-8 leading-relaxed">
      Organizations allow you to separate tournaments and team management between different clubs or leagues.
    </div>

    <!-- Confirmation Modal -->
    <UModal v-model:open="confirmModalState.isOpen" :ui="{ content: 'sm:max-w-md' }">
        <template #content>
            <UCard :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
                <template #header>
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-2">
                            <UIcon :name="confirmModalState.color === 'error' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-information-circle'" 
                                class="w-5 h-5" :class="confirmModalState.color === 'error' ? 'text-red-500' : 'text-blue-500'" />
                            {{ confirmModalState.title }}
                        </h3>
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="confirmModalState.isOpen = false" />
                    </div>
                </template>

                <div class="py-4 px-2">
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        {{ confirmModalState.description }}
                    </p>
                </div>

                <template #footer>
                    <div class="flex items-center justify-end gap-3">
                        <UButton 
                            color="neutral" 
                            variant="ghost" 
                            :label="confirmModalState.cancelLabel" 
                            @click="confirmModalState.isOpen = false" 
                            :disabled="confirmModalState.loading"
                        />
                        <UButton 
                            :color="confirmModalState.color" 
                            :label="confirmModalState.confirmLabel"
                            :loading="confirmModalState.loading"
                            @click="confirmModalState.onConfirm"
                        />
                    </div>
                </template>
            </UCard>
        </template>
    </UModal>

    <!-- Delete Organization Modal -->
    <UModal v-model:open="deleteModalOpen" :ui="{ content: 'sm:max-w-lg' }">
        <template #content>
            <UCard>
                <template #header>
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
                            Delete {{ deleteOrgName }}
                        </h3>
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="deleteModalOpen = false" />
                    </div>
                </template>

                <!-- Step 1: Warning -->
                <div v-if="deleteStep === 1" class="py-4 px-2 space-y-4">
                    <div class="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                        <p class="text-sm font-bold text-red-600 dark:text-red-400 mb-2">⚠️ This action is irreversible!</p>
                        <p class="text-sm text-red-600/80 dark:text-red-400/80">Deleting this organization will permanently remove:</p>
                        <ul class="text-sm text-red-600/80 dark:text-red-400/80 mt-2 ml-4 list-disc space-y-1">
                            <li>The organization "<strong>{{ deleteOrgName }}</strong>"</li>
                            <li>All tournaments and their fixtures, standings, and match data</li>
                            <li>All team invites and player registrations</li>
                            <li>All member associations</li>
                        </ul>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        To proceed, we'll send a <strong>6-digit verification code</strong> to your email address. You must enter this code to confirm the deletion.
                    </p>
                </div>

                <!-- Step 2: Code Entry -->
                <div v-if="deleteStep === 2" class="py-4 px-2 space-y-4">
                    <div class="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                        <p class="text-sm text-amber-700 dark:text-amber-400">
                            <strong>Verification code sent!</strong> Check your email and enter the 6-digit code below. The code expires in 10 minutes.
                        </p>
                    </div>
                    <UFormField label="Verification Code">
                        <UInput
                            v-model="deleteCode"
                            placeholder="Enter 6-digit code"
                            size="lg"
                            class="font-mono text-center tracking-widest"
                            maxlength="6"
                            @keyup.enter="handleConfirmDelete"
                        />
                    </UFormField>
                    <p class="text-xs text-gray-400">Didn't receive the code? <button class="text-indigo-500 hover:underline" :disabled="requestingCode" @click="handleRequestDeleteCode">Resend code</button></p>
                </div>

                <template #footer>
                    <div class="flex items-center justify-end gap-3">
                        <UButton
                            color="neutral"
                            variant="ghost"
                            label="Cancel"
                            @click="deleteModalOpen = false"
                            :disabled="requestingCode || confirmingDelete"
                        />
                        <UButton
                            v-if="deleteStep === 1"
                            color="error"
                            label="Send Verification Code"
                            icon="i-heroicons-envelope"
                            :loading="requestingCode"
                            @click="handleRequestDeleteCode"
                        />
                        <UButton
                            v-if="deleteStep === 2"
                            color="error"
                            label="Permanently Delete"
                            icon="i-heroicons-trash"
                            :loading="confirmingDelete"
                            :disabled="deleteCode.length !== 6"
                            @click="handleConfirmDelete"
                        />
                    </div>
                </template>
            </UCard>
        </template>
    </UModal>
  </div>
</template>

<style scoped>
.active-org {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
