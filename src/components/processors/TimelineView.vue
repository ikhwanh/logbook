<script setup lang="ts">
import { computed } from 'vue'
import type { Column } from '@/db'
import type { TimelineItem, TimelineResult } from '@/processors/timeline'
import { formatShortDate } from './format'
import StatTile from './StatTile.vue'

const props = defineProps<{ result: TimelineResult; columns: Record<string, Column> }>()

const endName = computed(() => props.columns.end!.name.toLowerCase())
const next = computed(() =>
  props.result.items
    .filter((item) => item.status === 'active')
    .reduce<TimelineItem | undefined>(
      (soonest, item) => (!soonest || item.endsIn < soonest.endsIn ? item : soonest),
      undefined,
    ),
)

function days(count: number) {
  return `${count} ${count === 1 ? 'day' : 'days'}`
}

function status(item: TimelineItem) {
  if (item.status === 'upcoming') return `Starts in ${days(item.startsIn)}`
  if (item.status === 'ended') return `Ended ${formatShortDate(item.end)}`
  return item.endsIn === 0 ? 'Last day' : `${days(item.endsIn)} left`
}

function range(item: TimelineItem) {
  const start = formatShortDate(item.start)
  return item.start === item.end ? start : `${start} – ${formatShortDate(item.end)}`
}

const percent = (item: TimelineItem) => Math.round(item.fraction * 100)
</script>

<template>
  <div class="timeline">
    <div class="tiles">
      <StatTile
        label="Active"
        :value="String(result.active)"
        :detail="`${result.upcoming} upcoming · ${result.ended} ended`"
      />
      <StatTile
        :label="`Next ${endName}`"
        :value="next ? (next.endsIn === 0 ? 'Today' : `In ${days(next.endsIn)}`) : '—'"
        :detail="next ? next.label : 'Nothing active'"
      />
    </div>

    <figure class="card">
      <figcaption>
        <span class="title">{{ columns.item!.name }}</span>
        <span class="subtitle">
          {{ columns.start!.name.toLowerCase() }} to {{ endName }}, by time elapsed
        </span>
      </figcaption>
      <ul>
        <li v-for="item in result.items" :key="item.entry.id" :class="item.status">
          <div class="name">{{ item.label }}</div>
          <div
            class="track"
            role="progressbar"
            :aria-valuenow="percent(item)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`${item.label}: ${percent(item)}% of time elapsed`"
          >
            <div class="fill" :style="{ width: `${item.fraction * 100}%` }"></div>
          </div>
          <div class="status">{{ status(item) }}</div>
          <div class="range">{{ range(item) }}</div>
        </li>
      </ul>
    </figure>
  </div>
</template>

<style scoped>
.timeline {
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
  grid-template-columns: minmax(5rem, 12rem) 1fr 8.5rem;
  grid-template-areas:
    'name track status'
    'range . .';
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
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--accent-soft);
}

.fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.status {
  grid-area: status;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.range {
  grid-area: range;
  color: var(--muted);
  font-size: 0.75rem;
}

.ended .name,
.ended .status,
.upcoming .status {
  color: var(--muted);
}

.ended .fill {
  background: var(--muted);
}

@media (max-width: 30rem) {
  li {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'name status'
      'track track'
      'range range';
    row-gap: 0.25rem;
  }
}
</style>
