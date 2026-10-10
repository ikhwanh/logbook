import { chart } from './chart'
import { checklist } from './checklist'
import { streaks } from './streaks'
import { totals } from './totals'
import type { Processor, ProcessorId } from './types'

export const processors: Processor[] = [chart, checklist, totals, streaks]

export function findProcessor(id: unknown): Processor | undefined {
  return processors.find((processor) => processor.id === (id as ProcessorId))
}

export type { Processor, ProcessorId, Slot, ExampleTemplate } from './types'
