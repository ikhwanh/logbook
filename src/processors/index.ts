import type { Logbook } from '@/db'
import { resolveBinding } from './binding'
import { chart } from './chart'
import { checklist } from './checklist'
import { streaks } from './streaks'
import { timeline } from './timeline'
import { totals } from './totals'
import type { Processor, ProcessorId } from './types'

export const processors: Processor[] = [chart, checklist, timeline, totals, streaks]

export function findProcessor(id: unknown): Processor | undefined {
  return processors.find((processor) => processor.id === (id as ProcessorId))
}

export function supportedViews(logbook: Logbook): ProcessorId[] {
  return processors.filter((p) => resolveBinding(p, logbook).ok).map((p) => p.id)
}

export type { Processor, ProcessorId, Slot, ExampleTemplate } from './types'
