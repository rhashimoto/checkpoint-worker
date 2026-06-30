import { WriteAhead } from 'wa-sqlite/src/examples/WriteAhead.js';

const DB_PATH = new URLSearchParams(location.search).get('path');

(async () => {
  // Parse database path to get directory handle and file name.
  let dirHandle = await navigator.storage.getDirectory();
  const pathComponents = DB_PATH.split('/').filter(Boolean);
  const fileName = pathComponents.pop();
  for (const component of pathComponents) {
    dirHandle = await dirHandle.getDirectoryHandle(component, { create: true });
  }

  // Create sync access handles for the database file and its WAL files.
  const dbHandle = await createSyncHandle(dirHandle, fileName);
  const walHandles = await Promise.all([
    createSyncHandle(dirHandle, fileName + '-wa0'),
    createSyncHandle(dirHandle, fileName + '-wa1'),
  ]);

  // Create the WriteAhead instance.
  const writeAhead = new WriteAhead(DB_PATH, dbHandle, walHandles, {
    // backstopInterval: 30_000,
    // journalSizeLimit: 1_000
  });
})();

async function createSyncHandle(dirHandle, fileName) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  return await fileHandle.createSyncAccessHandle({ mode: 'readwrite-unsafe' });
}