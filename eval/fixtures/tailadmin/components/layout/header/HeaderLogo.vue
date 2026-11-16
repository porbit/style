<!--
  This is AppHeader's default for its #logo slot (mobile-only brand mark) — a consumer
  overriding #logo replaces this whole component, no props needed here. See docs/USER_GUIDE.md.
-->
<template>
  <router-link to="/" class="xl:hidden">
    <img class="dark:hidden" src="/images/logo/logo.svg" alt="Logo" />
    <img class="hidden dark:block" src="/images/logo/logo-dark.svg" alt="Logo" />
  </router-link>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
