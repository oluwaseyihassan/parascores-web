/**
 * Composable for sharing and copying generated graphics.
 * Uses the Web Share API and Clipboard API where available.
 */
export function useGraphicShare() {
  const toast = useToast()

  /** Whether the browser supports sharing files via Web Share API */
  const canShare = ref(false)

  /** Whether the browser supports copying images to clipboard */
  const canCopy = ref(false)

  // Detect browser capabilities after mount (client-only)
  onMounted(() => {
    canShare.value = !!navigator.share
    canCopy.value = !!navigator.clipboard?.write
  })

  /**
   * Share a graphic blob via the native share dialog.
   * @param blob - The image blob to share
   * @param filename - The filename for the shared file
   */
  const shareGraphic = async (blob: Blob, filename = 'graphic.png') => {
    if (!navigator.share) {
      toast.add({
        title: 'Sharing not supported',
        description: 'Your browser does not support the share feature. Try downloading instead.',
        color: 'warning',
        icon: 'i-heroicons-exclamation-triangle'
      })
      return false
    }

    try {
      const file = new File([blob], filename, { type: 'image/png' })

      // Check if the browser can share this file type
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        toast.add({
          title: 'Cannot share image',
          description: 'Your browser does not support sharing images. Try downloading instead.',
          color: 'warning',
          icon: 'i-heroicons-exclamation-triangle'
        })
        return false
      }

      await navigator.share({
        files: [file],
        title: 'Match Graphic',
        text: 'Check out this match graphic from ParaScores!'
      })

      toast.add({
        title: 'Shared!',
        description: 'Graphic shared successfully.',
        color: 'success',
        icon: 'i-heroicons-share'
      })
      return true
    } catch (err: any) {
      // User cancelled the share dialog — not an error
      if (err.name === 'AbortError') return false

      console.error('Share failed:', err)
      toast.add({
        title: 'Share failed',
        description: 'Could not share the graphic. Try downloading instead.',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
      return false
    }
  }

  /**
   * Copy a graphic blob to the clipboard.
   * @param blob - The image blob to copy
   */
  const copyToClipboard = async (blob: Blob) => {
    if (!navigator.clipboard?.write) {
      toast.add({
        title: 'Copy not supported',
        description: 'Your browser does not support copying images to clipboard.',
        color: 'warning',
        icon: 'i-heroicons-exclamation-triangle'
      })
      return false
    }

    try {
      const item = new ClipboardItem({ 'image/png': blob })
      await navigator.clipboard.write([item])

      toast.add({
        title: 'Copied!',
        description: 'Graphic copied to clipboard. You can paste it anywhere.',
        color: 'success',
        icon: 'i-heroicons-clipboard-document-check'
      })
      return true
    } catch (err) {
      console.error('Copy to clipboard failed:', err)
      toast.add({
        title: 'Copy failed',
        description: 'Could not copy the graphic to clipboard.',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
      return false
    }
  }

  return {
    canShare,
    canCopy,
    shareGraphic,
    copyToClipboard
  }
}
