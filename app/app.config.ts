export default defineAppConfig({
  ui: {
    card: {
      slots: {
        // Force the background here instead of in 'variants'
        // root: 'bg-white dark:bg-[#171717] ring-1 ring-gray-200 dark:ring-gray-800 text-red-300 dark:text-gray-100', 
        // header: 'p-4 sm:px-6',
        // body: 'p-4 sm:p-6',
        // footer: 'p-4 sm:px-6'
      },
      // Keep variants empty or just use them for specialized styles
      variants: {
        variant: {
          outline: {
            root: '' // Leave empty so the slot style above takes over
          },
          auth: {
            root: 'w-full max-w-md mx-auto shadow-lg bg-white dark:bg-[#171717]'
          }
        }
      }
    },
    input: {
      slots: {
        // root: 'ring-1 ring-gray-200 dark:ring-gray-800', 
      },
      variants: {
        auth: {
          root: 'bg-white dark:bg-[#0F0F0F] ring-1 ring-gray-200 dark:ring-gray-800'
        }
      }
    },
    button: {
      slots: {
        // root: 'ring-1 ring-gray-200 dark:ring-gray-800', 
        base: 'ring-1 ring-gray-200 dark:ring-gray-800',
      },
      variants: {
        variant: {
          green:  'bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-700'  
        },
        color: {
          // primary: 'bg-indigo-500 dark:bg-indigo-600'
        }
      }
    }
  }
})