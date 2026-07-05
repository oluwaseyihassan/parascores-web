<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const users = ref<any[]>([])
const search = ref('')
const selectedRole = ref('all')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const totalPages = ref(0)

const loadUsers = async () => {
  try {
    const data = await adminStore.fetchUsers({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
      role: selectedRole.value === 'all' ? undefined : selectedRole.value
    })
    if (data) {
      users.value = data.items
      total.value = data.total
      totalPages.value = data.pages
    }
  } catch (err) {
    console.error('Failed to load users:', err)
  }
}

watch([page, selectedRole], () => {
  loadUsers()
})

const triggerSearch = () => {
  page.value = 1
  loadUsers()
}

onMounted(() => {
  loadUsers()
})

const deleteUserId = ref<string | null>(null)
const deleteUserName = ref('')
const isDeleteModalOpen = ref(false)

const openDeleteConfirm = (user: any) => {
  deleteUserId.value = user.id
  deleteUserName.value = user.name || user.email
  isDeleteModalOpen.value = true
}

const performDelete = async () => {
  if (!deleteUserId.value) return
  try {
    await adminStore.deleteUser(deleteUserId.value)
    useToast().add({
      title: 'User Deleted',
      description: `Successfully deleted ${deleteUserName.value}`,
      color: 'success'
    })
    isDeleteModalOpen.value = false
    loadUsers()
  } catch (err) {
    useToast().add({
      title: 'Action Failed',
      description: 'Failed to delete user account.',
      color: 'error'
    })
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Title Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">User Accounts</h1>
        <p class="text-sm text-slate-400 mt-1">Manage and audit all platform registered users.</p>
      </div>
      <div class="text-slate-400 text-sm font-bold bg-slate-950 px-4 py-2 border border-slate-800 rounded-2xl">
        Total Users: <span class="text-rose-500 font-extrabold">{{ total }}</span>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="flex flex-col sm:flex-row gap-4 bg-slate-950 p-4 border border-slate-850 rounded-2xl">
      <div class="flex-1 relative">
        <UInput
          v-model="search"
          placeholder="Search by name or email..."
          icon="i-heroicons-magnifying-glass"
          size="md"
          class="w-full"
          @keydown.enter="triggerSearch"
        />
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <select 
          v-model="selectedRole"
          class="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ORGANIZER">Organizer</option>
          <option value="USER">User / Fan</option>
        </select>
        <UButton
          color="primary"
          icon="i-heroicons-magnifying-glass"
          @click="triggerSearch"
        >
          Apply
        </UButton>
      </div>
    </div>

    <!-- Table content -->
    <div class="bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/35">
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">User / Identity</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Role</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Email Verification</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Registration Date</th>
              <th class="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-900">
            <tr v-if="loading" v-for="n in 5" :key="n" class="animate-pulse">
              <td class="px-6 py-4.5"><div class="h-5 w-40 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-16 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-24 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-24 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-8 w-16 bg-slate-800 rounded ml-auto"></div></td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-slate-500 text-sm">
                No platform users found matching your search.
              </td>
            </tr>
            <tr v-else v-for="user in users" :key="user.id" class="hover:bg-slate-900/25 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <UAvatar
                    v-if="user.picture"
                    :src="user.picture"
                    size="sm"
                  />
                  <UAvatar
                    v-else
                    :text="user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()"
                    size="sm"
                    class="bg-slate-800 text-slate-300 font-bold"
                  />
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-extrabold text-white truncate leading-none mb-1">{{ user.name || 'Anonymous User' }}</span>
                    <span class="text-xs text-slate-400 truncate leading-none">{{ user.email }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
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
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 text-xs">
                  <UIcon 
                    :name="user.emailVerified ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                    class="w-4 h-4"
                    :class="user.emailVerified ? 'text-emerald-500' : 'text-slate-600'"
                  />
                  <span :class="user.emailVerified ? 'text-slate-300 font-medium' : 'text-slate-500'">
                    {{ user.emailVerified ? formatDate(user.emailVerified) : 'Unverified' }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-xs font-semibold text-slate-400">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-eye"
                    @click="navigateTo(`/users/${user.id}`);"
                  />
                  <UButton
                    size="sm"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    :disabled="user.role === 'SUPER_ADMIN'"
                    @click="openDeleteConfirm(user)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="border-t border-slate-800/80 px-6 py-4 bg-slate-900/15 flex items-center justify-between">
        <span class="text-xs text-slate-500 font-semibold">
          Showing page {{ page }} of {{ totalPages }}
        </span>
        <div class="flex gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="page === 1"
            @click="page--;"
          >
            Previous
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="page === totalPages"
            @click="page++;"
          >
            Next
          </UButton>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Drawer / Modal -->
    <UModal v-model:open="isDeleteModalOpen" title="Confirm Account Deletion">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-slate-300">
            Are you absolutely sure you want to permanently delete the account for <strong class="text-white">{{ deleteUserName }}</strong>?
          </p>
          <div class="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-xs text-rose-400 flex items-start gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 mt-0.5" />
            <span>This action cannot be undone. All user data, linked organizations, and platform metadata associated with this user will be removed or orphaned.</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isDeleteModalOpen = false;"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            variant="solid"
            @click="performDelete"
          >
            Permanently Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
