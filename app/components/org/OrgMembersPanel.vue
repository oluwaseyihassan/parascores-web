<script setup lang="ts">
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const props = defineProps<{
  orgMember: any;
  members: any[];
  loading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const { handleError } = useErrors();
const { openConfirmModal } = inject(ModalDialogsKey)!;

const orgId = computed(() => props.orgMember.organizationId);

// Invite (new members join as MEMBER)
const inviteEmail = ref("");
const inviting = ref(false);

const handleInvite = async () => {
  if (!inviteEmail.value) return;
  inviting.value = true;
  try {
    await $api(`/organizations/${orgId.value}/members`, {
      method: "POST",
      body: { email: inviteEmail.value, role: "MEMBER" },
    });
    useToast().add({ title: "Invitation sent", color: "success" });
    inviteEmail.value = "";
    emit("refresh");
  } catch (error: any) {
    handleError(error, { title: "Invite failed" });
  } finally {
    inviting.value = false;
  }
};

const handleUpdateRole = async (userId: string, role: string) => {
  try {
    await $api(`/organizations/${orgId.value}/members/${userId}`, {
      method: "PATCH",
      body: { role },
    });
    useToast().add({ title: "Role updated", color: "success" });
    emit("refresh");
  } catch (error: any) {
    handleError(error, { title: "Update failed" });
  }
};

const handleRemoveMember = async (userId: string) => {
  openConfirmModal({
    title: "Remove Member",
    description:
      "Are you sure you want to remove this member from the organization? This action cannot be undone.",
    confirmLabel: "Remove Member",
    color: "error",
    onConfirm: async () => {
      try {
        await $api(`/organizations/${orgId.value}/members/${userId}`, {
          method: "DELETE",
        });
        useToast().add({ title: "Member removed", color: "success" });
        emit("refresh");
      } catch (error: any) {
        handleError(error, { title: "Removal failed" });
      }
    },
  });
};

// Role gates mirror the backend permission matrix (see docs/platform-roles.md)
const canManage = (member: any) => {
  const current = props.orgMember;
  if (!current || !member) return false;
  if (current.userId === member.userId) return false;
  if (current.role === "OWNER") return true;
  if (current.role === "ADMIN") return member.role === "MEMBER";
  return false;
};

const getMemberActions = (member: any) => {
  const sections = [];

  if (props.orgMember.role === "OWNER") {
    const roleActions = [];
    if (member.role !== "ADMIN") {
      roleActions.push({
        label: "Make Admin",
        icon: "i-heroicons-shield-check",
        onSelect: () => handleUpdateRole(member.userId, "ADMIN"),
      });
    }
    if (member.role !== "MEMBER") {
      roleActions.push({
        label: "Make Member",
        icon: "i-heroicons-user",
        onSelect: () => handleUpdateRole(member.userId, "MEMBER"),
      });
    }
    if (roleActions.length > 0) sections.push(roleActions);
  }

  sections.push([
    {
      label: "Remove from Team",
      icon: "i-heroicons-user-minus",
      color: "error" as const,
      onSelect: () => handleRemoveMember(member.userId),
    },
  ]);

  return sections;
};

const roleBadge = (role: string) =>
  role === "OWNER"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : role === "ADMIN"
      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
      : "bg-black/5 dark:bg-white/[0.08] text-muted";
</script>

<template>
  <div>
    <!-- Invite -->
    <div class="flex gap-2 mb-4">
      <UInput
        v-model="inviteEmail"
        placeholder="colleague@example.com"
        class="flex-1"
        icon="i-heroicons-envelope"
        @keyup.enter="handleInvite"
      />
      <UButton
        label="Invite"
        color="primary"
        class="font-bold"
        :loading="inviting"
        :disabled="!inviteEmail"
        @click="handleInvite"
      />
    </div>

    <p class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted mb-1">
      Team
    </p>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-6">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-muted" />
    </div>

    <!-- Empty -->
    <div v-else-if="!members.length" class="py-6 text-center text-sm text-muted">
      No members yet — invite your team above.
    </div>

    <!-- Member rows -->
    <div v-else class="flex flex-col">
      <div
        v-for="m in members"
        :key="m.id"
        class="flex items-center gap-3 py-2.5 border-b border-subtle last:border-b-0"
      >
        <UAvatar :src="m.user.picture" :alt="m.user.name" size="sm" />
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-bold text-heading truncate">
            {{ m.user.name }}
            <span v-if="m.userId === orgMember.userId" class="text-muted font-medium">· you</span>
          </p>
          <p class="text-[11px] text-muted truncate">{{ m.user.email }}</p>
        </div>
        <span
          class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
          :class="roleBadge(m.role)"
          >{{ m.role }}</span
        >
        <UDropdownMenu
          v-if="canManage(m)"
          :items="getMemberActions(m)"
          :content="{ align: 'end' }"
        >
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-heroicons-ellipsis-vertical"
            size="xs"
            square
            aria-label="Member actions"
          />
        </UDropdownMenu>
      </div>
    </div>

    <p class="text-[10.5px] text-muted mt-4 leading-relaxed">
      Owners can change any role · Admins manage members only. Role gates mirror
      the backend — the API enforces them regardless.
    </p>
  </div>
</template>
