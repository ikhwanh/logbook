<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import type { Entry, Logbook } from '@/db'
import {
  addEntry,
  deleteColumn,
  deleteEntries,
  moveColumn,
  saveColumn,
  updateCell,
} from '@/db/logbooks'
import { columnTypes } from '@/logbook/columnTypes'
import CellInput from './CellInput.vue'
import ColumnDialog from './ColumnDialog.vue'

const props = defineProps<{ logbook: Logbook; entries: Entry[] }>()

const scroller = useTemplateRef('scroller')
const columnDialog = useTemplateRef('columnDialog')
const pendingFocus = ref<{ entryId: string; columnId: string }>()

function focusCell(entryId: string, columnId: string) {
  const cell = scroller.value?.querySelector<HTMLElement>(`[data-cell="${entryId}:${columnId}"]`)
  cell?.focus()
  return Boolean(cell)
}

// A new row only renders once the live query delivers it, which can happen
// before or after addEntry resolves, so focus is retried on both paths.
watch(
  () => props.entries,
  () => {
    if (pendingFocus.value && focusCell(pendingFocus.value.entryId, pendingFocus.value.columnId)) {
      pendingFocus.value = undefined
    }
  },
  { flush: 'post' },
)

async function addRow(columnId = props.logbook.columns[0]?.id) {
  const entryId = await addEntry(props.logbook.id)
  if (!columnId) return
  pendingFocus.value = { entryId, columnId }
  await nextTick()
  if (focusCell(entryId, columnId)) pendingFocus.value = undefined
}

const selectedIds = ref(new Set<string>())
// Filtering through entries drops ids of rows that were deleted elsewhere.
const selectedEntries = computed(() => props.entries.filter((e) => selectedIds.value.has(e.id)))
const allSelected = computed(
  () => props.entries.length > 0 && selectedEntries.value.length === props.entries.length,
)
let anchorId: string | undefined

function toggleRow(event: MouseEvent, entry: Entry) {
  const checked = (event.target as HTMLInputElement).checked
  const index = props.entries.indexOf(entry)
  const anchor = props.entries.findIndex((e) => e.id === anchorId)
  const range =
    event.shiftKey && anchor !== -1
      ? props.entries.slice(Math.min(anchor, index), Math.max(anchor, index) + 1)
      : [entry]
  for (const { id } of range) {
    if (checked) selectedIds.value.add(id)
    else selectedIds.value.delete(id)
  }
  anchorId = entry.id
}

function toggleAll(event: Event) {
  if ((event.target as HTMLInputElement).checked) {
    selectedIds.value = new Set(props.entries.map((e) => e.id))
  } else {
    selectedIds.value.clear()
  }
}

async function removeSelected() {
  const rows = selectedEntries.value
  const label = rows.length === 1 ? 'this row' : `${rows.length} rows`
  if (rows.some((e) => Object.keys(e.values).length > 0) && !confirm(`Delete ${label}?`)) return
  await deleteEntries(rows.map((e) => e.id))
  selectedIds.value.clear()
}

function onCellKeydown(event: KeyboardEvent, rowIndex: number, columnId: string) {
  if (event.key !== 'Enter' || event.isComposing) return
  const next = props.entries[rowIndex + (event.shiftKey ? -1 : 1)]
  if (next) focusCell(next.id, columnId)
  else if (!event.shiftKey) addRow(columnId)
}

// Cells save on `change`, which only fires on blur. Blurring when the app is
// backgrounded saves the cell being edited before a mobile OS can kill the page.
function flushOnHide() {
  const active = document.activeElement
  if (document.hidden && active instanceof HTMLElement && scroller.value?.contains(active)) {
    active.blur()
  }
}
document.addEventListener('visibilitychange', flushOnHide)
onBeforeUnmount(() => document.removeEventListener('visibilitychange', flushOnHide))
</script>

<template>
  <div ref="scroller" class="scroller">
    <table :class="{ selecting: selectedEntries.length > 0 }">
      <thead>
        <tr>
          <th class="gutter" scope="col">
            <label class="select-box">
              <input
                type="checkbox"
                aria-label="Select all rows"
                :checked="allSelected"
                :indeterminate="selectedEntries.length > 0 && !allSelected"
                :disabled="entries.length === 0"
                @change="toggleAll"
              />
            </label>
          </th>
          <th
            v-for="column in logbook.columns"
            :key="column.id"
            scope="col"
            :style="{
              width: columnTypes[column.type].width,
              minWidth: columnTypes[column.type].width,
            }"
          >
            <button class="column-header" @click="columnDialog?.open(column)">
              <span class="column-name">{{ column.name }}</span>
              <span class="column-type">{{ columnTypes[column.type].label }}</span>
            </button>
          </th>
          <th class="filler">
            <button
              class="add-column"
              aria-label="Add column"
              title="Add column"
              @click="columnDialog?.open()"
            >
              +
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(entry, rowIndex) in entries"
          :key="entry.id"
          :class="{ selected: selectedIds.has(entry.id) }"
        >
          <th class="gutter" scope="row">
            <span class="row-number">{{ rowIndex + 1 }}</span>
            <!-- mousedown.prevent keeps focus in the row; otherwise the checkbox hides
                 itself (it only shows on focus-within) before the tap's click lands. -->
            <label class="select-box select-row" @mousedown.prevent>
              <input
                type="checkbox"
                :aria-label="`Select row ${rowIndex + 1}`"
                :checked="selectedIds.has(entry.id)"
                @click="toggleRow($event, entry)"
              />
            </label>
          </th>
          <td v-for="column in logbook.columns" :key="column.id">
            <CellInput
              :column
              :value="entry.values[column.id]"
              :data-cell="`${entry.id}:${column.id}`"
              :aria-label="`${column.name}, row ${rowIndex + 1}`"
              @commit="(value) => updateCell(entry, column.id, value)"
              @keydown="onCellKeydown($event, rowIndex, column.id)"
            />
          </td>
          <td class="filler"></td>
        </tr>
      </tbody>
    </table>
    <button class="add-row" @click="addRow()">+ New row</button>
  </div>

  <div v-if="selectedEntries.length > 0" class="selection-bar">
    <span class="selection-count">{{ selectedEntries.length }} selected</span>
    <button @click="selectedIds.clear()">Clear</button>
    <button class="danger" @click="removeSelected">Delete</button>
  </div>

  <ColumnDialog
    ref="columnDialog"
    :columns="logbook.columns"
    @save="(column) => saveColumn(logbook.id, column)"
    @delete="(columnId) => deleteColumn(logbook.id, columnId)"
    @move="(columnId, offset) => moveColumn(logbook.id, columnId, offset)"
  />
</template>

<style scoped>
.scroller {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--surface);
  overscroll-behavior: contain;
}

table {
  /* Separate borders keep cell borders attached to sticky headers while scrolling. */
  border-collapse: separate;
  border-spacing: 0;
  min-width: 100%;
}

th,
td {
  padding: 0;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  vertical-align: middle;
}

td:focus-within {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg);
  font-weight: normal;
  text-align: left;
}

.gutter {
  position: sticky;
  left: 0;
  z-index: 1;
  width: 3rem;
  min-width: 3rem;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: normal;
  text-align: center;
}

thead .gutter {
  z-index: 3;
}

.filler {
  width: 100%;
  border-right: 0;
}

tbody .filler {
  border-bottom-color: transparent;
}

.column-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  width: 100%;
  padding: 0.375rem 0.625rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  text-align: left;
}

.column-header:hover {
  background: var(--accent-soft);
}

.column-name {
  max-width: 100%;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-type {
  color: var(--muted);
  font-size: 0.75rem;
}

.add-column {
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 1.25rem;
}

.add-column:hover {
  color: var(--accent);
}

.select-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  cursor: pointer;
}

.select-box input {
  width: 1.125rem;
  height: 1.125rem;
  margin: 0;
  accent-color: var(--accent);
  cursor: inherit;
}

.select-row {
  display: none;
}

tr:hover .select-row,
tr:focus-within .select-row,
.selecting .select-row {
  display: flex;
}

tr:hover .row-number,
tr:focus-within .row-number,
.selecting .row-number {
  display: none;
}

tbody tr:focus-within .gutter,
tbody tr.selected .gutter {
  background: var(--accent-soft);
  color: var(--accent);
}

tbody tr.selected td:not(.filler) {
  background: color-mix(in srgb, var(--accent-soft) 50%, var(--surface));
}

.selection-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.selection-count {
  flex: 1;
  color: var(--muted);
  font-size: 0.875rem;
}

.add-row {
  position: sticky;
  left: 0;
  margin: 0.5rem;
  border-color: transparent;
  background: transparent;
  color: var(--accent);
}

.add-row:hover {
  background: var(--accent-soft);
}
</style>
