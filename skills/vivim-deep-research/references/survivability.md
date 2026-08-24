# Survivability Reference

VIVIM does not impose a total research-spend ceiling. Research may continue until the objective is actually complete.

The runtime instead manages volatile execution. Token estimates and action counts are used to detect when the current execution context is approaching a dangerous point. A checkpoint signal means durable state should be committed before more work is dispatched.

## Pressure model

- `danger_zone_tokens` defines the configured pressure boundary.
- `checkpoint_margin_ratio` creates an earlier checkpoint threshold because token estimates are approximate.
- `max_actions_between_checkpoints` provides a token-independent safety floor.

Pressure is a signal, not a research failure. Fleet execution should stop dispatching new tasks after a checkpoint signal, allow already-running atomic tasks to finish, and write one checkpoint.

## Recovery model

A fresh agent must be able to resume from the latest durable checkpoint without conversational history. Structured checkpoint state is authoritative. The resume brief is an operational guide derived from that state.

A checkpoint should make clear what was completed, what remains, what must not be repeated, and what the next safe action is.

## Completion

Only explicit objective completion ends the research lifecycle, and completion requires at least one verified candidate. Running out of context or reaching a checkpoint threshold is never equivalent to completing the research objective.
