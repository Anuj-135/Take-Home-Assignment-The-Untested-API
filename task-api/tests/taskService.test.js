const taskService = require('../src/services/taskService');

describe('taskService (Batch 2.1)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    it('creates a task with the supplied title', () => {
      const task = taskService.create({ title: 'Buy groceries' });
      expect(task.title).toBe('Buy groceries');
    });

    it('verifies default values when optional fields are omitted', () => {
      const task = taskService.create({ title: 'Default Test Task' });
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
    });

    it('verifies id is generated and is a non-empty string', () => {
      const task = taskService.create({ title: 'ID Verification Task' });
      expect(typeof task.id).toBe('string');
      expect(task.id.trim().length).toBeGreaterThan(0);
    });

    it('verifies createdAt is a valid ISO timestamp', () => {
      const task = taskService.create({ title: 'Timestamp Task' });
      expect(typeof task.createdAt).toBe('string');
      const timestamp = Date.parse(task.createdAt);
      expect(Number.isNaN(timestamp)).toBe(false);
      expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
    });

    it('verifies extra/unexpected input fields are not stored', () => {
      const task = taskService.create({
        title: 'Filtered Fields Task',
        extraField: 'unexpected',
        hackedProperty: true,
      });

      expect(task.extraField).toBeUndefined();
      expect(task.hackedProperty).toBeUndefined();
      expect(Object.keys(task)).toEqual([
        'id',
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
        'completedAt',
        'createdAt',
      ]);
    });

    it('creates two tasks and verifies their IDs are different', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('getAll()', () => {
    it('returns an empty array when the store is empty', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns all created tasks after tasks are added', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      const allTasks = taskService.getAll();
      expect(allTasks).toHaveLength(2);
      expect(allTasks).toEqual([task1, task2]);
    });

    it('verifies pushing into the returned array does not change the internal task store', () => {
      taskService.create({ title: 'Initial Task' });
      const returnedTasks = taskService.getAll();

      returnedTasks.push({ title: 'Tampered Task' });

      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById()', () => {
    it('returns the task when the ID exists', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found).toEqual(created);
    });

    it('returns undefined for a non-existing ID', () => {
      const found = taskService.findById('non-existent-uuid');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    let todoTask;
    let inProgressTask;
    let doneTask;

    beforeEach(() => {
      todoTask = taskService.create({ title: 'Task 1', status: 'todo' });
      inProgressTask = taskService.create({ title: 'Task 2', status: 'in_progress' });
      doneTask = taskService.create({ title: 'Task 3', status: 'done' });
    });

    it('returns only the task matching "todo"', () => {
      const result = taskService.getByStatus('todo');
      expect(result).toEqual([todoTask]);
    });

    it('returns only the task matching "in_progress"', () => {
      const result = taskService.getByStatus('in_progress');
      expect(result).toEqual([inProgressTask]);
    });

    it('returns only the task matching "done"', () => {
      const result = taskService.getByStatus('done');
      expect(result).toEqual([doneTask]);
    });

    it('returns empty array when querying with a substring like "do"', () => {
      const result = taskService.getByStatus('do');
      expect(result).toEqual([]);
    });

    it('returns empty array when querying with an unknown status', () => {
      const result = taskService.getByStatus('unknown');
      expect(result).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    let task1;
    let task2;
    let task3;
    let task4;
    let task5;

    beforeEach(() => {
      task1 = taskService.create({ title: 'Task 1' });
      task2 = taskService.create({ title: 'Task 2' });
      task3 = taskService.create({ title: 'Task 3' });
      task4 = taskService.create({ title: 'Task 4' });
      task5 = taskService.create({ title: 'Task 5' });
    });

    it('returns first page (Task 1, Task 2) for page 1 and limit 2', () => {
      const result = taskService.getPaginated(1, 2);
      expect(result).toEqual([task1, task2]);
    });

    it('returns second page (Task 3, Task 4) for page 2 and limit 2', () => {
      const result = taskService.getPaginated(2, 2);
      expect(result).toEqual([task3, task4]);
    });

    it('returns empty array when page is beyond available data', () => {
      const result = taskService.getPaginated(10, 2);
      expect(result).toEqual([]);
    });

    it('returns all 5 tasks when limit is larger than total count', () => {
      const result = taskService.getPaginated(1, 10);
      expect(result).toEqual([task1, task2, task3, task4, task5]);
    });
  });

  describe('getStats()', () => {
    it('returns zero counts and zero overdue when the store is empty', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('counts tasks by status correctly when no tasks are overdue', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'todo' });
      taskService.create({ title: 'Task 3', status: 'in_progress' });
      taskService.create({ title: 'Task 4', status: 'done' });
      taskService.create({ title: 'Task 5', status: 'done' });

      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 2,
        in_progress: 1,
        done: 2,
        overdue: 0,
      });
    });

    it('counts a non-done task with a past dueDate as overdue', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      taskService.create({ title: 'Overdue Todo Task', status: 'todo', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });

    it('counts a done task with a past dueDate as done but not overdue', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      taskService.create({ title: 'Completed Past Due Task', status: 'done', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    it('does not count a non-done task with a future dueDate as overdue', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      taskService.create({ title: 'Future Task', status: 'todo', dueDate: futureDate });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0);
    });

    it('does not count a non-done task with null/default dueDate as overdue', () => {
      taskService.create({ title: 'No Due Date Task', status: 'todo' });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0);
    });

    it('counts only eligible past-due non-done tasks as overdue in a mixed dataset', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      taskService.create({ title: 'Past Todo', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Past In Progress', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Past Done', status: 'done', dueDate: pastDate });
      taskService.create({ title: 'Future Todo', status: 'todo', dueDate: futureDate });
      taskService.create({ title: 'No Due In Progress', status: 'in_progress', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(2);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update()', () => {
    it('updates the title of an existing task and returns the updated task', () => {
      const created = taskService.create({ title: 'Original Title' });
      const updated = taskService.update(created.id, { title: 'Updated Title' });

      expect(updated).not.toBeNull();
      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('Updated Title');
      expect(taskService.findById(created.id).title).toBe('Updated Title');
    });

    it('performs a partial update preserving other existing fields', () => {
      const created = taskService.create({
        title: 'Original Title',
        description: 'Original Description',
        status: 'todo',
        priority: 'high',
      });

      const updated = taskService.update(created.id, { status: 'in_progress' });

      expect(updated.status).toBe('in_progress');
      expect(updated.title).toBe('Original Title');
      expect(updated.description).toBe('Original Description');
      expect(updated.priority).toBe('high');
      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it('returns null when updating a non-existent ID', () => {
      const result = taskService.update('non-existent-id', { title: 'New' });
      expect(result).toBeNull();
    });

    it('merges supplied fields into the existing task object (raw merge behavior)', () => {
      const created = taskService.create({ title: 'Test Task' });
      const updated = taskService.update(created.id, {
        customNote: 'Note added',
        tags: ['urgent', 'bug'],
      });

      expect(updated.customNote).toBe('Note added');
      expect(updated.tags).toEqual(['urgent', 'bug']);
    });
  });

  describe('remove()', () => {
    it('removes an existing task and returns true', () => {
      const created = taskService.create({ title: 'To Delete' });
      const result = taskService.remove(created.id);

      expect(result).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns false when attempting to remove a non-existent ID', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask()', () => {
    it('marks an existing task as done and sets a valid completedAt ISO timestamp', () => {
      const created = taskService.create({ title: 'Task to Complete' });
      const completed = taskService.completeTask(created.id);

      expect(completed).not.toBeNull();
      expect(completed.status).toBe('done');
      expect(typeof completed.completedAt).toBe('string');
      expect(Number.isNaN(Date.parse(completed.completedAt))).toBe(false);
      expect(new Date(completed.completedAt).toISOString()).toBe(completed.completedAt);
    });

    it('preserves priority when completing a high-priority task', () => {
      const created = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(created.id);

      expect(completed.priority).toBe('high');
    });

    it('preserves priority when completing a low-priority task', () => {
      const created = taskService.create({ title: 'Low Priority Task', priority: 'low' });
      const completed = taskService.completeTask(created.id);

      expect(completed.priority).toBe('low');
    });

    it('returns null when completing a non-existent ID', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('preserves other task fields (title, description, dueDate) when completed', () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const created = taskService.create({
        title: 'Preserve Fields Task',
        description: 'Detailed description',
        dueDate,
      });

      const completed = taskService.completeTask(created.id);

      expect(completed.title).toBe('Preserve Fields Task');
      expect(completed.description).toBe('Detailed description');
      expect(completed.dueDate).toBe(dueDate);
      expect(completed.id).toBe(created.id);
      expect(completed.createdAt).toBe(created.createdAt);
    });
  });

  describe('assignTask()', () => {
    it('assigns an assignee to an existing task and returns the updated task', () => {
      const task = taskService.create({ title: 'Task to assign' });
      const updated = taskService.assignTask(task.id, 'Alice');

      expect(updated).not.toBeNull();
      expect(updated.id).toBe(task.id);
      expect(updated.assignee).toBe('Alice');
      expect(taskService.findById(task.id).assignee).toBe('Alice');
    });

    it('trims surrounding whitespace from assignee name', () => {
      const task = taskService.create({ title: 'Task with untrimmed assignee' });
      const updated = taskService.assignTask(task.id, '  Alice  ');

      expect(updated).not.toBeNull();
      expect(updated.assignee).toBe('Alice');
      expect(taskService.findById(task.id).assignee).toBe('Alice');
    });

    it('returns null when assigning a non-existent task ID', () => {
      const result = taskService.assignTask('non-existent-id', 'Alice');
      expect(result).toBeNull();
    });

    it('allows reassignment to a new assignee', () => {
      const task = taskService.create({ title: 'Task to reassign' });
      taskService.assignTask(task.id, 'Alice');
      const updated = taskService.assignTask(task.id, 'Bob');

      expect(updated).not.toBeNull();
      expect(updated.assignee).toBe('Bob');
      expect(taskService.findById(task.id).assignee).toBe('Bob');
    });

    it('allows assignment to a completed task and preserves done status', () => {
      const task = taskService.create({ title: 'Completed task to assign' });
      const completed = taskService.completeTask(task.id);
      const originalCompletedAt = completed.completedAt;

      const updated = taskService.assignTask(task.id, 'Alice');

      expect(updated).not.toBeNull();
      expect(updated.assignee).toBe('Alice');
      expect(updated.status).toBe('done');
      expect(updated.completedAt).toBe(originalCompletedAt);
      expect(updated.completedAt).not.toBeNull();
    });

    it('preserves all unrelated fields when assigning a task', () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const task = taskService.create({
        title: 'Important task',
        description: 'Detailed description',
        status: 'todo',
        priority: 'high',
        dueDate,
      });

      const updated = taskService.assignTask(task.id, 'Alice');

      expect(updated.id).toBe(task.id);
      expect(updated.title).toBe('Important task');
      expect(updated.description).toBe('Detailed description');
      expect(updated.status).toBe('todo');
      expect(updated.priority).toBe('high');
      expect(updated.dueDate).toBe(dueDate);
      expect(updated.createdAt).toBe(task.createdAt);
      expect(updated.completedAt).toBeNull();
      expect(updated.assignee).toBe('Alice');
    });
  });
});




