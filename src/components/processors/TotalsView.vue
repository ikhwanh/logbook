<script setup lang="ts">
import { computed } from 'vue'
import type { Column } from '@/db'
import type { TotalsResult } from '@/processors/totals'
import { formatCompact, formatNumber } from './format'
import StatTile from './StatTile.vue'

const props = defineProps<{ result: TotalsResult; columns: Record<string, Column> }>()

const largest = computed(() => Math.max(0, ...props.result.groups.map((group) => group.sum)))

function share(sum: number) {
  return largest.value > 0 ? `${(Math.max(0, sum) / largest.value) * 100}%` : '0%'
}
</script>

<template>
  <div class="totals">
    <div class="tiles">
      <StatTile
        :label="`Total ${columns.amount!.name.toLowerCase()}`"
        :value="formatCompact(result.total)"
        :detail="`${result.count} ${result.count === 1 ? 'entry' : 'entries'}`"
      />
      <StatTile
        :label="columns.category!.name"
        :value="String(result.groups.filter((g) => !g.uncategorized).length)"
        detail="with entries"
      />
    </div>

    <figure class="card">
      <figcaption>
        <span class="title">{{ columns.amount!.name }}</span>
        <span class="subtitle">by {{ columns.category!.name.toLowerCase() }}</span>
      </figcaption>
      <ul>
        <li
          v-for="group in result.groups"
          :key="group.name"
          :class="{ other: group.uncategorized }"
        >
          <div class="name">{{ group.name }}</div>
          <div class="track">
            <div class="bar" :style="{ width: share(group.sum) }"></div>
          </div>
          <div class="sum">{{ formatNumber(group.sum) }}</div>
          <div class="detail">
            {{ group.count }} {{ group.count === 1 ? 'entry' : 'entries' }} · avg
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
