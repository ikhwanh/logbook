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
  binding.value.ok
    ? props.processor.run(props.entries, binding.value.columns, binding.value.multi)
    : undefined,
)

function list(word: 'and' | 'or', items: string[]) {
  return items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`
}

const typeLabel = (type: ColumnType) => columnTypes[type].label
const slotTypes = (slot: Slot) =>
  list('or', [slot.type, ...(slot.alternateTypes ?? [])].map(typeLabel))

const needs = computed(() => {
  const counts = new Map<string, number>()
  for (const slot of props.processor.slots) {
    if (slot.optional || slot.multiple) continue
    const types = slotTypes(slot)
    counts.set(types, (counts.get(types) ?? 0) + 1)
  }
  const parts = [...counts].map(([types, count]) =>
    count === 1 ? `a ${types} column` : `${count} ${types} columns`,
  )
  return list('and', parts)
})
const slotColumns = computed(() => {
  const result = binding.value
  if (!result.ok) return ''
  return list(
    'and',
    props.processor.slots.flatMap((slot) => result.columns[slot.key]?.name ?? []),
  )
})

// Columns already used by a single slot are left out, since a multi slot can't share them.
function multiOptions(slot: Slot) {
  const used = binding.value.ok ? Object.values(binding.value.columns).map((c) => c.id) : []
  return candidates(slot, props.logbook).filter((column) => !used.includes(column.id))
}

function chosenNames(slot: Slot) {
  const chosen = binding.value.ok ? (binding.value.multi[slot.key] ?? []) : []
  return chosen.length ? chosen.map((column) => column.name).join(', ') : 'None'
}

function isChosen(slot: Slot, columnId: string) {
  return binding.value.ok && (binding.value.multi[slot.key] ?? []).some((c) => c.id === columnId)
}
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

async function toggle(slot: Slot, columnId: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const ids = multiOptions(slot)
    .map((column) => column.id)
    .filter((id) => (id === columnId ? checked : isChosen(slot, id)))
  // Unticking frees a column for auto-picking, which would silently move an
  // auto-picked slot onto it, so pin what the other slots show first.
  const saved = props.logbook.processors?.[props.processor.id] ?? {}
  const shown = binding.value.ok ? Object.entries(binding.value.columns) : []
  for (const [key, column] of shown) {
    if (saved[key] === undefined)
      await saveBinding(props.logbook.id, props.processor.id, key, column.id)
  }
  await saveBinding(props.logbook.id, props.processor.id, slot.key, ids)
}
</script>

<template>
  <div class="panel">
    <template v-if="binding.ok">
      <div class="slots">
        <template v-for="slot in processor.slots" :key="slot.key">
          <div v-if="slot.multiple" class="slot">
            {{ slot.label }}
            <details class="multi">
              <summary>{{ chosenNames(slot) }}</summary>
              <div class="options">
                <label v-for="column in multiOptions(slot)" :key="column.id">
                  <input
                    type="checkbox"
                    :checked="isChosen(slot, column.id)"
                    @change="toggle(slot, column.id, $event)"
                  />
                  {{ column.name }}
                </label>
                <p v-if="multiOptions(slot).length === 0" class="empty">
                  No other {{ slotTypes(slot) }} columns
                </p>
              </div>
            </details>
          </div>
          <label v-else class="slot">
            {{ slot.label }}
            <select :value="binding.columns[slot.key]?.id ?? ''" @change="choose(slot, $event)">
              <option v-if="slot.optional" value="">None</option>
              <option
                v-for="column in candidates(slot, logbook)"
                :key="column.id"
                :value="column.id"
              >
                {{ column.name }}
              </option>
            </select>
          </label>
        </template>
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

.slot {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.875rem;
}

.slot select,
.multi summary {
  padding: 0.3125rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: max(0.875rem, 16px);
}

.multi {
  position: relative;
}

.multi summary {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  list-style: none;
}

.multi summary::-webkit-details-marker {
  display: none;
}

.multi summary::after {
  content: ' ▾';
  color: var(--muted);
}

.options {
  position: absolute;
  z-index: 10;
  top: calc(100% + 0.25rem);
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--surface);
  color: var(--text);
  white-space: nowrap;
}

.options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.options .empty {
  margin: 0;
  color: var(--muted);
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
