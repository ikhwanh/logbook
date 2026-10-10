<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/db'
import { deleteLogbook, listEntries, renameLogbook } from '@/db/logbooks'
import { exportLogbooks } from '@/db/transfer'
import { downloadJson, exportFilename } from '@/logbook/download'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { findProcessor, processors } from '@/processors'
import { resolveBinding } from '@/processors/binding'
import LogbookTable from '@/components/logbook/LogbookTable.vue'
import ProcessorPanel from '@/components/processors/ProcessorPanel.vue'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()

// undefined while loading, null when the logbook doesn't exist.
const logbook = useLiveQuery(async () => (await db.logbooks.get(props.id)) ?? null)
const entries = useLiveQuery(() => listEntries(props.id), [])

const activeProcessor = computed(() => findProcessor(route.query.view))
const supported = computed(() =>
  Object.fromEntries(
    processors.map((p) => [p.id, logbook.value ? resolveBinding(p, logbook.value).ok : false]),
  ),
)

function rename(event: Event) {
  const name = (event.target as HTMLInputElement).value.trim()
  if (name) renameLogbook(props.id, name)
}

async function exportFile() {
  if (!logbook.value) return
  downloadJson(exportFilename(logbook.value.name), await exportLogbooks([props.id]))
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
      <button @click="exportFile">Export</button>
      <button class="danger" @click="remove">Delete</button>
    </div>
    <nav class="tabs" aria-label="Views">
      <RouterLink
        :to="{ query: {} }"
        :class="{ active: !activeProcessor }"
        :aria-current="activeProcessor ? undefined : 'page'"
      >
        Table
      </RouterLink>
      <RouterLink
        v-for="processor in processors"
        :key="processor.id"
        :to="{ query: { view: processor.id } }"
        :class="{ active: activeProcessor === processor, unsupported: !supported[processor.id] }"
        :aria-current="activeProcessor === processor ? 'page' : undefined"
        :title="processor.description"
      >
        {{ processor.name }}
      </RouterLink>
    </nav>
    <div v-if="activeProcessor" class="processor">
      <ProcessorPanel :processor="activeProcessor" :logbook :entries />
    </div>
    <LogbookTable v-else :logbook :entries />
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

.tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0 0.75rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  scrollbar-width: none;
}

.tabs a {
  padding: 0.625rem 0.75rem;
  border-bottom: 2px solid transparent;
  color: var(--text);
  font-size: 0.875rem;
  text-decoration: none;
  white-space: nowrap;
}

.tabs a:hover {
  color: var(--accent);
}

.tabs a.active {
  border-bottom-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.tabs a.unsupported:not(.active) {
  color: var(--muted);
}

.processor {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.missing {
  padding: 1rem;
}

.missing a {
  color: var(--accent);
}
</style>
