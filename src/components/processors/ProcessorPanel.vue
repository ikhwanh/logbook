<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { ColumnType, Entry, Logbook } from '@/db'
import { saveBinding } from '@/db/logbooks'
import { columnTypes } from '@/logbook/columnTypes'
import { candidates, resolveBinding } from '@/processors/binding'
import type { Processor, ProcessorId, Slot } from '@/processors'
import ChecklistView from './ChecklistView.vue'
import LineChart from './LineChart.vue'
import StreaksView from './StreaksView.vue'
import TimelineView from './TimelineView.vue'
import TotalsView from './TotalsView.vue'

const props = defineProps<{ processor: Processor; logbook: Logbook; entries: Entry[] }>()

const views: Record<ProcessorId, Component> = {
  chart: LineChart,
  checklist: ChecklistView,
  timeline: TimelineView,
  totals: TotalsView,
  streaks: StreaksView,
}

const binding = computed(() => resolveBinding(props.processor, props.logbook))
const result = computed(() =>
  binding.value.ok ? props.processor.run(props.entries, binding.value.columns) : undefined,
)

function list(word: 'and' | 'or', items: string[]) {
  return items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`
}

const typeLabel = (type: ColumnType) => columnTypes[type].label

const needs = computed(() => {
  const counts = new Map<ColumnType, number>()
  for (const slot of props.processor.slots) counts.set(slot.type, (counts.get(slot.type) ?? 0) + 1)
  const parts = [...counts].map(([type, count]) =>
    count === 1 ? `a ${typeLabel(type)} column` : `${count} ${typeLabel(type)} columns`,
  )
  return list('and', parts)
})
const slotColumns = computed(() => {
  const result = binding.value
  if (!result.ok) return ''
  return list(
    'and',
    props.processor.slots.map((slot) => result.columns[slot.key]!.name),
  )
})
// When a processor needs two columns of a type and the logbook has one, saying
// it has "no" column of that type would be wrong.
const shortfall = computed(() => {
  if (binding.value.ok) return ''
  const types = [...new Set(binding.value.missing.map((slot) => slot.type))]
  const present = types.filter((type) => props.logbook.columns.some((c) => c.type === type))
  const absent = types.filter((type) => !present.includes(type))
  const parts = []
  if (absent.length) parts.push(`has no ${list('or', absent.map(typeLabel))} column`)
  if (present.length) parts.push(`needs another ${list('or', present.map(typeLabel))} column`)
  return list('and', parts)
})

function choose(slot: Slot, event: Event) {
  const columnId = (event.target as HTMLSelectElement).value
  saveBinding(props.logbook.id, props.processor.id, slot.key, columnId)
}
</script>

<template>
  <div class="panel">
    <template v-if="binding.ok">
      <div class="slots">
        <label v-for="slot in processor.slots" :key="slot.key">
          {{ slot.label }}
          <select :value="binding.columns[slot.key]!.id" @change="choose(slot, $event)">
            <option v-for="column in candidates(slot, logbook)" :key="column.id" :value="column.id">
              {{ column.name }}
            </option>
          </select>
        </label>
      </div>

      <p v-if="result === undefined || processor.isEmpty(result)" class="notice">
        Nothing to show yet. Fill in {{ slotColumns }} on a few rows from the Table tab.
      </p>
      <component :is="views[processor.id]" v-else :result :columns="binding.columns" />
    </template>

    <div v-else class="notice">
      <p>
        <strong>{{ processor.name }}</strong> needs {{ needs }}.
      </p>
      <p>
        This logbook {{ shortfall }}. Add one from the <strong>+</strong> at the end of the table
        header.
      </p>
      <RouterLink :to="{ query: {} }">Go to table</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.panel {
  box-sizing: border-box;
  width: 100%;
  max-width: 56rem;
  margin: 0 auto;
  padding: 1rem;
}

.slots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-bottom: 1rem;
}

.slots label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.875rem;
}

.slots select {
  padding: 0.3125rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(0.875rem, 16px);
}

.notice {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
}

.notice p {
  margin: 0 0 0.5rem;
}

.notice a {
  color: var(--accent);
}
</style>
