# checkpoint-worker
This is a proof of concept for using a Worker to manage checkpoints for OPFSWriteAheadVFS
without a SQLite database connection. It works by directly instantiating the
[`WriteAhead`](https://github.com/rhashimoto/wa-sqlite/blob/master/src/examples/WriteAhead.js)
class, which is a helper class for OPFSWriteAheadVFS.

The page can be loaded from GitHub Pages [here](https://rhashimoto.github.io/checkpoint-worker/).
It immediately runs without any user interaction and logs to the page (not to the console). The
output should look something like this:

```
16:59:56.704 Hello, world!
16:59:57.118 Worker initialized and database opened at /my-database
16:59:57.384 Transaction 0...
16:59:57.535 Checkpoint detected
16:59:57.642 Transaction 1000...
16:59:57.684 Checkpoint detected
16:59:57.784 Checkpoint detected
16:59:57.888 Transaction 2000...
16:59:57.934 Checkpoint detected
16:59:58.035 Checkpoint detected
16:59:58.130 Transaction 3000...
16:59:58.134 Checkpoint detected
16:59:58.284 Checkpoint detected
16:59:58.373 Transaction 4000...
16:59:58.385 Checkpoint detected
16:59:58.534 Checkpoint detected
16:59:58.607 Transaction 5000...
16:59:58.634 Checkpoint detected
16:59:58.735 Checkpoint detected
16:59:58.838 Transaction 6000...
16:59:58.885 Checkpoint detected
16:59:58.984 Checkpoint detected
16:59:59.070 Transaction 7000...
16:59:59.084 Checkpoint detected
16:59:59.234 Checkpoint detected
16:59:59.304 Transaction 8000...
16:59:59.335 Checkpoint detected
16:59:59.435 Checkpoint detected
16:59:59.541 Transaction 9000...
16:59:59.585 Checkpoint detected
16:59:59.684 Checkpoint detected
16:59:59.777 Done
16:59:59.786 Checkpoint detected
```

## What is it doing?
There are three scripts running in three different contexts:

* [main.js](https://github.com/rhashimoto/checkpoint-worker/blob/master/main.js) - Window context. Launches the other two scripts, sends SQL to the main worker, handles logging.
* [main-worker.js](https://github.com/rhashimoto/checkpoint-worker/blob/master/main-worker.js) - Worker context. Owns the SQLite database connection. Also polls to detect checkpoints.
* [checkpoint-worker.js](https://github.com/rhashimoto/checkpoint-worker/blob/master/checkpoint-worker.js) - Worker context. Just performs checkpoints as needed.

The main script launches the two workers, then disables autocheckpoint on the main worker with:

```sql
PRAGMA wal_autocheckpoint=0
```

Then it creates a table and performs 10,000 write transactions, which is enough to trigger a few checkpoints.

Besides proxying queries for the main script, the main worker script repeatedly checks the database file header
change counter to detect checkpoints so it can log them.

The checkpoint worker script does just enough to instantiate `WriteAhead`, which doesn't require SQLite or even
OPFSWriteAheadVFS. It only needs to create OPFS handles for the database file and its two WAL files.
