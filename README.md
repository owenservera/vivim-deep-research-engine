# VIVIM Deep-Research Engine

> **A durable, evidence-gated research runtime for AI agents.**
>
> VIVIM turns a research methodology from a prompt an agent is expected to remember into an executable protocol that survives context loss, enforces verification gates, preserves evidence, and resumes from durable checkpoints.

[![Status](https://img.shields.io/badge/status-active%20development-orange)](#status)
[![Runtime](https://img.shields.io/badge/runtime-Node%20%2F%20Bun-blue)](#quick-start)
[![Platform](https://img.shields.io/badge/platform-cross--platform-green)](#quick-start)

---

## Why VIVIM exists

Long-running AI research has a fundamental reliability problem: **the agent's context is temporary, but the research is not.**

A prompt can say:

- don't repeat a known dead end;
- don't claim verification without a passing reproduction;
- preserve the evidence behind every important claim;
- checkpoint before context becomes unsafe;
- resume exactly where the previous agent stopped.

But instructions alone are advisory. Under context pressure, across agent turns, or during concurrent execution, they can be forgotten or bypassed.

VIVIM moves those requirements into a **durable execution layer**.

> **The skill explains the protocol. The engine enforces it.**

The result is intended to behave less like a collection of research prompts and more like a **stateful research runtime for autonomous agents**.

---

## Core guarantees

### 🔒 Durable state

Research state is persisted to the session filesystem and checkpointed independently of the agent's conversational context.

A fresh agent instance can resume from the latest checkpoint without reconstructing the previous conversation.

### 🧭 Enforced research lifecycle

```text
framing → generation → validation → synthesis → output
```

Phase transitions have explicit exit criteria. The engine rejects premature transitions rather than trusting an agent to remember them.

### 🧪 Evidence-gated verification

A candidate cannot become verified merely because an agent says it is verified.

```text
proposal
   ↓
verification criterion
   ↓
reproduction
   ↓
passing result
   ↓
validated
   ↓
evidence integrity
   ↓
verified
```

### ♻️ Context-survivable execution

VIVIM does **not** impose an arbitrary research-spend ceiling.

Instead it monitors execution pressure using:

- estimated token pressure;
- a configurable danger-zone margin;
- a hard maximum number of actions between checkpoints.

When a checkpoint is required, new work stops being dispatched, in-flight atomic work is allowed to finish, and durable state is committed.

### 🧠 Dead-end memory

Known dead ends are persisted as structured session state. Candidate proposals are checked against them before being accepted, preventing obvious repeated approaches.

### 🛡️ Evidence integrity

Evidence references can be validated for existence and, when expected hashes are supplied, SHA-256 byte integrity.

The repository's archive also has a reproducible SHA-256 manifest generator.

### ⚙️ Fleet orchestration

Agent-role ratios in `framework.json` are converted into exact fleet composition using largest-remainder allocation.

Fleet progress is persisted by role, allowing a resumed run to dispatch the **remaining work rather than blindly starting another complete fleet**.

Failed tasks are durable state rather than transient return values.

### 🤖 Agent-native skill

The repository includes an installable-style agent skill at:

```text
skills/vivim-deep-research/
```

It provides the agent-facing protocol, recovery instructions, methodology, and survivability guidance while leaving enforcement to the runtime.

---

## Architecture

```text
                         AI AGENT
                            │
                            ▼
              ┌─────────────────────────┐
              │ VIVIM Deep Research     │
              │ Agent Skill              │
              │                         │
              │ protocol + methodology │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ ResearchEngine           │
              │                         │
              │ state machine            │
              │ verification gates       │
              │ evidence validation      │
              │ survivability pressure   │
              └────────────┬────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        checkpoints      evidence     fleet
              │            │            │
              └────────────┼────────────┘
                           ▼
                    durable session
                         state
```

### Repository layout

| Path | Purpose |
|---|---|
| `orchestrator/` | Executable research runtime, state machine, fleet dispatcher, CLI |
| `skills/` | Agent-facing VIVIM Deep Research skill and references |
| `framework/` | Core research roles, templates, and methodology |
| `session/` | Active research state, candidates, repros, checkpoints, dead ends |
| `project/` | Project-specific research material and hazards |
| `archive/` | Immutable/reference material from the original research workspace |
| `docs/` | Detailed design, usage, and customization documentation |
| `deploy/` | Portable deployment/bootstrap tooling |

---

## Quick start

### Requirements

- Node.js 22+ **or** Bun
- Git
- A research session root containing a compatible `framework.json`

### Initialize / inspect a session

```bash
node orchestrator/cli.ts status <session-root>
node orchestrator/cli.ts pressure <session-root>
```

After context loss or a new agent turn, resume first:

```bash
node orchestrator/cli.ts resume <session-root>
```

### Checkpoint manually

```bash
node orchestrator/cli.ts checkpoint <session-root> "Continue validating candidate C-14. Do not repeat C-03; its reproduction failed because ..."
```

### Validate evidence

```bash
node orchestrator/cli.ts verify-evidence <session-root>
```

### Complete an objective

```bash
node orchestrator/cli.ts complete <session-root> "Candidate C-14 verified against the reproduction and evidence chain."
```

Completion is rejected unless the session contains at least one verified candidate.

---

## Survivability model

The most important design decision in VIVIM is that **checkpointing is not a failure state**.

Research can continue indefinitely. The runtime's job is to prevent volatile agent context from becoming the single point of failure.

```text
                  context pressure
                         │
                         ▼
              ┌─────────────────────┐
              │ checkpoint required │
              └──────────┬──────────┘
                         │
               stop new dispatches
                         │
               finish atomic work
                         │
                         ▼
                 durable checkpoint
                         │
                         ▼
                  fresh agent turn
                         │
                         ▼
                     resume
```

A checkpoint contains structured research state plus a `resumeBrief` describing what a cold agent needs to do next and what it must not redo.

The canonical state is the structured checkpoint. The resume brief is an operational aid, not a replacement for state.

---

## Verification model

VIVIM separates **reasoning** from **authority**.

Agent prompts can generate ideas, arguments, experiments, and interpretations. The runtime decides whether those outputs satisfy the project's invariants.

### Candidate gate

Every candidate requires a non-empty verification criterion.

### Reproduction gate

A candidate needs a recorded passing reproduction before it can be promoted to `verified`.

### Evidence gate

Evidence links must resolve to durable artifacts. Optional SHA-256 expectations allow the engine to detect post-capture modification.

### Completion gate

The research objective cannot be declared complete with zero verified candidates.

This is intentional: **"the agent stopped" and "the research is complete" are different states.**

---

## Agent roles

The default framework distributes work across six complementary roles:

| Role | Function |
|---|---|
| `generator` | Generate candidate explanations and approaches |
| `extender` | Develop promising candidates |
| `validator` | Attempt reproductions, counterexamples, and stress tests |
| `literature` | Seek prior art, independent evidence, and contradictions |
| `synthesizer` | Produce synthesis from surviving evidence |
| `blindspot` | Search for assumptions, omissions, and failure modes |

The default ratios are deliberately normalized to **100%** and are validated at configuration load time.

---

## Fleet execution

`orchestrator/fleet.ts` provides a bounded-concurrency dispatcher with injectable agent invocation.

The transport is intentionally decoupled from the runtime: an integration can supply Claude Code subagents, another agent harness, a raw API adapter, or a test implementation without changing the research invariants.

A fleet run persists progress by role. On restart, the dispatcher uses the persisted progress to construct the remainder rather than duplicating completed work.

This makes fleet execution compatible with the same survivability model as manual execution.

---

## Checkpoint integrity

Checkpoint files are durable research artifacts. The design treats persistence as part of correctness, not merely logging.

The archive also exposes a reproducible SHA-256 generator:

```bash
node archive/generate-sha256-manifest.ts
```

The resulting hashes can be used to verify that preserved evidence has not changed byte-for-byte.

---

## Configuration

The central configuration is `framework.json`.

The current model includes:

```json
{
  "survivability": {
    "danger_zone_tokens": 40000,
    "checkpoint_margin_ratio": 0.8,
    "max_actions_between_checkpoints": 25
  }
}
```

Agent role ratios must sum to `1.0` within a small floating-point tolerance. Invalid configurations fail loudly instead of silently producing an unintended fleet.

There is intentionally **no legacy percentage-spent budget ceiling** in the current runtime.

---

## Design principles

1. **Enforce invariants in code.** Prompts are guidance; state transitions are authority.
2. **Durability before context loss.** Volatile conversation is never the canonical research record.
3. **Verification is earned.** A claim does not become verified because an agent labels it verified.
4. **Evidence is addressable and integrity-checkable.** Important conclusions must trace to durable artifacts.
5. **Failure is information.** Dead ends and failed tasks should survive process boundaries.
6. **Completion is explicit.** A checkpoint, timeout, or context compaction is not completion.
7. **Agent-agnostic enforcement.** The runtime should not depend on a particular model provider or agent harness.
8. **Fail loud.** Invalid configuration and broken evidence chains should be visible rather than silently repaired.
9. **Portable execution.** Node/Bun and cross-platform filesystem semantics are preferred over shell-specific orchestration.
10. **Human review remains authoritative.** The engine can enforce process guarantees; it cannot make an empirical conclusion true by itself.

---

## Status

**Active development / research infrastructure.**

The architecture and core enforcement mechanisms are implemented, but this project is not presented as a fully production-hardened autonomous research service yet. In particular, integrations with concrete agent transports and larger-scale end-to-end fleet workloads remain deployment-specific.

Run the test suite locally before treating a change as validated.

---

## Documentation

- [`DESIGN.md`](DESIGN.md) — architecture and invariants
- [`docs/05-usage-guide.md`](docs/05-usage-guide.md) — operational usage
- [`docs/06-customization-guide.md`](docs/06-customization-guide.md) — framework customization
- [`OWNER.md`](OWNER.md) — ownership and operating rules
- [`skills/vivim-deep-research/SKILL.md`](skills/vivim-deep-research/SKILL.md) — agent skill
- [`archive/manifest.md`](archive/manifest.md) — preserved evidence and integrity model

---

## License

See the repository's license and ownership files for the current project terms.

---

**VIVIM Deep-Research Engine** — durable research execution for context-limited AI agents.
