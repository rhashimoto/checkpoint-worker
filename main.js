import * as Comlink from 'comlink';

const DB_PATH = '/my-database';

const OUTPUT_TIME_FORMAT = {
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  };

(async () => {
  try {
    // Set up database connection in a Worker.
    const dbWorker = new Worker(
      'main-worker.js?path=' + encodeURIComponent(DB_PATH),
      { type: 'module' });
    const dbExec = Comlink.wrap(dbWorker);

    // Turn off auto checkpoint.
    // await dbExec(`PRAGMA wal_auto_checkpoint=0`);

    // Create a table.
    await dbExec(`CREATE TABLE IF NOT EXISTS t (key INTEGER PRIMARY KEY, value)`);

    // Submit a lot of write transactions.
    for (let i = 0; i < 10000; i++) {
      if (i % 1000 === 0) {
        log(`Transaction ${i}...`);
      }
      await dbExec(`INSERT OR REPLACE INTO t VALUES (${i % 1000}, '${Math.random().toString(16)}')`);
    }
    log('Done');
  } catch (e) {
    log(e?.stack ?? e?.message ?? e);
  }
})();

function log(...args) {
  const timeString = new Date().toLocaleTimeString([], OUTPUT_TIME_FORMAT);
  const message = args.map(a => {
    return typeof a === 'string' ? a : JSON.stringify(a);
  }).join(' ');
  output.textContent += timeString + ' ' + message + '\n';
}

new BroadcastChannel('log').addEventListener('message', (event) => {
  log(...(Array.isArray(event.data) ? event.data : [event.data]));
});

log('Hello, world!');
