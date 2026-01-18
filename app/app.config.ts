export default defineAppConfig({
  ui: {
    card: {
      slots: {
        // Force the background here instead of in 'variants'
        root: 'bg-white dark:bg-[#171717] ring-1 ring-gray-200 dark:ring-gray-800 text-red-300 dark:text-gray-100', 
        // header: 'p-4 sm:px-6',
        // body: 'p-4 sm:p-6',
        // footer: 'p-4 sm:px-6'
      },
      // Keep variants empty or just use them for specialized styles
      variants: {
        variant: {
          outline: {
            root: '' // Leave empty so the slot style above takes over
          }
        }
      }
    },
    input: {
      slots: {
        // root: 'ring-1 ring-gray-200 dark:ring-gray-800', 
        base: 'bg-white dark:bg-[#0F0F0F] ring-1 ring-gray-200 dark:ring-gray-800'
      },
    },
    button: {
      slots: {
        // root: 'ring-1 ring-gray-200 dark:ring-gray-800', 
        base: 'ring-1 ring-gray-200 dark:ring-gray-800',
      },
      variants: {
        variant: {
          green:  'bg-green-400 dark:bg-green-700 hover:bg-green-500 dark:hover:bg-green-800'  
        },
        color: {
          // primary: 'bg-green-500 dark:bg-green-600'
        }
      }
    }
  }
})