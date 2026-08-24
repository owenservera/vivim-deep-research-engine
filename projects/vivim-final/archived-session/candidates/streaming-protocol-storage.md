claimed-by: lead (iteration 8, streaming-protocol)
READY FOR VALIDATION

# Candidate: StreamingProtocol — duplicate block storage + incremental path never persists

## Approach / claim
`StreamingProtocol` (src/engines/streaming-protocol.ts) has two storage defects:

1. **D1 (duplicate persistence — H5 family).** `captureChunk` persists each
   chunk's parsed blocks immediately (line 110–112: `if (store && blocks.length>0)
   storeBlocks(...)`). Then `finishConversation` re-persists the *entire* accumulated
   `blockBuffer` (line 128–130). Every block is therefore written **twice** — once per
   chunk and again as the full buffer at finish. Result: duplicate block rows in the
   store for a single streamed message.
2. **D2 (incomplete path / H2 family).** `processIncremental` with a parser that
   supplies `parseIncremental` takes the branch at lines 149–164: it emits `block`
   events but **never calls `store.storeBlocks`**, and never populates the shared
   `this.blockBuffer`. So streamed blocks via the incremental parser are never
   persisted; and a subsequent `finishConversation` reads an empty buffer and emits/
   stores zero blocks. (The `else` branch that reuses `captureChunk` *does* store — so
   the two paths diverge.)

## Why it seems promising
Executed check `repros/streaming-protocol.ts` (fake `StreamBlockStoreContract`,
`DualParser` with both `parse` + `parseIncremental`) → ALL PASS (5/5):
- D1: 2 real blocks persisted 4 times (2 per-chunk + 1 full buffer).
- D2: `processIncremental` with `parseIncremental` → 0 store calls; `finishConversation`
  after it → empty buffer, 0 blocks persisted.

## What needs to be checked next
- Whether downstream consumers dedupe on read (if so, D1 is waste/ambiguity not data
  loss; still incorrect).
- Whether `parseIncremental` is actually used in prod (if always the `else` branch, D2
  is latent).

## Confidence
High for both (executed). Severity: D1 = silent duplicate writes (data integrity);
D2 = potential silent loss of streamed blocks when incremental parser is used.
