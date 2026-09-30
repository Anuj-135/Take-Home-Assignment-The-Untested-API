const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('returns 200 and an empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([]);
    });

    it('returns 200 and all created tasks', async () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body).toEqual([task1, task2]);
    });
  });

  describe('POST /tasks', () => {
    it('creates a task and returns 201 with generated id and defaults', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Integration Task' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('string');
      expect(res.body.title).toBe('New Integration Task');
      expect(res.body.description).toBe('');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body).toHaveProperty('createdAt');
    });

    it('returns 400 when title is missing or empty', async () => {
      const resMissing = await request(app).post('/tasks').send({});
      expect(resMissing.status).toBe(400);
      expect(resMissing.body).toHaveProperty('error');

      const resEmpty = await request(app).post('/tasks').send({ title: '   ' });
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body).toHaveProperty('error');
    });

    it('returns 400 when status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'invalid_priority' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when dueDate is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /tasks?status=...', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task In Progress', status: 'in_progress' });
      taskService.create({ title: 'Task Done', status: 'done' });
    });

    it('filters tasks by exact status via HTTP query param', async () => {
      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task In Progress');
      expect(res.body[0].status).toBe('in_progress');
    });

    it('returns empty array when querying an unknown or non-matching status', async () => {
      const res = await request(app).get('/tasks?status=nonexistent');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns empty array when querying with a substring like "do" (B2)', async () => {
      const res = await request(app).get('/tasks?status=do');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?page=...&limit=...', () => {
    let task1, task2, task3, task4, task5;

    beforeEach(() => {
      task1 = taskService.create({ title: 'Task 1' });
      task2 = taskService.create({ title: 'Task 2' });
      task3 = taskService.create({ title: 'Task 3' });
      task4 = taskService.create({ title: 'Task 4' });
      task5 = taskService.create({ title: 'Task 5' });
    });

    it('returns the first two tasks for page 1 with limit 2 (B1)', async () => {
      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([task1, task2]);
    });

    it('returns the next two tasks for page 2 with limit 2 (B1)', async () => {
      const res = await request(app).get('/tasks?page=2&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([task3, task4]);
    });

    it('returns all tasks when limit is larger than total count (B1)', async () => {
      const res = await request(app).get('/tasks?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([task1, task2, task3, task4, task5]);
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns 200 with accurate status and overdue counts', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo Overdue', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done', dueDate: pastDate });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates an existing task and returns 200 with updated task', async () => {
      const task = taskService.create({ title: 'Original Title' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('Updated Title');
    });

    it('performs partial update and preserves other fields', async () => {
      const task = taskService.create({
        title: 'Original Title',
        description: 'Original Description',
        priority: 'high',
      });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ description: 'New Description' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Original Title');
      expect(res.body.description).toBe('New Description');
      expect(res.body.priority).toBe('high');
    });

    it('returns 404 when updating non-existent task ID', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('returns 400 when update payload fails validation', async () => {
      const task = taskService.create({ title: 'Valid Title' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('marks an existing task as done and sets completedAt', async () => {
      const task = taskService.create({ title: 'Task to finish' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.status).toBe('done');
      expect(typeof res.body.completedAt).toBe('string');
      expect(Number.isNaN(Date.parse(res.body.completedAt))).toBe(false);
    });

    it('preserves priority when completing a high-priority task (B3)', async () => {
      const task = taskService.create({
        title: 'Urgent Task',
        priority: 'high',
      });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('high');
    });

    it('returns 404 when completing non-existent task ID', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes an existing task and returns 204', async () => {
      const task = taskService.create({ title: 'Task to delete' });
      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('returns 404 when deleting a non-existent task ID', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('Malformed JSON handling (B4)', () => {
    it('responds with 400 Bad Request instead of 500 on malformed JSON payload', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title": "Unclosed string');

      consoleErrorSpy.mockRestore();

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Filter + Pagination interaction (B7)', () => {
    it('applies pagination to filtered status results when both status and pagination params are supplied', async () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'Todo 3', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Todo 1');
      expect(res.body[1].title).toBe('Todo 2');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('assigns a task and returns 200 with updated assignee', async () => {
      const task = taskService.create({ title: 'Task to assign' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Alice');
    });

    it('returns 400 when assignee is missing', async () => {
      const task = taskService.create({ title: 'Task missing assignee' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when assignee is not a string', async () => {
      const task = taskService.create({ title: 'Task non-string assignee' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when assignee is an empty string', async () => {
      const task = taskService.create({ title: 'Task empty assignee' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when assignee is whitespace-only string', async () => {
      const task = taskService.create({ title: 'Task whitespace assignee' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('trims surrounding whitespace from assignee and returns 200', async () => {
      const task = taskService.create({ title: 'Task trimmed assignee' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  Alice  ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
    });

    it('returns 404 when assigning a non-existent task ID', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('allows reassignment to a new assignee', async () => {
      const task = taskService.create({ title: 'Reassign task' });

      const res1 = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });
      expect(res1.status).toBe(200);
      expect(res1.body.assignee).toBe('Alice');

      const res2 = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });
      expect(res2.status).toBe(200);
      expect(res2.body.assignee).toBe('Bob');
    });

    it('allows assigning a completed task and preserves done status', async () => {
      const task = taskService.create({ title: 'Completed task' });
      taskService.completeTask(task.id);

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('preserves all unrelated fields when assigning a task', async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const task = taskService.create({
        title: 'Preserve fields',
        description: 'Keep this description',
        priority: 'high',
        dueDate,
      });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('Preserve fields');
      expect(res.body.description).toBe('Keep this description');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
      expect(res.body.dueDate).toBe(dueDate);
      expect(res.body.createdAt).toBe(task.createdAt);
    });
  });
});
