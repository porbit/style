<template>
  <div class="space-y-6">
    <!-- Single Select Input -->
    <div>
      <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
        {{ label }}
      </label>
      <div class="relative z-20 bg-transparent">
        <select
          v-model="singleSelect"
          class="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 ltr:pr-11 rtl:pl-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          :class="{ 'text-gray-800 dark:text-white/90': singleSelect }"
        >
          <option value="" disabled>{{ placeholder }}</option>
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            class="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {{ option.label }}
          </option>
        </select>
        <span
          class="absolute z-30 text-gray-700 -translate-y-1/2 pointer-events-none ltr:right-4 rtl:left-4 top-1/2 dark:text-gray-400"
        >
          <svg
            class="stroke-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
              stroke=""
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>

    <!-- Multiple Select Input -->
    <div>
      <MultipleSelect
        :label="multipleLabel"
        :options="multipleOptions"
        v-model="selected"
        :name="multipleName"
      />
    </div>
  </div>
</template>

<script lang="ts">
export interface SelectOption {
  value: string
  label: string
}

export interface MultiSelectOption {
  id: number
  name: string
}

export const defaultSelectOptions: SelectOption[] = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'template', label: 'Template' },
  { value: 'development', label: 'Development' },
]

export const defaultMultiSelectOptions: MultiSelectOption[] = [
  { id: 1, name: 'Option 1' },
  { id: 2, name: 'Option 2' },
  { id: 3, name: 'Option 3' },
  { id: 4, name: 'Option 4' },
  { id: 5, name: 'Option 5' },
]
</script>

<script setup lang="ts">
import MultipleSelect from './MultipleSelect.vue'

const {
  label = 'Select Input',
  placeholder = 'Select Option',
  options = defaultSelectOptions,
  multipleLabel = 'Multiple Select Options',
  multipleOptions = defaultMultiSelectOptions,
  multipleName = 'selected_options',
} = defineProps<{
  label?: string
  placeholder?: string
  options?: SelectOption[]
  multipleLabel?: string
  multipleOptions?: MultiSelectOption[]
  multipleName?: string
}>()

const selected = defineModel<number[]>('multiple', { default: () => [1, 3] })
const singleSelect = defineModel<string>({ default: '' })
</script>
