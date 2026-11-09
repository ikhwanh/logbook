<script setup lang="ts">
import type { Column } from '@/db'
import type { StageItem, StageStay, StagesResult } from '@/processors/stages'
import { formatNumber, formatShortDate } from './format'

const props = defineProps<{ result: StagesResult; columns: Record<string, Column> }>()

const SERIES = 8

// Colors follow the place's position in the column's options, so a place keeps
// its color however many places are in use.
function color(place: string) {
  const index = props.result.places.findIndex((p) => p.name === place)
  return index >= 0 && index < SERIES ? `var(--place-${index + 1})` : 'var(--muted)'
}

function days(count: number) {
  return `${count} ${count === 1 ? 'day' : 'days'}`
}

function dayRange(min: number, max: number) {
  return min === max ? days(min) : `${min}–${days(max)}`
}

function stayLabel(stay: StageStay) {
  const range = `${stay.place} → ${stay.to} ${dayRange(stay.min, stay.max)}`
  return stay.min === stay.max
    ? range
    : `${range}, avg ${formatNumber(Math.round(stay.average * 10) / 10)}`
}

function share(item: StageItem, count: number) {
  return `${Math.round((count / item.total) * 100)}%`
}

function barLabel(item: StageItem) {
  const parts = item.holdings.map((h) => `${h.place} ${formatNumber(h.count)}`)
  return `${item.label}: ${parts.join(', ')}`
}
</script>

<template>
  <div class="stages">
    <div v-if="result.problems.length" class="problems" role="alert">
      <p v-for="problem in result.problems" :key="problem.entry.id">
        {{ problem.label }} on {{ formatShortDate(problem.date) }} moves
        {{ formatNumber(problem.missing) }} more out of {{ problem.place }} than it held.
      </p>
    </div>

    <ul class="places">
      <li v-for="place in result.places" :key="place.name" class="place">
        <div class="place-head">
          <span class="swatch" :style="{ background: color(place.name) }"></span>
          <span class="place-name">{{ place.name }}</span>
          <span class="place-count">{{ formatNumber(place.count) }}</span>
        </div>
        <ul v-if="place.items.length" class="place-items">
          <li v-for="item in place.items" :key="item.label">
            <span class="item-name">{{ item.label }}</span>
            <span class="item-count">{{ formatNumber(item.count) }}</span>
            <span class="item-days">{{ dayRange(item.minDays, item.maxDays) }}</span>
          </li>
        </ul>
        <p v-else class="empty">Empty</p>
      </li>
    </ul>

    <figure class="card">
      <figcaption>
        <span class="title">{{ columns.item!.name }}</span>
        <ul class="legend">
          <li v-for="place in result.places" :key="place.name">
            <span class="swatch" :style="{ background: color(place.name) }"></span>
            {{ place.name }}
          </li>
        </ul>
      </figcaption>
      <ul class="items">
        <li v-for="item in result.items" :key="item.label">
          <div class="item-head">
            <span class="item-name">{{ item.label }}</span>
            <span class="item-meta">
              Planted {{ formatShortDate(item.planted) }} · day {{ item.age }}
            </span>
          </div>
          <div class="bar" role="img" :aria-label="barLabel(item)">
            <div
              v-for="holding in item.holdings"
              :key="holding.place"
              class="segment"
              :style="{ flexGrow: holding.count, background: color(holding.place) }"
              :title="`${holding.place}: ${formatNumber(holding.count)} (${share(item, holding.count)})`"
            ></div>
          </div>
          <p class="counts">
            <span v-for="holding in item.holdings" :key="holding.place">
              {{ holding.place }} {{ formatNumber(holding.count) }}
            </span>
          </p>
          <p v-if="item.stays.length" class="stays">
            <span v-for="stay in item.stays" :key="`${stay.place}-${stay.to}`">{{
              stayLabel(stay)
            }}</span>
          </p>
        </li>
      </ul>
    </figure>
  </div>
</template>

<style scoped>
.stages {
  --place-1: light-dark(#2a78d6, #3987e5);
  --place-2: light-dark(#eb6834, #d95926);
  --place-3: light-dark(#1baf7a, #199e70);
  --place-4: light-dark(#eda100, #c98500);
  --place-5: light-dark(#e87ba4, #d55181);
  --place-6: light-dark(#008300, #008300);
  --place-7: light-dark(#6250d6, #9085e9);
  --place-8: light-dark(#e34948, #e66767);

  display: flex;
  flex-direction: column;
  gap: 1rem;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

p {
  margin: 0;
}

.problems {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 0.875rem;
}

.places {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.75rem;
}

.place,
.card {
  min-width: 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
}

.place-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.place-name {
  flex: 1;
  font-weight: 600;
}

.place-count {
  font-size: 1.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.place-items li {
  display: grid;
  grid-template-columns: 1fr auto;
  column-gap: 0.5rem;
  font-size: 0.875rem;
}

.place-items li + li {
  margin-top: 0.375rem;
}

.item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-count {
  font-variant-numeric: tabular-nums;
}

.item-days {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 0.75rem;
}

.empty {
  color: var(--muted);
  font-size: 0.875rem;
}

.swatch {
  flex: none;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 2px;
}

.card {
  margin: 0;
  padding: 1rem;
}

figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.title {
  font-weight: 600;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  color: var(--muted);
  font-size: 0.8125rem;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.75rem;
  align-items: baseline;
  margin-bottom: 0.375rem;
}

.item-meta,
.counts,
.stays {
  color: var(--muted);
  font-size: 0.75rem;
}

.counts,
.stays {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.75rem;
  margin-top: 0.25rem;
}

.counts {
  color: var(--text);
}

.bar {
  display: flex;
  gap: 2px;
  height: 0.5rem;
}

.segment {
  flex-basis: 0;
  min-width: 2px;
  border-radius: 999px;
}
</style>
