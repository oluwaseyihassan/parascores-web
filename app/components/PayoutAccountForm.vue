<script setup lang="ts">
import type { PaystackBank, PayoutAccountStatus } from '~/stores/payment'

const props = defineProps<{
  orgId: string
}>()

const emit = defineEmits<{
  saved: [status: PayoutAccountStatus | null]
}>()

const paymentStore = usePaymentStore()
const { handleError } = useErrors()

const banks = ref<PaystackBank[]>([])
const loadingBanks = ref(true)
const form = reactive({ bankCode: '', accountNumber: '' })
const resolvingAccount = ref(false)
const resolvedAccountName = ref('')
const saving = ref(false)

const bankOptions = computed(() =>
  banks.value
    .filter((b) => b.active)
    .map((b) => ({ label: b.name, value: b.code }))
)

async function handleResolveAccount() {
  resolvingAccount.value = true
  resolvedAccountName.value = ''
  try {
    const res = await paymentStore.resolvePayoutAccount(form.accountNumber, form.bankCode)
    resolvedAccountName.value = res?.account_name || ''
  } catch (err: any) {
    handleError(err, { title: 'Could not verify account' })
  } finally {
    resolvingAccount.value = false
  }
}

watch([() => form.accountNumber, () => form.bankCode], () => {
  resolvedAccountName.value = ''
  if (/^\d{10}$/.test(form.accountNumber) && form.bankCode) {
    handleResolveAccount()
  }
})

async function handleSave() {
  if (!resolvedAccountName.value) return
  saving.value = true
  try {
    const res = await paymentStore.setupPayoutAccount(props.orgId, {
      bankCode: form.bankCode,
      accountNumber: form.accountNumber,
    })
    form.accountNumber = ''
    resolvedAccountName.value = ''
    useToast().add({
      title: 'Payout Account Saved',
      description: `Registration fees will now be paid directly to ${res.data?.accountName}.`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    emit('saved', res.data || null)
  } catch (err: any) {
    handleError(err, { title: 'Failed to save payout account' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadingBanks.value = true
  paymentStore
    .fetchPayoutBanks()
    .then((b) => (banks.value = b))
    .catch(() => {})
    .finally(() => (loadingBanks.value = false))
})
</script>

<template>
  <div class="space-y-5">
    <div class="grid sm:grid-cols-2 gap-4">
      <UFormField label="Bank" required>
        <USelect
          v-model="form.bankCode"
          :items="bankOptions"
          placeholder="Select bank…"
          value-key="value"
          class="w-full"
          :loading="loadingBanks"
        />
      </UFormField>
      <UFormField label="Account Number" required>
        <UInput
          v-model="form.accountNumber"
          placeholder="0123456789"
          inputmode="numeric"
          maxlength="10"
          class="w-full"
          :loading="resolvingAccount"
        />
      </UFormField>
    </div>

    <div v-if="resolvedAccountName" class="flex items-center gap-2 text-sm">
      <UIcon name="i-heroicons-check-badge" class="w-4.5 h-4.5 text-emerald-500" />
      <span class="font-semibold text-gray-900 dark:text-white">{{ resolvedAccountName }}</span>
    </div>
    <p v-else-if="form.accountNumber.length === 10 && form.bankCode && !resolvingAccount" class="text-xs text-gray-400">
      Verifying account…
    </p>

    <div class="flex justify-end">
      <UButton
        color="primary"
        icon="i-heroicons-check"
        label="Save Payout Account"
        :loading="saving"
        :disabled="!resolvedAccountName"
        @click="handleSave"
      />
    </div>
  </div>
</template>
