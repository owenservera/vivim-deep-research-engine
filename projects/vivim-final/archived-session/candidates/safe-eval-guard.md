claimed-by: lead (iteration 2, safe-eval)
READY FOR VALIDATION

# Candidate: `assertTrustedExpressionSource` denylist fails open — dangerous globals reachable

## Approach / claim
`safe-eval.ts` protects the remaining `new Function()` eval site (stream-parser
`SandboxRunner` path) with a **denylist** regex of forbidden tokens
(`process`, `globalThis`, `Function`, `eval`, `fetch`, `WebSocket`?…). Denylists
for code execution are fail-open: anything not enumerated passes.

Confirmed by executed check `repros/safe-eval-guard.ts`:
- Many dangerous globals are NOT on the list and the guard permits them:
  `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`, `indexedDB`,
  `navigator`, `location`, `Blob`, `TextEncoder`, `structuredClone`,
  `MessageChannel`, `crypto`, `XMLSerializer`, `DOMParser`, `BroadcastChannel`.
- For globals present in this runtime, `new Function(source)()` actually
  **returns them** after the guard passes: `WebSocket` (function), `navigator`
  (object), `Blob`, `TextEncoder`, `structuredClone`, `MessageChannel`,
  `BroadcastChannel` (functions), `crypto` (object). In a browser-equivalent
  eval scope this is network/storage/DOM exfiltration.
- **Case-sensitivity (H3)**: the regex lacks the `i` flag, so `PROCESS` and
  `FUNCTION` (uppercase) evade the denylist entirely.

## Why it seems promising
Executed against the real `assertTrustedExpressionSource`:
`repros/safe-eval-guard.ts` → ALL PASS (17/17). Shows both the guard permitting
non-enumerated dangerous globals and `new Function` reaching them.

## What needs to be checked next
- **Scope dependency**: if `SandboxRunner` (quickjs/vm) provides a *restricted*
  global (no `WebSocket`/`navigator`), the guard is defense-in-depth and the gap
  is moot. The doc says this path "still uses `new Function()` for DB-backed
  parser definitions" — whether that `new Function` runs in the sandbox's scope
  or a wider one determines real exploitability. Severity is conditional on that.
- Whether any caller feeds *untrusted* strings to this eval site.

## Confidence
High the guard is structurally incomplete (denylist, case-sensitive, omits
commonly-dangerous globals). Real exploitability depends on the eval scope
SandboxRunner provides. Either way it is a weak control and a code smell.
