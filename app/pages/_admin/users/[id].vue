<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const user = ref<any>(null)
const selectedRole = ref('')

const loadUser = async () => {
  try {
    const data = await adminStore.fetchUser(route.params.id as string)
    if (data) {
      user.value = data
      selectedRole.value = data.role
    }
  } catch (err) {
    console.error('Failed to load user detail:', err)
  }
}

onMounted(() => {
  loadUser()
})

const isUpdatingRole = ref(false)

const handleRoleChange = async () => {
  if (!user.value || selectedRole.value === user.value.role) return
  
  if (selectedRole.value === 'SUPER_ADMIN' && !user.value.email.endsWith('@parascores.com')) {
    useToast().add({
      title: 'Action Blocked',
      description: 'Super Admin promotion is restricted to @parascores.com email domains.',
      color: 'error'
    })
    selectedRole.value = user.value.role
    return
  }

  isUpdatingRole.value = true
  try {
    const updated = await adminStore.updateUserRole(user.value.id, selectedRole.value)
    if (updated) {
      user.value.role = updated.role
      useToast().add({
        title: 'Role Updated',
        description: `Successfully updated user role to ${updated.role}`,
        color: 'success'
      })
    }
  } catch (err: any) {
    useToast().add({
      title: 'Action Failed',
      description: err.message || 'Failed to update user role.',
      color: 'error'
    })
    selectedRole.value = user.value.role
  } finally {
    isUpdatingRole.value = false
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(val)
}

const copiedField = ref<string | null>(null)

const copyToClipboard = async (value: string, field: string) => {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedField.value = field
    setTimeout(() => {
      if (copiedField.value === field) copiedField.value = null
    }, 1500)
    useToast().add({
      title: 'Copied',
      description: `${field} copied to clipboard.`,
      color: 'success',
      icon: 'i-heroicons-clipboard-document-check'
    })
  } catch (err) {
    useToast().add({
      title: 'Copy Failed',
      description: 'Could not copy to clipboard.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Breadcrumbs / Back navigation -->
    <div class="flex items-center gap-3">
      <NuxtLink to="/users" class="text-rose-500 hover:text-rose-400 text-sm font-semibold flex items-center gap-1">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        Back to Users
      </NuxtLink>
    </div>

    <!-- Error state -->
    <UAlert
      v-if="error"
      title="Failed to retrieve user detailed profile"
      description="The backend could not locate the user ID requested."
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Main user grid -->
    <div v-if="user" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Sidebar Information -->
      <div class="space-y-6 lg:col-span-1">
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
          <UAvatar
            v-if="user.picture"
            :src="user.picture"
            size="lg"
            class="ring-4 ring-rose-600/30"
          />
          <UAvatar
            v-else
            :text="user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()"
            size="lg"
            class="bg-slate-800 text-slate-300 ring-4 ring-slate-800 font-extrabold text-xl"
          />

          <h2 class="text-lg font-bold text-white mt-4">{{ user.name || 'Anonymous User' }}</h2>
          <div class="flex items-center justify-center gap-2 mt-1">
            <span class="text-sm text-slate-500 font-medium">{{ user.email }}</span>
            <button
              class="text-slate-500 hover:text-emerald-400 transition"
              :class="copiedField === 'Email' ? 'text-emerald-400' : ''"
              @click="copyToClipboard(user.email, 'Email')"
            >
              <UIcon :name="copiedField === 'Email' ? 'i-heroicons-clipboard-document-check' : 'i-heroicons-clipboard-document'" class="w-4 h-4" />
            </button>
          </div>

          <div class="mt-4 flex items-center gap-2">
            <span 
              class="px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
              :class="[
                user.role === 'SUPER_ADMIN' 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                  : user.role === 'ORGANIZER'
                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
              ]"
            >
              {{ user.role }}
            </span>
            <span 
              class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
              :class="user.isEmailVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'"
            >
              {{ user.isEmailVerified ? 'Verified' : 'Unverified' }}
            </span>
          </div>

          <div class="w-full border-t border-slate-900 mt-6 pt-6 text-left space-y-4 text-xs font-semibold">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Account ID</span>
              <div class="flex items-center gap-2">
                <span class="text-slate-300 font-mono text-[10px] select-all">{{ user.id }}</span>
                <button
                  class="text-slate-500 hover:text-emerald-400 transition"
                  :class="copiedField === 'Account ID' ? 'text-emerald-400' : ''"
                  @click="copyToClipboard(user.id, 'Account ID')"
                >
                  <UIcon :name="copiedField === 'Account ID' ? 'i-heroicons-clipboard-document-check' : 'i-heroicons-clipboard-document'" class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Registered</span>
              <span class="text-slate-300">{{ formatDate(user.created_at) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Last Updated</span>
              <span class="text-slate-300">{{ formatDate(user.updated_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Role Update Controls -->
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 class="text-sm font-bold text-white">Modify User Role</h3>
          <div class="flex flex-col gap-3">
            <select 
              v-model="selectedRole"
              class="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 w-full focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
              :disabled="isUpdatingRole"
            >
              <option value="USER">User / Fan Profile</option>
              <option value="ORGANIZER">Tournament Organizer</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <UButton
              block
              color="primary"
              :disabled="selectedRole === user.role"
              :loading="isUpdatingRole"
              @click="handleRoleChange"
            >
              Update Account Role
            </UButton>
          </div>
          <div 
            v-if="!user.email.endsWith('@parascores.com')"
            class="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-[11px] text-rose-400 flex items-start gap-2"
          >
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 shrink-0 mt-0.5" />
            <span>Promotion to SUPER_ADMIN is disabled because this account does not possess a @parascores.com email domain.</span>
          </div>
        </div>
      </div>

      <!-- Main Detailed Information tabs/widgets -->
      <div class="space-y-8 lg:col-span-2">
        <!-- Organizations Section -->
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-building-office" class="w-5 h-5 text-rose-500" />
            Linked Organizations
          </h3>
          <div v-if="!user.organizations || user.organizations.length === 0" class="text-center py-6 text-slate-500 text-sm">
            This account is not associated with any Organizations.
          </div>
          <div v-else class="space-y-4">
            <div 
              v-for="orgMember in user.organizations" 
              :key="orgMember.id"
              class="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-850 rounded-2xl"
            >
              <div class="flex items-center gap-3">
                <UAvatar
                  v-if="orgMember.organization?.logoUrl"
                  :src="orgMember.organization.logoUrl"
                  size="xs"
                />
                <div v-else class="w-8 h-8 rounded bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                  {{ orgMember.organization?.name?.charAt(0).toUpperCase() }}
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-white leading-none mb-1">{{ orgMember.organization?.name }}</span>
                  <div class="flex items-center gap-1.5 leading-none">
                    <span class="text-xs text-slate-500">slug: {{ orgMember.organization?.slug }}</span>
                    <button
                      v-if="orgMember.organization?.slug"
                      class="text-slate-500 hover:text-emerald-400 transition"
                      :class="copiedField === `Org slug ${orgMember.organization.slug}` ? 'text-emerald-400' : ''"
                      @click="copyToClipboard(orgMember.organization.slug, `Org slug ${orgMember.organization.slug}`)"
                    >
                      <UIcon :name="copiedField === `Org slug ${orgMember.organization.slug}` ? 'i-heroicons-clipboard-document-check' : 'i-heroicons-clipboard-document'" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-400 uppercase">
                  {{ orgMember.role || 'MEMBER' }}
                </span>
                <span 
                  v-if="orgMember.organization?.isVerified"
                  class="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase"
                >
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Player Profiles Section -->
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-user-group" class="w-5 h-5 text-violet-500" />
            Player Profiles
          </h3>
          <div v-if="!user.player_profiles || user.player_profiles.length === 0" class="text-center py-6 text-slate-500 text-sm">
            This account does not have any active Player Profiles.
          </div>
          <div v-else class="space-y-4">
            <div 
              v-for="profile in user.player_profiles" 
              :key="profile.id"
              class="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-850 rounded-2xl"
            >
              <div class="flex flex-col">
                <span class="text-sm font-bold text-white mb-1">{{ profile.name }}</span>
                <span class="text-xs text-slate-500 leading-snug">
                  Tournament: {{ profile.participant?.tournament?.name || 'Unassigned' }}
                </span>
              </div>

              <div class="flex items-center gap-3">
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                  :class="[
                    profile.status === 'APPROVED' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : profile.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  ]"
                >
                  {{ profile.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment History -->
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-emerald-500" />
            Payment Logs
          </h3>
          <div v-if="!user.payments || user.payments.length === 0" class="text-center py-6 text-slate-500 text-sm">
            No payments have been logged for this user.
          </div>
          <div v-else class="space-y-4">
            <div 
              v-for="pay in user.payments" 
              :key="pay.id"
              class="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-850 rounded-2xl"
            >
              <div class="flex flex-col">
                <span class="text-sm font-bold text-white leading-none mb-1 capitalize">{{ pay.type?.toLowerCase() }}</span>
                <span class="text-xs text-slate-500 mt-1 leading-none">{{ formatDate(pay.created_at) }}</span>
              </div>

              <div class="flex items-center gap-4">
                <span class="text-sm font-extrabold text-white">{{ formatCurrency(pay.amount) }}</span>
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                  :class="[
                    pay.status === 'SUCCESS' || pay.status === 'COMPLETED' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : pay.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  ]"
                >
                  {{ pay.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
