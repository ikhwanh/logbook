import { liveQuery } from 'dexie'
import { onScopeDispose, shallowRef, type Ref } from 'vue'

export function useLiveQuery<T>(querier: () => T | Promise<T>): Ref<T | undefined>
export function useLiveQuery<T>(querier: () => T | Promise<T>, initialValue: T): Ref<T>
export function useLiveQuery<T>(querier: () => T | Promise<T>, initialValue?: T) {
  const value = shallowRef<T | undefined>(initialValue)
  const subscription = liveQuery(querier).subscribe({
    next: (result) => (value.value = result),
    error: (error) => console.error('useLiveQuery failed', error),
  })
  onScopeDispose(() => subscription.unsubscribe())
  return value
}
