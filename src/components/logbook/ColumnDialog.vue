<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import type { Column, ColumnType } from '@/db'
import { columnTypeIds, columnTypes } from '@/logbook/columnTypes'

const props = defineProps<{ columns: Column[] }>()

const emit = defineEmits<{
  save: [column: Column]
  delete: [columnId: string]
  move: [columnId: string, offset: -1 | 1]
}>()

const dialog = useTemplateRef('dialog')
const editing = ref<Column>()
const index = computed(() => props.columns.findIndex((c) => c.id === editing.value?.id))
const name = ref('')
const type = ref<ColumnType>('text')
const optionsText = ref('')

function open(column?: Column) {
  editing.value = column
  name.value = column?.name ?? ''
  type.value = column?.type ?? 'text'
  optionsText.value = column?.options?.join('\n') ?? ''
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

function save() {
  const column: Column = {
    id: editing.value?.id ?? crypto.randomUUID(),
    name: name.value.trim() || 'Untitled',
    type: type.value,
  }
  if (type.value === 'select') {
    column.options = [
      ...new Set(
        optionsText.value
          .split('\n')
          .map((option) => option.trim())
          .filter(Boolean),
      ),
    ]
  }
  emit('save', column)
  close()
}

function remove() {
  const column = editing.value
  if (!column || !confirm(`Delete column "${column.name}"?`)) return
  emit('delete', column.id)
  close()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" aria-labelledby="column-dialog-title">
    <form @submit.prevent="save">
      <h2 id="column-dialog-title">{{ editing ? 'Edit column' : 'New column' }}</h2>

      <label>
        Name
        <input v-model="name" type="text" autocomplete="off" required autofocus />
      </label>

      <label>
        Type
        <select v-model="type">
          <option v-for="id in columnTypeIds" :key="id" :value="id">
            {{ columnTypes[id].label }}
          </option>
        </select>
      </label>

      <label v-if="type === 'select'">
        Options <span class="hint">one per line</span>
        <textarea v-model="optionsText" rows="5"></textarea>
      </label>

      <div v-if="editing" class="field">
        Position
        <div class="move">
          <button type="button" :disabled="index <= 0" @click="emit('move', editing.id, -1)">
            ← Move left
          </button>
          <button
            type="button"
            :disabled="index >= columns.length - 1"
            @click="emit('move', editing.id, 1)"
          >
            Move right →
          </button>
        </div>
      </div>

      <p v-if="editing && editing.type !== type" class="hint">
        Existing values that don't fit the new type are kept and highlighted until you overwrite
        them.
      </p>

      <div class="actions">
        <button v-if="editing" type="button" class="danger" @click="remove">Delete</button>
        <span class="spacer"></span>
        <button type="button" @click="close">Cancel</button>
        <button type="submit" class="primary">Save</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
dialog {
  box-sizing: border-box;
  width: min(24rem, calc(100vw - 2rem));
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.18);
}

dialog::backdrop {
  background: rgb(0 0 0 / 0.35);
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h2 {
  margin: 0;
  font-size: 1.125rem;
}

label,
.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
}

input,
select,
textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--bg);
  color: inherit;
  font: inherit;
  font-size: max(1rem, 16px);
  font-weight: normal;
}

input:focus,
select:focus,
textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

textarea {
  resize: vertical;
}

.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: normal;
}

.actions,
.move {
  display: flex;
  gap: 0.5rem;
}

.move button {
  flex: 1;
  font-weight: normal;
}

.spacer {
  flex: 1;
}
</style>
