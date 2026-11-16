<template>
  <div class="flex flex-wrap items-center gap-8">
    <div>
      <label
        for="radioLabelOne"
        class="flex cursor-pointer select-none items-center text-sm font-medium text-gray-700 dark:text-gray-400"
      >
        <div class="relative">
          <input type="checkbox" id="radioLabelOne" class="sr-only" v-model="checkboxToggleOne" />
          <div
            :class="
              checkboxToggleOne
                ? 'border-brand-500 bg-brand-500'
                : 'bg-transparent border-gray-300 dark:border-gray-700'
            "
            class="ltr:mr-3 rtl:ml-3 flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] hover:border-brand-500 dark:hover:border-brand-500"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="checkboxToggleOne ? 'bg-white' : 'bg-white dark:bg-[#171f2e]'"
            ></span>
          </div>
        </div>
        {{ defaultLabel }}
      </label>
    </div>

    <div>
      <label
        for="radioLabelTwo"
        class="flex cursor-pointer select-none items-center text-sm font-medium text-gray-700 dark:text-gray-400"
      >
        <div class="relative">
          <input type="checkbox" id="radioLabelTwo" class="sr-only" v-model="checkboxToggleTwo" />
          <div
            :class="
              checkboxToggleTwo
                ? 'border-brand-500 bg-brand-500'
                : 'bg-transparent border-gray-300 dark:border-gray-700'
            "
            class="ltr:mr-3 rtl:ml-3 flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] hover:border-brand-500 dark:hover:border-brand-500"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="checkboxToggleTwo ? 'bg-white' : 'bg-white dark:bg-[#171f2e]'"
            ></span>
          </div>
        </div>
        {{ secondaryLabel }}
      </label>
    </div>

    <div>
      <label
        for="radioLabelThree"
        class="flex cursor-pointer select-none items-center text-sm font-medium text-gray-300 dark:text-gray-700"
      >
        <div class="relative">
          <input
            type="checkbox"
            id="radioLabelThree"
            class="peer sr-only"
            :checked="disabledSecondaryChecked"
            disabled
          />
          <div
            :class="
              disabledSecondaryChecked
                ? 'bg-transparent border-gray-300 dark:border-gray-700'
                : 'border-brand-500 bg-brand-500'
            "
            class="ltr:mr-3 rtl:ml-3 flex h-5 w-5 items-center justify-center rounded-full border-[1.25px]"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="disabledSecondaryChecked ? 'bg-white' : 'bg-white dark:bg-[#171f2e]'"
            ></span>
          </div>
        </div>
        {{ disabledSecondaryLabel }}
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  defaultLabel = 'Default',
  secondaryLabel = 'Secondary',
  disabledSecondaryLabel = 'Disabled Secondary',
  disabledSecondaryChecked = false,
} = defineProps<{
  defaultLabel?: string
  secondaryLabel?: string
  disabledSecondaryLabel?: string
  disabledSecondaryChecked?: boolean
}>()

const checkboxToggleOne = defineModel<boolean>('default', { default: false })
const checkboxToggleTwo = defineModel<boolean>('secondary', { default: true })
</script>
