---
name: clean-code-review
description: Review changed or specified files against this project's clean-code rules (CLAUDE.md) and Medusa conventions, then report or fix issues. Use before finishing any code change, or when the user asks to review, clean up, or refactor code for readability.
---

# Clean code review

## Scope
- No argument: review the working-tree diff (`git diff` + untracked files from `git status`).
- A path argument: review that file or folder.
Only review what's in scope — don't wander into unrelated files.

## Steps

1. Read `CLAUDE.md` and the relevant skill for each file type:
   - `src/api/**` → `medusa-api-route`
   - `src/workflows/**` → `medusa-workflow`
   - `src/modules/**` → `medusa-provider-module`
   - `src/admin/**` → `medusa-admin-widget`
2. Check each file against the checklist below.
3. Report findings grouped by severity, each with `file:line`, the problem, and the concrete fix.
4. If the user asked to fix: apply fixes one file at a time, keep behavior identical, then run `pnpm exec tsc --noEmit` and report the result honestly.

## Checklist (by severity)

**Must fix**
- Secrets/tokens/API keys logged or returned in responses
- `fetch` without a `response.ok` check
- Mutating workflow step without compensation
- Unvalidated `req.body` in a route
- `any`, `@ts-ignore`, or `!` on values that can really be undefined
- Business logic or third-party calls in a route, subscriber or job

**Should fix**
- Functions > ~40 lines or files > ~200 lines; `// --- section ---` comments that should be functions
- `process.env` read outside `medusa-config.ts`
- `console.log` instead of the container logger
- Nested ternaries, deep nesting instead of early returns
- Magic numbers/strings; duplicated `fetch` boilerplate
- Unclear names (`res`, `json`, `data2`, `v`, `o`)
- Generic error `new Error(...)` where a `MedusaError` type fits

**Nice to have**
- File-path header comments, commented-out code, comments explaining *what* instead of *why*
- Inconsistent indentation/quotes vs. project style (2 spaces, double quotes, no semicolons)
- Unused imports or variables

## Report format

```
### Must fix
- src/modules/konnect/service.ts:78 — API key logged with console.log. Remove the log.

### Should fix
- ...

### Looks good
- one line on what is already clean
```
Keep it short. Don't report style nits when there are real problems to fix.
