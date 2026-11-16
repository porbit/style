<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { useSidebarProvider } from '../../composables/useSidebar'

const { mobileBreakpoint = 768 } = defineProps<{
  /** Viewport width (px) under which the sidebar is a mobile drawer. Default 768 (unchanged). */
  mobileBreakpoint?: number
}>()

useSidebarProvider({ mobileBreakpoint: () => mobileBreakpoint })
</script>
