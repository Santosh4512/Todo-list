const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all todos for user
router.get('/', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.id],
        (err, todos) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(todos);
        }
    );
});

// Create todo
router.post('/', authenticateToken, (req, res) => {
    const { title, description } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    db.run(
        'INSERT INTO todos (user_id, title, description) VALUES (?, ?, ?)',
        [req.user.id, title, description || ''],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({
                id: this.lastID,
                user_id: req.user.id,
                title,
                description: description || '',
                completed: 0
            });
        }
    );
});

// Update todo
router.put('/:id', authenticateToken, (req, res) => {
    const { title, description, completed } = req.body;
    const { id } = req.params;

    db.run(
        'UPDATE todos SET title = ?, description = ?, completed = ? WHERE id = ? AND user_id = ?',
        [title, description, completed ? 1 : 0, id, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Todo not found' });
            }
            res.json({ id: parseInt(id), title, description, completed: completed ? 1 : 0 });
        }
    );
});

// Delete todo
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run(
        'DELETE FROM todos WHERE id = ? AND user_id = ?',
        [id, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Todo not found' });
            }
            res.json({ message: 'Todo deleted successfully' });
        }
    );
});

// Toggle todo completion
router.patch('/:id/toggle', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get(
        'SELECT * FROM todos WHERE id = ? AND user_id = ?',
        [id, req.user.id],
        (err, todo) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!todo) {
                return res.status(404).json({ error: 'Todo not found' });
            }

            const newCompleted = todo.completed ? 0 : 1;
            db.run(
                'UPDATE todos SET completed = ? WHERE id = ?',
                [newCompleted, id],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json({ ...todo, completed: newCompleted });
                }
            );
        }
    );
});

module.exports = router;
