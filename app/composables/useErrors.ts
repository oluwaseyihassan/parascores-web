import * as Sentry from "@sentry/nuxt"

export interface ErrorOptions {
  title?: string
  description?: string
  toast?: boolean
  log?: boolean
  report?: boolean
}

export const useErrors = () => {
  const toast = useToast()

  /**
   * Extracts a human-readable message from various error formats.
   */
  const extractErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred'
    
    // Handle string errors
    if (typeof error === 'string') return error
    
    let message = 'An unexpected error occurred'
    
    // Handle FetchError from Nuxt/ofetch
    if (error.data?.message) {
      if (Array.isArray(error.data.message)) {
        message = error.data.message[0]
      } else {
        message = error.data.message
      }
    } else if (error.message) {
      // Handle standard Error objects or FetchError without data
      message = error.message
    }
    
    // Sanitize message: Remove API endpoints and internal routing details
    // Frameworks like Express often return "Cannot GET /path" for 404s
    if (message.includes('Cannot ') && (message.includes('GET') || message.includes('POST') || message.includes('DELETE') || message.includes('PATCH') || message.includes('PUT'))) {
      return 'The requested action is not supported or the resource was not found. Please contact support if the issue persists.'
    }
    
    // Mask URLs
    if (message.includes('://')) {
      message = message.replace(/https?:\/\/[^\s]+/g, '[API]')
    }
    
    return message
  }

  /**
   * Centralized error handler.
   * Logs, reports to Sentry, and shows a toast notification.
   */
  const handleError = (error: any, options: ErrorOptions = {}) => {
    const { 
      title = 'Error', 
      toast: showToast = true, 
      log: showLog = true, 
      report: showReport = true 
    } = options

    const message = extractErrorMessage(error)
    
    // 1. Console Logging
    if (showLog) {
      console.error(`[ErrorHandler] ${title}:`, error)
    }

    // 2. Sentry Reporting
    if (showReport && error && typeof error !== 'string') {
      Sentry.captureException(error, {
        extra: {
          contextTitle: title,
          extractedMessage: message,
          options
        }
      })
    }

    // 3. UI Notification
    if (showToast) {
      toast.add({
        title,
        description: options.description || message,
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }

    return message
  }

  return {
    extractErrorMessage,
    handleError
  }
}
