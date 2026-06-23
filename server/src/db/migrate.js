import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDatabase } from './ensureDb.js';
import pool from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  await ensureDatabase();

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Executando migração do banco de dados...');
  await pool.query(schema);
  console.log('Migração concluída com sucesso!');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Erro na migração:', err.message);
  process.exit(1);
});
