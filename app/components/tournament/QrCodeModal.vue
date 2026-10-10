<script setup lang="ts">
import QrcodeVue from "qrcode.vue";

const open = defineModel<boolean>("open", { default: false });

const route = useRoute();
const appConfig = useRuntimeConfig();
const tournamentStore = useTournamentStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);

const tournamentId = computed(() => route.params.id as string);

// QR Code Feature
const publicTournamentUrl = computed(() => {
  const host = import.meta.client
    ? window.location.host
        .replace(
          /^manage-dev\./,
          window.location.host.includes("lvh.me") ? "" : "dev.",
        )
        .replace(/^manage\./, "")
    : "parascores.com";
  const protocol = import.meta.dev ? "http" : "https";
  const baseUrl = appConfig.public.siteUrl || `${protocol}://${host}`;

  const urlId = tournament.value?.customName || tournamentId.value;
  return `${baseUrl}/t/${urlId}`;
});

const downloadQRCode = () => {
  if (!import.meta.client) return;

  // Find the canvas element
  const canvas = document.querySelector(
    ".qr-code-canvas canvas",
  ) as HTMLCanvasElement;
  if (!canvas) {
    useToast().add({ title: "Error generating QR code", color: "error" });
    return;
  }

  // Download as PNG
  const link = document.createElement("a");
  const fileName =
    tournament.value?.name?.replace(/\s+/g, "-").toLowerCase() || "tournament";
  link.download = `${fileName}-qr-code.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const copyTournamentLink = async () => {
  if (!import.meta.client) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(publicTournamentUrl.value);
      useToast().add({ title: "Link copied to clipboard", color: "success" });
    } else {
      // Fallback for non-secure contexts (like local network testing)
      const textArea = document.createElement("textarea");
      textArea.value = publicTournamentUrl.value;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        useToast().add({ title: "Link copied to clipboard", color: "success" });
      } else {
        useToast().add({ title: "Failed to copy link", color: "error" });
      }
    }
  } catch (err) {
    const message = (err as any).data?.message || String(err);
    useToast().add({
      title: "Failed to copy link",
      description: message,
      color: "error",
    });
  }
};
</script>

<template>
  <!-- QR Code Modal -->
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <UCard
        class="ring-0 shadow-none"
        :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Tournament QR Code
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              class="-my-1"
              @click="open = false"
            />
          </div>
        </template>

        <div class="py-6 flex flex-col items-center">
          <p class="text-sm text-gray-500 mb-6 text-center px-4">
            Scan this code to visit the public tournament page. Export it
            for use on promotional flyers and banners.
          </p>

          <div
            class="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-6 inline-flex justify-center items-center qr-code-canvas"
          >
            <QrcodeVue
              :value="publicTournamentUrl"
              :size="200"
              level="H"
              render-as="canvas"
              :margin="2"
              foreground="#000000"
            />
          </div>

          <div class="w-full max-w-[280px] space-y-4">
            <UButton
              block
              color="primary"
              icon="i-heroicons-arrow-down-tray"
              @click="downloadQRCode"
            >
              Download PNG
            </UButton>

            <div class="relative w-full">
              <div
                class="flex items-center w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <span
                  class="text-xs text-gray-500 truncate flex-1 select-all mr-2"
                >
                  {{ publicTournamentUrl }}
                </span>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-clipboard-document"
                  size="xs"
                  @click="copyTournamentLink"
                />
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
