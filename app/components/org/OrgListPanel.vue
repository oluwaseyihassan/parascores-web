<script setup lang="ts">
import { storeToRefs } from "pinia";

defineProps<{
  selectedId: string | null;
}>();

const emit = defineEmits<{
  "update:selectedId": [id: string];
}>();

const authStore = useAuthStore();
const { activeOrganizationId } = storeToRefs(authStore);

const roleBadge = (role: string) =>
  role === "OWNER"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : role === "ADMIN"
      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
      : "bg-black/5 dark:bg-white/[0.08] text-muted";
</script>

<template>
  <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
    <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
      <span
        class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"
      >
        <UIcon name="i-heroicons-building-office" class="w-3.5 h-3.5" />
      </span>
      <h2 class="text-[13px] font-bold text-heading">Workspaces</h2>
      <span class="ml-auto text-[11px] text-muted tabular-nums">{{
        authStore.organizations.length
      }}</span>
    </header>

    <div class="flex flex-col">
      <button
        v-for="orgMember in authStore.organizations"
        :key="orgMember.organizationId"
        type="button"
        class="flex items-center gap-3 px-3.5 py-3 text-left border-l-2 transition-colors"
        :class="
          selectedId === orgMember.organizationId
            ? 'border-emerald-500 bg-emerald-500/[0.07]'
            : 'border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
        "
        @click="emit('update:selectedId', orgMember.organizationId)"
      >
        <UAvatar
          v-if="orgMember.organization?.logoUrl"
          :src="orgMember.organization.logoUrl"
          :alt="orgMember.organization?.name"
          size="md"
          class="rounded-lg shrink-0"
        />
        <span
          v-else
          class="w-9 h-9 rounded-xl bg-[#136332] text-white text-sm font-extrabold flex items-center justify-center shrink-0"
        >
          {{ orgMember.organization?.name?.charAt(0).toUpperCase() }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-[13px] font-bold text-heading truncate">{{
            orgMember.organization?.name || "Organization"
          }}</span>
          <span class="flex items-center gap-1.5 mt-1">
            <span
              class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              :class="roleBadge(orgMember.role)"
              >{{ orgMember.role }}</span
            >
            <span
              v-if="activeOrganizationId === orgMember.organizationId"
              class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500 text-white"
              >Active</span
            >
          </span>
        </span>
      </button>

      <NuxtLink
        to="/onboarding"
        class="flex items-center gap-2.5 px-3.5 py-3 border-t border-dashed border-subtle text-[13px] font-bold text-muted hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/[0.05] transition-colors"
      >
        <UIcon name="i-heroicons-plus" class="w-4 h-4" />
        New organization
      </NuxtLink>
    </div>
  </section>
</template>
