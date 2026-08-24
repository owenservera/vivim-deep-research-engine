validated-by: lead (iteration 8, streaming-protocol)
VERIFIED

# Validation: StreamingProtocol — duplicate block storage + incremental path never persists

## Check type
Executed reproduction against the real `StreamingProtocol` imported from
`C:/0-BlackBoxProject-0/vivim-final/src/engines/streaming-protocol.ts`, using a
fake `StreamBlockStoreContract` (records storeBlocks calls) and a `DualParser`
implementing both `parse` and async `parseIncremental`.
File: `repros/streaming-protocol.ts`.

## How to run
```
cd C:\0-BlackBoxProject-0\ideation\project
bun run repros/streaming-protocol.ts
```

## Result
ALL PASS (exit 0), 5/5:
- D1: 2 real blocks persisted 4 times (2 per-chunk calls + 1 full-buffer call).
- D2: `processIncremental` with `parseIncremental` → 0 `storeBlocks` calls; after it,
  `finishConversation` returns 0 blocks and persists 0.

## Verdict
Confirmed. (1) Blocks are stored twice (per-chunk + full buffer at finish). (2) The
`parseIncremental` branch of `processIncremental` emits events but never persists, and
leaves the shared buffer empty so `finishConversation` stores nothing.

Suggested fixes:
- In `finishConversation`, only store blocks not already stored (or skip the per-chunk
  store in `captureChunk` and store once at finish). Remove the double-write.
- In `processIncremental`'s `parseIncremental` branch, persist blocks to `store` and/or
  append them to `this.blockBuffer` so `finishConversation` sees them.
