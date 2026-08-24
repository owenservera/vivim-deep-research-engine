# Verified write-up: StreamParserEngine streaming-contract footgun

**Status: SURVIVED VALIDATION only. Not yet independently human-expert reviewed.**

## Precise claim (refined by validator)
VIVIM's `StreamParserEngine` (`vivim-final/src/engines/stream-parser.ts`) is a
**whole-body** parser: `parse(rawBody)` consumes the full string and returns the
final `ContentBlock[]`; there is no incremental state. Its real contract —
"caller accumulates bytes, then parses once at completion" — is **implicit and
unenforced**. The public API (`detectCompletion` + `parse`) invites the natural
per-chunk loop, and `detectCompletion()` **defaults to `true`** in several
seed/inline parsers (`_repro2_stream_parser.ts`), which guarantees that loop
emits partial/duplicated content. The defect is a **latent footgun**, not
guaranteed incorrectness: with a correctly-implemented `detectCompletion` the
hazard does not occur.

## Key idea (plain)
A stream parser's job isn't only "parse the complete blob" — it's also "tell the
caller when the blob is complete, and never hand back partial data as if it were
final." The engine delegates the second half entirely to each provider parser,
with a `true` default that is wrong for streaming. So the obvious way to use it
streamingly is unsafe.

## What was checked (executed, bun, real engine)
- **T1 determinism (control): PASS** — `parse(R)` identical across 100 random
  partitions (0 mismatches). Accumulate-then-parse is correct.
- **T2 premature-commitment hazard: REPRODUCED (6 prefixes)** — with the
  `detectCompletion()=>true` parser, a prefix judged "complete" emitted partial
  text that the final parse contradicted (e.g. prefix `data: {"de` → emitted
  `data: {"de`; final is the full SSE). A consumer in the per-chunk loop would
  emit wrong content.
- **T3 selection flip: NOT reproduced** on a single-wire-format corpus — so it is
  explicitly **not** claimed.

## Recommended hardened contract (what "fixed" looks like)
1. Engine refuses to emit confident non-error blocks unless completion is
   confirmed by the parser **or** the caller passes an explicit `isFinal` flag.
2. `detectCompletion()===true` on a prefix that never saw a real completion
   sentinel is treated as "incomplete — don't commit."
3. Parser selection is locked at the first non-empty chunk (removes any
   per-call selection-flip risk).

## What remains uncertain
- Whether any **production-shipped** VIVIM parser uses the `true` default (the
  repro file suggests seed/inline parsers do — confirm against the live
  `provider_parser` rows).
- Selection-flip was not reproduced; re-test on a multi-wire-format provider
  (e.g. gemini batchexecute vs SSE) before ruling it out.
- **Side signal (conditional):** the quickjs `SandboxRunner` aborted
  (`list_empty(&rt->gc_obj_list)`) when the engine was instantiated per-request
  (~200×); with a reused singleton it did not. Only a defect if VIVIM creates an
  engine per request. Reproduce against the real instantiation pattern.

## Recommendation
Have a human expert review before treating as established. This write-up has not
had independent human-expert review. The T2 evidence is reproducible via
`vivim-final/_fuzz_parser.ts`.
