<script setup lang="ts">
import { storeToRefs } from "pinia";

const props = defineProps<{
  orgMember: any;
}>();

const emit = defineEmits<{
  switch: [orgId: string];
}>();

const authStore = useAuthStore();
const { activeOrganizationId } = storeToRefs(authStore);
const { handleError } = useErrors();
const { frontendUrl } = useHost();

const orgId = computed(() => props.orgMember.organizationId);
const isActive = computed(() => orgId.value === activeOrganizationId.value);
const isOwner = computed(() => props.orgMember.role === "OWNER");

// Members + socials are fetched per selected org (the parent remounts this
// component on selection change via :key, so no watcher is needed)
const members = ref<any[]>([]);
const loadingMembers = ref(false);
const socials = ref<any[]>([]);
const loadingSocials = ref(false);

const fetchMembers = async () => {
  loadingMembers.value = true;
  try {
    const response = await $api<{ success: boolean; data: any[] }>(
      `/organizations/${orgId.value}/members`,
    );
    members.value = response.data;
  } catch (error) {
    handleError(error, { title: "Failed to load members", toast: false });
  } finally {
    loadingMembers.value = false;
  }
};

const fetchSocials = async () => {
  loadingSocials.value = true;
  try {
    const response = await $api<{ success: boolean; data: any[] }>(
      `/socials/organizations/${orgId.value}`,
    );
    socials.value = response.data;
  } catch (error) {
    handleError(error, { title: "Failed to load socials", toast: false });
  } finally {
    loadingSocials.value = false;
  }
};

onMounted(() => {
  fetchMembers();
  fetchSocials();
});

const copyPublicLink = async () => {
  const slug = props.orgMember.organization?.slug;
  if (!slug) return;
  try {
    await navigator.clipboard.writeText(`${frontendUrl.value}/org/${slug}`);
    useToast().add({ title: "Public link copied!", color: "success" });
  } catch {
    useToast().add({ title: "Failed to copy link", color: "error" });
  }
};

const roleBadge = computed(() =>
  props.orgMember.role === "OWNER"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : props.orgMember.role === "ADMIN"
      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
      : "bg-black/5 dark:bg-white/[0.08] text-muted",
);

const activeTab = ref<"members" | "branding" | "socials" | "danger">("members");

const tabs = computed(() => {
  const items = [
    { key: "members" as const, label: "Members", badge: members.value.length || undefined },
    { key: "branding" as const, label: "Branding", badge: undefined },
    { key: "socials" as const, label: "Socials", badge: socials.value.length || undefined },
  ];
  if (isOwner.value) {
    items.push({ key: "danger" as const, label: "Danger", badge: undefined });
  }
  return items;
});
</script>

<template>
  <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
    <!-- Detail header -->
    <div class="flex items-center gap-3.5 px-4 sm:px-5 py-4 border-b border-subtle flex-wrap">
      <UAvatar
        v-if="orgMember.organization?.logoUrl"
        :src="orgMember.organization.logoUrl"
        :alt="orgMember.organization?.name"
        size="xl"
        class="rounded-xl shrink-0"
      />
      <span
        v-else
        class="w-12 h-12 rounded-xl bg-[#136332] text-white text-lg font-extrabold flex items-center justify-center shrink-0"
      >
        {{ orgMember.organization?.name?.charAt(0).toUpperCase() }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-base font-extrabold text-heading truncate">
            {{ orgMember.organization?.name || "Organization" }}
          </h2>
          <span
            class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            :class="roleBadge"
            >{{ orgMember.role }}</span
          >
          <span
            v-if="isActive"
            class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500 text-white"
            >Active workspace</span
          >
        </div>
        <p class="text-[11px] text-muted mt-1">
          <template v-if="loadingMembers">Loading members…</template>
          <template v-else>{{ members.length }} member{{ members.length === 1 ? "" : "s" }}</template>
        </p>
      </div>
      <UButton
        v-if="orgMember.organization?.slug"
        variant="ghost"
        color="neutral"
        icon="i-heroicons-link"
        aria-label="Copy public link"
        title="Copy public link"
        @click="copyPublicLink"
      />
      <UButton
        v-if="!isActive"
        size="sm"
        variant="outline"
        color="primary"
        label="Switch to this workspace"
        class="font-bold"
        @click="emit('switch', orgId)"
      />
    </div>

    <!-- Tabs -->
    <div class="flex items-end gap-1 overflow-x-auto px-3 border-b border-subtle [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors"
        :class="[
          activeTab === tab.key
            ? tab.key === 'danger'
              ? 'text-red-500 border-red-500'
              : 'text-emerald-600 dark:text-emerald-400 border-emerald-500'
            : tab.key === 'danger'
              ? 'text-red-400/70 border-transparent hover:text-red-500'
              : 'text-muted border-transparent hover:text-heading',
        ]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <UBadge v-if="tab.badge" color="neutral" variant="soft" size="xs">{{ tab.badge }}</UBadge>
      </button>
    </div>

    <!-- Panels -->
    <div class="p-4 sm:p-5">
      <OrgMembersPanel
        v-show="activeTab === 'members'"
        :org-member="orgMember"
        :members="members"
        :loading="loadingMembers"
        @refresh="fetchMembers"
      />
      <OrgBrandingPanel
        v-show="activeTab === 'branding'"
        :org-member="orgMember"
      />
      <OrgSocialsPanel
        v-show="activeTab === 'socials'"
        :org-member="orgMember"
        :socials="socials"
        :loading="loadingSocials"
        @refresh="fetchSocials"
      />
      <OrgDangerPanel
        v-if="isOwner"
        v-show="activeTab === 'danger'"
        :org-member="orgMember"
      />
    </div>
  </section>
</template>
