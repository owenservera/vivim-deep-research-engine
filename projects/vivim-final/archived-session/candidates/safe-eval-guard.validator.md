validated-by: lead (iteration 2, safe-eval)
VERIFIED

# Validation: `assertTrustedExpressionSource` denylist fails open

## Check type
Executed reproduction against the real `assertTrustedExpressionSource`
imported from `C:/0-BlackBoxProject-0/vivim-final/src/engines/safe-eval.ts`.
File: `repros/safe-eval-guard.ts`.

## How to run
```
cd C:\0-BlackBoxProject-0\ideation\project
bun run repros/safe-eval-guard.ts
```

## Result
ALL PASS (exit 0), 17/17 cases:

1. Sanity: guard correctly blocks `return process`.
2. GUARD GAP (reachable in this runtime): `WebSocket`, `navigator`, `Blob`,
   `TextEncoder`, `structuredClone`, `MessageChannel`, `BroadcastChannel`,
   `crypto` — all NOT forbidden AND `new Function(source)()` returns the real
   global.
3. GUARD GAP (absent here but unguarded): `EventSource`, `localStorage`,
   `sessionStorage`, `indexedDB`, `location`, `XMLSerializer`, `DOMParser` —
   guard permits referencing them; in a browser scope they would be reachable.
4. SECURITY: `WebSocket` reachable through the guard (network exfil in browser).
5. H3 case-sensitivity: `PROCESS` and `FUNCTION` (uppercase) evade the
   lowercase-only denylist.

## Verdict
Guard is a fail-open denylist. The protection is incomplete: non-enumerated
dangerous globals pass, and case variants evade it. Real exploitability depends
on whether `SandboxRunner` runs `new Function` in a restricted (sandboxed) scope
or a wider one — but as the sole/defense-in-depth control it is weak and should
be replaced by an allowlist + case-insensitive matching + a true sandbox with no
globals.

Suggested fix: replace the denylist with an allowlist of permitted DSL
identifiers (or run the expression inside a real sandbox — quickjs/vm — that
exposes no globals), and make any remaining token check case-insensitive.
