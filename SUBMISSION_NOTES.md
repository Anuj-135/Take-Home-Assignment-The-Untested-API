# Submission Notes — The Untested API

**Candidate:** Anuj Chahar  
**Repository:** [Take-Home-Assignment-The-Untested-API](https://github.com/Anuj-135/Take-Home-Assignment-The-Untested-API)  
**Branch:** `solution`  
**Stack:** Node.js, Express, Jest, Supertest  

---

## 1. Overview of Work Completed

1. **Automated Testing Suite (122 Tests)**
   - **Service Unit Tests (`tests/taskService.test.js` - 44 tests)**: Direct unit tests for all `taskService` functions (`create`, `getAll`, `findById`, `getByStatus`, `getPaginated`, `getStats`, `update`, `remove`, `completeTask`, `assignTask`).
   - **Validator Unit Tests (`tests/validators.test.js` - 43 tests)**: Exhaustive boundary and type validation tests for `validateCreateTask`, `validateUpdateTask`, and `validateAssignTask`.
   - **Integration Tests (`tests/tasks.integration.test.js` - 35 tests)**: End-to-end HTTP API tests using Supertest covering all endpoints, query parameter handling, status codes (200, 201, 204, 400, 404), error formatting, and middleware.

2. **Code Coverage Achieved**
   All metrics substantially exceed the assignment requirement of **≥ 80%**:
   - **Statements:** **97.50%**
   - **Branches:** **93.81%**
   - **Functions:** **96.66%**
   - **Lines:** **97.26%**

3. **Confirmed Bugs Found**
   Six distinct bugs were identified and proven with failing tests:
   - **B1**: Pagination offset formula `offset = page * limit` skipped the first page.
   - **B2**: Status filtering used `.includes(status)` substring matching instead of exact equality.
   - **B3**: Task completion unconditionally reset task priority to `'medium'`.
   - **B4**: Malformed JSON bodies triggered 500 Internal Server Error instead of 400 Bad Request.
   - **B5**: Falsy values (`""`) bypassed validator truthiness checks (`body.status && ...`).
   - **B7**: `GET /tasks` returned early on `status`, completely ignoring `page` and `limit`.

4. **Bugs Fixed**
   Five bugs were fixed with clean, minimal patches and zero regressions:
   - **B1 Fixed** (`taskService.js`): Corrected offset to `(page - 1) * limit`.
   - **B2 Fixed** (`taskService.js`): Strict equality `t.status === status`.
   - **B3 Fixed** (`taskService.js`): Preserved existing task priority on completion.
   - **B4 Fixed** (`app.js`): Middleware catches 4xx syntax errors and responds with 400.
   - **B7 Fixed** (`routes/tasks.js`): Unified filtering and pagination in `GET /tasks`.

5. **New Feature Implemented: `PATCH /tasks/:id/assign`**
   - **Route:** `PATCH /tasks/:id/assign`
   - **Validator:** `validateAssignTask` ensures `assignee` is present and a non-empty string; returns 400 with `{ error: 'assignee is required and must be a non-empty string' }` for missing, non-string, empty, or whitespace-only inputs.
   - **Service:** `assignTask(id, assignee)` trims leading and trailing whitespace, updates the task, allows reassignment, preserves completed task status, preserves all unrelated fields, and returns `null` if not found.
   - **Status Codes:** Returns 200 with updated task on success; returns 404 `{ error: 'Task not found' }` if task ID does not exist; returns 400 on invalid input.

---

## 2. Final Test Status & Remaining Known Failures

- **Total Tests:** 122
- **Passed:** 116
- **Failed:** 6
- **Skipped:** 0

### Remaining Known Failures (Defect B5)
The test suite **does not 100% pass**, and this is deliberate. The 6 failing tests correspond exclusively to **Defect B5** in `tests/validators.test.js`, where empty strings `""` evaluate to falsy and bypass truthiness checks in `validateCreateTask` and `validateUpdateTask`:
- `validateCreateTask()` › status validation › `rejects empty string status ("")`
- `validateCreateTask()` › priority validation › `rejects empty string priority ("")`
- `validateCreateTask()` › dueDate validation › `rejects empty string dueDate ("")`
- `validateUpdateTask()` › status validation › `rejects empty string status ("")`
- `validateUpdateTask()` › priority validation › `rejects empty string priority ("")`
- `validateUpdateTask()` › dueDate validation › `rejects empty string dueDate ("")`

As instructed, B5 was documented in `BUG_REPORT.md` and intentionally left unfixed to preserve focused bug fixing scope.

All other test suites are completely green:
- `taskService.test.js`: **44/44 passed**
- `tasks.integration.test.js`: **35/35 passed**
- `validateAssignTask` unit tests: **8/8 passed**

---

## 3. Assignment Design Decisions (`PATCH /tasks/:id/assign`)

| Decision | Chosen Behavior | Rationale |
|---|---|---|
| **Input Validation** | Rejects missing, non-string, empty, or whitespace-only strings with 400. | Assigning an empty or whitespace name provides no accountability. Tasks should remain in their previous state upon invalid input. |
| **Whitespace Normalization** | Trims surrounding whitespace at service level (`assignee.trim()`). | Storing `'Alice'` instead of `'  Alice  '` prevents duplicate or misleading entries while preserving intentional internal spaces (e.g., `'Alice Smith'`). Trimming in the service keeps normalization centralized. |
| **Reassignment** | Allowed (overwrites previous assignee). | Tasks frequently change owners during project lifecycles. Forbidding reassignment (e.g., returning 409 Conflict) would permanently lock the task without an explicit reassignment API. |
| **Completed Tasks** | Allowed (preserves `done` status and `completedAt`). | Completing a task does not preclude retroactively recording or correcting who performed the work. |
| **Unknown Task ID** | Returns 404 `{ error: 'Task not found' }`. | Consistent with `PUT /tasks/:id` and `PATCH /tasks/:id/complete`. |
| **Separation of Concerns** | Route validates shape (`validateAssignTask`); service normalizes and mutates (`assignTask`). | Adheres to the established architectural layer separation in the codebase. |

---

## 4. What I'd Test Next (With More Time)

1. **Pagination Boundary & Fuzz Testing**:
   - Test non-integer and negative inputs (`page=-1`, `limit=abc`).
   - Test boundary limits: very large values (`limit=1000000`) and enforce an upper limit (e.g., max 100 items per page) to prevent denial-of-service memory exhaustion.
2. **Input Sanitization & Mass-Assignment Protection (Observation B6)**:
   - `PUT /tasks/:id` currently performs an unrestricted object merge (`{ ...existing, ...fields }`). Write tests ensuring clients cannot overwrite immutable fields (`id`, `createdAt`, `completedAt`) or inject arbitrary keys via `PUT`.
3. **Concurrent Operations & Race Conditions**:
   - Simulate parallel requests updating, assigning, and completing the same task simultaneously to test state consistency.
4. **Database Integration & Persistence Lifecycle**:
   - Once a persistent database replaces the in-memory array, write repository-level transaction tests, connection failure retries, and data migration tests.
5. **Security & Header Validation**:
   - Test payload size limits, CORS policies, security headers (Helmet), and rate-limiting responses (429 Too Many Requests).

---

## 5. Anything That Surprised Me in the Codebase

1. **Documentation vs. Code Discrepancy**:
   - `README.md` documents status values as `pending`, `in-progress`, and `completed` with sample curls like `?status=pending`. However, the actual application code (`src/utils/validators.js`) and `ASSIGNMENT.md` strictly require `todo`, `in_progress`, and `done`. Querying `?status=pending` against the existing code returns an empty array.
2. **Substring Status Filter (`t.status.includes(status)`)**:
   - Using `.includes()` rather than strict equality meant querying `?status=do` matched both `todo` and `done`. This was a subtle defect that would easily go unnoticed without automated tests.
3. **Priority Reset on Completion**:
   - `completeTask()` explicitly hardcoded `priority: 'medium'`, which silently downgraded high-priority tasks and corrupted historical priority tracking.
4. **Unhandled JSON Parse Errors**:
   - Express's built-in `express.json()` generates a 400 Bad Request error when client payloads contain invalid JSON, but the custom error handler discarded `err.status` and defaulted every exception to 500 Internal Server Error.
5. **Early Return Discarding Query Parameters**:
   - In `routes/tasks.js`, `if (status)` returned immediately, completely ignoring pagination parameters (`page` and `limit`) whenever a status filter was applied.

---

## 6. Questions I'd Ask Before Shipping to Production

1. **Persistence & Data Architecture**:
   - When is the migration from the in-memory array to a persistent relational database (e.g., PostgreSQL) scheduled, and what ORM/query builder (e.g., Prisma, Kysely) will be used?
2. **User Identity & Assignment Semantics**:
   - Should `assignee` continue to be an arbitrary free-text string, or should it validate against a formal `User` entity or UUID from an authentication service?
   - Should an explicit unassignment feature (`assignee: null` or `DELETE /tasks/:id/assignee`) be supported?
3. **Concurrency Control**:
   - How should conflicting simultaneous updates be handled? Should we implement optimistic locking using an `updatedAt` timestamp or an `ETag` / `If-Match` header?
4. **API Standards & Error Contract**:
   - Should all API errors standardize on RFC 7807 (Problem Details for HTTP APIs) or maintain the current `{ "error": "message" }` format?
   - Should invalid query parameters (such as `page=-5` or unknown query keys) strictly return 400 Bad Request rather than silently falling back to defaults?
5. **Observability & Operational Readiness**:
   - What structured logging (e.g., Pino/Winston) and metrics instrumentation (e.g., Prometheus/OpenTelemetry) should be integrated?
   - What rate-limiting thresholds and security headers are required before exposing the service publicly?
