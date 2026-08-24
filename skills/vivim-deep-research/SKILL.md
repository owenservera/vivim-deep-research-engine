---
name: vivim-deep-research
description: Durable, evidence-gated research workflow for VIVIM. Use when conducting multi-step technical or scientific research that must survive agent context loss, avoid repeated dead ends, preserve evidence, and distinguish proposed, validated, and verified findings.
---

# VIVIM Deep Research

Use the VIVIM research runtime as the source of truth for research state. The skill explains the protocol; `orchestrator/` enforces it.

## First action

For an existing session, run:

```bash
node orchestrator/cli.ts resume <session-root>
```

Read the returned resume brief before doing research. Then inspect status and pressure:

```bash
node orchestrator/cli.ts status <session-root>
node orchestrator/cli.ts pressure <session-root>
```

For a new session, initialize it with the repository's framework configuration before beginning work.

## Non-negotiable invariants

- Never propose a candidate without a concrete verification criterion.
- Never silently retry a known dead end.
- Never call a candidate `validated` without a recorded passing reproduction.
- Never call a candidate `verified` without a passing reproduction and intact evidence.
- Never advance phases by assumption; use the engine's phase transition.
- Never treat a resume brief as canonical state. Structured engine state is authoritative.
- Never continue blindly through context pressure. When `pressure` reports that a checkpoint is required, stop pulling new work, finish the current atomic task, and checkpoint.
- Never declare the objective complete without at least one verified candidate.

## Research lifecycle

```text
framing → generation → validation → synthesis → output
```

The engine enforces the exit conditions. Agents provide reasoning, candidate proposals, reproductions, evidence, and synthesis; they do not directly mutate lifecycle status.

## Checkpointing

A checkpoint is a durable cut, not a research stop. It should contain enough structured state and a concise resume brief for a fresh agent to continue without conversational history.

A good resume brief states:

1. What has been established.
2. What remains unresolved.
3. Which candidate/task should be done next.
4. Which approaches must not be repeated and why.
5. Which evidence or repro files matter next.

Use:

```bash
node orchestrator/cli.ts checkpoint <session-root> "<resume brief>"
```

After a context compaction, the first action is `resume`, not re-derivation from memory.

## Evidence

Evidence is a durable artifact, not merely a URL or statement in conversation. Capture evidence through the engine so its SHA-256 hash is recorded. Before synthesis/output, run:

```bash
node orchestrator/cli.ts verify-evidence <session-root>
```

A missing or modified evidence artifact is a broken chain and must be repaired before claiming verification.

## Agent behavior

Prefer small, independently durable tasks. Record meaningful action pressure after agent/tool work. Do not start additional work when a checkpoint is required. Avoid duplicating work that is already represented in the checkpoint, candidate state, deadends, repros, or evidence.

When uncertain whether a result is established, classify it conservatively as a proposal or unresolved finding rather than promoting it.

## References

For detailed methodology and survivability guidance, consult the files under `references/` in this skill.
