<script setup lang="ts">
import type { Column } from '@/db'
import { WEEKDAYS } from '@/logbook/weekdays'
import type { RoutinesResult } from '@/processors/routines'
import StatTile from './StatTile.vue'

defineProps<{ result: RoutinesResult; columns: Record<string, Column> }>()

const FULL_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
</script>

<template>
  <div class="routines">
    <div class="tiles">
      <StatTile
        label="Today"
        :value="String(result.todayCount)"
        :detail="`${result.todayCount === 1 ? 'routine' : 'routines'} on ${FULL_NAMES[result.today]}`"
      />
      <StatTile
        label="This week"
        :value="String(result.byDay.reduce((sum, day) => sum + day.length, 0))"
        :detail="`from ${result.routines.length} ${result.routines.length === 1 ? 'routine' : 'routines'}`"
      />
    </div>

    <figure class="card">
      <figcaption>
        <span class="title">Week</span>
        <span v-if="columns.description" class="subtitle">
          hover a routine for its {{ columns.description.name.toLowerCase() }}
        </span>
      </figcaption>
      <ol class="week">
        <li
          v-for="(routines, day) in result.byDay"
          :key="day"
          class="day"
          :class="{ today: day === result.today }"
          :aria-current="day === result.today ? 'date' : undefined"
        >
          <h3 class="day-name">
            <abbr :title="FULL_NAMES[day]">{{ WEEKDAYS[day] }}</abbr>
          </h3>
          <ul v-if="routines.length" class="chips">
            <li v-for="routine in routines" :key="routine.entry.id">
              <span
                class="chip"
                :class="{ described: routine.description }"
                :tabindex="routine.description ? 0 : undefined"
                :aria-describedby="
                  routine.description ? `routine-${day}-${routine.entry.id}` : undefined
                "
              >
                <time v-if="routine.time" class="at" :datetime="routine.time">
                  {{ routine.time }}
                </time>
                {{ routine.label }}
                <span
                  v-if="routine.description"
                  :id="`routine-${day}-${routine.entry.id}`"
                  role="tooltip"
                  class="tooltip"
                >
                  {{ routine.description }}
                </span>
              </span>
            </li>
          </ul>
          <p v-else class="none">—</p>
        </li>
      </ol>
    </figure>
  </div>
</template>

<style scoped>
.routines {
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

.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.day {
  min-width: 0;
  padding: 0.5rem 0.375rem;
  border-radius: 0.375rem;
}

.day.today {
  background: var(--accent-soft);
}

.day-name {
  margin: 0 0 0.5rem;
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
}

.day-name abbr {
  text-decoration: none;
}

.today .day-name {
  color: var(--accent);
}

.chips {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  position: relative;
  display: block;
  padding: 0.25rem 0.375rem;
  overflow-wrap: anywhere;
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  background: var(--surface);
  font-size: 0.8125rem;
  line-height: 1.3;
}

.at {
  display: block;
  color: var(--muted);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}

.chip.described {
  cursor: help;
  text-decoration: underline dotted var(--muted);
  text-underline-offset: 0.2em;
}

.chip.described:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* Shown on focus as well as hover so tapping a chip reveals it on touch screens. */
.tooltip {
  position: absolute;
  z-index: 10;
  top: calc(100% + 0.25rem);
  left: 0;
  width: max-content;
  max-width: 14rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--text);
  color: var(--surface);
  font-size: 0.75rem;
  line-height: 1.4;
  text-decoration: none;
  white-space: normal;
  visibility: hidden;
  pointer-events: none;
}

.chip:hover .tooltip,
.chip:focus .tooltip {
  visibility: visible;
}

.day:nth-child(n + 5) .tooltip {
  right: 0;
  left: auto;
}

.none {
  margin: 0;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 30rem) {
  .week {
    grid-template-columns: 1fr;
  }

  .day {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 0.5rem;
    align-items: start;
  }

  .day-name {
    margin: 0.25rem 0 0;
    text-align: left;
  }

  .chips {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .at {
    display: inline;
    margin-right: 0.25rem;
  }

  .none {
    margin-top: 0.25rem;
    text-align: left;
  }

  .day:nth-child(n + 5) .tooltip {
    right: auto;
    left: 0;
  }
}
</style>
