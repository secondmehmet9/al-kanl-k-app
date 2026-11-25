import * as SQLite from 'expo-sqlite';

import type { Persistence } from './schema';
import { createSqlitePersistence } from './sqlitePersistence';

/** Native (iOS/Android): cihazdaki SQLite dosyası. Web sürümü: persistence.web.ts */
export async function openPersistence(): Promise<Persistence> {
  const db = await SQLite.openDatabaseAsync('aliskanlik.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  return createSqlitePersistence(db);
}
