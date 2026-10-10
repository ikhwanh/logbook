<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import type { Column } from '@/db'
import type { ChartResult } from '@/processors/chart'
import { toDayNumber } from '@/processors/dates'
import { formatCompact, formatLongDate, formatNumber, formatShortDate, niceTicks } from './format'
import StatTile from './StatTile.vue'

const props = defineProps<{ result: ChartResult; columns: Record<string, Column> }>()

const HEIGHT = 260
const TOP = 24
const BOTTOM = 28
const RIGHT = 16
const MAX_DOTS = 60

const container = useTemplateRef('container')
const width = ref(640)
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = entry.contentRect.width
  })
  if (container.value) observer.observe(container.value)
})
onBeforeUnmount(() => observer?.disconnect())

const ticks = computed(() => niceTicks(props.result.min, props.result.max))
const left = computed(() => Math.max(...ticks.value.map((t) => formatNumber(t).length)) * 7 + 14)

const coords = computed(() => {
  const points = props.result.points
  const yMin = ticks.value[0]!
  const yMax = ticks.value[ticks.value.length - 1]!
  const dayMin = toDayNumber(points[0]?.date ?? '1970-01-01')
  const dayMax = toDayNumber(points[points.length - 1]?.date ?? '1970-01-01')
  const x0 = left.value
  const x1 = width.value - RIGHT
  return points.map((point) => ({
    ...point,
    x:
      dayMax === dayMin
        ? (x0 + x1) / 2
        : x0 + ((toDayNumber(point.date) - dayMin) / (dayMax - dayMin)) * (x1 - x0),
    y: HEIGHT - BOTTOM - ((point.value - yMin) / (yMax - yMin)) * (HEIGHT - BOTTOM - TOP),
  }))
})

function yOf(value: number) {
  const yMin = ticks.value[0]!
  const yMax = ticks.value[ticks.value.length - 1]!
  return HEIGHT - BOTTOM - ((value - yMin) / (yMax - yMin)) * (HEIGHT - BOTTOM - TOP)
}

const linePath = computed(() => 'M' + coords.value.map((c) => `${c.x},${c.y}`).join('L'))
const areaPath = computed(() => {
  const first = coords.value[0]
  const last = coords.value[coords.value.length - 1]
  if (!first || !last) return ''
  return `${linePath.value}L${last.x},${HEIGHT - BOTTOM}L${first.x},${HEIGHT - BOTTOM}Z`
})
const lastPoint = computed(() => coords.value[coords.value.length - 1])

const active = ref<number>()
const activePoint = computed(() =>
  active.value === undefined ? undefined : coords.value[active.value],
)

function onPointerMove(event: PointerEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const x = event.clientX - svg.getBoundingClientRect().left
  let nearest = 0
  coords.value.forEach((c, i) => {
    if (Math.abs(c.x - x) < Math.abs(coords.value[nearest]!.x - x)) nearest = i
  })
  active.value = nearest
}

function onKeydown(event: KeyboardEvent) {
  const last = coords.value.length - 1
  const current = active.value ?? last
  const next = {
    ArrowLeft: Math.max(0, current - 1),
    ArrowRight: Math.min(last, current + 1),
    Home: 0,
    End: last,
  }[event.key]
  if (next === undefined) return
  event.preventDefault()
  active.value = next
}

const tooltipLeft = computed(() => {
  const x = activePoint.value?.x ?? 0
  return `${Math.min(Math.max(x, 70), width.value - 70)}px`
})
</script>

<template>
  <div class="chart-view">
    <div class="tiles">
      <StatTile label="Total" :value="formatCompact(result.total)" />
      <StatTile label="Average" :value="formatCompact(result.average)" />
      <StatTile label="Lowest" :value="formatCompact(result.min)" />
      <StatTile label="Highest" :value="formatCompact(result.max)" />
    </div>

    <figure class="card">
      <figcaption>
        <span class="title">{{ columns.value!.name }}</span>
        <span class="subtitle">
          by {{ columns.date!.name.toLowerCase() }} · {{ result.points.length }} days
        </span>
      </figcaption>

      <div ref="container" class="plot">
        <svg
          :width
          :height="HEIGHT"
          :viewBox="`0 0 ${width} ${HEIGHT}`"
          role="img"
          tabindex="0"
          :aria-label="`${columns.value!.name} over time. Use arrow keys to read values.`"
          @pointermove="onPointerMove"
          @pointerleave="active = undefined"
          @focus="active = coords.length - 1"
          @blur="active = undefined"
          @keydown="onKeydown"
        >
          <g class="grid">
            <g v-for="tick in ticks" :key="tick">
              <line :x1="left" :x2="width - RIGHT" :y1="yOf(tick)" :y2="yOf(tick)" />
              <text :x="left - 8" :y="yOf(tick)" text-anchor="end" dominant-baseline="middle">
                {{ formatNumber(tick) }}
              </text>
            </g>
          </g>

          <g class="x-axis">
            <text v-if="coords[0]" :x="coords[0].x" :y="HEIGHT - 8" text-anchor="start">
              {{ formatShortDate(coords[0].date) }}
            </text>
            <text
              v-if="lastPoint && coords.length > 1"
              :x="lastPoint.x"
              :y="HEIGHT - 8"
              text-anchor="end"
            >
              {{ formatShortDate(lastPoint.date) }}
            </text>
          </g>

          <path class="area" :d="areaPath" />
          <path class="line" :d="linePath" />

          <g v-if="coords.length <= MAX_DOTS">
            <circle v-for="c in coords" :key="c.date" class="dot" :cx="c.x" :cy="c.y" r="4" />
          </g>

          <text
            v-if="lastPoint && active === undefined"
            class="end-label"
            :x="lastPoint.x"
            :y="lastPoint.y - 12"
            text-anchor="end"
          >
            {{ formatNumber(lastPoint.value) }}
          </text>

          <g v-if="activePoint">
            <line
              class="crosshair"
              :x1="activePoint.x"
              :x2="activePoint.x"
              :y1="TOP"
              :y2="HEIGHT - BOTTOM"
            />
            <circle class="dot active" :cx="activePoint.x" :cy="activePoint.y" r="5" />
          </g>
        </svg>

        <div
          v-if="activePoint"
          class="tooltip"
          :style="{ left: tooltipLeft, top: `${activePoint.y}px` }"
          aria-live="polite"
        >
          <strong>{{ formatNumber(activePoint.value) }}</strong>
          <span>{{ formatLongDate(activePoint.date) }}</span>
        </div>
      </div>
    </figure>
  </div>
</template>

<style scoped>
.chart-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
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
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.title {
  font-weight: 600;
}

.subtitle {
  color: var(--muted);
  font-size: 0.8125rem;
}

.plot {
  position: relative;
}

svg {
  display: block;
  overflow: visible;
  touch-action: pan-y;
}

svg:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 0.25rem;
}

svg text {
  fill: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.grid line {
  stroke: var(--border);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.area {
  fill: var(--accent);
  opacity: 0.1;
}

.line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.dot {
  fill: var(--accent);
  stroke: var(--surface);
  stroke-width: 2;
}

.end-label {
  fill: var(--text);
  font-weight: 600;
}

.crosshair {
  stroke: var(--muted);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.tooltip {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--surface);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.12);
  font-size: 0.8125rem;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 12px));
}

.tooltip strong {
  font-size: 0.9375rem;
}

.tooltip span {
  color: var(--muted);
}
</style>
