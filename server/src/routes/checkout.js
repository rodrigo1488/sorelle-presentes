import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { getCieloConfig } from '../services/cieloConfig.js';
import { rowToEntity } from '../utils/helpers.js';
import {
  buildCieloPayload,
  createCieloCheckout,
  buildOrderNumber,
  WRAPPING_PRICES,
} from '../services/cielo.js';

const router = Router();

function calcTotals(cartItems) {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity || 1),
    0
  );
  const wrappingCost = cartItems.reduce(
    (sum, item) => sum + (WRAPPING_PRICES[item.wrapping] || 0),
    0
  );
  return {
    subtotal,
    wrappingCost,
    total: subtotal + wrappingCost,
  };
}

router.post('/cielo', requireAuth, async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_document,
      customer_address,
      customer_zip_code,
    } = req.body;

    if (!customer_name?.trim() || !customer_email?.trim()) {
      return res.status(400).json({ message: 'Nome e e-mail são obrigatórios' });
    }

    const cartResult = await pool.query(
      'SELECT * FROM cart_items WHERE user_id = $1 ORDER BY created_date DESC',
      [req.user.id]
    );
    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Seu carrinho está vazio' });
    }

    const { subtotal, wrappingCost, total } = calcTotals(cartItems);
    const orderItems = cartItems.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity || 1,
      unit_price: Number(item.price),
      total: Number(item.price) * Number(item.quantity || 1),
      wrapping: item.wrapping || 'none',
    }));

    const orderResult = await pool.query(
      `INSERT INTO orders (
        customer_name, customer_email, customer_phone, customer_address,
        items, subtotal, wrapping_cost, total, status, payment_method,
        payment_status, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        customer_name.trim(),
        customer_email.trim().toLowerCase(),
        customer_phone || null,
        customer_address || null,
        JSON.stringify(orderItems),
        subtotal,
        wrappingCost,
        total,
        'pendente',
        'cielo',
        'aguardando_pagamento',
        customer_zip_code ? `CEP: ${customer_zip_code}` : null,
      ]
    );

    const order = rowToEntity(orderResult.rows[0]);
    const cieloConfig = await getCieloConfig();
    const returnUrl = `${cieloConfig.frontendUrl}/pagamento/retorno?pedido=${order.id}`;

    const payload = buildCieloPayload({
      order,
      customer: {
        customer_name,
        customer_email,
        customer_phone,
        customer_document,
        customer_address,
        customer_zip_code,
      },
      returnUrl,
      config: cieloConfig,
    });

    const { checkoutUrl } = await createCieloCheckout(payload, {
      merchantId: cieloConfig.merchantId,
      checkoutApiUrl: cieloConfig.checkoutApiUrl,
    });
    const gatewayOrderNumber = buildOrderNumber(order.id);

    await pool.query(
      'UPDATE orders SET gateway_order_number = $1, updated_date = NOW() WHERE id = $2',
      [gatewayOrderNumber, order.id]
    );

    res.json({
      checkout_url: checkoutUrl,
      order_id: order.id,
      gateway_order_number: gatewayOrderNumber,
    });
  } catch (err) {
    console.error('Erro ao iniciar checkout Cielo:', err);
    res.status(500).json({ message: err.message || 'Erro ao iniciar pagamento' });
  }
});

router.get('/pedido/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, status, payment_status, payment_method, total, gateway_order_number, created_date FROM orders WHERE id = $1 AND customer_email = $2',
      [req.params.id, req.user.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    res.json(rowToEntity(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar pedido' });
  }
});

router.post('/cielo/notificacao', async (req, res) => {
  try {
    const merchantOrderNumber = req.body?.MerchantOrderNumber
      || req.body?.merchantOrderNumber
      || req.body?.order_number;

    if (!merchantOrderNumber) {
      return res.status(400).json({ message: 'Notificação inválida' });
    }

    const paymentStatus = String(req.body?.payment_status || req.body?.PaymentStatus || '').toLowerCase();
    const isPaid = paymentStatus === 'paid' || paymentStatus === 'pago' || req.body?.paid === true;

    const result = await pool.query(
      `UPDATE orders SET
        payment_status = $1,
        status = CASE WHEN $2 THEN 'confirmado' ELSE status END,
        updated_date = NOW()
      WHERE gateway_order_number = $3
      RETURNING id, customer_email`,
      [isPaid ? 'pago' : 'aguardando_pagamento', isPaid, merchantOrderNumber]
    );

    if (isPaid && result.rows[0]) {
      await pool.query(
        'DELETE FROM cart_items WHERE user_id = (SELECT id FROM users WHERE email = $1 LIMIT 1)',
        [result.rows[0].customer_email]
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Erro na notificação Cielo:', err);
    res.status(500).json({ message: 'Erro ao processar notificação' });
  }
});

export default router;
