# BUG_REPORT.md — The Untested API

## Executive Summary

This bug report documents defects discovered and confirmed through automated unit and integration tests written against the Task Manager API (`task-api/`).

### Test Suite Baseline (Pre-Fix)
- **Total Test Suites**: 3
- **Total Tests**: 98
- **Passed**: 79
- **Failed**: 19 (each failure directly maps to an identified defect below)
- **Code Coverage**:
  - **Statements**: 98.5%
  - **Branches**: 94.66%
  - **Functions**: 96.15%
  - **Lines**: 98.36%

Full test execution logs and coverage tables are preserved in [`TEST_EVIDENCE.md`](file:///c:/Users/anuj%20chahar/Downloads/assignment/Take-Home-Assignment-The-Untested-API/TEST_EVIDENCE.md).

---

## Confirmed Defects

---

### B1 — Pagination Offset Formula Skips First Page and Breaks Boundaries

- **Bug ID**: B1
- **Location**: [`task-api/src/services/taskService.js`](file:///c:/Users/anuj%20chahar/Downloads/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L11-L14) (`getPaginated`)
- **Current Behavior**:
  The offset calculation uses:
  ```javascript
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
  ```
  Because the API route treats `page` as 1-based (`pageNum = parseInt(page) || 1`), page 1 calculates `offset = 1 * limit`, skipping the first `limit` items.
- **Expected Behavior**:
  Page numbers are 1-based. `page=1` must return the first page of results (indices `0` to `limit - 1`). The offset formula for 1-based indexing is `(page - 1) * limit`.
- **Reproduction / Test Scenario**:
  Create 5 tasks in order (Task 1 to Task 5). Request page 1 with limit 2: `taskService.getPaginated(1, 2)` or `GET /tasks?page=1&limit=2`. Request page 1 with limit 10 (`limit >= totalTasks`).
- **Actual Result**:
  - `page=1&limit=2` returns `[Task 3, Task 4]` instead of `[Task 1, Task 2]`.
  - `page=2&limit=2` returns `[Task 5]` instead of `[Task 3, Task 4]`.
  - `page=1&limit=10` calculates `offset = 10` and returns `[]` instead of all 5 tasks.
- **Evidence Reference**:
  - `tests/taskService.test.js`: `getPaginated() › returns first page (Task 1, Task 2) for page 1 and limit 2`
  - `tests/taskService.test.js`: `getPaginated() › returns second page (Task 3, Task 4) for page 2 and limit 2`
  - `tests/taskService.test.js`: `getPaginated() › returns all 5 tasks when limit is larger than total count`
  - `tests/tasks.integration.test.js`: `GET /tasks?page=...&limit=... › returns the first two tasks for page 1 with limit 2 (B1)`
  - `tests/tasks.integration.test.js`: `GET /tasks?page=...&limit=... › returns the next two tasks for page 2 with limit 2 (B1)`
  - `tests/tasks.integration.test.js`: `GET /tasks?page=...&limit=... › returns all tasks when limit is larger than total count (B1)`
- **Impact**:
  The first page of items is permanently unreachable. When requesting items with a default limit of 10 on a store with fewer than 10 items, the client receives an empty array, giving the false appearance that no tasks exist.
- **Suggested Fix Direction**:
  Update `taskService.js` to calculate offset using 1-based indexing:
  ```javascript
  const offset = (page - 1) * limit;
  ```

---

### B2 — Status Filtering Uses Substring Matching Instead of Exact Match

- **Bug ID**: B2
- **Location**: [`task-api/src/services/taskService.js`](file:///c:/Users/anuj%20chahar/Downloads/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L9) (`getByStatus`)
- **Current Behavior**:
  The function filters using `.includes()`:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Expected Behavior**:
  Status filtering should strictly match the requested status value (`t.status === status`).
- **Reproduction / Test Scenario**:
  Populate store with tasks having statuses `todo`, `in_progress`, and `done`. Query status `"do"` via `taskService.getByStatus('do')` or `GET /tasks?status=do`.
- **Actual Result**:
  Returns both `todo` and `done` tasks because the substring `"do"` exists in both `"todo"` and `"done"`.
- **Evidence Reference**:
  - `tests/taskService.test.js`: `getByStatus() › returns empty array when querying with a substring like "do"`
  - `tests/tasks.integration.test.js`: `GET /tasks?status=... › returns empty array when querying with a substring like "do" (B2)`
- **Impact**:
  Clients receive tasks belonging to categories they did not request. For example, querying for pending/todo work can accidentally return completed work.
- **Suggested Fix Direction**:
  Use strict equality comparison:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### B3 — Completing a Task Resets Priority to 'medium'

- **Bug ID**: B3
- **Location**: [`task-api/src/services/taskService.js`](file:///c:/Users/anuj%20chahar/Downloads/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L67-L72) (`completeTask`)
- **Current Behavior**:
  `completeTask` unconditionally hardcodes `priority: 'medium'`:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **Expected Behavior**:
  Marking a task as complete should update `status` to `'done'` and set `completedAt`, but leave the existing task `priority` unchanged.
- **Reproduction / Test Scenario**:
  Create a task with `priority: 'high'` or `priority: 'low'`. Call `taskService.completeTask(id)` or send `PATCH /tasks/:id/complete`.
- **Actual Result**:
  The returned task has `priority: 'medium'`, losing the original priority level.
- **Evidence Reference**:
  - `tests/taskService.test.js`: `completeTask() › preserves priority when completing a high-priority task`
  - `tests/taskService.test.js`: `completeTask() › preserves priority when completing a low-priority task`
  - `tests/tasks.integration.test.js`: `PATCH /tasks/:id/complete › preserves priority when completing a high-priority task (B3)`
- **Impact**:
  Data loss. Historical priority classification is corrupted when tasks are marked complete, invalidating metrics, audit logs, or reporting based on task priority.
- **Suggested Fix Direction**:
  Remove `priority: 'medium'` from the `updated` object in `completeTask`:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

### B4 — Malformed JSON Request Returns 500 Internal Server Error

- **Bug ID**: B4
- **Location**: [`task-api/src/app.js`](file:///c:/Users/anuj%20chahar/Downloads/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/app.js#L9-L12) (Error-handling middleware)
- **Current Behavior**:
  When `express.json()` encounters invalid JSON syntax, it raises a `SyntaxError` carrying status code 400. However, the custom global error handler ignores the error properties and always returns 500:
  ```javascript
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```
- **Expected Behavior**:
  Client-generated syntax errors should return HTTP 400 (Bad Request) with a descriptive error payload. Only unexpected server-side exceptions should return HTTP 500.
- **Reproduction / Test Scenario**:
  Send an unclosed or malformed JSON payload (`{"title": "broken`) with `Content-Type: application/json` to `POST /tasks`.
- **Actual Result**:
  API returns HTTP status `500` with `{ error: 'Internal server error' }`.
- **Evidence Reference**:
  - `tests/tasks.integration.test.js`: `Malformed JSON handling (B4) › responds with 400 Bad Request instead of 500 on malformed JSON payload`
- **Impact**:
  Clients and API consumers cannot distinguish between their own formatting errors and server outages. Monitoring systems (e.g. Sentry, Datadog) trigger false alerts for internal server failure when users send bad input.
- **Suggested Fix Direction**:
  Check `err.status` or `err.statusCode` in the error middleware:
  ```javascript
  app.use((err, req, res, next) => {
    if (err.status && err.status >= 400 && err.status < 500) {
      return res.status(err.status).json({ error: err.message || 'Invalid request body' });
    }
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```

---

### B5 — Falsy Values Bypass Validator Truthiness Checks

- **Bug ID**: B5
- **Location**: [`task-api/src/utils/validators.js`](file:///c:/Users/anuj%20chahar/Downloads/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/utils/validators.js#L8-L16) (`validateCreateTask`, `validateUpdateTask`)
- **Current Behavior**:
  Field validation relies on truthiness checks:
  ```javascript
  if (body.status && !VALID_STATUSES.includes(body.status)) ...
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) ...
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) ...
  ```
  When an empty string `""` is supplied, `body.status` evaluates to falsy, skipping the validation condition and returning `null` (success).
- **Expected Behavior**:
  While omitting optional fields (`undefined`) is valid, explicitly providing invalid values such as `""` for categorical fields like `status` or `priority` or date fields like `dueDate` must be rejected with an appropriate validation message.
- **Reproduction / Test Scenario**:
  Call `validateCreateTask` or `validateUpdateTask` with `{ title: 'Task', status: '' }`, `{ title: 'Task', priority: '' }`, or `{ title: 'Task', dueDate: '' }`.
- **Actual Result**:
  Validators return `null` instead of an error message string.
- **Evidence Reference**:
  - `tests/validators.test.js`: `validateCreateTask() › status validation › rejects empty string status ("")`
  - `tests/validators.test.js`: `validateCreateTask() › priority validation › rejects empty string priority ("")`
  - `tests/validators.test.js`: `validateCreateTask() › dueDate validation › rejects empty string dueDate ("")`
  - `tests/validators.test.js`: `validateUpdateTask() › status validation › rejects empty string status ("")`
  - `tests/validators.test.js`: `validateUpdateTask() › priority validation › rejects empty string priority ("")`
  - `tests/validators.test.js`: `validateUpdateTask() › dueDate validation › rejects empty string dueDate ("")`
- **Impact**:
  Invalid data enters the service store. In particular, storing empty or non-standard status values will corrupt reporting and cause `GET /tasks?status=...` to produce unexpected results or runtime exceptions.
- **Suggested Fix Direction**:
  Validate when fields are explicitly provided (`!== undefined`), rather than checking truthiness:
  ```javascript
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  ```

---

### B7 — Status Filtering and Pagination Parameters Cannot Be Combined

- **Bug ID**: B7
- **Location**: [`task-api/src/routes/tasks.js`](file:///c:/Users/anuj%20chahar/Downloads/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/routes/tasks.js#L14-L24) (`GET /tasks`)
- **Current Behavior**:
  The route returns early when `status` is supplied:
  ```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    ...
  }
  ```
  Any accompanying `page` or `limit` parameters are completely ignored.
- **Expected Behavior**:
  Filter and pagination query parameters should work together. Requesting `GET /tasks?status=todo&page=1&limit=2` should return the first 2 tasks that match status `todo`.
- **Reproduction / Test Scenario**:
  Create three tasks with `status: 'todo'` and one task with `status: 'done'`. Send `GET /tasks?status=todo&page=1&limit=2`.
- **Actual Result**:
  Returns all 3 `todo` tasks; pagination parameters `page=1&limit=2` are disregarded.
- **Evidence Reference**:
  - `tests/tasks.integration.test.js`: `Filter + Pagination interaction (B7) › applies pagination to filtered status results when both status and pagination params are supplied`
- **Impact**:
  Clients cannot paginate through filtered subsets. If a project has 5,000 completed tasks, requesting `?status=done&limit=20` returns all 5,000 tasks at once.
- **Suggested Fix Direction**:
  Refactor `GET /tasks` in `routes/tasks.js` to filter first, then paginate the resulting collection before responding:
  ```javascript
  router.get('/', (req, res) => {
    const { status, page, limit } = req.query;
    let tasks = status ? taskService.getByStatus(status) : taskService.getAll();

    if (page !== undefined || limit !== undefined) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;
      tasks = tasks.slice(offset, offset + limitNum);
    }

    res.json(tasks);
  });
  ```

---

## Not Confirmed / Observations for Future Consideration

The following items were identified as architectural questions or design observations during code analysis, but are **not** classified as confirmed defects under the current test suite or specification:

1. **B6 — `update()` Unrestricted Object Merge**:
   `taskService.update` performs a shallow merge (`{ ...tasks[index], ...fields }`). This allows callers to overwrite fields such as `id` or add arbitrary properties. Current API routes do not sanitize input fields against a strict whitelist.
2. **B8 — Pagination Parameter Boundary Validation**:
   Passing negative values (e.g. `page=-1`) or non-numeric strings falls back to default parsing rather than returning a strict HTTP 400 Bad Request.
3. **B9 — `completedAt` Synchronization on Manual Update**:
   Updating a task via `PUT /tasks/:id` with `{ status: 'done' }` does not automatically populate `completedAt`, and reverting a task from `done` to `todo` does not clear `completedAt`.
4. **B10 — In-Memory Object Reference Sharing**:
   `getAll()` returns a shallow copy of the tasks array (`[...tasks]`), but the task objects themselves are references. Direct external mutations can theoretically affect the internal store.

---

## Summary Table of Confirmed Bugs

| Bug ID | Title | File Location | Key Failing Test Suite | Root Cause | Status |
|---|---|---|---|---|---|
| **B1** | Pagination offset calculation | `services/taskService.js:12` | `taskService.test.js`, `tasks.integration.test.js` | 1-based page index multiplied directly without `(page - 1)` | **Fixed** (Step 7.1) |
| **B2** | Substring status matching | `services/taskService.js:9` | `taskService.test.js`, `tasks.integration.test.js` | `.includes()` used instead of `===` | **Fixed** (Step 7.2) |
| **B3** | Task completion priority reset | `services/taskService.js:69` | `taskService.test.js`, `tasks.integration.test.js` | Hardcoded `priority: 'medium'` in update payload | **Fixed** (Step 7.3) |
| **B4** | Malformed JSON returns 500 | `app.js:9-12` | `tasks.integration.test.js` | Error handler unconditionally sends 500 | **Fixed** (Step 7.4) |
| **B5** | Falsy validation bypass | `utils/validators.js:8, 11, 14` | `validators.test.js` | Truthiness check `body.status &&` skips empty strings | **Confirmed — Currently Unfixed** |
| **B7** | Filter and pagination conflict | `routes/tasks.js:14-17` | `tasks.integration.test.js` | Early return on `status` skips pagination logic | **Fixed** (Step 7.5) |
