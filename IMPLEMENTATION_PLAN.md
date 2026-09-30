# IMPLEMENTATION_PLAN.md — The Untested API (Take-Home Assignment)

> **Purpose of this file:** full context for an AI coding agent (and for me, Anuj) so we can work through the assignment smoothly, one step at a time. Read this entire file before doing anything.

---

## 0. Working rules for the agent (READ FIRST)

1. **Step by step, one piece at a time.** Do not build everything at once. Finish one step from Section 9, show the result, and **wait for my explicit go-ahead** before starting the next.
2. **Do not create files or write code until I say so** for that step. Propose first, then implement after approval.
3. **I must understand everything.** The company grades my ability to read and reason about unfamiliar code, not generated output. For every change, explain *where* it lives and *why* in plain language so I can restate it in my own words.
4. **Tests assert intended behavior, not current behavior.** Never write a test to match a bug. A failing test that exposes a bug is a *good* result. Save that failing output as evidence before fixing.
5. **Don't over-engineer.** The assignment says not to perfect the codebase beyond what's asked. Fix only what we decide to fix; report the rest.
6. **Test behavior, not implementation details.**
7. **Do not modify `ASSIGNMENT.md` or `README.md`** (original briefs). Add new files instead (`BUG_REPORT.md`, `SUBMISSION_NOTES.md`).
8. Work inside `task-api/`. Use a dedicated branch (suggested: `solution`) so the submission is a clean diff.

---

## 1. The assignment in brief

A 2-day take-home for a **full-stack developer intern** role. Stack: **Node.js, Express, Jest, Supertest**. The codebase is a small Task Manager API with an in-memory store, written quickly with no tests, "heading to production."

The README allows AI tools but says the submission must reflect my own understanding:
- For each bug: where in the code it lives and **why** it happens.
- For the feature: brief explanation of design decisions.
- Say so if something surprised me or I made a tradeoff.

Repo: my fork at `github.com/Anuj-135/Take-Home-Assignment-The-Untested-API` (forked from `rohit-ups/Take-Home-Assignment-The-Untested-API`). The original has ~115 forks, so many similar submissions exist. **Quality of reasoning and explanation is what differentiates mine.**

---

## 2. Requirements (from ASSIGNMENT.md)

### Day 1 — Read & Test
- Read `src/`; run the server and poke at endpoints.
- Write tests in `tests/` covering:
  - **Unit tests** for `taskService.js` functions directly
  - **Integration tests** for API routes using **Supertest**
  - At minimum: happy path for each endpoint + **at least 2 edge cases**
- **80%+ coverage** (`npm run coverage`).
- **Deliverable:** committed tests + coverage output (paste summary or screenshot).

### Day 2 — Find & Build
- **Part A — Bug report:** for each bug include (1) expected behavior, (2) actual behavior, (3) how I discovered it, (4) what a fix looks like. No need to fix all.
- **Part B — Fix one bug:** pick one, fix it, update tests that should now pass.
- **Part C — New feature:** `PATCH /tasks/:id/assign`, body `{ "assignee": "string" }`
  - Accepts a name (string), stores it on the task, returns the updated task.
  - Returns **404** if the task doesn't exist.
  - Think about validation: empty string? already assigned?
  - Write tests before or alongside the implementation.
- **Deliverable:** bug report, fix, new endpoint with tests.

### Submission
Push to a branch/fork and share the link, plus a short note (a few sentences) on:
- What I'd test next with more time
- Anything that surprised me in the codebase
- Questions I'd ask before shipping to production

---

## 3. Repo structure

```
ASSIGNMENT.md
README.md
task-api/
  package.json          # scripts: start, test (jest), coverage (jest --coverage)
  jest.config.js        # testEnvironment node; testMatch **/tests/**/*.test.js;
                        # collectCoverageFrom src/**/*.js; coverageDirectory coverage
  src/
    app.js
    routes/tasks.js
    services/taskService.js
    utils/validators.js
  tests/                # empty — my work goes here
```

Dependencies: `express ^4.18.2`, `uuid ^9.0.0`. Dev: `jest ^29.7.0`, `supertest ^6.3.4`. Node 18+.

Commands (run inside `task-api/`): `npm install`, `npm start` (port 3000), `npm test`, `npm run coverage`.

**Test-file naming:** must match `tests/**/*.test.js` or Jest won't find them.

---

## 4. How the current codebase works

Request flow: **route → validator → service**. The service holds a module-level `tasks` array (in-memory, resets on restart). It is a **singleton**, so unit tests and Supertest tests share the same array — **every test file needs `taskService._reset()` in `beforeEach`.**

### `src/app.js`
- `express.json()` body parsing, mounts `/tasks` router.
- Error-handling middleware: logs the stack, **always** responds `500 { error: 'Internal server error' }`.
- Only calls `listen` when `require.main === module`, and exports `app` → Supertest can import it safely.

### `src/services/taskService.js` (exports)
`getAll, findById, getByStatus, getPaginated, getStats, create, update, remove, completeTask, _reset`

| Function | Behavior |
|---|---|
| `getAll()` | Returns a shallow copy of the array (`[...tasks]`); task objects are still shared references |
| `findById(id)` | `tasks.find` by id |
| `getByStatus(status)` | `tasks.filter(t => t.status.includes(status))` |
| `getPaginated(page, limit)` | `offset = page * limit`; `tasks.slice(offset, offset + limit)` |
| `getStats()` | Counts `todo / in_progress / done`; `overdue` = has `dueDate`, status not `done`, `dueDate < now` |
| `create({title, description='', status='todo', priority='medium', dueDate=null})` | Builds task with `uuidv4()` id, `completedAt: null`, `createdAt` ISO; pushes and returns it. Only destructured fields are kept |
| `update(id, fields)` | Finds index; `null` if missing; otherwise `{ ...existing, ...fields }` (raw merge) |
| `remove(id)` | Splices; returns `true`/`false` |
| `completeTask(id)` | `null` if missing; sets `priority: 'medium'`, `status: 'done'`, `completedAt: now` |
| `_reset()` | Empties the array (test helper) |

### `src/routes/tasks.js`
| Route | Behavior |
|---|---|
| `GET /tasks/stats` | Returns `getStats()`. Defined **before** `/:id` routes intentionally |
| `GET /tasks` | If `status` → `getByStatus` and **return early**. Else if `page` or `limit` defined → `parseInt(page) \|\| 1`, `parseInt(limit) \|\| 10` → `getPaginated`. Else `getAll` |
| `POST /tasks` | `validateCreateTask` → 400 `{error}` or `create` → **201** |
| `PUT /tasks/:id` | `validateUpdateTask` → 400; `update` → 404 `{error:'Task not found'}` or 200 with task |
| `DELETE /tasks/:id` | `remove` → 404 or **204** |
| `PATCH /tasks/:id/complete` | `completeTask` → 404 or 200 with task |

### `src/utils/validators.js`
- `VALID_STATUSES = ['todo','in_progress','done']`, `VALID_PRIORITIES = ['low','medium','high']`
- `validateCreateTask(body)`: title required, string, non-empty after trim; status/priority must be in the lists **if truthy**; `dueDate` must satisfy `Date.parse` **if truthy**. Returns an error string or `null`.
- `validateUpdateTask(body)`: same, but title only checked if `!== undefined`.

### Task shape (actual)
```
{ id (uuid), title, description, status: todo|in_progress|done,
  priority: low|medium|high, dueDate: ISO|null, completedAt: ISO|null, createdAt: ISO }
```

### Doc inconsistency (worth mentioning in submission)
`README.md` says statuses are `pending | in-progress | completed` (its sample curl uses `?status=pending`), but the **code and ASSIGNMENT.md** use `todo | in_progress | done`. The README is wrong; the code is the source of truth.

---

## 5. Bug list (from code reading — each MUST be confirmed by a test)

> These are hypotheses from reading the code. Do **not** report a bug as confirmed until a test demonstrates it. Record the failing test output as "how I discovered it."

### Strong candidates (likely planted)

**B1 — Pagination offset is wrong** — `taskService.getPaginated`
- Expected: `page=1&limit=2` returns the first two tasks.
- Actual: `offset = page * limit` (=2), so page 1 skips the first `limit` tasks; the first page is unreachable.
- Fix: `offset = (page - 1) * limit`.

**B2 — Status filter uses substring match** — `taskService.getByStatus`
- Expected: `?status=todo` returns only `todo` tasks.
- Actual: `t.status.includes(status)` → `?status=do` matches `todo` and `done`; `?status=in` matches `in_progress`.
- Fix: strict equality (`t.status === status`). Optionally validate the query value against `VALID_STATUSES` (400 on unknown).

**B3 — Completing a task resets priority** — `taskService.completeTask`
- Expected: status → `done`, `completedAt` → now, **priority unchanged**.
- Actual: hardcoded `priority: 'medium'` downgrades high/low tasks.
- Fix: delete the `priority: 'medium'` line.

**B4 — Malformed JSON returns 500 instead of 400** — `app.js` error handler
- Expected: invalid JSON body → 400.
- Actual: `express.json()` raises a parse error carrying a 4xx status; the handler ignores it and always sends 500.
- Fix: use `err.status` when it's a 4xx, fall back to 500.

### Real issues (design / robustness) — report, fix only if time allows

**B5 — Falsy values bypass validation** — `validators.js` + `create`
- Checks are `body.status && ...`, so `status: ""` / `null` (and `priority`, `dueDate`) skip validation. `create()` defaults only apply to `undefined`, so `null` gets stored.
- Chain: POST with `"status": null` → later `GET /tasks?status=todo` calls `.includes` on `null` → throws → 500. One bad POST breaks the filter for everyone.
- Fix: check `!== undefined` instead of truthiness.

**B6 — `update()` merges any field** — `taskService.update`
- Raw `{...existing, ...fields}` lets `PUT` overwrite `id`, `createdAt`, `completedAt`, or add arbitrary fields (including `assignee`, bypassing the new endpoint's validation). README calls `PUT` a "full update" but it behaves as a merge.
- Fix: whitelist updatable fields.

**B7 — Filter and pagination can't combine** — `routes/tasks.js` (`GET /tasks` returns early on `status`).

**B8 — Pagination params unvalidated** — `routes/tasks.js`
- `page=-1` → negative offset → `slice` returns from the end; `limit=0` silently becomes 10 (`|| 10`); no max limit; non-numeric values silently default.

**B9 — `completedAt` inconsistency** — `update` / `completeTask`
- `PUT {status:'done'}` doesn't set `completedAt`; moving back to `todo` doesn't clear it; calling `/complete` twice overwrites the original timestamp.

**B10 — Reference leaking** — `getAll` / `findById` return shared task objects (callers can mutate the store). Minor.

**Not a bug:** `getStats` logic looks correct — still test it (especially "done tasks are never overdue").

---

## 6. Test plan

**Rules:** `beforeEach(() => taskService._reset())` everywhere. Files live in `task-api/tests/` and end with `.test.js`.

### 6.1 `tests/taskService.test.js` — unit tests
- `create`: defaults (`description=''`, `status='todo'`, `priority='medium'`, `dueDate=null`, `completedAt=null`), unique ids, valid `createdAt`, extra fields dropped.
- `getAll`: empty → `[]`; returns a copy (pushing to result doesn't change the store).
- `findById`: found / not found (`undefined`).
- `getByStatus`: exact match; **substring case (exposes B2)**; no matches → `[]`.
- `getPaginated`: page 1 returns first N **(exposes B1)**; page 2; page past the end → `[]`; limit larger than total.
- `getStats`: counts per status; overdue counted; done + past due NOT overdue; no `dueDate` not overdue; future `dueDate` not overdue; empty store.
- `update`: merges fields; unknown id → `null`; other fields preserved; document B6 behavior.
- `remove`: `true` and actually gone; unknown id → `false`.
- `completeTask`: sets `done` + `completedAt`; unknown id → `null`; **priority preserved (exposes B3)**.
- `assignTask` (added in Part C).

### 6.2 `tests/validators.test.js` — unit tests
- Create: valid body → `null`; missing / empty / whitespace / non-string title; invalid status; invalid priority; invalid `dueDate`; **falsy status/priority (`""`, `null`) (exposes B5)**.
- Update: title only checked when provided; other branches as above.
- Assign validator (Part C).

### 6.3 `tests/tasks.test.js` — Supertest integration
- `POST /tasks`: 201 + shape; 400 missing title; 400 bad status; **400 on malformed JSON (exposes B4)**; no body → 400.
- `GET /tasks`: empty → `[]`; lists all; `?status=` exact; `?status=do` substring **(B2)**; `?page=1&limit=2` **(B1)**; page 2; `limit` alone.
- `PUT /tasks/:id`: 200 updates; 404 unknown; 400 invalid; partial update behavior (B6); `id` overwrite attempt.
- `DELETE /tasks/:id`: 204 then gone; 404 unknown.
- `PATCH /tasks/:id/complete`: 200, `done`, `completedAt` set; **priority preserved (B3)**; 404.
- `GET /tasks/stats`: counts + overdue; route not shadowed by `/:id`.
- Error handler: trigger a 500 (e.g. via B5 chain or a mocked service throw) to cover it.
- `PATCH /tasks/:id/assign` (Part C, below).

### 6.4 Coverage
Target **≥ 80%** (aim ~90%+ — codebase is tiny). The `listen` block in `app.js` won't execute under test; that's fine. Save the `npm run coverage` summary for the submission.

---

## 7. Part C — `PATCH /tasks/:id/assign` design

**Request:** `{ "assignee": "string" }` → **Response:** updated task (with `assignee`).

Decisions (record the reasoning in `SUBMISSION_NOTES.md`):

| Case | Decision | Reasoning |
|---|---|---|
| `assignee` missing / not a string / empty / whitespace-only | **400** `{ error }` | Invalid input; task must remain unchanged |
| Valid name with surrounding spaces | Trim before storing | Consistent stored values; internal spaces preserved |
| Unknown task id | **404** `{ error: 'Task not found' }` | Required by the spec |
| Order of checks | Validate, then lookup (matches existing `PUT` route) — *or* reverse; pick one and justify | Consistency with `PUT`; note the tradeoff |
| Already assigned | **Allow reassignment (200)**, replace previous name | The API has no other way to change an assignee; 409 would lock it permanently. Note 409 as the alternative |
| Completed (`done`) task | Allow; leave `status` and `completedAt` untouched | Ownership metadata is independent of status |
| Task shape | Unassigned tasks simply have no `assignee` (or `null`) — choose one and keep it consistent | Avoid breaking existing shape/tests |

Implementation notes (for later, after approval): add `validateAssignTask` to `validators.js`, an `assignTask(id, assignee)` to `taskService.js` (reuse `update` or write directly), and the route in `routes/tasks.js`. Write the tests first.

**Related:** because `PUT` (B6) can set arbitrary fields, it can set `assignee` without validation — flag this in the bug report.

---

## 8. Deliverables checklist

- [x] `tests/taskService.test.js` (44 tests, all passing)
- [x] `tests/validators.test.js` (43 tests, 37 passing, 6 failing for documented B5)
- [x] `tests/tasks.integration.test.js` (35 tests, all passing)
- [x] Coverage summary (≥ 80%) saved: **97.50% Statements, 93.81% Branches, 96.66% Functions, 97.26% Lines**
- [x] Failing-test output saved as bug evidence in `TEST_EVIDENCE.md`
- [x] `BUG_REPORT.md` — confirmed bugs (B1, B2, B3, B4, B5, B7) with expected, actual, discovery, and root cause
- [x] Confirmed bugs fixed: B1, B2, B3, B4, B7 (B5 documented and intentionally left unfixed)
- [x] `PATCH /tasks/:id/assign` implemented **with tests** (unit & integration)
- [x] `SUBMISSION_NOTES.md` — assign design decisions, what I'd test next, what surprised me, production questions
- [ ] Pushed to my fork/branch, link ready to share

---

## 9. Step-by-step execution plan

| Step | Task | Status | Output / Notes |
|---|---|---|---|
| 1 | Create branch `solution`; `cd task-api && npm install`; run `npm start` and hit each endpoint with curl; confirm `npm test` runs (no tests yet) | **Complete** | Working environment established on branch `solution`. |
| 2 | Write `tests/taskService.test.js` (in small batches: 2.1–2.4) | **Complete** | 38 unit tests covering all service functions. |
| 3 | Write `tests/validators.test.js` | **Complete** | 35 validator unit tests covering create/update validators. |
| 4 | Write `tests/tasks.integration.test.js` (Supertest) | **Complete** | 25 integration tests covering all HTTP endpoints. |
| 5 | Run `npm test` + `npm run coverage`; save failing output (evidence for B1–B5, B7) and coverage summary | **Complete** | Baseline evidence recorded in `TEST_EVIDENCE.md` (79 passed, 19 failed). |
| 6 | Write `BUG_REPORT.md` from the confirmed failures | **Complete** | Detailed report of confirmed bugs (B1, B2, B3, B4, B5, B7) and unconfirmed observations. |
| 7 | Fix confirmed bugs: B1 (pagination), B2 (status match), B3 (priority reset), B4 (JSON 400), B7 (filter + pagination) | **Complete** | B1–B4 and B7 fixed with regression tests green. B5 documented and left intentionally unfixed. |
| 8 | Part C: Assignment feature (tests first → validator → service → route) | **Complete** | Implemented `PATCH /tasks/:id/assign`, `validateAssignTask`, and `assignTask(id, assignee)` with 10 integration and 14 unit tests. |
| 9 | Re-run full suite + coverage; verify metrics ≥ 80% | **Complete** | 116/122 passed (only 6 B5 tests fail). Coverage: 97.50% stmts, 93.81% branch, 96.66% funcs, 97.26% lines. |
| 10 | Finalize test evidence, update bug report status, create `SUBMISSION_NOTES.md` | **Complete** | Documentation updated and verified. |

---

## 10. Submission note — points to cover (my own words in the end)

- **What I'd test next:** pagination edge cases (0, negative, huge, non-numeric), combined filter + pagination, invalid query params, concurrent updates, `PUT` field whitelisting, error-handler paths, persistence once a DB replaces the in-memory store.
- **What surprised me:** README vs code status names mismatch; the substring status filter; the hard-coded priority reset on completion; one bad `POST` (`status: null`) breaking the filter for all users; malformed JSON reported as a 500.
- **Questions before production:** Is reassignment allowed? Should assignees be validated against a users table? Should pagination/filter inputs return 400 when invalid, and what max `limit`? Auth/authorization model? Persistence and concurrency strategy? Standard error format? Logging/monitoring and rate limiting?

---

## 11. Quick reference

- Valid statuses: `todo`, `in_progress`, `done`
- Valid priorities: `low`, `medium`, `high`
- Error format: `{ "error": "message" }`
- Status codes in use: 200, 201, 204, 400, 404, 500
- Contact/profile context for the eventual submission: Anuj Chahar — fork at `github.com/Anuj-135/Take-Home-Assignment-The-Untested-API`