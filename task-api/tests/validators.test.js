const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('validators', () => {
  describe('validateCreateTask()', () => {
    describe('title validation', () => {
      it('rejects missing title', () => {
        const result = validateCreateTask({});
        expect(result).toBe('title is required and must be a non-empty string');
      });

      it('rejects empty title', () => {
        const result = validateCreateTask({ title: '' });
        expect(result).toBe('title is required and must be a non-empty string');
      });

      it('rejects whitespace-only title', () => {
        const result = validateCreateTask({ title: '   ' });
        expect(result).toBe('title is required and must be a non-empty string');
      });

      it('rejects non-string title (number)', () => {
        const result = validateCreateTask({ title: 12345 });
        expect(result).toBe('title is required and must be a non-empty string');
      });

      it('rejects non-string title (boolean)', () => {
        const result = validateCreateTask({ title: true });
        expect(result).toBe('title is required and must be a non-empty string');
      });

      it('accepts valid title', () => {
        const result = validateCreateTask({ title: 'Complete take-home assignment' });
        expect(result).toBeNull();
      });
    });

    describe('status validation', () => {
      it.each(['todo', 'in_progress', 'done'])(
        'accepts valid status: "%s"',
        (status) => {
          const result = validateCreateTask({ title: 'Valid Task', status });
          expect(result).toBeNull();
        }
      );

      it('rejects invalid status', () => {
        const result = validateCreateTask({ title: 'Valid Task', status: 'pending' });
        expect(result).toBe('status must be one of: todo, in_progress, done');
      });

      it('rejects empty string status ("")', () => {
        const result = validateCreateTask({ title: 'Valid Task', status: '' });
        expect(result).toBe('status must be one of: todo, in_progress, done');
      });
    });

    describe('priority validation', () => {
      it.each(['low', 'medium', 'high'])(
        'accepts valid priority: "%s"',
        (priority) => {
          const result = validateCreateTask({ title: 'Valid Task', priority });
          expect(result).toBeNull();
        }
      );

      it('rejects invalid priority', () => {
        const result = validateCreateTask({ title: 'Valid Task', priority: 'urgent' });
        expect(result).toBe('priority must be one of: low, medium, high');
      });

      it('rejects empty string priority ("")', () => {
        const result = validateCreateTask({ title: 'Valid Task', priority: '' });
        expect(result).toBe('priority must be one of: low, medium, high');
      });
    });

    describe('dueDate validation', () => {
      it('accepts valid ISO dueDate', () => {
        const result = validateCreateTask({
          title: 'Valid Task',
          dueDate: '2026-12-31T23:59:59.000Z',
        });
        expect(result).toBeNull();
      });

      it('rejects invalid dueDate', () => {
        const result = validateCreateTask({
          title: 'Valid Task',
          dueDate: 'invalid-date-format',
        });
        expect(result).toBe('dueDate must be a valid ISO date string');
      });

      it('rejects empty string dueDate ("")', () => {
        const result = validateCreateTask({
          title: 'Valid Task',
          dueDate: '',
        });
        expect(result).toBe('dueDate must be a valid ISO date string');
      });
    });

    describe('omitted optional fields', () => {
      it('accepts when optional fields (description, status, priority, dueDate) are omitted', () => {
        const result = validateCreateTask({ title: 'Only Title Provided' });
        expect(result).toBeNull();
      });
    });
  });

  describe('validateUpdateTask()', () => {
    describe('title validation (when provided)', () => {
      it('rejects empty title', () => {
        const result = validateUpdateTask({ title: '' });
        expect(result).toBe('title must be a non-empty string');
      });

      it('rejects whitespace-only title', () => {
        const result = validateUpdateTask({ title: '   ' });
        expect(result).toBe('title must be a non-empty string');
      });

      it('rejects non-string title', () => {
        const result = validateUpdateTask({ title: 9876 });
        expect(result).toBe('title must be a non-empty string');
      });

      it('accepts valid title', () => {
        const result = validateUpdateTask({ title: 'Updated Valid Title' });
        expect(result).toBeNull();
      });
    });

    describe('status validation', () => {
      it('accepts valid status', () => {
        const result = validateUpdateTask({ status: 'in_progress' });
        expect(result).toBeNull();
      });

      it('rejects invalid status', () => {
        const result = validateUpdateTask({ status: 'archived' });
        expect(result).toBe('status must be one of: todo, in_progress, done');
      });

      it('rejects empty string status ("")', () => {
        const result = validateUpdateTask({ status: '' });
        expect(result).toBe('status must be one of: todo, in_progress, done');
      });
    });

    describe('priority validation', () => {
      it('accepts valid priority', () => {
        const result = validateUpdateTask({ priority: 'high' });
        expect(result).toBeNull();
      });

      it('rejects invalid priority', () => {
        const result = validateUpdateTask({ priority: 'critical' });
        expect(result).toBe('priority must be one of: low, medium, high');
      });

      it('rejects empty string priority ("")', () => {
        const result = validateUpdateTask({ priority: '' });
        expect(result).toBe('priority must be one of: low, medium, high');
      });
    });

    describe('dueDate validation', () => {
      it('accepts valid ISO dueDate', () => {
        const result = validateUpdateTask({ dueDate: '2026-11-20T10:00:00.000Z' });
        expect(result).toBeNull();
      });

      it('rejects invalid dueDate', () => {
        const result = validateUpdateTask({ dueDate: 'not-a-valid-date' });
        expect(result).toBe('dueDate must be a valid ISO date string');
      });

      it('rejects empty string dueDate ("")', () => {
        const result = validateUpdateTask({ dueDate: '' });
        expect(result).toBe('dueDate must be a valid ISO date string');
      });
    });

    describe('partial update and omitted fields', () => {
      it('accepts valid partial update without title', () => {
        const result = validateUpdateTask({ status: 'done', priority: 'low' });
        expect(result).toBeNull();
      });

      it('accepts empty object when all fields are omitted', () => {
        const result = validateUpdateTask({});
        expect(result).toBeNull();
      });
    });
  });

  describe('validateAssignTask()', () => {
    it('returns validation error when assignee is missing or undefined', () => {
      const resultEmpty = validateAssignTask({});
      expect(typeof resultEmpty).toBe('string');

      const resultUndefined = validateAssignTask({ assignee: undefined });
      expect(typeof resultUndefined).toBe('string');

      const resultNoArg = validateAssignTask();
      expect(typeof resultNoArg).toBe('string');
    });

    it('returns validation error when assignee is a number', () => {
      const result = validateAssignTask({ assignee: 123 });
      expect(typeof result).toBe('string');
    });

    it('returns validation error when assignee is an object', () => {
      const result = validateAssignTask({ assignee: { name: 'Alice' } });
      expect(typeof result).toBe('string');
    });

    it('returns validation error when assignee is an array', () => {
      const result = validateAssignTask({ assignee: ['Alice'] });
      expect(typeof result).toBe('string');
    });

    it('returns validation error when assignee is an empty string ("")', () => {
      const result = validateAssignTask({ assignee: '' });
      expect(typeof result).toBe('string');
    });

    it('returns validation error when assignee is a whitespace-only string', () => {
      const result = validateAssignTask({ assignee: '   ' });
      expect(typeof result).toBe('string');
    });

    it('returns null when assignee is a valid non-empty string', () => {
      const result = validateAssignTask({ assignee: 'Alice' });
      expect(result).toBeNull();
    });

    it('returns null when assignee is a valid string with surrounding whitespace', () => {
      const result = validateAssignTask({ assignee: '  Alice  ' });
      expect(result).toBeNull();
    });
  });
});

