import { storage } from '@/_helpers/browser-api'
import { getWords, saveWords, Word, getSyncMeta, setSyncMeta, deleteSyncMeta } from '@/background/database'
import { MsgType } from '@/typings/message'

import { concat } from 'rxjs/observable/concat'
import { fromPromise } from 'rxjs/observable/fromPromise'
import { map } from 'rxjs/operators/map'

export interface NotebookFile {
  timestamp: number
  words: Word[]
}

export interface DlResponse {
  json: NotebookFile
  etag: string
}

/**
 * Check server and create a Saladict Directory if not exist.
 */
export interface InitServer<C> {
  (config: C): Promise<{ error?: string }>
}

/**
 * Upload files to server.
 */
export interface Upload<C> {
  (config: C, text: string): Promise<boolean>
}

/**
 * Download files from server and filter out unchanged
 */
export interface DlChanged<C, M = { [k: string]: any }> {
  (config: C, meta: M, force?: boolean): Promise<DlResponse | undefined>
}

export async function setSyncConfig<T = any> (serviceID: string, config: T): Promise<void> {
  let { syncConfig } = await storage.sync.get('syncConfig')
  if (!syncConfig) { syncConfig = {} }
  syncConfig[serviceID] = config
  await storage.sync.set({ syncConfig })
}

export async function getSyncConfig<T> (serviceID: string): Promise<T | undefined> {
  const { syncConfig } = await storage.sync.get('syncConfig')
  if (syncConfig) {
    return syncConfig[serviceID]
  }
}

export function removeSyncConfig (): Promise<void> {
  return storage.sync.remove('syncConfig')
}

/** Get a sync config and listen changes */
export function createSyncConfigStream () {
  return concat(
    fromPromise(storage.sync.get('syncConfig')).pipe(map(o => o.syncConfig)),
    storage.sync.createStream('syncConfig').pipe(map(change => change.newValue)),
  )
}

export async function setMeta<T = any> (serviceID: string, meta: T): Promise<void> {
  await setSyncMeta(serviceID, JSON.stringify(meta))
}

export async function getMeta<T> (serviceID: string): Promise<T | undefined> {
  const text = await getSyncMeta(serviceID)
  if (text) {
    return JSON.parse(text)
  }
}

export async function deleteMeta (serviceID): Promise<void> {
  await deleteSyncMeta(serviceID)
}

export async function setNotebook (words: Word[]): Promise<void> {
  await saveWords({ area: 'notebook', words })
}

export async function getNotebook (): Promise<Word[]> {
  return (await getWords({ type: MsgType.GetWords, area: 'notebook' })).words || []
}
