<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Column } from '@/db'
import { updateCell } from '@/db/logbooks'
import type { ChecklistItem, ChecklistResult } from '@/processors/checklist'

const props = defineProps<{ result: ChecklistResult; columns: Record<string, Column> }>()

const hideDone = ref(false)
const percent = computed(() =>
  props.result.total ? Math.round((props.result.done / props.result.total) * 100) : 0,
)
const visible = computed(() =>
  hideDone.value ? props.result.items.filter((item) => !item.done) : props.result.items,
)

function toggle(item: ChecklistItem, event: Event) {
  updateCell(
    item.entry,
    props.columns.done!.id,
    (event.target as HTMLInputElement).checked || undefined,
  )
}
</script>

<template>
  <div class="checklist">
    <div class="progress card">
      <div class="summary">
        <span class="count">{{ result.done }} / {{ result.total }}</span>
        <span class="label">{{ columns.done!.name.toLowerCase() }}</span>
        <span class="percent">{{ percent }}%</span>
      </div>
      <div
        class="meter"
        role="progressbar"
        :aria-valuenow="result.done"
        aria-valuemin="0"
        :aria-valuemax="result.total"
        :aria-label="`${result.done} of ${result.total} ${columns.done!.name.toLowerCase()}`"
      >
        <div class="fill" :style="{ width: `${percent}%` }"></div>
      </div>
    </div>

    <div class="card">
      <label class="hide-done">
        <input v-model="hideDone" type="checkbox" />
        Hide {{ columns.done!.name.toLowerCase() }} items
      </label>
      <ul>
        <li v-for="item in visible" :key="item.entry.id" :class="{ done: item.done }">
          <label>
            <input type="checkbox" :checked="item.done" @change="toggle(item, $event)" />
            <span>{{ item.label }}</span>
          </label>
        </li>
      </ul>
      <p v-if="visible.length === 0" class="empty">
        {{ result.total ? 'Everything is done.' : `No rows with a ${columns.item!.name} yet.` }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.checklist {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
}

.summary {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.count {
  font-size: 1.5rem;
  font-weight: 600;
}

.label {
  color: var(--muted);
}

.percent {
  margin-left: auto;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.meter {
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--accent-soft);
}

.fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.2s ease;
}

.hide-done {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.875rem;
}

ul {
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

li + li {
  border-top: 1px solid var(--border);
}

li label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  cursor: pointer;
}

input[type='checkbox'] {
  width: 1.125rem;
  height: 1.125rem;
  margin: 0;
  accent-color: var(--accent);
}

li.done span {
  color: var(--muted);
  text-decoration: line-through;
}

.empty {
  margin: 0.75rem 0 0;
  color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  .fill {
    transition: none;
  }
}
</style>
