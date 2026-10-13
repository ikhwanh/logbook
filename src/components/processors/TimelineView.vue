<script setup lang="ts">
import { computed } from 'vue'
import type { Column } from '@/db'
import type {
  TimelineItem,
  TimelineMark,
  TimelineResult,
  TimelineRoutine,
} from '@/processors/timeline'
import { formatShortDate } from './format'
import StatTile from './StatTile.vue'

const props = defineProps<{ result: TimelineResult; columns: Record<string, Column> }>()

// A number column counts days after the start, so its name ("Days") can't stand in for the end.
const endName = computed(() =>
  props.columns.end!.type === 'date' ? props.columns.end!.name.toLowerCase() : 'end',
)
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

function due(routine: TimelineRoutine) {
  return routine.dueIn === 0 ? 'Today' : `In ${days(routine.dueIn)}`
}

const percent = (item: TimelineItem) => Math.round(item.fraction * 100)

function markLabel(mark: TimelineMark) {
  const value = typeof mark.value === 'string' ? formatShortDate(mark.value) : `day ${mark.value}`
  return `${mark.column.name}: ${value}`
}

function trackLabel(item: TimelineItem) {
  const marks = item.marks.map(markLabel)
  return [`${item.label}: ${percent(item)}% of time elapsed`, ...marks].join(', ')
}
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
            :class="{ marked: item.marks.length > 0 }"
            role="progressbar"
            :aria-valuenow="percent(item)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="trackLabel(item)"
          >
            <div class="fill" :style="{ width: `${item.fraction * 100}%` }"></div>
            <div
              v-for="mark in item.marks"
              :key="mark.column.id"
              class="tick"
              :style="{ left: `${mark.at * 100}%` }"
              :title="markLabel(mark)"
            ></div>
            <!-- Shifting by its own position keeps a label at either end inside the track. -->
            <span
              v-for="mark in item.marks"
              :key="`label-${mark.column.id}`"
              class="mark-label"
              :style="{ left: `${mark.at * 100}%`, transform: `translateX(-${mark.at * 100}%)` }"
              aria-hidden="true"
            >
              {{ mark.column.name }}
            </span>
          </div>
          <div class="status">{{ status(item) }}</div>
          <div class="range">{{ range(item) }}</div>
        </li>
      </ul>
    </figure>

    <figure v-if="result.hasRoutines" class="card">
      <figcaption>
        <span class="title">Routines</span>
        <span class="subtitle">next dates until {{ endName }}</span>
      </figcaption>
      <ul v-if="result.routines.length" class="routines">
        <li
          v-for="routine in result.routines"
          :key="`${routine.item.entry.id}-${routine.column.id}-${routine.date}`"
        >
          <div class="date">{{ formatShortDate(routine.date) }}</div>
          <div class="name">
            {{ routine.item.label }} · {{ routine.column.name }}
            <span class="every">every {{ days(routine.every) }}</span>
          </div>
          <div class="status">{{ due(routine) }}</div>
        </li>
      </ul>
      <p v-else class="empty">No routines coming up</p>
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
  position: relative;
  grid-area: track;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--accent-soft);
}

.fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.tick {
  position: absolute;
  top: -0.25rem;
  bottom: -0.25rem;
  width: 2px;
  border-radius: 1px;
  background: var(--text);
  transform: translateX(-50%);
}

/* Widens the hover target so the title shows without pixel-hunting a 2px line. */
.tick::before {
  content: '';
  position: absolute;
  inset: 0 -0.25rem;
}

.mark-label {
  position: absolute;
  bottom: calc(100% + 0.375rem);
  color: var(--muted);
  font-size: 0.6875rem;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
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

/* Routine rows reuse the item row's area names so .name and .status place themselves. */
.routines li {
  grid-template-columns: 4rem 1fr auto;
  grid-template-areas: 'date name status';
}

.date {
  grid-area: date;
  font-variant-numeric: tabular-nums;
}

.every {
  color: var(--muted);
  font-size: 0.8125rem;
}

.empty {
  margin: 0;
  color: var(--muted);
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

  .track.marked {
    margin-top: 1rem;
  }
}
</style>
