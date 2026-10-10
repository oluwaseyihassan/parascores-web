/**
 * Anonymous device identity for fan interactions (pulse reactions).
 * Generated on first client visit and persisted in localStorage — no
 * account needed, consistent with the anonymous push-subscription model.
 */
export const useDeviceId = () => {
  const deviceId = useState<string>('deviceId', () => '')
  if (import.meta.client && !deviceId.value) {
    let id = localStorage.getItem('ps-device-id')
    if (!id) {
      // crypto.randomUUID is secure-context-only — dev event hubs run on
      // plain http://<slug>.lvh.me, so fall back to getRandomValues
      id = crypto.randomUUID?.() ??
        `dev-${Date.now()}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(36)).join('')}`
      localStorage.setItem('ps-device-id', id)
    }
    deviceId.value = id
  }
  return deviceId
}
