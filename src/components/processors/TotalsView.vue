<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Column } from '@/db'
import type { TotalsRangeId, TotalsResult } from '@/processors/totals'
import { formatCompact, formatNumber } from './format'
import StatTile from './StatTile.vue'

const props = defineProps<{ result: TotalsResult; columns: Record<string, Column> }>()

const selected = ref<TotalsRangeId>(props.result.ranges.length > 1 ? 'month' : 'all')
// Unbinding the date column leaves only "All time", whatever was selected.
const range = computed(
  () =>
    props.result.ranges.find((r) => r.id === selected.value) ??
    props.result.ranges[props.result.ranges.length - 1]!,
)

const cards = computed(() => {
  const { income, expense } = range.value
  const sections = income
    ? [
        { title: 'Income', section: income },
        { title: 'Expense', section: expense },
      ]
    : [{ title: props.columns.amount!.name, section: expense }]
  return sections
    .filter((card) => card.section.groups.length > 0)
    .map((card) => ({
      ...card,
      largest: Math.max(0, ...card.section.groups.map((group) => group.sum)),
    }))
})

function entries(count: number) {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`
}

function share(sum: number, largest: number) {
  return largest > 0 ? `${(Math.max(0, sum) / largest) * 100}%` : '0%'
}
</script>

<template>
  <div class="totals">
    <div v-if="result.ranges.length > 1" class="ranges">
      <button
        v-for="option in result.ranges"
        :key="option.id"
        type="button"
        :aria-pressed="option.id === range.id"
        @click="selected = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="range.income" class="tiles">
      <StatTile
        label="Income"
        :value="formatCompact(range.income.total)"
        :detail="entries(range.income.count)"
      />
      <StatTile
        label="Expense"
        :value="formatCompact(range.expense.total)"
        :detail="entries(range.expense.count)"
      />
      <StatTile label="Net" :value="formatCompact(range.income.total - range.expense.total)" />
    </div>
    <div v-else class="tiles">
      <StatTile
        :label="`Total ${columns.amount!.name.toLowerCase()}`"
        :value="formatCompact(range.expense.total)"
        :detail="entries(range.expense.count)"
      />
      <StatTile
        :label="columns.category!.name"
        :value="String(range.expense.groups.filter((g) => !g.uncategorized).length)"
        detail="with entries"
      />
    </div>

    <p v-if="cards.length === 0" class="empty">No entries {{ range.label.toLowerCase() }}.</p>

    <figure v-for="card in cards" :key="card.title" class="card">
      <figcaption>
        <span class="title">{{ card.title }}</span>
        <span class="subtitle">by {{ columns.category!.name.toLowerCase() }}</span>
      </figcaption>
      <ul>
        <li
          v-for="group in card.section.groups"
          :key="group.name"
          :class="{ other: group.uncategorized }"
        >
          <div class="name">{{ group.name }}</div>
          <div class="track">
            <div class="bar" :style="{ width: share(group.sum, card.largest) }"></div>
          </div>
          <div class="sum">{{ formatNumber(group.sum) }}</div>
          <div class="detail">
            {{ entries(group.count) }} · avg
            {{ formatNumber(Math.round(group.average)) }}
          </div>
        </li>
      </ul>
    </figure>
  </div>
</template>

<style scoped>
.totals {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ranges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.ranges button {
  padding: 0.3125rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.ranges button[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.card {
  margin: 0;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
}

.empty {
  margin: 0;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--muted);
}

figcaption {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.title {
  font-weight: 600;
}

.subtitle {
  color: var(--muted);
  font-size: 0.8125rem;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: grid;
  grid-template-columns: minmax(5rem, 9rem) 1fr auto;
  grid-template-areas:
    'name track sum'
    '. detail detail';
  column-gap: 0.75rem;
  align-items: center;
}

.name {
  grid-area: name;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track {
  grid-area: track;
}

.bar {
  height: 1.25rem;
  min-width: 2px;
  border-radius: 0 4px 4px 0;
  background: var(--accent);
}

.other .bar {
  background: var(--muted);
}

.other .name {
  color: var(--muted);
}

.sum {
  grid-area: sum;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-align: right;
}

.detail {
  grid-area: detail;
  color: var(--muted);
  font-size: 0.75rem;
}

@media (max-width: 30rem) {
  li {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'name sum'
      'track track'
      'detail detail';
    row-gap: 0.25rem;
  }
}
</style>
