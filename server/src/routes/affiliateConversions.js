import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { parseSort, rowToEntity, rowsToEntities } from '../utils/helpers.js';

const router = Router();

const ALLOWED_FIELDS = [
  'affiliate_id', 'affiliate_name', 'affiliate_code', 'order_id',
  'order_total', 'commission_rate', 'commission_value', 'status', 'notes',
];

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { sort = '-created_date', limit = '100' } = req.query;
    const { column, direction } = parseSort(sort);
    const result = await pool.query(
      `SELECT * FROM affiliate_conversions ORDER BY ${column} ${direction} LIMIT $1`,
      [parseInt(limit) || 100]
    );
    res.json(rowsToEntities(result.rows));
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar conversões' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const result = await pool.query(
      `INSERT INTO affiliate_conversions (affiliate_id, affiliate_name, affiliate_code, order_id, order_total, commission_rate, commission_value, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        data.affiliate_id, data.affiliate_name, data.affiliate_code,
        data.order_id || null, data.order_total, data.commission_rate,
        data.commission_value, data.status || 'pendente', data.notes || null,
      ]
    );
    res.status(201).json(rowToEntity(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar conversão' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const data = req.body;
    const sets = [];
    const values = [];
    let idx = 1;

    for (const field of ALLOWED_FIELDS) {
      if (data[field] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        values.push(data[field]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    sets.push('updated_date = NOW()');
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE affiliate_conversions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conversão não encontrada' });
    }
    res.json(rowToEntity(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar conversão' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM affiliate_conversions WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conversão não encontrada' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir conversão' });
  }
});

export default router;
