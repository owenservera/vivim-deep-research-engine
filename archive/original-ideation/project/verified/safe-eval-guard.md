# Verified: safe-eval `assertTrustedExpressionSource` denylist fails open

- target: `C:/0-BlackBoxProject-0/vivim-final/src/engines/safe-eval.ts`
- defect: denylist guard for `new Function()` is fail-open
- harness: `repros/safe-eval-guard.ts`
- command: `bun run repros/safe-eval-guard.ts`
- result: ALL PASS (17/17)
- hazards: H3 (case-sensitivity), H9 (denylist/blocklist fails open)
- severity: conditional — depends on SandboxRunner eval scope; weak control regardless

## What the check proved
1. Many dangerous globals are absent from the denylist and the guard permits
   them: `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`,
   `indexedDB`, `navigator`, `location`, `Blob`, `TextEncoder`,
   `structuredClone`, `MessageChannel`, `crypto`, `XMLSerializer`, `DOMParser`,
   `BroadcastChannel`.
2. Where the global exists in this runtime, `new Function(source)()` actually
   returns it after the guard passes → a sandbox-escape path (network via
   WebSocket, storage via localStorage/indexedDB, DOM via navigator/location).
3. The regex is case-sensitive (no `i` flag), so `PROCESS`/`FUNCTION` evade it.

## Suggested fix
- Prefer an **allowlist** of permitted DSL identifiers over a denylist.
- Make any token check case-insensitive (`i` flag) if retained.
- Run the expression inside a real sandbox (quickjs/vm) exposing no globals,
  rather than relying on a source-string blocklist.
