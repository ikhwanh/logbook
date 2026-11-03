<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import type { CellValue, Column } from '@/db'
import { columnTypes } from '@/logbook/columnTypes'
import { formatDays, parseDays, WEEKDAYS } from '@/logbook/weekdays'

const props = defineProps<{ column: Column; value: CellValue | undefined }>()
const emit = defineEmits<{ commit: [value: CellValue | undefined] }>()

const input = useTemplateRef('input')
const coerced = computed(() =>
  props.value === undefined ? undefined : columnTypes[props.column.type].coerce(props.value),
)
const invalid = computed(() => props.value !== undefined && coerced.value === undefined)
const title = computed(() => (invalid.value ? `Previous value: ${props.value}` : undefined))
const selectedDays = computed(() =>
  typeof coerced.value === 'string' && props.column.type === 'days'
    ? (parseDays(coerced.value) ?? [])
    : [],
)
const unknownOption = computed(() =>
  typeof coerced.value === 'string' && !props.column.options?.includes(coerced.value)
    ? coerced.value
    : undefined,
)

// Set by hand instead of with :value. Vue re-applies a bound value on every
// re-render, so a commit from another cell refreshing the table would wipe
// what the user is still typing here.
watch(
  [input, coerced, () => props.column.type],
  ([el, value]) => {
    if (el && el !== document.activeElement) el.value = value === undefined ? '' : String(value)
  },
  { immediate: true, flush: 'post' },
)

function commitInput(event: Event) {
  const el = event.target as HTMLInputElement
  if (props.column.type === 'number') {
    emit('commit', Number.isNaN(el.valueAsNumber) ? undefined : el.valueAsNumber)
  } else {
    emit('commit', el.value === '' ? undefined : el.value)
  }
}

function commitSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('commit', value === '' ? undefined : value)
}

function commitCheckbox(event: Event) {
  emit('commit', (event.target as HTMLInputElement).checked || undefined)
}

// The table moves focus by focusing a cell's root, which here is the group.
function focusFirstDay(event: FocusEvent) {
  ;(event.currentTarget as HTMLElement).querySelector('button')?.focus()
}

function toggleDay(day: number) {
  const days = selectedDays.value.includes(day)
    ? selectedDays.value.filter((d) => d !== day)
    : [...selectedDays.value, day].sort((a, b) => a - b)
  emit('commit', days.length ? formatDays(days) : undefined)
}
</script>

<template>
  <input
    v-if="column.type === 'checkbox'"
    class="cell"
    :class="{ invalid }"
    :title
    type="checkbox"
    :checked="coerced === true"
    @change="commitCheckbox"
  />
  <div
    v-else-if="column.type === 'days'"
    class="cell days"
    :class="{ invalid }"
    :title
    role="group"
    :aria-label="column.name"
    tabindex="-1"
    @focus="focusFirstDay"
  >
    <!-- Enter moves to the next row like in other cells, so it mustn't also toggle. -->
    <button
      v-for="(day, index) in WEEKDAYS"
      :key="day"
      type="button"
      class="day"
      :aria-pressed="selectedDays.includes(index)"
      :aria-label="day"
      :title="day"
      @click="toggleDay(index)"
      @keydown.enter.prevent
    >
      {{ day[0] }}
    </button>
  </div>
  <select
    v-else-if="column.type === 'select'"
    class="cell"
    :class="{ invalid }"
    :title
    :value="coerced ?? ''"
    @change="commitSelect"
  >
    <option value=""></option>
    <option v-for="option in column.options" :key="option" :value="option">{{ option }}</option>
    <option v-if="unknownOption" :value="unknownOption">{{ unknownOption }}</option>
  </select>
  <input
    v-else
    ref="input"
    class="cell"
    :class="{ invalid }"
    :title
    :type="column.type"
    :placeholder="invalid ? String(value) : undefined"
    :inputmode="column.type === 'number' ? 'decimal' : undefined"
    :step="column.type === 'number' ? 'any' : undefined"
    autocomplete="off"
    @change="commitInput"
  />
</template>

<style scoped>
.cell {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 2.5rem;
  margin: 0;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  /* 16px or larger keeps iOS Safari from zooming in when a cell is focused. */
  font: inherit;
  font-size: max(1rem, 16px);
  outline: none;
}

.cell[type='number'] {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.cell[type='checkbox'] {
  width: 1.125rem;
  height: 1.125rem;
  min-height: 0;
  margin: 0.6875rem auto;
  padding: 0;
  accent-color: var(--accent);
}

.cell.days {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0.375rem 0.5rem;
}

.day {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
}

.day[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.day:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

select.cell {
  appearance: none;
  cursor: pointer;
}

select.cell option {
  background: var(--surface);
  color: var(--text);
}

.cell.invalid {
  background: var(--warn-soft);
}

.cell.invalid::placeholder {
  color: var(--warn);
  font-style: italic;
  opacity: 1;
}
</style>
