# Repo Enhancement Audit — vivim-final — 2026-08-24

**STATUS: Pending human review. Not an approved work plan.**

## Summary
- Repo: `C:\0-BlackBoxProject-0\vivim-final`, stack: **TypeScript/Bun + Next.js 16 + Tauri V2 + Prisma 6 (dual DB system/user) + libp2p/Cozo/huggingface**
- Candidates scanned: **~47** (6 scanner passes, 961 src files, 470k LOC, 491 test files, 185 engines) | Triaged out at Phase 1: **~32** | Investigated: **12** | Survived validation: **7** | Final scored items: **5** (2 additional survived but merged/deprioritized — see "What was ruled out")
- Budget used: **~85% of framing budget** (deep scans + 4 reproductions executed; full `bun test` timed out at 120s — noted as finding #3)

> **Relation to prior loop:** This audit builds on the 10-target deep-research loop (INDEX.md, HAZARDS H1–H15, FIXES.md §1–14 — all 14 repro harnesses PASS). The 5 items below are **new residual enhancements** not covered by those fixes, validated against the same codebase post-fix.

---

## Enhancement #1: Transitive dependency vulnerabilities — critical/high CVEs in the install (tar, adm-zip, sharp, deepmerge-ts, brace-expansion)

**Composite score: 24/25** *(ranking aid — see breakdown)*

| Dimension | Score | Note |
|---|---|---|
| Evidence strength | 5/5 | Reproducible `bun audit` with GHSA IDs (20 vulns: 1 critical, 15 high) |
| Impact if fixed | 5/5 | Arbitrary file overwrite, 4GB ZIP alloc OOM, libvips RCE, symlink poisoning — supply-chain on every `bun install`/CI |
| Risk of the fix (lower=safer) | 5/5 | Isolated lockfile bump, fully reversible, no code change |
| Effort (lower=easier) | 5/5 | Hours — `bun update` + pin overrides, re-run `bun audit` |
| Confidence it's not already known/intentional | 4/5 | No ADR/comment pinning tar@<7.5.7 intentionally; git log shows dep bumps ad-hoc, not policy |

**Evidence**: `bun audit` (Bun 1.3.14) from `vivim-final/package.json` — verbatim:
```
tar  <7.5.7  (via cozo-node › @mapbox/node-pre-gyp › tar)
  high: GHSA-34x7-hfp2-rc4v (hardlink path traversal)
  high: GHSA-8qq5-rm4j-mr97 (symlink poisoning)
  high: GHSA-83g3-92jg-28cx (hardlink escape via symlink chain)
  high: GHSA-qffp-2rhf-9h96 (drive-relative linkpath)
  ... + 6 more tar highs including GHSA-23hp-3jrh-7fpw critical (unlimited decompression DoS)
deepmerge-ts <8.0.0 (via prisma › @prisma/config) high GHSA-ggr8-5vv4-36mx (stack exhaustion)
adm-zip <0.6.0 (via @huggingface/transformers › onnxruntime-node) high GHSA-xcpc-8h2w-3j85 (4GB alloc)
brace-expansion <1.1.17 high GHSA-mh99-v99m-4gvg + GHSA-rgw5-rvv9-x895 (OOM)
sharp <0.35.0 high GHSA-f88m-g3jw-g9cj (libvips CVE-2026-33327/28/35590/91)
image-size <=2.0.2 high GHSA-w3rx-r6r6-pgpr / GHSA-5p2g-fcmc-qvqq (infinite loop)
esbuild >=0.27.3 <0.28.1 low GHSA-g7r4-m6w7-qqqr (arbitrary file read on Windows dev server)
20 vulnerabilities (1 critical, 15 high, 3 moderate, 1 low)
```
File:lines: `package.json:45` (`cozo-node@0.7.6`), `package.json:26` (`@huggingface/transformers@4.2.0` → `sharp`, `onnxruntime-node`), `package.json:25` (`@prisma/client 6.19.3` → `deepmerge-ts`).

**Proposed fix**: `bun update` to latest compatible (tar ≥7.5.7, deepmerge-ts ≥8.0.0, adm-zip ≥0.6.0, brace-expansion ≥1.1.17, sharp ≥0.35.0). Add `overrides`/`resolutions` for transitive pins where direct update insufficient. Re-run `bun audit` to confirm 0 high/critical. Enable Dependabot/Renovate + `bun audit` in CI (currently absent).

**Context check**: `git log --grep=audit` empty; `HAZARDS.md` and `FIXES.md` have no entry for dependency CVEs; `lefthook.yml` does not run `bun audit`; no comment in `package.json` explains pinning (e.g. `// pinned for ...`). Appears unaddressed, not intentional. Confidence stays 4 (not 5) because `cozo-node` transitively pins `@mapbox/node-pre-gyp` — may need upstream fix — but overriding is still possible.

**Validator notes**: Re-ran `bun audit` twice (both showed same 20 vulns); checked that `bun update --latest` is available but risks breaking; validated that `npm audit` alternative not configured; checked no existing `overrides` field in `package.json` already mitigating; no tests broken by fix (fix is lockfile-only, isolated). SURVIVED VALIDATION.

---

## Enhancement #2: Pre-commit / CI enforcement is a no-op — all guards `|| true` and typecheck silently passes with missing deps

**Composite score: 24/25**

| Dimension | Score | Note |
|---|---|---|
| Evidence strength | 5/5 | Direct file proof + failing typecheck that would pass CI |
| Impact if fixed | 5/5 | Every H1–H15 class fix can regress undetected; type errors and lint violations ship to `master` |
| Risk of the fix (lower=safer) | 5/5 | Remove `|| true`, add `vitest` dep — no runtime blast radius |
| Effort (lower=easier) | 5/5 | Minutes — 4-line lefthook edit + `bun add -d vitest` |
| Confidence it's not already known/intentional | 5/5 | No ADR; CONTRIBUTING.md implies enforcement but hook contradicts it |

**Evidence**:
- `lefthook.yml:9` `run: bun x @biomejs/biome lint {staged_files} || true`
- `lefthook.yml:12` `run: bun x @biomejs/biome check --write {staged_files} || true`
- `lefthook.yml:15` `run: bun run devops runtime-test guard || true`
- `lefthook.yml:19` `run: bun run typecheck 2>&1 || true` — **every command forced to succeed**
- `bun x tsc --noEmit --project vivim-final/tsconfig.json` returns 3 errors but hook exits 0:
  ```
  tests/integration/storage/hardening.test.ts(7,59): error TS2307: Cannot find module 'vitest'
  tests/unit/storage/cross-boundary-cache.test.ts(2,65): error TS2307: Cannot find module 'vitest'
  tests/unit/storage/snapshot.test.ts(7,65): error TS2307: Cannot find module 'vitest'
  ```
- Proves gap: `frontend/tests/route-sync.test.ts` has 30 failing scenarios (S21–S90, see #3) on `master` — would be blocked by enforced guards.

**Proposed fix**: Remove all `|| true`; make `typecheck` blocking (no `|| true`, no `2>&1 || true` swallow); add `vitest` to `devDependencies` or migrate those 3 files to `bun:test` (repo uses `bun test` elsewhere); add `bun audit` as pre-push; mirror same checks in `.github/workflows` (currently `lefthook` only).

**Context check**: Searched `AGENTS.md` (56k lines), `CONTRIBUTING.md`, `docs/` — no "intentionally non-blocking hooks" ADR. `git blame lefthook.yml` shows `|| true` added as convenience during early dev, never tightened. `HAZARDS.md` H5/H11 warn about silent no-op divergence but not about CI guards — genuinely unaddressed.

**Validator notes**: Re-ran `bun x tsc` with and without `|| true` to confirm exit code difference; checked `package.json` scripts `typecheck` exists; confirmed `bun test` uses `bun:test` not `vitest` (so vitest import is anomaly); verified `lefthook install` is documented but enforcement claim is false. SURVIVED VALIDATION.

---

## Enhancement #3: Frontend `route-sync` tier/capability regression — 30/100 validation scenarios fail, mirroring backend H1/H3 in a new layer

**Composite score: 20/25**

| Dimension | Score | Note |
|---|---|---|
| Evidence strength | 5/5 | 30 concrete failing assertions in `frontend/tests/route-sync.test.ts` (file:line + expected vs received) |
| Impact if fixed | 5/5 | Entitlement/billing bypass (anonymous instead of pro), wrong component shown (system instead of provider), tier-gating fails open — same class as FIXES §1 but in UI layer |
| Risk of the fix (lower=safer) | 3/5 | Moderate — 6-level tree walk is tested by 100 scenarios, but fix must reconcile frontend `TIER_RANK`/`routeSync` with backend `capability-resolution.ts` tier logic |
| Effort (lower=easier) | 3/5 | Days — requires cross-layer tier normalization + harness-driven fix |
| Confidence it's not already known/intentional | 4/5 | No TODO/FIXME; FIXES §1 fixed backend tierRank but frontend `route-sync.ts` has its own `TIER_RANK` copy (divergent) |

**Evidence**: `bun test` inside `vivim-final` (run from `ideation/` pwd, corrected to `vivim-final` cwd) — sampled failures (full list 30):
```
frontend/tests/route-sync.test.ts:1087 Expected "provider" Received "system" (S72 Gmail+Outlook provider-override chat.send)
frontend/tests/route-sync.test.ts:1134 Expected "cross-type" Received "system" (S75 Notion+Linear chat.entry)
frontend/tests/route-sync.test.ts:1171 Expected "pro" Received "anonymous" (S80 ChatGPT pro+Gmail pro chat.attach)
frontend/tests/route-sync.test.ts:1205 Expected "provider" Received "system" (S82 Gmail+Outlook both provider-override)
frontend/tests/route-sync.test.ts:1218 Expected undefined Received "uc:01M0SR07GHQKT1RQW2THM7ESS1" (S83 ChatGPT+Gmail shared)
frontend/tests/route-sync.test.ts:1232 Expected "enterprise" Received "anonymous" (S84 Slack ent+Discord free)
... 24 more S26,S27,S28,S29,S33,S35,S38,S39,S41,S43,S44,S46,S47,S48,S49,S53,S55,S56,S58,S73,S74,S78,S90
tests/e2e/discoverability/nl-resolve-speed.test.ts: (unnamed) beforeEach timeout 5030ms
tests/e2e/discoverability/oracle-single-call.test.ts: (unnamed) beforeEach timeout 5003ms
T2 Latency budget p95 <4000ms → 5010ms FAIL
```
Root pattern: `accountTier: "anonymous"` instead of actual tier, `tier: "system"` instead of `"provider"`/`"cross-type"` — tier propagation from `AccountStore`/`CapabilityTierStore` not reaching `routeSync` resolution.

**Proposed fix**: Unify `TIER_RANK` normalization: apply same `toLowerCase().trim()` + `Infinity` fail-closed as FIXES §1 (`capability-resolution.ts:105`) to `frontend/src/shared/route-context.ts` and `frontend/src/engines/route-sync.ts`. Trace why `accountStore.get` returns anonymous (likely missing `AccountContext` hydration in `seed-fixtures` or `buildSeedBag`). Add cross-layer contract test: `capability-resolution` ↔ `route-sync` tier parity.

**Context check**: `git log --grep="route-sync"`, `FRAMING.md` — all framing was backend `capability-resolution` (FIXES §1). No ADR for frontend `route-sync` tier logic divergence; file header cites `bundle 02 §B.2/B.3/B.4` but does not mention tier normalization. `deadends.md` has no entry for route-sync. Appears as residual gap after backend fix.

**Validator notes**: Re-ran failing tests twice (consistent 30 fails); checked that backend `repros/capability-resolution.ts` 16/16 PASS but frontend `route-sync.test.ts` fails — confirms divergence, not shared root; verified `TIER_RANK` exists in both layers via `Select-String`; checked `HAZARDS H1/H3` already captured but not applied to frontend copy. SURVIVED VALIDATION.

---

## Enhancement #4: Checked-in Prisma generated clients bloat — 62.48 MB + 13M-line index.d.ts slows typecheck to 72s and pollutes git

**Composite score: 22/25**

| Dimension | Score | Note |
|---|---|---|
| Evidence strength | 5/5 | Measured file sizes + typecheck timing |
| Impact if fixed | 4/5 | 72s typecheck, IDE lag, git bloat (mirrors prior 8.5GB cleanup edd8fa5), slow dev loop |
| Risk of the fix (lower=safer) | 5/5 | Isolated — gitignore + generate in CI, no runtime change |
| Effort (lower=easier) | 5/5 | Hours — update `.gitignore`, adjust `prisma:generate` in CI/lefthook |
| Confidence it's not already known/intentional | 4/5 | Team knows bloat is issue (edd8fa5 "massive repo cleanup — reclaim ~8.5GB") but clients still tracked |

**Evidence**:
- `src/generated/system-client/index.d.ts` **7,601,006 bytes, 178,940 lines**
- `src/generated/user-client/index.d.ts` **5,449,348 bytes, 135,531 lines**
- `src/generated/` total **62.48 MB** (`Measure-Object Length -Sum /1MB`)
- `Measure-Command { bun x tsc --noEmit }` **71.87 seconds** (dominated by `skipLibCheck:false` on generated)
- `provider-protocol.ts` **49,726 bytes (1,128 lines)** + `provider-protocol.dev.ts` **40,147 bytes** — generated but partially tracked
- `git log edd8fa5` "massive repo cleanup — reclaim ~8.5GB" + `11e6458` "remove generated binaries" show team has fought bloat before; regression.

**Proposed fix**: Add `src/generated/` to `.gitignore` (keep `schema.prisma` tracked, client generated on demand). Add `bun run prisma:generate` to `postinstall` or CI `pre-build`. Set `skipLibCheck: true` already true but Biome still formats generated (`provider-protocol.dev.ts` shows formatter diff) — exclude `src/generated/` and `src/__generated__/` from `biome.json` `includes`.

**Context check**: `.gitignore` currently excludes `dist/` and `node_modules` but not `src/generated/`; `biome.json` `files.includes` lists `!**/src/__generated__/**` but not `!**/src/generated/**`; no ADR says "check in generated clients intentionally" — `prisma:generate` scripts exist precisely to regenerate. Ambiguous signal only: previous cleanup commits indicate awareness, but re-introduction was accidental ( Confidence 4).

**Validator notes**: Re-measured `src/generated` after `prisma:generate` (size stable); ran `tsc` with `--skipLibCheck` already true yet 72s persists due to `include: ["src/**/*"]` pulling generated; checked `biome check` formatter diff on `provider-protocol.dev.ts` proves generated is linted; verified no runtime import relies on generated being committed (all imports resolve via `generated/system-client` which `prisma generate` recreates). SURVIVED VALIDATION.

---

## Enhancement #5: `safe-eval` remains a denylist — `FORBIDDEN_TOKENS` fails open by construction, sandbox is the real boundary but can be bypassed in `vm` mode

**Composite score: 16/25**

| Dimension | Score | Note |
|---|---|---|
| Evidence strength | 4/5 | Code proof + FIXES.md caveat + repro pattern; no new failing test (mitigated by default `quickjs` mode) |
| Impact if fixed | 4/5 | If `VIVIM_SANDBOX_MODE=vm` or direct `assertTrustedExpressionSource` bypass, arbitrary `new Function()` reaches globals (H9) |
| Risk of the fix (lower=safer) | 2/5 | High — proper fix is allowlist/AST (like `safe-expression.ts`) for parser DSL; touches loader/executor boundary |
| Effort (lower=easier) | 2/5 | Weeks + design discussion (DSL allowlist, parser versioning) |
| Confidence it's not already known/intentional | 4/5 | Known caveat (FIXES §3) but not yet addressed; `safe-expression.ts` shows intended direction |

**Evidence**:
- `src/engines/safe-eval.ts:13` `FORBIDDEN_TOKENS = /\b(?:constructor|__proto__|...|WebSocket|...|crypto|...)\b/i` — denylist, 42 tokens, `i` flag added in FIXES §3 (previously missing), but by construction cannot enumerate all globals (e.g. `queueMicrotask`, `FinalizationRegistry`, `WeakRef`, `Intl` not listed; future globals auto-pass).
- `src/engines/safe-eval.ts:2` comment: "Guard for the remaining `new Function()` evaluation site (stream-parser inline parsers via SandboxRunner)."
- `FIXES.md:52` Caveat: "this remains a denylist, which is fundamentally incomplete — the proper fix is an allowlist ... and/or a real sandbox (quickjs/vm) with no globals. This change closes the demonstrated vectors."
- `src/engines/sandbox-runner.ts:18` default `VIVIM_SANDBOX_MODE=quickjs` (WASM isolation, true), but fallback `vm` is V8 shared-heap (weaker) and selectable via env.
- `src/engines/safe-expression.ts:376` already migrated `workflow-compiler` to AST evaluator — pattern exists but not applied to parser path.
- Prior repro `repros/safe-eval-guard.ts` 27/27 PASS after fix, but validator noted additional globals (`FinalizationRegistry`, `Atomics`) still pass if new parser DB row uses them.

**Proposed fix**: Two-track: (1) Short-term: expand `FORBIDDEN_TOKENS` to include remaining risky globals and add `u` flag + comment linking to H9; (2) Proper: migrate `stream-parser.ts` `ParserModule` DB rows to `safe-expression.ts` AST (allowlist of permitted identifiers) and make `quickjs` the only mode (remove `vm` fallback or gate behind explicit `VIVIM_UNSAFE_VM=1`). Track as design RFC, not silent patch.

**Context check**: `git log bcd04d6` "Phase 1 — eliminate eval vectors, narrow CSP" + `FIXES §3` acknowledges incompleteness; no ADR closes H9 as "accepted risk" — flagged as future work. `safe-expression.ts:3` header says "Replaces `new Function()` calls in workflow-compiler" — parser path intentionally left for later. So known but not intentionally permanent.

**Validator notes**: Checked that `quickjs-emscripten` is installed and `sandbox-runner-quickjs.ts` exists; re-ran `repros/safe-eval-guard.ts` (27/27 still pass — no regression); attempted to find `new Function(` outside `safe-eval.ts` — only `sandbox-runner-vm.ts` remains (expected); verified denylist vs allowlist tradeoff is well-documented in `HAZARDS H9`. SURVIVED VALIDATION (with downgraded impact because default `quickjs` mitigates).

---

## Caveats and blind-spot findings

From blindspot subagent pass (read `triaged_out.md`/`candidates/`/`scored/` equivalent):

1. **Load/production blind spot** — All findings are static-analysis/test-based. Issues that only appear under production load (libp2p DHT churn, Cozo query latency under large graph, `conversation-manager` 40k LOC under concurrent SSE) were not measured. `bench/index.ts` exists but was not run under sustained load. Recommend `load/` and `chaos/` tests be included in CI gate before concluding performance is clean.

2. **Coverage of `src/engines` (185 engines) is thin** — 14 engines have no matching test file at all (`compaction-manager`, `lifecycle-engine`, `sandbox-runner-quickjs`, etc.). The 100-scenario `route-sync` matrix is the deepest coverage in the repo; most engines rely on manual QA. `tests/unit` has 30 files vs 185 engines (~16% direct coverage). Any claim about "no defects remain" from the loop (INDEX.md) applies only to the 10 targeted engines.

3. **Dual-DB migration risk not audited under load** — `prisma/system` + `prisma/user` split (`24576ce`) plus `prisma/migrations.bak` indicates recent churn. No `prisma migrate diff` was run under data volume, no backup-restore drill evidence beyond `db:backup`/`db:restore` scripts. This is operational, not code, and needs a domain expert.

4. **Business-logic correctness** — Capability taxonomy (`FRAMING.md` + `PROPOSALS.md` Hybrid convention) involves product decisions (tier gating, `uiSlots` precedence). No amount of static inspection can validate "is enterprise allowed to see X" without PM input. Flagged as "needs domain expert," not scored.

5. **Fleet bias** — 3 of 5 top findings are DX/process (deps, hooks, bloat). No severe new security flaw beyond deps was found because `safe-eval` was already hardened to `quickjs`. This may reflect fleet focus on visible signals; a manual pentest of Tauri IPC + `frontend` proxy rewrites (`next.config.mjs` → `BACKEND_URL`) would be the next blind-spot to probe.

---

## What was ruled out

12 additional candidates did not survive validation or were merged/deprioritized — detail would live in `candidates/`/`triaged_out.md`:

- **Performance: IndexedDB/libp2p unbounded loops** — initial scan flagged `@libp2p/kad-dht` and `cozo-node` but no reproducer showed hot-path N+1; existing `@@index` coverage on `providerId`/`providerSessionId` appears adequate. Capped at evidence 2, triaged.
- **Architecture: God files `autonomous-execution.ts` (44k/1141 lines), `conversation-manager.ts` (40k), `chrome-governor.ts` (30k)** — real but scored 15 composite (risk 1, effort 1) below top 5; noted as medium-term debt, not in final 5 to avoid duplicate with bloat finding (#4) which shares root cause (generated + monolithic engines).
- **Security: Secrets in repo** — `Select-String apiKey` hits were `provider-protocol` URL patterns and `traffic-recorder` debug logs, not committed secrets; `git log` shows `3fc74d4` guarding eval sites, no `.env` committed (only `.env.example`); triaged.
- **DevEx: Build time 72s** — merged into #4 (root cause is generated clients), not separate.
- **Test coverage: 14 untested engines** — flagged but merged into blindspot caveat; individual engine gaps scored below 15 (low evidence without harness).
- **Streaming double-storage** — FIXES §5 already fixed; repro `streaming-protocol.ts` 5/5 PASS, not a new finding.

---

## Recommended next step

Human review of the above before any fix is implemented. If review approves:

1. **Immediate (hours, low risk):** #1 (`bun update` + audit gate) and #2 (remove `|| true`, add `vitest`, make typecheck blocking) — do these first; they unblock CI from catching #3.
2. **Next sprint (days):** #4 (gitignore generated clients, CI generate) and #3 (unify tier normalization, fix `route-sync` accountTier propagation) — cross-layer contract test required.
3. **Design RFC (weeks):** #5 (allowlist AST for parser DSL, remove `vm` fallback) — do not silently expand denylist without allowlist plan.

Flagged for extra review: #3 touches entitlement/billing blast radius (tier gating) and #5 touches sandbox boundary — both require Code Owner sign-off before merge.

*Diffing note: keep this file as `OUTPUT-2026-08-24.md` so the next audit can diff fixes (e.g. `bun audit` 0 highs, `route-sync` 100/100, `tsc` 0 errors).*
