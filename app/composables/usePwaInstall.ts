import { ref, computed } from 'vue'

const installPromptEvent = ref<any>(null)
const isInstalled = ref(false)
const isIOSDevice = ref(false)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    // Stash the event so it can be triggered later.
    installPromptEvent.value = e
  })

  window.addEventListener('appinstalled', () => {
    isInstalled.value = true
    installPromptEvent.value = null
  })
}

export const usePwaInstall = () => {
  const checkInstallState = () => {
    if (typeof window !== 'undefined') {
      isInstalled.value = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
      isIOSDevice.value = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    }
  }

  // Check state on client-side initialization
  if (typeof window !== 'undefined') {
    checkInstallState()
  }

  const showInstallButton = computed(() => {
    if (isInstalled.value) return false
    return !!installPromptEvent.value || isIOSDevice.value
  })

  const install = async () => {
    if (installPromptEvent.value) {
      installPromptEvent.value.prompt()
      const { outcome } = await installPromptEvent.value.userChoice
      if (outcome === 'accepted') {
        installPromptEvent.value = null
      }
    }
  }

  return {
    isInstalled,
    isIOSDevice,
    showInstallButton,
    installPromptEvent,
    install,
    checkInstallState
  }
}
