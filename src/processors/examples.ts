import type { CellValue, Column } from '@/db'
import { addDays, localToday } from './dates'
import type { ExampleTemplate, ProcessorId } from './types'

// Seeded so the examples, and the tests that check them, are the same every run.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(next: () => number, items: T[]): T {
  return items[Math.floor(next() * items.length)]!
}

function fuelLog(today: string): ExampleTemplate {
  const next = random(1)
  const stations = ['Pertamina', 'Shell', 'BP']
  const columns: Column[] = [
    { id: 'date', name: 'Date', type: 'date' },
    { id: 'liters', name: 'Liters', type: 'number' },
    { id: 'cost', name: 'Cost', type: 'number' },
    { id: 'station', name: 'Station', type: 'select', options: stations },
  ]
  const rows: Record<string, CellValue>[] = []
  for (let daysAgo = 120; daysAgo >= 0; daysAgo -= 5 + Math.floor(next() * 5)) {
    const liters = Math.round((25 + next() * 20) * 10) / 10
    const price = 10_000 + Math.round(next() * 4) * 500
    rows.push({
      date: addDays(today, -daysAgo),
      liters,
      cost: Math.round(liters * price),
      station: pick(next, stations),
    })
  }
  return { name: 'Fuel log', processorId: 'chart', columns, rows }
}

function packingList(): ExampleTemplate {
  const categories = ['Clothes', 'Toiletries', 'Electronics', 'Documents']
  const items: [string, string, boolean][] = [
    ['Passport', 'Documents', true],
    ['Boarding pass', 'Documents', true],
    ['Travel insurance', 'Documents', false],
    ['T-shirts ×4', 'Clothes', true],
    ['Jacket', 'Clothes', false],
    ['Swimwear', 'Clothes', true],
    ['Toothbrush', 'Toiletries', false],
    ['Sunscreen', 'Toiletries', true],
    ['Phone charger', 'Electronics', true],
    ['Power bank', 'Electronics', false],
    ['Universal adapter', 'Electronics', false],
    ['Headphones', 'Electronics', true],
  ]
  return {
    name: 'Packing list',
    processorId: 'checklist',
    columns: [
      { id: 'item', name: 'Item', type: 'text' },
      { id: 'packed', name: 'Packed', type: 'checkbox' },
      { id: 'category', name: 'Category', type: 'select', options: categories },
    ],
    rows: items.map(([item, category, packed]) => ({
      item,
      category,
      ...(packed && { packed }),
    })),
  }
}

function expenses(today: string): ExampleTemplate {
  const next = random(2)
  const spending: Record<string, [string, number][]> = {
    Food: [
      ['Groceries', 250_000],
      ['Lunch', 45_000],
      ['Coffee', 30_000],
    ],
    Transport: [
      ['Fuel', 150_000],
      ['Parking', 10_000],
      ['Ride hailing', 35_000],
    ],
    Bills: [
      ['Electricity', 400_000],
      ['Internet', 350_000],
    ],
    Fun: [
      ['Movie', 60_000],
      ['Book', 120_000],
    ],
  }
  const categories = Object.keys(spending)
  const rows: Record<string, CellValue>[] = []
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const count = Math.floor(next() * 3)
    for (let i = 0; i < count; i++) {
      const category = pick(next, categories)
      const [description, base] = pick(next, spending[category]!)
      rows.push({
        date: addDays(today, -daysAgo),
        description,
        category,
        amount: Math.round((base * (0.8 + next() * 0.4)) / 1000) * 1000,
      })
    }
  }
  rows.push({ date: today, description: 'Gift', amount: 200_000 })
  return {
    name: 'Expenses',
    processorId: 'totals',
    columns: [
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'description', name: 'Description', type: 'text' },
      { id: 'category', name: 'Category', type: 'select', options: categories },
      { id: 'amount', name: 'Amount', type: 'number' },
    ],
    rows,
  }
}

function habitTracker(today: string): ExampleTemplate {
  const next = random(3)
  const notes = ['Run 5k', 'Gym', 'Yoga', 'Swim', 'Cycling']
  const rows: Record<string, CellValue>[] = []
  for (let daysAgo = 110; daysAgo >= 1; daysAgo--) {
    if (daysAgo > 6 && next() < 0.1) continue
    // The last week is always done so the example shows a live streak.
    const exercised = daysAgo <= 6 || next() < 0.7
    rows.push({
      date: addDays(today, -daysAgo),
      ...(exercised && { exercised, note: pick(next, notes) }),
    })
  }
  return {
    name: 'Habit tracker',
    processorId: 'streaks',
    columns: [
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'exercised', name: 'Exercised', type: 'checkbox' },
      { id: 'note', name: 'Note', type: 'text' },
    ],
    rows,
  }
}

export function buildExamples(today = localToday()): Record<ProcessorId, ExampleTemplate> {
  return {
    chart: fuelLog(today),
    checklist: packingList(),
    totals: expenses(today),
    streaks: habitTracker(today),
  }
}
