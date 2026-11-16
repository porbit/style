<template>
  <tr
    :class="
      isHeader
        ? 'border-b border-gray-200 dark:border-gray-700'
        : 'border-t border-gray-100 dark:border-gray-800'
    "
  >
    <slot />
  </tr>
</template>

<script setup lang="ts">
// isHeader picks the heavier border used under a header row vs. the lighter
// divider between body rows — matches the two row treatments already used
// across the template's hand-written tables.
const { isHeader = false } = defineProps<{
  isHeader?: boolean
}>()
</script>
