<template>
  <div class="overflow-hidden">
    <!-- Hero Section -->
    <section class="relative min-h-screen flex items-center overflow-hidden">
      
      <!-- Animated grid pattern -->
      <div class="absolute inset-0 grid-pattern opacity-30"></div>
      
      <!-- Floating orbs -->
      <div class="absolute top-20 left-[10%] w-72 h-72 bg-green-500/20 rounded-full blur-[100px] floating-orb"></div>
      <div class="absolute bottom-20 right-[15%] w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] floating-orb-delayed"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[150px] floating-orb-slow"></div>
      
      <!-- Floating shapes -->
      <div class="absolute top-32 right-[20%] w-4 h-4 bg-green-400/60 rounded-full floating-shape"></div>
      <div class="absolute top-48 left-[25%] w-3 h-3 bg-emerald-400/40 rounded-full floating-shape-delayed"></div>
      <div class="absolute bottom-32 left-[15%] w-5 h-5 bg-teal-400/50 rounded-full floating-shape-slow"></div>
      <div class="absolute bottom-48 right-[30%] w-2 h-2 bg-green-300/70 rounded-full floating-shape"></div>
      
      <div class="relative max-w-7xl mx-auto px-6 py-32">
        <div class="text-center max-w-4xl mx-auto">
          <!-- Badge with pulse animation -->
          <div 
            ref="badgeRef"
            class="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-sm font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-sm reveal-element"
          >
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Now in Beta — Join the waitlist
          </div>

          <!-- Main Headline with staggered reveal -->
          <h1 
            ref="headlineRef"
            class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-heading tracking-tight leading-[1.1] mb-6 reveal-element delay-100"
          >
            Run tournaments
            <span class="block mt-2 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_100%]">
              like a pro
            </span>
          </h1>

          <!-- Subtitle -->
          <p 
            ref="subtitleRef"
            class="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed reveal-element delay-200"
          >
            The all-in-one platform for organizing, managing, and scaling competitive events. 
            From brackets to live scoring and graphics — we've got you covered.
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 reveal-element delay-300">
            <UButton
              to="/signup"
              size="xl"
              icon="i-heroicons-arrow-right"
              trailing
              color="primary"
              class="w-full sm:w-auto px-8 py-4 text-base font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 btn-glow"
            >
              Start for free
            </UButton>
            <UButton
              to="/demo"
              size="xl"
              icon="i-heroicons-play-circle"
              variant="outline"
              color="neutral"
              class="w-full sm:w-auto px-8 py-4 text-base font-semibold hover:bg-white/5 transition-all duration-300"
            >
              Watch demo
            </UButton>
          </div>

          <!-- Animated Stats -->
          <div 
            ref="statsRef"
            class="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-8 border-t border-white/[0.06] reveal-element delay-400"
          >
            <div 
              v-for="(stat, index) in stats" 
              :key="index"
              class="text-center group cursor-default"
            >
              <div class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors duration-300">
                <span ref="statCounters" :data-target="stat.value" :data-suffix="stat.suffix">0{{ stat.suffix }}</span>
              </div>
              <div class="text-xs sm:text-sm text-gray-500 group-hover:text-gray-400 transition-colors">{{ stat.label }}</div>
            </div>
          </div>
        </div>

        <!-- Hero Image/Mockup with 3D tilt effect -->
        <div 
          ref="mockupRef"
          class="mt-20 relative perspective-1000 reveal-element delay-500"
        >
          <div 
            class="relative bg-[#111111]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 mockup-card transition-transform duration-500 hover:scale-[1.02]"
          >
            <!-- Browser-like header -->
            <div class="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-black/20">
              <div class="flex gap-1.5">
                <div class="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors cursor-pointer"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors cursor-pointer"></div>
                <div class="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-400 transition-colors cursor-pointer"></div>
              </div>
              <div class="flex-1 flex justify-center">
                <div class="px-4 py-1 text-xs text-gray-500 bg-white/[0.04] rounded-md">
                  manage.parascores.com/dashboard
                </div>
              </div>
            </div>
            
            <!-- Dashboard preview content -->
            <div class="p-6 sm:p-8">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div 
                  v-for="(card, i) in dashboardCards" 
                  :key="i"
                  class="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-green-500/30 hover:bg-white/[0.04] transition-all duration-300"
                  :style="{ transitionDelay: `${i * 50}ms` }"
                >
                  <div class="text-sm text-gray-500 mb-1">{{ card.label }}</div>
                  <div class="text-2xl font-bold text-white">{{ card.value }}</div>
                </div>
              </div>
              
              <!-- Bracket preview -->
              <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 sm:p-6 hover:border-green-500/20 transition-all duration-300">
                <div class="flex items-center justify-between mb-4">
                  <div class="text-sm font-medium text-white">Championship Bracket</div>
                  <div class="px-2 py-1 text-xs font-medium text-green-400 bg-green-500/10 rounded-md flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Live
                  </div>
                </div>
                <div class="flex gap-8 overflow-x-auto pb-2">
                  <!-- Round 1 -->
                  <div class="flex-shrink-0 space-y-3">
                    <div class="text-xs text-gray-500 mb-2">Quarter Finals</div>
                    <div class="w-40 p-2 bg-white/[0.03] border border-white/[0.08] rounded-lg hover:border-white/20 transition-all">
                      <div class="flex justify-between text-xs"><span class="text-gray-400">Team Alpha</span><span class="text-white font-medium">3</span></div>
                      <div class="flex justify-between text-xs mt-1"><span class="text-gray-400">Team Beta</span><span class="text-gray-500">1</span></div>
                    </div>
                    <div class="w-40 p-2 bg-white/[0.03] border border-white/[0.08] rounded-lg hover:border-white/20 transition-all">
                      <div class="flex justify-between text-xs"><span class="text-gray-400">Team Gamma</span><span class="text-gray-500">2</span></div>
                      <div class="flex justify-between text-xs mt-1"><span class="text-gray-400">Team Delta</span><span class="text-white font-medium">3</span></div>
                    </div>
                  </div>
                  <!-- Semi Finals -->
                  <div class="flex-shrink-0 space-y-3">
                    <div class="text-xs text-gray-500 mb-2">Semi Finals</div>
                    <div class="w-40 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div class="flex justify-between text-xs"><span class="text-green-400">Team Alpha</span><span class="text-white font-medium">2</span></div>
                      <div class="flex justify-between text-xs mt-1"><span class="text-gray-400">Team Delta</span><span class="text-gray-500">1</span></div>
                    </div>
                  </div>
                  <!-- Finals -->
                  <div class="flex-shrink-0 space-y-3">
                    <div class="text-xs text-gray-500 mb-2">Finals</div>
                    <div class="w-40 p-2 bg-white/[0.03] border border-dashed border-white/[0.15] rounded-lg">
                      <div class="flex justify-between text-xs"><span class="text-gray-500">TBD</span><span class="text-gray-600">-</span></div>
                      <div class="flex justify-between text-xs mt-1"><span class="text-gray-500">TBD</span><span class="text-gray-600">-</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Decorative glow under mockup -->
          <div class="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-40 bg-green-500/20 rounded-full blur-[80px]"></div>
        </div>
      </div>
    </section>

    <!-- Trusted By Section -->
    <section class="py-16 border-t border-white/[0.06] relative">
      <div class="max-w-7xl mx-auto px-6">
        <p 
          ref="trustedRef"
          class="text-center text-xs font-medium text-gray-500 uppercase tracking-[0.2em] mb-10 reveal-element"
        >
          Trusted by organizations worldwide
        </p>
        <div class="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-12 gap-y-6 reveal-element delay-100">
          <span 
            v-for="(brand, i) in brands" 
            :key="brand.name"
            :class="brand.class"
            class="opacity-60 hover:opacity-100 transition-all duration-300 hover:scale-110 cursor-default"
            :style="{ transitionDelay: `${i * 50}ms` }"
          >
            {{ brand.name }}
          </span>
        </div>
      </div>
    </section>

    <!-- Feature 1: Bracket Engine -->
    <section id="features" class="py-24 scroll-mt-20 relative">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <!-- Content -->
          <div ref="feature1Ref" class="order-2 lg:order-1">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full reveal-element">
              <Icon name="heroicons:puzzle-piece" class="w-4 h-4" />
              Bracket Engine
            </div>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6 reveal-element delay-100">
              Chaos-Free Scheduling.
            </h2>
            <p class="text-lg text-gray-400 leading-relaxed mb-8 reveal-element delay-200">
              Forget spreadsheets. Generate round-robin, knockout, or group stage schedules in one click. Our engine handles conflict resolution and pitch allocation automatically.
            </p>
            <ul class="space-y-4">
              <li 
                v-for="(item, i) in feature1Items" 
                :key="i"
                class="flex items-center gap-3 reveal-element"
                :style="{ transitionDelay: `${300 + i * 100}ms` }"
              >
                <div class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Icon name="heroicons:check" class="w-3 h-3 text-green-400" />
                </div>
                <span class="text-gray-300">{{ item }}</span>
              </li>
            </ul>
          </div>
          
          <!-- Mockup -->
          <div class="order-1 lg:order-2 relative group reveal-element">
            <div class="relative rounded-2xl overflow-hidden shadow-2xl transform rotate-2 transition-all duration-700 ease-out group-hover:rotate-0 group-hover:scale-[1.02]">
              <div class="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div class="text-gray-500 text-sm">Bracket Engine Preview</div>
              </div>
              <!-- Glow effect -->
              <div class="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <!-- Floating accent -->
            <div class="absolute -top-4 -right-4 w-20 h-20 bg-cyan-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 2: Live Control -->
    <section class="py-24 relative">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <!-- Mockup -->
          <div ref="feature2Ref" class="relative group reveal-element">
            <div class="relative rounded-2xl overflow-hidden shadow-2xl transform -rotate-2 transition-all duration-700 ease-out group-hover:rotate-0 group-hover:scale-[1.02]">
              <div class="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div class="text-gray-500 text-sm">Live Control Preview</div>
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <div class="absolute -bottom-4 -left-4 w-24 h-24 bg-green-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>

          <!-- Content -->
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-sm font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full reveal-element">
              <Icon name="heroicons:signal" class="w-4 h-4" />
              Live Control
            </div>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6 reveal-element delay-100">
              Command Center for Match Day.
            </h2>
            <p class="text-lg text-gray-400 leading-relaxed mb-8 reveal-element delay-200">
              Empower your referees and officials with a mobile-friendly control panel. Log goals, fouls, and subs in real-time, instantly updating the public view.
            </p>
            <ul class="space-y-4">
              <li 
                v-for="(item, i) in feature2Items" 
                :key="i"
                class="flex items-center gap-3 reveal-element"
                :style="{ transitionDelay: `${300 + i * 100}ms` }"
              >
                <div class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Icon name="heroicons:check" class="w-3 h-3 text-green-400" />
                </div>
                <span class="text-gray-300">{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 3: Graphics Studio -->
    <section class="py-24 relative overflow-hidden">
      <div class="relative max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <!-- Content -->
          <div ref="feature3Ref" class="order-2 lg:order-1">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-sm font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full reveal-element">
              <Icon name="heroicons:paint-brush" class="w-4 h-4" />
              Graphics Studio
            </div>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6 reveal-element delay-100">
              Social Media Ready. Instantly.
            </h2>
            <p class="text-lg text-gray-400 leading-relaxed mb-8 reveal-element delay-200">
              Don't wait for a designer. Generate stunning match results, league tables, and player quote graphics directly from your match data with one click.
            </p>
            <ul class="space-y-4">
              <li 
                v-for="(item, i) in feature3Items" 
                :key="i"
                class="flex items-center gap-3 reveal-element"
                :style="{ transitionDelay: `${300 + i * 100}ms` }"
              >
                <div class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Icon name="heroicons:check" class="w-3 h-3 text-green-400" />
                </div>
                <span class="text-gray-300">{{ item }}</span>
              </li>
            </ul>
          </div>
          
          <!-- Mockup -->
          <div class="order-1 lg:order-2 relative group reveal-element">
            <div class="relative rounded-2xl overflow-hidden shadow-2xl transform rotate-2 transition-all duration-700 ease-out group-hover:rotate-0 group-hover:scale-[1.02]">
              <div class="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div class="text-gray-500 text-sm">Graphics Studio Preview</div>
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <div class="absolute -top-4 -right-4 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="py-24 relative">
      <div class="max-w-7xl mx-auto px-6">
        <div ref="testimonialsRef" class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4 reveal-element">
            Loved by Organizers
          </h2>
          <p class="text-gray-400 text-lg reveal-element delay-100">
            Join hundreds of leagues streamlining their operations.
          </p>
        </div>
        
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div 
            v-for="(testimonial, index) in testimonials" 
            :key="index"
            class="reveal-element"
            :style="{ transitionDelay: `${200 + index * 100}ms` }"
          >
            <UCard 
              :class="[
                'relative h-full transition-all duration-500 hover:border-green-500/30 hover:-translate-y-2 hover:shadow-xl hover:shadow-green-500/5 group',
                index === testimonials.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''
              ]"
            >
              <div class="absolute top-4 sm:top-6 right-4 sm:right-6 text-4xl sm:text-5xl font-serif text-gray-200 dark:text-gray-700 group-hover:text-green-500/30 transition-colors duration-500">"</div>
              <p class="text-muted mb-5 sm:mb-6 leading-relaxed text-sm sm:text-base pr-6 flex-1">
                "{{ testimonial.quote }}"
              </p>
              <div class="flex items-center gap-3">
                <UAvatar 
                  :src="testimonial.avatar" 
                  :alt="testimonial.name" 
                  size="md" 
                  class="ring-2 ring-transparent group-hover:ring-green-500/50 transition-all duration-300"
                />
                <div>
                  <div class="text-heading font-medium text-sm sm:text-base">{{ testimonial.name }}</div>
                  <div class="text-xs sm:text-sm text-muted">{{ testimonial.role }}</div>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-24 scroll-mt-20 relative">
      <div class="max-w-7xl mx-auto px-6">
        <div ref="pricingRef" class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4 reveal-element">
            Simple, Transparent Pricing
          </h2>
          <p class="text-gray-400 text-lg reveal-element delay-100">
            Start for free, upgrade as you grow.
          </p>
        </div>
        
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <!-- Starter Plan -->
          <div class="reveal-element delay-200">
            <UCard class="relative h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-xl group">
              <div class="text-xs font-medium text-muted uppercase tracking-wider mb-2">Starter</div>
              <div class="text-4xl font-bold text-heading mb-6 group-hover:text-green-400 transition-colors">Free</div>
              <ul class="space-y-3 mb-8">
                <li v-for="(item, i) in starterFeatures" :key="i" class="flex items-center gap-3 text-sm">
                  <Icon :name="item.included ? 'heroicons:check' : 'heroicons:x-mark'" :class="item.included ? 'w-4 h-4 text-green-500 flex-shrink-0' : 'w-4 h-4 text-muted flex-shrink-0'" />
                  <span :class="item.included ? 'text-body' : 'text-muted'">{{ item.text }}</span>
                </li>
              </ul>
              <UButton block variant="solid" color="neutral" size="lg" class="group-hover:bg-white/10 transition-colors">Get Started</UButton>
            </UCard>
          </div>
          
          <!-- Pro Plan -->
          <div class="reveal-element delay-300 sm:col-span-2 lg:col-span-1 order-first sm:order-none lg:order-none">
            <UCard 
              class="relative h-full ring-2 ring-green-500 dark:ring-green-500 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-green-500/20 group"
            >
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-full whitespace-nowrap animate-pulse-subtle">
                MOST POPULAR
              </div>
              <div class="text-xs font-medium text-green-500 uppercase tracking-wider mb-2">Pro</div>
              <div class="flex items-baseline gap-1 mb-6">
                <span class="text-4xl font-bold text-heading">$29</span>
                <span class="text-muted">/mo</span>
              </div>
              <ul class="space-y-3 mb-8">
                <li v-for="(item, i) in proFeatures" :key="i" class="flex items-center gap-3 text-sm">
                  <Icon name="heroicons:check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span class="text-body">{{ item }}</span>
                </li>
              </ul>
              <UButton block color="primary" size="lg" class="shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-shadow">Start Free Trial</UButton>
            </UCard>
          </div>
          
          <!-- Agency Plan -->
          <div class="reveal-element delay-400">
            <UCard class="relative h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-xl group">
              <div class="text-xs font-medium text-muted uppercase tracking-wider mb-2">Agency</div>
              <div class="text-4xl font-bold text-heading mb-6 group-hover:text-green-400 transition-colors">Custom</div>
              <ul class="space-y-3 mb-8">
                <li v-for="(item, i) in agencyFeatures" :key="i" class="flex items-center gap-3 text-sm">
                  <Icon name="heroicons:check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span class="text-body">{{ item }}</span>
                </li>
              </ul>
              <UButton block variant="solid" color="neutral" size="lg" class="group-hover:bg-white/10 transition-colors">Contact Sales</UButton>
            </UCard>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="py-24 relative overflow-hidden">
      <!-- Background effects -->
      <div class="absolute inset-0">
        <div class="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]"></div>
        <div class="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[100px]"></div>
      </div>
      
      <div ref="ctaRef" class="relative max-w-4xl mx-auto px-6 text-center">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6 reveal-element">
          Ready to level up your tournaments?
        </h2>
        <p class="text-lg text-gray-400 mb-10 max-w-2xl mx-auto reveal-element delay-100">
          Join thousands of organizers who trust Parascores to run their events. Start for free today.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 reveal-element delay-200">
          <UButton
            to="/signup"
            size="xl"
            icon="i-heroicons-arrow-right"
            trailing
            color="primary"
            class="w-full sm:w-auto px-8 py-4 text-base font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300"
          >
            Get started for free
          </UButton>
          <UButton
            to="/contact"
            size="xl"
            variant="outline"
            color="neutral"
            class="w-full sm:w-auto px-8 py-4 text-base font-semibold hover:bg-white/5 transition-all"
          >
            Talk to sales
          </UButton>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Data
const stats = [
  { value: 10, suffix: 'K+', label: 'Tournaments hosted' },
  { value: 500, suffix: 'K+', label: 'Active players' },
  { value: 50, suffix: '+', label: 'Countries' },
  { value: 99.9, suffix: '%', label: 'Uptime' }
]

const dashboardCards = [
  { label: 'Active Tournaments', value: '24' },
  { label: 'Participants', value: '1,247' },
  { label: 'Matches Today', value: '86' }
]

const brands = [
  { name: 'LEAGUEOPS', class: 'text-base sm:text-xl font-semibold text-gray-600 tracking-wide' },
  { name: 'Varsity', class: 'text-lg sm:text-2xl font-serif italic text-gray-600' },
  { name: 'ESL', class: 'text-base sm:text-xl font-bold text-gray-600' },
  { name: 'DRAFTKINGS', class: 'text-base sm:text-xl font-bold text-gray-600 tracking-wider' },
  { name: 'SCOREBOARD', class: 'text-base sm:text-xl font-semibold text-gray-600 tracking-wide' }
]

const feature1Items = [
  'Drag-and-drop fixture management',
  'Automatic table calculation',
  'Multi-sport support (Football, Basketball, Esports)'
]

const feature2Items = [
  'Real-time clock synchronization',
  'Incident dispute resolution',
  'Live stats tracking'
]

const feature3Items = [
  'Auto-populated data templates',
  'Custom branding & logos',
  'Download in HD for Instagram/Twitter'
]

const testimonials = [
  {
    quote: "Parascores saved us hours every weekend. The automated graphics generator is a game changer for our social media engagement.",
    name: "Alex Johnson",
    role: "Director, City Leagues",
    avatar: "https://i.pravatar.cc/150?u=alex"
  },
  {
    quote: "Finally, a tool that handles both our basketball and esports tournaments in one place. The UI is incredibly intuitive.",
    name: "Sarah Chen",
    role: "Manager, UniSports",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    quote: "The live match control is flawless. Our referees picked it up in minutes without any training.",
    name: "Mike Ross",
    role: "Head Ref, Elite Cup",
    avatar: "https://i.pravatar.cc/150?u=mike"
  }
]

const starterFeatures = [
  { text: '1 Tournament', included: true },
  { text: '8 Teams Max', included: true },
  { text: 'Basic Scheduling', included: true },
  { text: 'Graphics Studio', included: false }
]

const proFeatures = [
  'Unlimited Tournaments',
  'Live Match Control',
  'Graphics Studio',
  'Priority Support'
]

const agencyFeatures = [
  'Whitelabeling',
  'API Access',
  'Dedicated Manager',
  'Custom Integration'
]

// Refs for scroll animations
const statCounters = ref<HTMLElement[]>([])

// Intersection Observer for reveal animations
let observer: IntersectionObserver | null = null

onMounted(() => {
  // Setup intersection observer for reveal animations
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          
          // Animate counters when stats section is visible
          if (entry.target.closest('[data-animate-counters]')) {
            animateCounters()
          }
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }
  )

  // Observe all reveal elements
  document.querySelectorAll('.reveal-element').forEach((el) => {
    observer?.observe(el)
  })
  
  // Mark stats section for counter animation
  const statsSection = document.querySelector('[class*="grid-cols-2"][class*="sm:grid-cols-4"]')
  if (statsSection) {
    statsSection.setAttribute('data-animate-counters', 'true')
  }
})

onUnmounted(() => {
  observer?.disconnect()
})

// Animate number counters
const animateCounters = () => {
  const counters = document.querySelectorAll('[data-target]')
  counters.forEach((counter) => {
    const target = parseFloat(counter.getAttribute('data-target') || '0')
    const suffix = counter.getAttribute('data-suffix') || ''
    const duration = 2000
    const start = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - start
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = target * easeOutQuart
      
      if (target % 1 !== 0) {
        counter.textContent = current.toFixed(1) + suffix
      } else {
        counter.textContent = Math.floor(current) + suffix
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  })
}
</script>

<style scoped>
/* Hero gradient animation */
.hero-gradient {
  background: 
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.15), transparent),
    radial-gradient(ellipse 60% 40% at 80% 60%, rgba(6, 182, 212, 0.1), transparent),
    radial-gradient(ellipse 50% 30% at 20% 80%, rgba(16, 185, 129, 0.1), transparent);
  animation: gradient-shift 8s ease-in-out infinite alternate;
}

@keyframes gradient-shift {
  0% {
    opacity: 0.8;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 1;
    transform: scale(1.05) translateY(-10px);
  }
}

/* Grid pattern */
.grid-pattern {
  background-image: 
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* Floating animations */
.floating-orb {
  animation: float 6s ease-in-out infinite;
}

.floating-orb-delayed {
  animation: float 8s ease-in-out infinite;
  animation-delay: -2s;
}

.floating-orb-slow {
  animation: float 10s ease-in-out infinite;
  animation-delay: -4s;
}

.floating-shape {
  animation: float-shape 4s ease-in-out infinite;
}

.floating-shape-delayed {
  animation: float-shape 5s ease-in-out infinite;
  animation-delay: -1.5s;
}

.floating-shape-slow {
  animation: float-shape 6s ease-in-out infinite;
  animation-delay: -3s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0);
  }
  50% {
    transform: translateY(-20px) translateX(10px);
  }
}

@keyframes float-shape {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-15px) scale(1.1);
    opacity: 1;
  }
}

/* Gradient text animation */
.animate-gradient-x {
  animation: gradient-x 3s ease infinite;
}

@keyframes gradient-x {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Button glow effect */
.btn-glow {
  position: relative;
}

.btn-glow::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, #10b981, #06b6d4, #10b981);
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  filter: blur(10px);
  transition: opacity 0.3s ease;
}

.btn-glow:hover::before {
  opacity: 0.5;
}

/* Reveal animations */
.reveal-element {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal-element.revealed {
  opacity: 1;
  transform: translateY(0);
}

.delay-100 { transition-delay: 100ms; }
.delay-200 { transition-delay: 200ms; }
.delay-300 { transition-delay: 300ms; }
.delay-400 { transition-delay: 400ms; }
.delay-500 { transition-delay: 500ms; }

/* Perspective for 3D effects */
.perspective-1000 {
  perspective: 1000px;
}

/* Subtle pulse for "Most Popular" badge */
.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 0.9;
    transform: translateX(-50%) scale(1.02);
  }
}

/* Mockup card subtle shadow animation */
.mockup-card {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

.mockup-card:hover {
  box-shadow: 
    0 30px 60px -15px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(16, 185, 129, 0.2);
}
</style>
