<template>
  <div>
    <!-- First set of toggle switches -->
    <div class="mb-6 flex flex-wrap items-center gap-6 sm:gap-8">
      <div>
        <label
          for="toggle1"
          class="flex cursor-pointer select-none items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          <div class="relative">
            <input type="checkbox" id="toggle1" class="sr-only" v-model="switcherToggle1" />
            <div
              class="block h-6 w-11 rounded-full"
              :class="
                switcherToggle1 ? 'bg-brand-500 dark:bg-brand-500' : 'bg-gray-200 dark:bg-white/10'
              "
            ></div>
            <div
              :class="switcherToggle1 ? 'translate-x-full' : 'translate-x-0'"
              class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm duration-300 ease-linear"
            ></div>
          </div>
          {{ defaultLabel }}
        </label>
      </div>

      <div>
        <label
          for="toggle2"
          class="flex cursor-pointer select-none items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          <div class="relative">
            <input type="checkbox" id="toggle2" class="sr-only" v-model="switcherToggle2" />
            <div
              class="block h-6 w-11 rounded-full"
              :class="
                switcherToggle2 ? 'bg-brand-500 dark:bg-brand-500' : 'bg-gray-200 dark:bg-white/10'
              "
            ></div>
            <div
              :class="switcherToggle2 ? 'translate-x-full' : 'translate-x-0'"
              class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm duration-300 ease-linear"
            ></div>
          </div>
          {{ checkedLabel }}
        </label>
      </div>

      <div>
        <label
          for="toggle3"
          class="flex cursor-pointer select-none items-center gap-3 text-sm font-medium text-gray-400"
        >
          <div class="relative">
            <input
              type="checkbox"
              id="toggle3"
              class="sr-only"
              :checked="set1DisabledChecked"
              disabled
            />
            <div
              class="block h-6 w-11 rounded-full"
              :class="
                set1DisabledChecked
                  ? 'bg-brand-500 dark:bg-brand-500'
                  : 'bg-gray-100 dark:bg-gray-800'
              "
            ></div>
            <div
              :class="set1DisabledChecked ? 'translate-x-full' : 'translate-x-0'"
              class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-gray-50 shadow-theme-sm duration-300 ease-linear"
            ></div>
          </div>
          {{ disabledLabel }}
        </label>
      </div>
    </div>

    <!-- Second set of toggle switches -->
    <div class="flex flex-wrap items-center gap-6 sm:gap-8">
      <div>
        <label
          for="toggle11"
          class="flex cursor-pointer select-none items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          <div class="relative">
            <input type="checkbox" id="toggle11" class="sr-only" v-model="switcherToggle11" />
            <div
              class="block h-6 w-11 rounded-full"
              :class="
                switcherToggle11 ? 'bg-gray-700 dark:bg-white/10' : 'bg-gray-200 dark:bg-gray-800'
              "
            ></div>
            <div
              :class="switcherToggle11 ? 'translate-x-full' : 'translate-x-0'"
              class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm duration-300 ease-linear"
            ></div>
          </div>
          {{ defaultLabel }}
        </label>
      </div>

      <div>
        <label
          for="toggle22"
          class="flex cursor-pointer select-none items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          <div class="relative">
            <input type="checkbox" id="toggle22" class="sr-only" v-model="switcherToggle22" />
            <div
              class="block h-6 w-11 rounded-full"
              :class="
                switcherToggle22 ? 'bg-gray-700 dark:bg-white/10' : 'bg-gray-200 dark:bg-gray-800'
              "
            ></div>
            <div
              :class="switcherToggle22 ? 'translate-x-full' : 'translate-x-0'"
              class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm duration-300 ease-linear"
            ></div>
          </div>
          {{ checkedLabel }}
        </label>
      </div>

      <div>
        <label
          for="toggle33"
          class="flex cursor-pointer select-none items-center gap-3 text-sm font-medium text-gray-400"
        >
          <div class="relative">
            <input
              type="checkbox"
              id="toggle33"
              class="sr-only"
              :checked="set2DisabledChecked"
              disabled
            />
            <div
              class="block h-6 w-11 rounded-full"
              :class="
                set2DisabledChecked
                  ? 'bg-gray-700 dark:bg-white/10'
                  : 'bg-gray-100 dark:bg-gray-800'
              "
            ></div>
            <div
              :class="set2DisabledChecked ? 'translate-x-full' : 'translate-x-0'"
              class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-gray-50 shadow-theme-sm duration-300 ease-linear"
            ></div>
          </div>
          {{ disabledLabel }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  defaultLabel = 'Default',
  checkedLabel = 'Checked',
  disabledLabel = 'Disabled',
  set1DisabledChecked = false,
  set2DisabledChecked = false,
} = defineProps<{
  defaultLabel?: string
  checkedLabel?: string
  disabledLabel?: string
  set1DisabledChecked?: boolean
  set2DisabledChecked?: boolean
}>()

const switcherToggle1 = defineModel<boolean>('set1Default', { default: false })
const switcherToggle2 = defineModel<boolean>('set1Checked', { default: true })
const switcherToggle11 = defineModel<boolean>('set2Default', { default: false })
const switcherToggle22 = defineModel<boolean>('set2Checked', { default: true })
</script>
