import * as Comlink from 'comlink';

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite/src/sqlite-api.js';
import { OPFSWriteAheadVFS } from 'wa-sqlite/src/examples/OPFSWriteAheadVFS.js';

const DB_PATH = new URLSearchParams(location.search).get('path');

// Initialize wa-sqlite and open the database.
const dbReady = Promise.resolve().then(async () => {
  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);

  const vfs = await OPFSWriteAheadVFS.create('write-ahead', module);
  sqlite3.vfs_register(vfs, true);
  const db = await sqlite3.open_v2(DB_PATH);

  return { module, sqlite3, vfs,db };
});

// Expose a function to the main thread to execute SQL queries.
Comlink.expose(async function(sql) {
  const { sqlite3, db } = await dbReady;

  const results = [];
  await sqlite3.exec(db, sql, (row, columns) => {
    if (columns !== results.at(-1)?.columns) {
      results.push({ columns, rows: [] });
    }
    results.at(-1).rows.push(row);
  });
  return results;
});

const logChannel = new BroadcastChannel('log');
function log(...args) {
  logChannel.postMessage(args);
}
log('Worker initialized and database opened at', DB_PATH);