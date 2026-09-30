# Test Failure Evidence & Coverage Summary (Step 5)

Generated before fixing bugs or implementing new features.
Execution Date: 2026-09-30

---

## 1. Test Suite Execution Summary

- **Commands Executed**:
  - `npm test -- --runInBand`
  - `npm run coverage -- --runInBand`
- **Working Directory**: `task-api/`
- **Total Test Suites**: `3` (3 failed, 0 passed)
  - `tests/taskService.test.js` (Failed - 6 failed, 32 passed)
  - `tests/validators.test.js` (Failed - 6 failed, 29 passed)
  - `tests/tasks.integration.test.js` (Failed - 7 failed, 18 passed)
- **Total Tests**: `98`
  - **Passed**: `79`
  - **Failed**: `19`
  - **Skipped**: `0`

---

## 2. Jest Code Coverage Summary

Target: ≥ 80% coverage across statements, branches, functions, and lines.

```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |    98.5 |    94.66 |   96.15 |   98.36 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18             
 src/routes      |     100 |       90 |     100 |     100 |                   
  tasks.js       |     100 |       90 |     100 |     100 | 20-21             
 src/services    |     100 |    94.11 |     100 |     100 |                   
  taskService.js |     100 |    94.11 |     100 |     100 | 22                
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
```

> **Note on uncovered lines**:
> - `app.js:17-18`: `app.listen(PORT, ...)` only executes when `require.main === module`, not under test.
> - `tasks.js:20-21`: Default fallback values `|| 1` and `|| 10` when `page` or `limit` are undefined / evaluate to NaN.
> - `taskService.js:22`: Safety check `if (counts[t.status] !== undefined)` for tasks with uncounted/unknown status.

---

## 3. Breakdown of Confirmed Test Failures (19 Total)

### Bug B1 — Pagination Offset Formula (`offset = page * limit`)
Location: `src/services/taskService.js:12`
1. `tests/taskService.test.js` › `getPaginated()` › `returns first page (Task 1, Task 2) for page 1 and limit 2`
   - *Expected `[Task 1, Task 2]`, received `[Task 3, Task 4]`.*
2. `tests/taskService.test.js` › `getPaginated()` › `returns second page (Task 3, Task 4) for page 2 and limit 2`
   - *Expected `[Task 3, Task 4]`, received `[Task 5]`.*
3. `tests/taskService.test.js` › `getPaginated()` › `returns all 5 tasks when limit is larger than total count`
   - *Expected all 5 tasks, received `[]`.*
4. `tests/tasks.integration.test.js` › `GET /tasks?page=...&limit=...` › `returns the first two tasks for page 1 with limit 2 (B1)`
   - *Expected `[Task 1, Task 2]`, received `[Task 3, Task 4]`.*
5. `tests/tasks.integration.test.js` › `GET /tasks?page=...&limit=...` › `returns the next two tasks for page 2 with limit 2 (B1)`
   - *Expected `[Task 3, Task 4]`, received `[Task 5]`.*
6. `tests/tasks.integration.test.js` › `GET /tasks?page=...&limit=...` › `returns all tasks when limit is larger than total count (B1)`
   - *Expected all 5 tasks, received `[]`.*

### Bug B2 — Substring Status Matching (`t.status.includes(status)`)
Location: `src/services/taskService.js:9`
7. `tests/taskService.test.js` › `getByStatus()` › `returns empty array when querying with a substring like "do"`
   - *Expected `[]`, received `todo` and `done` tasks.*
8. `tests/tasks.integration.test.js` › `GET /tasks?status=...` › `returns empty array when querying with a substring like "do" (B2)`
   - *Expected `[]`, received `todo` and `done` tasks via HTTP.*

### Bug B3 — Task Completion Hardcodes `priority: 'medium'`
Location: `src/services/taskService.js:69`
9. `tests/taskService.test.js` › `completeTask()` › `preserves priority when completing a high-priority task`
   - *Expected `"high"`, received `"medium"`.*
10. `tests/taskService.test.js` › `completeTask()` › `preserves priority when completing a low-priority task`
    - *Expected `"low"`, received `"medium"`.*
11. `tests/tasks.integration.test.js` › `PATCH /tasks/:id/complete` › `preserves priority when completing a high-priority task (B3)`
    - *Expected `"high"`, received `"medium"`.*

### Bug B4 — Malformed JSON Payload Responds with 500
Location: `src/app.js:9-12`
12. `tests/tasks.integration.test.js` › `Malformed JSON handling (B4)` › `responds with 400 Bad Request instead of 500 on malformed JSON payload`
    - *Expected `400`, received `500`.*

### Bug B5 — Falsy Values Bypass Validator Truthiness Checks (`body.status && ...`)
Location: `src/utils/validators.js:8, 11, 14, 24, 27, 30`
13. `tests/validators.test.js` › `validateCreateTask()` › `status validation` › `rejects empty string status ("")`
    - *Expected error message, received `null`.*
14. `tests/validators.test.js` › `validateCreateTask()` › `priority validation` › `rejects empty string priority ("")`
    - *Expected error message, received `null`.*
15. `tests/validators.test.js` › `validateCreateTask()` › `dueDate validation` › `rejects empty string dueDate ("")`
    - *Expected error message, received `null`.*
16. `tests/validators.test.js` › `validateUpdateTask()` › `status validation` › `rejects empty string status ("")`
    - *Expected error message, received `null`.*
17. `tests/validators.test.js` › `validateUpdateTask()` › `priority validation` › `rejects empty string priority ("")`
    - *Expected error message, received `null`.*
18. `tests/validators.test.js` › `validateUpdateTask()` › `dueDate validation` › `rejects empty string dueDate ("")`
    - *Expected error message, received `null`.*

### Bug B7 — Status Filtering and Pagination Cannot Combine
Location: `src/routes/tasks.js:14-17`
19. `tests/tasks.integration.test.js` › `Filter + Pagination interaction (B7)` › `applies pagination to filtered status results when both status and pagination params are supplied`
    - *Expected length 2, received length 3 because `status` filter returned early, completely ignoring `page` and `limit`.*

---

## 4. Raw Output Logs

Raw unedited terminal logs are preserved in:
- `task-api/test-run.log`
- `task-api/coverage-run.log`

---

## 5. Final Verification Results (Post-Fix & Feature Implementation)

Execution Date: 2026-09-30
Commands: `npm test -- --runInBand` and `npm run coverage -- --runInBand`

### Test Suite Execution Summary
- **Total Test Suites**: 3 (1 failed, 2 passed)
  - `tests/taskService.test.js`: **44/44 passed** (100%)
  - `tests/tasks.integration.test.js`: **35/35 passed** (100%)
  - `tests/validators.test.js`: **37/43 passed** (6 failed)
- **Total Tests**: `122`
  - **Passed**: `116`
  - **Failed**: `6`
  - **Skipped**: `0`

### Successful Focused Suites
- **Service Unit Tests (`taskService.test.js`)**: 44/44 passing (includes 6/6 new `assignTask` service tests, with zero regressions across B1, B2, and B3).
- **Integration Tests (`tasks.integration.test.js`)**: 35/35 passing (includes 10/10 new `PATCH /tasks/:id/assign` tests, with zero regressions across B1, B2, B3, B4, and B7).
- **Assignment Validation Tests (`validators.test.js`)**: 8/8 passing (`validateAssignTask` unit tests).

### Explanation of Remaining Failures (Known Defect B5)
The **only 6 failures** in the entire 122-test suite correspond strictly to the confirmed and intentionally unfixed defect **B5** (falsy values bypassing truthiness checks in `validateCreateTask` and `validateUpdateTask`):
1. `validateCreateTask()` › status validation › `rejects empty string status ("")`
2. `validateCreateTask()` › priority validation › `rejects empty string priority ("")`
3. `validateCreateTask()` › dueDate validation › `rejects empty string dueDate ("")`
4. `validateUpdateTask()` › status validation › `rejects empty string status ("")`
5. `validateUpdateTask()` › priority validation › `rejects empty string priority ("")`
6. `validateUpdateTask()` › dueDate validation › `rejects empty string dueDate ("")`

All 6 of these tests remain intentionally unfixed in accordance with assignment guidelines.

### Final Code Coverage Summary

Target: ≥ 80% coverage across statements, branches, functions, and lines.

```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |    97.5 |    93.81 |   96.66 |   97.26 |                   
 src             |   73.33 |    77.77 |      50 |   73.33 |                   
  app.js         |   73.33 |    77.77 |      50 |   73.33 | 13-14,20-21       
 src/routes      |     100 |    92.85 |     100 |     100 |                   
  tasks.js       |     100 |    92.85 |     100 |     100 | 16-17             
 src/services    |     100 |    90.47 |     100 |     100 |                   
  taskService.js |     100 |    90.47 |     100 |     100 | 22,84             
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
```

#### Verification Against the 80% Requirement:
| Metric | Final Result | Requirement | Status |
| :--- | :--- | :--- | :--- |
| **Statements** | **97.50%** | $\ge 80\%$ | **PASS** (Exceeds requirement) |
| **Branches** | **93.81%** | $\ge 80\%$ | **PASS** (Exceeds requirement) |
| **Functions** | **96.66%** | $\ge 80\%$ | **PASS** (Exceeds requirement) |
| **Lines** | **97.26%** | $\ge 80\%$ | **PASS** (Exceeds requirement) |

