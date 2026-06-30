import * as Comlink from 'comlink';

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite/src/sqlite-api.js';
import { OPFSWriteAheadVFS } from 'wa-sqlite/src/examples/OPFSWriteAheadVFS.js';

const DB_PATH = new URLSearchParams(location.search).get('path');
const POLLING_INTERVAL = 50; // milliseconds

// Initialize wa-sqlite and open the database.
const dbReady = Promise.resolve().then(async () => {
  // Clear OPFS so we have a consistent starting point.
  const dirHandle = await navigator.storage.getDirectory();
  await dirHandle.remove({ recursive: true });

  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);

  const vfs = await OPFSWriteAheadVFS.create('write-ahead', module);
  sqlite3.vfs_register(vfs, true);
  const db = await sqlite3.open_v2(DB_PATH);

  return { module, sqlite3, vfs, db };
});

// Expose a function to the main thread to execute SQL queries.
Comlink.expose(async function(sql) {
  const { sqlite3, db } = await dbReady;

  const results = [];
  if (sql) {
    await sqlite3.exec(db, sql, (row, columns) => {
      if (columns !== results.at(-1)?.columns) {
        results.push({ columns, rows: [] });
      }
      results.at(-1).rows.push(row);
    });
  }
  return results;
});

// Detect checkpoints by polling the change counter in the database header.
dbReady.then(async () => {
  // Get another OPFS handle to the database file.
  let dirHandle = await navigator.storage.getDirectory();
  const pathComponents = DB_PATH.split('/').filter(Boolean);
  const fileName = pathComponents.pop();
  for (const component of pathComponents) {
    dirHandle = await dirHandle.getDirectoryHandle(component);
  }
  dirHandle = await dirHandle.getFileHandle(fileName);
  const syncHandle = await dirHandle.createSyncAccessHandle({ mode: 'readwrite-unsafe' });

  // This utility function reads the change counter from the database header.
  // Every new transaction increments the change counter on page 1, but they
  // only reach the actual database file when a checkpoint happens.
  function getChangeCounter(syncHandle) {
    const buffer = new DataView(new ArrayBuffer(4));
    const nBytes = syncHandle.read(buffer, { at: 24 });
    return nBytes > 0 ? buffer.getUint32(0, true) : null;
  }

  // Poll.
  let changeCounter = getChangeCounter(syncHandle);
  setInterval(() => {
    const newChangeCounter = getChangeCounter(syncHandle);
    if (newChangeCounter !== changeCounter) {
      log(`Checkpoint detected`);
      changeCounter = newChangeCounter;
    }
  }, POLLING_INTERVAL);
});

const logChannel = new BroadcastChannel('log');
function log(...args) {
  logChannel.postMessage(args);
}
log('Worker initialized and database opened at', DB_PATH);