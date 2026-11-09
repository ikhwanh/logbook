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

function projects(today: string): ExampleTemplate {
  // [name, start, due] in days from today, so the example always has a mix of
  // ended, active and upcoming rows.
  const items: [string, number, number][] = [
    ['Passport renewal', -60, -21],
    ['Kitchen renovation', -45, -4],
    ['Spanish course', -30, 60],
    ['Tax return', -12, 5],
    ['Website redesign', -3, 25],
    ['Garden shed', 4, 18],
    ['Marathon training', 10, 120],
  ]
  return {
    name: 'Projects',
    processorId: 'timeline',
    columns: [
      { id: 'project', name: 'Project', type: 'text' },
      { id: 'start', name: 'Start', type: 'date' },
      { id: 'due', name: 'Due', type: 'date' },
    ],
    rows: items.map(([project, start, due]) => ({
      project,
      start: addDays(today, start),
      due: addDays(today, due),
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
  const categories = [...Object.keys(spending), 'Salary', 'Freelance']
  const rows: Record<string, CellValue>[] = []
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const count = Math.floor(next() * 3)
    for (let i = 0; i < count; i++) {
      const category = pick(next, Object.keys(spending))
      const [description, base] = pick(next, spending[category]!)
      rows.push({
        date: addDays(today, -daysAgo),
        description,
        category,
        type: 'Expense',
        amount: Math.round((base * (0.8 + next() * 0.4)) / 1000) * 1000,
      })
    }
  }
  rows.push({ date: today, description: 'Gift', type: 'Expense', amount: 200_000 })
  const thisMonth = `${today.slice(0, 7)}-01`
  for (const date of [`${addDays(thisMonth, -1).slice(0, 7)}-01`, thisMonth]) {
    rows.push({
      date,
      description: 'Salary',
      category: 'Salary',
      type: 'Income',
      amount: 6_500_000,
    })
  }
  rows.push({
    date: addDays(today, -20),
    description: 'Logo design',
    category: 'Freelance',
    type: 'Income',
    amount: 1_500_000,
  })
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  return {
    name: 'Expenses',
    processorId: 'totals',
    columns: [
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'description', name: 'Description', type: 'text' },
      { id: 'category', name: 'Category', type: 'select', options: categories },
      { id: 'type', name: 'Type', type: 'select', options: ['Expense', 'Income'] },
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

function weeklyRoutines(): ExampleTemplate {
  const items: [string, string, string, string][] = [
    ['Gym', 'Mon,Wed,Fri', '18:00', 'Strength on Mon and Fri, cardio on Wed'],
    ['Read', 'Tue,Thu,Sun', '21:30', '30 minutes before bed'],
    ['Water plants', 'Mon,Thu', '07:00', 'Balcony and kitchen'],
    ['Groceries', 'Sat', '07:30', 'Market opens at 7'],
    ['Meal prep', 'Sun', '16:00', 'Lunches for Mon–Wed'],
    ['Call parents', 'Sun', '', ''],
    ['Laundry', 'Wed,Sat', '09:00', 'Whites on Wed, towels on Sat'],
    ['Stretch', 'Mon,Tue,Wed,Thu,Fri', '06:30', '10 minutes after waking up'],
  ]
  return {
    name: 'Weekly routines',
    processorId: 'routines',
    columns: [
      { id: 'name', name: 'Name', type: 'text' },
      { id: 'days', name: 'Days', type: 'days' },
      { id: 'time', name: 'Time', type: 'time' },
      { id: 'description', name: 'Description', type: 'text' },
    ],
    rows: items.map(([name, days, time, description]) => ({
      name,
      days,
      ...(time && { time }),
      ...(description && { description }),
    })),
  }
}

function garden(today: string): ExampleTemplate {
  const places = ['Sprout', 'Vegetative', 'Generative', 'Harvested', 'Failed']
  // [plant, days from today, count, place, from]
  const moves: [string, number, number, string, string][] = [
    ['Tomato', -95, 3, 'Sprout', ''],
    ['Tomato', -88, 3, 'Vegetative', 'Sprout'],
    ['Tomato', -60, 3, 'Generative', 'Vegetative'],
    ['Shallot A', -40, 10, 'Sprout', ''],
    ['Shallot A', -33, 6, 'Vegetative', 'Sprout'],
    ['Shallot A', -26, 3, 'Vegetative', 'Sprout'],
    ['Shallot A', -26, 1, 'Failed', 'Sprout'],
    ['Chili', -20, 4, 'Sprout', ''],
    ['Chili', -12, 4, 'Vegetative', 'Sprout'],
    ['Tomato', -10, 2, 'Harvested', 'Generative'],
    ['Shallot A', -5, 6, 'Generative', 'Vegetative'],
    ['Shallot B', -3, 12, 'Sprout', ''],
    ['Tomato', -2, 1, 'Harvested', 'Generative'],
  ]
  return {
    name: 'Garden',
    processorId: 'stages',
    columns: [
      { id: 'plant', name: 'Plant', type: 'text' },
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'count', name: 'Count', type: 'number' },
      { id: 'place', name: 'Place', type: 'select', options: places },
      { id: 'from', name: 'From', type: 'select', options: places },
    ],
    rows: moves.map(([plant, days, count, place, from]) => ({
      plant,
      date: addDays(today, days),
      count,
      place,
      ...(from && { from }),
    })),
  }
}

export function buildExamples(today = localToday()): Record<ProcessorId, ExampleTemplate> {
  return {
    chart: fuelLog(today),
    checklist: packingList(),
    timeline: projects(today),
    totals: expenses(today),
    streaks: habitTracker(today),
    routines: weeklyRoutines(),
    stages: garden(today),
  }
}
