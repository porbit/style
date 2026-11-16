<template>
  <th
    v-if="isHeader"
    class="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400 sm:px-6"
  >
    <slot />
  </th>
  <td v-else class="px-5 py-4 sm:px-6">
    <slot />
  </td>
</template>

<script setup lang="ts">
// Renders a <th> with the header text styling baked in, or a <td> with just
// padding/alignment — cell content (avatars, badges, plain text) keeps its
// own typography via the slot, same as every hand-written table already did.
const { isHeader = false } = defineProps<{
  isHeader?: boolean
}>()
</script>
