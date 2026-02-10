<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 font-sans">
    <slot />
    <!-- Powered by ParaScores watermark -->
    <div class="fixed bottom-2 right-3 z-50">
      <a 
        href="https://parascores.com" 
        target="_blank" 
        rel="noopener noreferrer"
        class="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900/90 border border-white/10 rounded-full text-[10px] text-gray-400 hover:text-white transition-colors backdrop-blur-sm"
      >
        <div class="w-3 h-3 bg-emerald-500 rounded-sm flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-2 h-2 text-white">
            <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="3"/>
            <circle cx="8" cy="12" r="2" fill="currentColor"/>
            <circle cx="16" cy="12" r="2" fill="currentColor"/>
          </svg>
        </div>
        Powered by ParaScores
      </a>
    </div>
  </div>
</template>
