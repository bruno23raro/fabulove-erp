/**
 * Seed inicial — cria usuário admin padrão
 */

import pool from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import logger from '../utils/logger.js';

async function seed() {
  try {
    await pool.query('SELECT 1');
    logger.info('🔌 Conectado ao PostgreSQL. Iniciando seed...');

    const adminPassword = await hashPassword('Admin@12345');

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO NOTHING`,
      ['Administrador', 'admin@fabulove.com', adminPassword, 'admin']
    );

    logger.info('✅ Seed concluído — usuário admin criado (se não existia).');
  } catch (error) {
    console.error('❌ Detalhes do erro no seed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();

