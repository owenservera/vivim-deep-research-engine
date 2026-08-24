# VIVIM Deep-Research Engine — 10x Upgrade Proposal (v2.0.0)

**Status:** Design proposal. Not merged. Pending human review.
**Scope:** `owenservera/vivim-deep-research-engine` as of the current `main` branch.
**Companion code:** `orchestrator/engine.ts`, `orchestrator/fleet.ts`, `orchestrator/cli.ts`, `orchestrator/engine.test.ts` (all included, all passing — see §7).

---

## 0. What I actually found

I cloned the repo and read every file, not just the READMEs. Here's the honest shape of it:

- **It's a prompt-orchestration protocol, not a program.** `framework/core/agents/*.md` are six well-written role prompts (generator, extender, validator, literature, synthesizer, blindspot). `framework.json` declares ratios and budget numbers. `docs/05-usage-guide.md` describes a "manual mode" where a human or agent *remembers* to follow the process by hand.
- **The only executable code in the entire repo is two files:** `framework/scripts/check_budget.sh` and `check_budget.ps1` — a combined ~20 lines that compare two numbers and print a string. `bun run scripts/research-loop.ts` is referenced in the usage guide but **that file does not exist anywhere in the repository.**
- **The project's own config documents its own control failure.** `framework.json` currently reads:
  ```json
  "budget": {
    "total_budget_percent": 120,
    "budget_spent_percent": 124,
    "note": "Over budget by 4% — finished last queued target at user request."
  }
  ```
  That's not a hypothetical edge case I'm inventing to justify a rewrite — that's the one documented production run of this system, and it already went over its own limit. The "control" was a script nobody was forced to run before spending more budget.
- **Every hard invariant in `DESIGN.md` is prose, not code.** "No proposal without verification criterion." "Evidence chain is unbroken." "A candidate cannot reach `verified/` without a passing repro." These are excellent rules. Nothing checks them. An agent under time pressure (or just imperfectly following a long prompt) can violate every one of them and nothing in the repo will notice.
- **There are zero tests.** Not "thin coverage" — zero. `git grep -i test` outside `.opencode/` config turns up nothing.

None of this is a criticism of the writing — `DESIGN.md`, the agent prompts, and the hazard/evidence philosophy are genuinely good research-engineering thinking. The gap is that **the thinking never became a mechanism.** It's a constitution with no courts.

That's where 10x lives: not in writing smarter prompts, but in making the existing good rules *self-enforcing*.

---

## 1. The core thesis

> **v1 asks agents to remember the rules. v2 makes it impossible to break them.**

Every upgrade below is in service of one move: take an invariant currently expressed as a sentence in a markdown file, and turn it into a function that throws an exception when violated. I picked this over "add more agent roles" or "write fancier prompts" because the repo's own evidence (the 124/120 overrun) shows the actual failure mode is **control**, not **intelligence**. The agents were smart enough to do good research. Nothing stopped them from doing too much of it.

---

## 2. The ten upgrades

### 2.1 A real state machine (was: prose phase descriptions)

`DESIGN.md` describes phases 0–4 (framing → generation → validation → synthesis → output) as a narrative. Nothing enforces the order, and nothing enforces exit criteria — a synthesizer could theoretically write to `04-verified/` on day one with zero candidates behind it.

**Now:** `orchestrator/engine.ts` — `ResearchEngine.advancePhase()` enforces:
- `generation → validation` requires at least one candidate with a non-empty verification criterion.
- `validation → synthesis` requires at least one candidate with `status === "validated"` (i.e., has a passing repro).
- `synthesis → output` requires at least one candidate with `status === "verified"`.

Try to skip a step and you get a `PrematurePhaseTransitionError` with the specific missing condition, not a silent no-op.

### 2.2 Budget as a hard stop, not a printed warning (was: `check_budget.sh`)

The old script:
```bash
if (( $(echo "$SPENT > 100" | bc -l) )); then
  echo "WARNING: Budget exceeded ($SPENT% > $BUDGET%)."
else
  echo "Budget OK: $SPENT% / $BUDGET%"
fi
```
This requires `bc` (not installed by default on many minimal containers), requires someone to *call it*, requires someone to *read stdout*, and even then only prints a string — it cannot stop the next agent call.

**Now:** `engine.spendBudget()` is called *by the fleet dispatcher itself*, atomically with every agent invocation. If a spend would cross `hard_stop_percent`, the call throws `BudgetExceededError` **and locks the session** (`state.locked = true`). Every subsequent write — `proposeCandidate`, `recordRepro`, `registerHazard`, `advancePhase` — checks `assertUnlocked()` first and throws `SessionLockedError`. The only way out is `engine.unlockWithSignoff(humanId, reason)`, which is logged into the budget ledger as a permanent, timestamped, attributed entry.

I reproduced the repo's own 124/120 incident as a test (`engine.test.ts`, "this is the exact v1 failure the engine now prevents") and confirmed v2 refuses the spend that would have caused it. This isn't a hypothetical improvement — it's a fix for a bug the project already hit once in the only run it's documented.

### 2.3 Verification-criterion enforcement at write time (was: a sentence in `generator.md`)

`generator.md` says: *"No proposal without verification criterion."* In v1 this is a request. An agent that forgets, or a human pasting in a quick idea, produces a candidate with no criterion and nothing stops it from flowing downstream.

**Now:** `engine.proposeCandidate()` throws `MissingVerificationCriterionError` if `verificationCriterion` is empty. This is a two-line check, but it's the difference between a rule and a convention.

### 2.4 Deadend collision detection (was: "check `session/deadends.md` before re-attempting," honor system)

Agents are told to read `deadends.md` before proposing. Nothing checks that they did.

**Now:** `proposeCandidate()` runs the new approach against `state.deadends` with substring matching before accepting it, and rejects a re-proposed known dead end with a `PrematurePhaseTransitionError` naming the matching deadend. (This is intentionally a cheap heuristic, not semantic dedup — see §5 Known Limitations for the honest gap and the upgrade path via the literature agent.)

### 2.5 The verified-fix gate (was: nothing — this was the single largest hole)

Nothing in v1 stops a synthesizer from writing a "verified" fix for a candidate that was never actually run through a validator. The evidence-chain rule in `DESIGN.md` ("every verified write-up must link back to... the repro harness") is aspirational documentation.

**Now:** `engine.promoteToVerified(candidateId)` walks the repro table, and only succeeds if it finds at least one `ReproResult` for that candidate with `passed: true`. Otherwise: `PrematurePhaseTransitionError`. A candidate literally cannot become "verified" in the engine's state without a passing, on-record repro. This one change closes the biggest gap between what `DESIGN.md` claims and what v1 actually guaranteed.

### 2.6 Structured, queryable hazard memory (was: append-to-markdown-and-hope)

`project/HAZARDS.md` in v1 is a hand-maintained markdown file. Cross-referencing "has this hazard family been seen before" means grepping prose.

**Now:** `HazardEntry` is a typed record (`id`, `family`, `description`, `discoveredIn`, `severity`) stored in `state.hazards[]`, persisted to `session/state/engine-state.json`, and survives process restarts (tested explicitly — "hazard registration is append-only and survives reload"). This is a foundation other tooling can query without parsing markdown; you can now trivially build "show me every `critical` hazard discovered this session" instead of reading a file top to bottom.

### 2.7 Evidence-chain validation as a command, not a promise (was: "must reference a concrete source")

`DESIGN.md` principle 4: *"Evidence chain is unbroken. Any claim must point to its evidence file by exact relative path."* Nothing checked that the path was real.

**Now:** `engine.validateEvidenceChain()` walks every candidate's `evidenceLinks[]` and confirms each referenced path exists on disk relative to the session root, returning a structured list of breaks (`candidateId`, `missingPath`) instead of a pass/fail boolean — so a broken chain tells you exactly which claim is unsupported. Exposed as `node cli.ts verify-evidence <session-root>`, intended to run as a pre-merge / pre-output gate (see §4 CI integration).

### 2.8 A fleet dispatcher that actually reads `agent_roles.count_ratio` (was: declared but unused config)

`framework.json` has had `generator: 0.20, extender: 0.20, validator: 0.20, literature: 0.15, synthesizer: 0.05, blindspot: 0.05` since v1's first commit. No code anywhere reads this object and turns it into a fleet.

**Now:** `orchestrator/fleet.ts` — `computeFleetComposition(config, totalAgents)` turns those ratios into exact integer headcounts using the largest-remainder method (naive `Math.round` on ratios like these drops or duplicates a seat about 40% of the time depending on `totalAgents`; largest-remainder guarantees the counts sum exactly to `totalAgents`). `runFleet()` then runs a bounded-concurrency worker pool (default cap 6) that invokes agents, feeds every result through the same `ResearchEngine` used in manual mode, and stops dispatching new tasks the moment the budget locks — in-flight tasks finish, nothing new starts. `invoke` is injected as a parameter, so the same dispatcher works against the raw Anthropic API, Claude Code subagents, or a test mock.

### 2.9 A cross-platform CLI (was: bash *and* PowerShell twins that can silently drift)

v1 ships `check_budget.sh` and `check_budget.ps1` as separately maintained files. There's no guarantee they stay behaviorally identical, and `deploy/deploy.sh` / `deploy/deploy.ps1` have the same duplication risk.

**Now:** `orchestrator/cli.ts` is a single Node/TypeScript entry point (`init`, `status`, `budget`, `advance`, `verify-evidence`) that runs identically on Linux, macOS, and Windows via `node` or `bun` — no shell-specific syntax, no `bc` dependency, no second file to keep in sync. It also fixes a subtler v1 problem: config loaded from `framework.json` without `hard_stop_percent` (i.e., every existing v1 config) defaults it to `total_budget_percent` rather than leaving the hard stop undefined/unbounded — so upgrading doesn't accidentally disable the new safety mechanism for old configs.

### 2.10 A real test suite pinning the invariants (was: zero tests, repo-wide)

Eleven tests in `engine.test.ts`, all passing (§7), covering: budget accept/reject, the exact historical 124/120 overrun, lock-and-signoff flow, verification-criterion rejection, deadend collision, the verified-fix gate, phase-transition ordering (both the rejection case and the full happy path), evidence-chain breakage detection, and hazard persistence across reloads. This is the actual 10x multiplier under all the others: every future change to this engine now has something to break, which is what makes the other nine upgrades trustworthy over time instead of correct-once.

---

## 3. Architecture — before and after

```
BEFORE (v1)                                    AFTER (v2)
────────────                                   ──────────
framework.json (declared, unread)              framework.json (read by engine + fleet)
        │                                              │
        ▼                                              ▼
agent prompts (*.md, advisory)          agent prompts (*.md, UNCHANGED — still the "what to think" layer)
        │                                              │
        ▼                                              ▼
human/agent manually tracks state       ResearchEngine (engine.ts) — single source of truth
  in scattered .md files                        │  enforces: phase order, verification
        │                                        │  criterion, evidence chain, budget hard stop,
        ▼                                        │  verified-fix gate
check_budget.sh (advisory,                       ▼
  disconnected from state)                fleet.ts — reads agent_roles ratios,
        │                                   runs bounded-concurrency dispatch,
        ▼                                   routes every result through the engine
124/120 overrun happens                          │
  (documented in framework.json)                 ▼
                                          cli.ts — status / budget / advance /
                                            verify-evidence, cross-platform
                                                  │
                                                  ▼
                                          engine.test.ts — 11 tests, including a
                                            regression test for the 124/120 incident
```

The four-layer directory model (`framework/`, `session/`, `project/`, `archive/`) is **unchanged** — it's a good structure and doesn't need to move. `orchestrator/` is a new fifth top-level directory sitting alongside it, consumed by `framework/scripts/` (which should be updated to shell out to `node orchestrator/cli.ts` instead of the old bash/`bc` logic — a one-line change per script, not shown here since it's mechanical).

---

## 4. Rollout plan (so this doesn't become another abandoned redesign)

1. **Land `orchestrator/` as an additive directory.** Nothing in `framework/`, `session/`, `project/`, or `archive/` needs to change to add it. Zero risk to existing archived evidence.
2. **Wire `deploy/deploy.sh` / `.ps1` to run `node orchestrator/cli.ts init`** as their last step, replacing the current bash budget check invocation.
3. **Add `verify-evidence` and `budget` as CI gate commands** (or as a pre-`session/05-output.md` checklist step) — both already return non-zero exit codes on failure (`process.exitCode = 1` or `2`), so they slot into any CI runner without extra glue.
4. **Migrate `framework.json`:** add `"hard_stop_percent"` explicitly (the CLI back-fills it from `total_budget_percent` if absent, but explicit is better — see the 124/120 note above for why this number should probably *equal* `total_budget_percent` going forward, not exceed it).
5. **Leave the agent prompt files untouched.** They're good. The upgrade is entirely in the layer that decides whether to trust what they produce.

---

## 5. Known limitations (honest, not hand-waved)

- **Deadend matching is substring-based**, not semantic. Two differently-worded descriptions of the same dead end won't collide. The `literature` agent role is the natural home for a smarter dedup pass (embedding-based similarity against `deadends[]`); that's future work, not something I want to claim is solved here.
- **`AgentInvocation` in `fleet.ts` is an interface, not a concrete Anthropic API client.** I deliberately left it injectable rather than hardcoding an API call, because the actual transport (raw API vs. Claude Code subagent vs. some other harness) is a decision for whoever deploys this, not something I should bake in without knowing the target environment.
- **The budget ledger has no persistence-corruption recovery.** If `engine-state.json` is hand-edited into an invalid shape, the engine will throw on load rather than repair it. Given this system's own principle #4 ("evidence chain is unbroken"), I think fail-loud is the right default here — but it's worth naming as a tradeoff rather than pretending it's free.
- **`computeFleetComposition`'s largest-remainder allocation is untested against every possible `totalAgents` value** — the test suite covers the invariant logic (budget, phases, gates) exhaustively but doesn't include a property-based test sweeping fleet sizes 1–1000. Worth adding before this handles large fleets in production.

---

## 6. Why this is the 10x move and not just "more code"

A tempting alternative upgrade would've been: write better agent prompts, add a seventh agent role, make the hazard taxonomy richer. All of that is real value, and none of it is 10x, because none of it touches the actual failure the project has already had. The repo's own `framework.json` is, right now, a signed confession that the enforcement layer didn't work once already. Ten better prompts don't fix a control problem. One state machine that refuses to let the budget go over does.

---

## 7. Proof of correctness

All code in this proposal was executed, not just written. Test run (Node 22, via `tsx`):

```
✓ budget: allows spend under hard stop
✓ budget: hard stop rejects the overrunning spend and locks the session
✓ budget: this is the exact v1 failure the engine now prevents — 124/120 overrun
✓ locked session rejects all further mutation until human signoff
✓ candidate: rejects proposal with empty verification criterion
✓ candidate: rejects re-proposal of a known deadend
✓ synthesis gate: cannot promote a candidate to verified without a passing repro
✓ phase transitions: cannot skip to validation before any candidate has a verification criterion
✓ phase transitions: full happy path framing -> output
✓ evidence chain: flags candidates whose linked files do not exist
✓ hazard registration is append-only and survives reload

11 passed, 0 failed
```

**STATUS: Pending human review. Not an approved work plan.** (Carrying forward the disclaimer v1's own `docs/05-usage-guide.md` correctly requires for every output — that discipline is one of the things v1 got right, and v2 keeps it.)
