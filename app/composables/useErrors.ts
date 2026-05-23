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
    
    // ── Network / connectivity errors ───────────────────────────
    // ofetch FetchErrors without a statusCode mean the request never
    // reached the server (offline, DNS failure, CORS, timeout, etc.)
    const isNetworkError = (err: any): boolean => {
      // No HTTP status → no response was received at all
      if (err.statusCode === undefined && err.status === undefined && err.data === undefined) return true
      
      const msg = (err.message || '').toLowerCase()
      const networkSignals = [
        'failed to fetch',
        'networkerror',
        'network request failed',
        'err_network',
        'econnrefused',
        'enotfound',
        'etimedout',
        'econnaborted',
        'econnreset',
        'load failed',            // Safari
        'cancelled',              // iOS
        'aborted',
        'network error',
        'dns_probe',
        'err_internet_disconnected',
        'err_name_not_resolved',
        '<no response>',
      ]
      return networkSignals.some(signal => msg.includes(signal))
    }

    if (isNetworkError(error)) {
      return 'Unable to connect. Please check your internet connection and try again.'
    }

    // ── Timeout errors ─────────────────────────────────────────
    if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
      return 'The request timed out. Please try again.'
    }

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

    // ── Catch-all: strip remaining technical fetch artifacts ────
    // e.g. '[PATCH] "[API] <no response> Failed to fetch (api.parascores.com)"'
    if (/^\[(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\]/i.test(message) || message.includes('<no response>')) {
      return 'Something went wrong while communicating with the server. Please try again.'
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
