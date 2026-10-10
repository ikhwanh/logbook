<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Column } from '@/db'
import { localToday } from '@/processors/dates'
import type { StreakDay, StreaksResult } from '@/processors/streaks'
import { formatLongDate } from './format'
import StatTile from './StatTile.vue'

const props = defineProps<{ result: StreaksResult; columns: Record<string, Column> }>()

const today = localToday()
const hovered = ref<StreakDay>()
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' })

// A label goes on the first week of each month, unless the previous label is
// too close, which happens when the calendar starts in a month's last week.
const monthLabels = computed(() => {
  let lastLabeled = -Infinity
  return props.result.weeks.map((week, i) => {
    const month = week[week.length - 1]!.date.slice(0, 7)
    const previous = props.result.weeks[i - 1]?.[week.length - 1]!.date.slice(0, 7)
    if (month === previous || i - lastLabeled < 3) return ''
    lastLabeled = i
    return monthFormat.format(Date.parse(`${month}-01T00:00:00Z`))
  })
})

const doneName = computed(() => props.columns.done!.name.toLowerCase())
const days = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`
</script>

<template>
  <div class="streaks">
    <div class="tiles">
      <StatTile
        label="Current streak"
        :value="days(result.current)"
        :detail="result.current ? 'keep it going' : 'log today to start one'"
      />
      <StatTile label="Longest streak" :value="days(result.longest)" />
      <StatTile :label="`Days ${doneName}`" :value="String(result.doneDays)" detail="all time" />
    </div>

    <figure class="card">
      <figcaption>
        <span class="title">{{ columns.done!.name }}</span>
        <span class="subtitle">last {{ result.weeks.length }} weeks</span>
      </figcaption>

      <div class="scroll">
        <div
          class="heatmap"
          role="img"
          :aria-label="`Calendar of days ${doneName}. Current streak ${days(result.current)}, longest ${days(result.longest)}.`"
          :style="{ '--weeks': result.weeks.length }"
          @pointerleave="hovered = undefined"
        >
          <span
            v-for="(label, i) in monthLabels"
            :key="`m${i}`"
            class="month"
            :style="{ gridColumn: i + 2 }"
          >
            {{ label }}
          </span>
          <span class="weekday" style="grid-row: 2">Mon</span>
          <span class="weekday" style="grid-row: 4">Wed</span>
          <span class="weekday" style="grid-row: 6">Fri</span>
          <template v-for="(week, w) in result.weeks" :key="w">
            <span
              v-for="(day, d) in week"
              :key="day.date"
              class="cell"
              :class="{ done: day.done, future: day.future, today: day.date === today }"
              :style="{ gridColumn: w + 2, gridRow: d + 2 }"
              @pointerenter="hovered = day"
              @pointerdown="hovered = day"
            ></span>
          </template>
        </div>
      </div>

      <div class="footer">
        <p class="readout" aria-live="polite">
          <template v-if="hovered">
            <strong>{{ hovered.done ? 'Done' : hovered.future ? 'Upcoming' : 'Not done' }}</strong>
            · {{ formatLongDate(hovered.date) }}
          </template>
          <template v-else>Hover or tap a day</template>
        </p>
        <div class="legend">
          <span class="key"></span> Not done <span class="key done"></span> Done
        </div>
      </div>
    </figure>
  </div>
</template>

<style scoped>
.streaks {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
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

.scroll {
  overflow-x: auto;
}

.heatmap {
  display: grid;
  grid-template-columns: 2rem repeat(var(--weeks), 0.875rem);
  grid-template-rows: 1rem repeat(7, 0.875rem);
  gap: 2px;
  width: max-content;
  font-size: 0.6875rem;
}

.month,
.weekday {
  color: var(--muted);
  white-space: nowrap;
}

.month {
  grid-row: 1;
}

.weekday {
  grid-column: 1;
  line-height: 0.875rem;
}

.cell {
  border-radius: 3px;
  background: var(--accent-soft);
}

.cell.done {
  background: var(--accent);
}

.cell.future {
  background: transparent;
}

.cell.today {
  outline: 2px solid var(--text);
  outline-offset: -1px;
}

.cell:hover {
  outline: 2px solid var(--muted);
  outline-offset: -1px;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  font-size: 0.8125rem;
}

.readout {
  margin: 0;
  color: var(--muted);
}

.readout strong {
  color: var(--text);
}

.legend {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--muted);
}

.key {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 3px;
  background: var(--accent-soft);
}

.key.done {
  margin-left: 0.5rem;
  background: var(--accent);
}
</style>
