# checkpoint-worker
This is a proof of concept for using a Worker to manage checkpoints for OPFSWriteAheadVFS
without a SQLite database connection. It works by directly instantiating the
[`WriteAhead`](https://github.com/rhashimoto/wa-sqlite/blob/master/src/examples/WriteAhead.js)
class, which is a helper class for OPFSWriteAheadVFS.
