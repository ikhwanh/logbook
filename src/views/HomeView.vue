<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createLogbook, createLogbookFromTemplate, listLogbooks } from '@/db/logbooks'
import { processors, type Processor } from '@/processors'
import { buildExamples } from '@/processors/examples'
import { useLiveQuery } from '@/composables/useLiveQuery'

const router = useRouter()
const logbooks = useLiveQuery(listLogbooks, [])
const name = ref('')
const examples = buildExamples()

const updatedFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

async function createExample(processor: Processor) {
  const id = await createLogbookFromTemplate(examples[processor.id])
  router.push({ name: 'logbook', params: { id }, query: { view: processor.id } })
}

async function create() {
  const id = await createLogbook(name.value.trim() || 'Untitled logbook')
  name.value = ''
  router.push({ name: 'logbook', params: { id } })
}
</script>

<template>
  <main class="home">
    <form class="create" @submit.prevent="create">
      <input
        v-model="name"
        type="text"
        placeholder="New logbook name"
        aria-label="New logbook name"
      />
      <button type="submit" class="primary">Create</button>
    </form>

    <ul v-if="logbooks.length" class="list">
      <li v-for="logbook in logbooks" :key="logbook.id">
        <RouterLink :to="{ name: 'logbook', params: { id: logbook.id } }">
          <span class="name">{{ logbook.name }}</span>
          <span class="meta">
            {{ logbook.columns.length }} columns · updated
            {{ updatedFormat.format(logbook.updatedAt) }}
          </span>
        </RouterLink>
      </li>
    </ul>
    <p v-else class="empty">No logbooks yet. Create one to start logging.</p>

    <section class="examples">
      <h2>Start from an example</h2>
      <div class="cards">
        <button
          v-for="processor in processors"
          :key="processor.id"
          type="button"
          class="card"
          @click="createExample(processor)"
        >
          <span class="name">{{ examples[processor.id].name }}</span>
          <span class="meta">{{ processor.name }} · {{ processor.description }}</span>
        </button>
      </div>
    </section>

    <p class="note">All data is stored on this device. Nothing is sent to a server.</p>
  </main>
</template>

<style scoped>
.home {
  box-sizing: border-box;
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: 1rem;
}

.create {
  display: flex;
  gap: 0.5rem;
}

.create input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--surface);
  color: inherit;
  font: inherit;
  font-size: max(1rem, 16px);
}

.create input:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.list {
  margin: 1rem 0 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  list-style: none;
}

.list li + li {
  border-top: 1px solid var(--border);
}

.list a {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.75rem 1rem;
  color: inherit;
  text-decoration: none;
}

.list a:hover {
  background: var(--accent-soft);
}

.name {
  font-weight: 600;
}

.meta,
.empty,
.note {
  color: var(--muted);
  font-size: 0.875rem;
}

.examples {
  margin-top: 2rem;
}

.examples h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 0.75rem;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.875rem 1rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  text-align: left;
}

.card:hover {
  background: var(--accent-soft);
}

.note {
  margin-top: 2rem;
}
</style>
