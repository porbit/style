<template>
  <tbody :class="divided ? 'divide-y divide-gray-200 dark:divide-gray-700' : ''">
    <slot />
  </tbody>
</template>

<script setup lang="ts">
// Adds a divider line between rows; set to false if TableRow already draws its own border.
const { divided = true } = defineProps<{
  divided?: boolean
}>()
</script>
