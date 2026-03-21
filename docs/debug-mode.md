# Debug Mode

Run `yarn start:debug` to launch with debug instrumentation active.

## What It Captures

- **`.debug/session.log`** — timestamped dispatch actions and React render timing.
  Rotates at 10MB. Safe to leave running for extended periods.
- **`.debug/crash.log`** — full stack trace written synchronously on any unhandled
  exception or rejection. Overwrites on each crash.

## When to Use It

Run `yarn start:debug` instead of `yarn start` when tracking down intermittent
crashes or freezes. Debug mode has no visible effect on the UI — all output goes
to `.debug/` files, never to the terminal.

## Log Format

Each line in `session.log` is a JSON object with a `t` (timestamp) and `type` field:

| Type | Meaning |
|---|---|
| `DISPATCH` fields (`type` = action name) | State machine action with summarized payload |
| `RENDER` | React commit-phase render with `phase` and `ms` duration |
| `CRASH` | Unhandled exception or rejection (also written to `crash.log`) |

Large payload fields (`jestJson`, `pytestStdout`) are replaced with `"[omitted]"` to keep entries readable.

## Diagnosing a Stack Overflow

After a crash, check `.debug/crash.log` for the full stack trace. Then check
`.debug/session.log` for the last dispatch entries before the crash — look for
the same action type repeating in rapid succession (infinite dispatch loop) or
`RENDER` entries with timestamps converging (infinite render loop).

## Diagnosing a Freeze

If the app freezes without crashing, kill it with Ctrl+C and check
`.debug/session.log`. Look for a pattern of repeating dispatches or renders with
sub-millisecond gaps. The last entries in the log are the most diagnostic.

## Chrome DevTools

To attach Chrome DevTools for breakpoint debugging:

```bash
tsx --inspect runner/index.debug.js
```

Navigate to `chrome://inspect` in Chrome to attach. The inspect port sits idle
until a debugger connects — there is no performance impact from leaving it open.
Note that `--inspect` prints a short message to stderr at startup.
