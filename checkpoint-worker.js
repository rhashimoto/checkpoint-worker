import { WriteAhead } from './.yarn/unplugged/wa-sqlite-https-cbc83456f9/node_modules/wa-sqlite/src/examples/WriteAhead.js';

// Parse the database path from the Worker URL query string.
const DB_PATH = new URLSearchParams(location.search).get('path');

(async () => {
  // Parse database file path to get directory handle and file name.
  // The path is expected to be a UNIX-style path, e.g. "/my-database"
  // or "/some/dir/my-database", with no escaped characters.
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

  // Create a WriteAhead instance. This is the component of OPFSWriteAheadVFS
  // that manages the WAL files and performs checkpoints. It will keep its
  // view of the database current by listening for broadcast messages from
  // other connections, and it will perform checkpoints when appropriate.
  const writeAhead = new WriteAhead(DB_PATH, dbHandle, walHandles, {
    // These options can be changed from the defaults if desired.
    // journalSizeLimit: 1_000,
    // backstopInterval: 30_000,
  });
})();

/**
 * Utility function to create a sync access handle for a file in a directory.
 * @param {FileSystemDirectoryHandle} dirHandle 
 * @param {string} fileName
 * @returns {Promise<FileSystemSyncAccessHandle>}
 */
async function createSyncHandle(dirHandle, fileName) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  return await fileHandle.createSyncAccessHandle({ mode: 'readwrite-unsafe' });
}