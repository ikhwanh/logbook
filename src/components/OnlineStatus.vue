<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const online = ref(navigator.onLine)
const update = () => (online.value = navigator.onLine)

window.addEventListener('online', update)
window.addEventListener('offline', update)
onBeforeUnmount(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
</script>

<template>
  <span class="badge" :class="{ offline: !online }">{{ online ? 'Online' : 'Offline' }}</span>
</template>

<style scoped>
.badge {
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: var(--accent-soft);
  color: var(--accent);
}
.badge.offline {
  background: var(--warn-soft);
  color: var(--warn);
}
</style>
