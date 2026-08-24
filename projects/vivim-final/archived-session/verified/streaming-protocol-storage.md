# Verified: streaming-protocol — duplicate block storage + incremental path never persists

- target: `C:/0-BlackBoxProject-0/vivim-final/src/engines/streaming-protocol.ts`
- defects:
  - D1: `captureChunk` stores each chunk's blocks, then `finishConversation` re-stores
    the whole `blockBuffer` -> every block persisted twice (duplicate rows).
  - D2: `processIncremental` with `parseIncremental` emits block events but never calls
    `store.storeBlocks`, and leaves `this.blockBuffer` empty -> streamed blocks not
    persisted; subsequent `finishConversation` emits/stores zero blocks.
- harness: `repros/streaming-protocol.ts`
- command: `bun run repros/streaming-protocol.ts`
- result: ALL PASS (5/5)
- hazards: H15 (two code paths that should produce equivalent side effects diverge —
  one persists / one does not; or store-then-store-again duplicates), H5 (paired
  write duplication)

## What the check proved
1. 2 real blocks persisted 4 times (2 per-chunk + 1 full buffer).
2. `parseIncremental` path -> 0 store calls; finish after it -> 0 blocks.

## Suggested fixes
- Store once: prefer storing only at finish (or only per-chunk), not both.
- In `parseIncremental` branch, persist blocks (and populate `this.blockBuffer`).
