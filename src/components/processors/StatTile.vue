<script setup lang="ts">
defineProps<{ label: string; value: string; detail?: string }>()
</script>

<template>
  <div class="tile">
    <div class="label">{{ label }}</div>
    <div class="value">{{ value }}</div>
    <div v-if="detail" class="detail">{{ detail }}</div>
  </div>
</template>

<style scoped>
.tile {
  min-width: 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
}

.label,
.detail {
  color: var(--muted);
  font-size: 0.8125rem;
}

.value {
  overflow: hidden;
  font-size: 1.5rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
