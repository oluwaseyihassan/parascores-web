export default defineAppConfig({
  ui: {
    colors: {
      neutral: 'neutral'
    },
    card: { 
      slots: {
        // Force the background here instead of in 'variants'
        root: 'bg-white dark:backdrop-blur-xl ring-1 ring-gray-200 dark:ring-white/10', 
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
            root: 'w-full max-w-md mx-auto shadow-lg'
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
          root: 'bg-white dark:bg-[#050505] ring-1 ring-gray-200 dark:ring-gray-800'
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
          green:  ''  
        },
        color: {
          // primary: 'bg-indigo-500 dark:bg-indigo-600'
        }
      }
    }
  }
})