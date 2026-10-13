/**
 * Pool de conexões com o PostgreSQL
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'fabulove_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Distingue erros idle (recuperáveis) de erros fatais para não derrubar o processo desnecessariamente
pool.on('error', (err) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ECONNREFUSED') {
    // Erro idle — a conexão estava ociosa; pg-pool vai criar uma nova automaticamente
    console.error('[DB] Erro idle na pool (recuperável):', err.message);
  } else {
    // Erro fatal — encerra o processo
    console.error('[DB] Erro fatal na pool PostgreSQL:', err);
    process.exit(-1);
  }
});

export default pool;
