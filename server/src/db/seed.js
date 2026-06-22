import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

const sampleProducts = [
  {
    name: 'Vaso Orgânico em Cerâmica',
    description: 'Vaso artesanal com formas orgânicas, perfeito para flores secas ou arranjos minimalistas.',
    price: 189.90,
    original_price: 229.90,
    category: 'decoracao',
    subcategory: 'Vasos',
    image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b24?w=600',
    featured: true,
    in_stock: true,
    materials: 'Cerâmica artesanal',
    dimensions: '22cm x 15cm',
  },
  {
    name: 'Vela Aromática Lavanda',
    description: 'Vela de cera de soja com essência de lavanda, queima limpa de até 40 horas.',
    price: 79.90,
    category: 'fragancias',
    subcategory: 'Velas',
    image_url: 'https://images.unsplash.com/photo-1602607890780-8e7d8a8b8e8e?w=600',
    featured: true,
    in_stock: true,
    materials: 'Cera de soja, óleo essencial',
    dimensions: '9cm x 8cm',
  },
  {
    name: 'Jogo de Toalhas Premium',
    description: 'Conjunto de toalhas de banho e rosto em algodão egípcio 600 fios.',
    price: 349.90,
    category: 'cama_mesa_banho',
    subcategory: 'Toalhas',
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600',
    featured: false,
    in_stock: true,
    materials: 'Algodão egípcio',
    dimensions: 'Banho 70x140cm, Rosto 50x90cm',
  },
  {
    name: 'Bandeja Decorativa em Madeira',
    description: 'Bandeja em madeira maciça com acabamento natural, ideal para servir ou decorar.',
    price: 159.90,
    category: 'casa',
    subcategory: 'Bandejas',
    image_url: 'https://images.unsplash.com/photo-1615876234686-a8828094e910?w=600',
    featured: true,
    in_stock: true,
    materials: 'Madeira maciça',
    dimensions: '35cm x 25cm',
  },
];

async function seed() {
  console.log('Iniciando seed do banco de dados...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sorelle.com.br';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

  if (existingAdmin.rows.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [adminEmail, passwordHash, 'admin']
    );
    console.log(`Admin criado: ${adminEmail}`);
  } else {
    console.log('Admin já existe, pulando criação.');
  }

  const productCount = await pool.query('SELECT COUNT(*) FROM products');
  if (parseInt(productCount.rows[0].count) === 0) {
    for (const product of sampleProducts) {
      await pool.query(
        `INSERT INTO products (name, description, price, original_price, category, subcategory, image_url, featured, in_stock, materials, dimensions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          product.name, product.description, product.price, product.original_price || null,
          product.category, product.subcategory, product.image_url, product.featured,
          product.in_stock, product.materials, product.dimensions,
        ]
      );
    }
    console.log(`${sampleProducts.length} produtos de exemplo criados.`);
  } else {
    console.log('Produtos já existem, pulando seed.');
  }

  console.log('Seed concluído!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
