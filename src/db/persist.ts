// Without persistence the browser may evict IndexedDB under storage pressure,
// and there is no server copy to recover from.
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
