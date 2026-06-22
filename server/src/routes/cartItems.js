import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { rowToEntity, rowsToEntities } from '../utils/helpers.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cart_items WHERE user_id = $1 ORDER BY created_date DESC',
      [req.user.id]
    );
    res.json(rowsToEntities(result.rows));
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar carrinho' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, product_name, product_image, price, quantity, wrapping)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        req.user.id, data.product_id, data.product_name,
        data.product_image || null, data.price,
        data.quantity || 1, data.wrapping || 'none',
      ]
    );
    res.status(201).json(rowToEntity(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Erro ao adicionar ao carrinho' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const data = req.body;
    const allowed = ['quantity', 'wrapping'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const field of allowed) {
      if (data[field] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        values.push(data[field]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    sets.push('updated_date = NOW()');
    values.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE cart_items SET ${sets.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }
    res.json(rowToEntity(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar item' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover item' });
  }
});

export default router;
