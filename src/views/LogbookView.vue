<script setup lang="ts">
import { useRouter } from 'vue-router'
import { db } from '@/db'
import { deleteLogbook, listEntries, renameLogbook } from '@/db/logbooks'
import { useLiveQuery } from '@/composables/useLiveQuery'
import LogbookTable from '@/components/logbook/LogbookTable.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()

// undefined while loading, null when the logbook doesn't exist.
const logbook = useLiveQuery(async () => (await db.logbooks.get(props.id)) ?? null)
const entries = useLiveQuery(() => listEntries(props.id), [])

function rename(event: Event) {
  const name = (event.target as HTMLInputElement).value.trim()
  if (name) renameLogbook(props.id, name)
}

async function remove() {
  if (!logbook.value || !confirm(`Delete "${logbook.value.name}" and all its rows?`)) return
  await deleteLogbook(props.id)
  router.push({ name: 'home' })
}
</script>

<template>
  <main v-if="logbook" class="logbook">
    <div class="toolbar">
      <RouterLink :to="{ name: 'home' }" class="back" aria-label="All logbooks">←</RouterLink>
      <input
        class="name"
        :value="logbook.name"
        aria-label="Logbook name"
        autocomplete="off"
        @change="rename"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
      <span class="count">{{ entries.length }} {{ entries.length === 1 ? 'row' : 'rows' }}</span>
      <button class="danger" @click="remove">Delete</button>
    </div>
    <LogbookTable :logbook :entries />
  </main>
  <main v-else-if="logbook === null" class="missing">
    <p>This logbook doesn't exist.</p>
    <RouterLink :to="{ name: 'home' }">Back to all logbooks</RouterLink>
  </main>
</template>

<style scoped>
.logbook {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
}

.back {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  color: var(--muted);
  font-size: 1.125rem;
  text-decoration: none;
}

.back:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.name {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 1.125rem;
  font-weight: 600;
}

.name:hover {
  border-color: var(--border);
}

.name:focus {
  border-color: var(--accent);
  outline: none;
}

.count {
  color: var(--muted);
  font-size: 0.8125rem;
  white-space: nowrap;
}

.missing {
  padding: 1rem;
}

.missing a {
  color: var(--accent);
}
</style>
