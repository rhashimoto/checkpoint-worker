import * as Comlink from 'comlink';

const DB_PATH = '/my-database';

const OUTPUT_TIME_FORMAT = {
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  };

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
(async () => {
  try {
    const dbWorker = new Worker(
      'main-worker.js?path=' + encodeURIComponent(DB_PATH),
      { type: 'module' });
    const dbExec = Comlink.wrap(dbWorker);
    log(await dbExec(`SELECT 1+1`));
  } catch (e) {
    log(e?.stack ?? e?.message ?? e);
  }
})();


