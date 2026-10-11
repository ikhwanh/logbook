<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/db'
import { addView, deleteLogbook, listEntries, removeView, renameLogbook } from '@/db/logbooks'
import { exportLogbooks } from '@/db/transfer'
import { downloadJson, exportFilename } from '@/logbook/download'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { findProcessor, processors, type Processor } from '@/processors'
import { resolveBinding } from '@/processors/binding'
import LogbookTable from '@/components/logbook/LogbookTable.vue'
import ProcessorPanel from '@/components/processors/ProcessorPanel.vue'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()

// undefined while loading, null when the logbook doesn't exist.
const logbook = useLiveQuery(async () => (await db.logbooks.get(props.id)) ?? null)
const entries = useLiveQuery(() => listEntries(props.id), [])
const addMenu = ref<HTMLDetailsElement>()

const views = computed(() => (logbook.value?.views ?? []).flatMap((id) => findProcessor(id) ?? []))
const addable = computed(() => processors.filter((p) => !views.value.includes(p)))

// A view that isn't added falls back to the table so stale links still land somewhere useful.
const activeProcessor = computed(() => {
  const processor = findProcessor(route.query.view)
  return processor && views.value.includes(processor) ? processor : undefined
})
const supported = computed(() =>
  Object.fromEntries(
    processors.map((p) => [p.id, logbook.value ? resolveBinding(p, logbook.value).ok : false]),
  ),
)

async function add(processor: Processor) {
  if (addMenu.value) addMenu.value.open = false
  await addView(props.id, processor.id)
  router.push({ query: { view: processor.id } })
}

async function removeActive(processor: Processor) {
  await removeView(props.id, processor.id)
  router.push({ query: {} })
}

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
    <div class="tabbar">
      <nav class="tabs" aria-label="Views">
        <RouterLink
          :to="{ query: {} }"
          :class="{ active: !activeProcessor }"
          :aria-current="activeProcessor ? undefined : 'page'"
        >
          Table
        </RouterLink>
        <template v-for="processor in views" :key="processor.id">
          <RouterLink
            :to="{ query: { view: processor.id } }"
            :class="{
              active: activeProcessor === processor,
              unsupported: !supported[processor.id],
            }"
            :aria-current="activeProcessor === processor ? 'page' : undefined"
            :title="processor.description"
          >
            {{ processor.name }}
          </RouterLink>
          <button
            v-if="activeProcessor === processor"
            type="button"
            class="remove"
            :aria-label="`Remove ${processor.name} view`"
            :title="`Remove ${processor.name} view`"
            @click="removeActive(processor)"
          >
            ×
          </button>
        </template>
      </nav>
      <details v-if="addable.length" ref="addMenu" class="add">
        <summary aria-label="Add view" title="Add view">+</summary>
        <div class="menu">
          <button
            v-for="processor in addable"
            :key="processor.id"
            type="button"
            :class="{ unsupported: !supported[processor.id] }"
            @click="add(processor)"
          >
            <span class="option-name">{{ processor.name }}</span>
            <span class="option-meta">{{ processor.description }}</span>
          </button>
        </div>
      </details>
    </div>
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

.tabbar {
  display: flex;
  align-items: center;
  padding-right: 0.5rem;
  border-bottom: 1px solid var(--border);
}

/* The add menu sits outside the scrolling tabs so its dropdown isn't clipped. */
.tabs {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  padding: 0 0.75rem;
  overflow-x: auto;
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

.remove,
.add summary {
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.remove {
  margin-left: -0.5rem;
  padding: 0.25rem 0.375rem;
}

.remove:hover,
.add summary:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.add {
  position: relative;
}

.add summary {
  padding: 0.375rem 0.625rem;
  font-size: 1.125rem;
  list-style: none;
}

.add summary::-webkit-details-marker {
  display: none;
}

.menu {
  position: absolute;
  z-index: 10;
  top: calc(100% + 0.25rem);
  right: 0;
  display: flex;
  flex-direction: column;
  width: max-content;
  max-width: min(20rem, calc(100vw - 2rem));
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
}

.menu button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.menu button:hover {
  background: var(--accent-soft);
}

.option-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.option-meta,
.menu .unsupported .option-name {
  color: var(--muted);
  font-size: 0.8125rem;
}

.menu .unsupported .option-name {
  font-size: 0.875rem;
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
