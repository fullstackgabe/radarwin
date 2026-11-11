<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 72 })
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" :width="size" :height="size" aria-hidden="true"><defs><linearGradient id="sw" x1="50" y1="15" x2="80" y2="33" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f2c14e" stop-opacity="0"/><stop offset="1" stop-color="#f2c14e" stop-opacity=".45"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="#000000"/><g transform="translate(50 50) scale(1.0) translate(-50 -50)">
<path d="M50 50 L50 15 A35 35 0 0 1 80.31 32.5 Z" fill="url(#sw)"/>
<circle cx="50" cy="50" r="35" fill="none" stroke="#f2c14e" stroke-width="2.6"/>
<circle cx="50" cy="50" r="23.5" fill="none" stroke="#f2c14e" stroke-width="1.6" stroke-opacity=".55"/>
<circle cx="50" cy="50" r="12" fill="none" stroke="#f2c14e" stroke-width="1.6" stroke-opacity=".55"/>
<path d="M50 15V85M15 50H85" stroke="#f2c14e" stroke-width="1.2" stroke-opacity=".3"/>
<path d="M50 50 L80.31 32.5" stroke="#f2c14e" stroke-width="2.6" stroke-linecap="round"/>
<circle cx="64" cy="35" r="3.4" fill="#f2c14e"/>
<circle cx="36" cy="63" r="2.6" fill="#f2c14e" fill-opacity=".7"/>
<circle cx="50" cy="50" r="3.2" fill="#f2c14e"/>
</g></svg>
</template>
