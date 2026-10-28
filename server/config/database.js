/**
 * Pool de conexões com o PostgreSQL
 *
 * Suporta:
 * - Local: variáveis DB_HOST/PORT/NAME/USER/PASSWORD
 * - Supabase: DATABASE_URL (URI completa)
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Se DATABASE_URL estiver definido (Supabase/cloud), usa ela
let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
      console.error('[DB] Erro idle na pool (recuperável):', err.message);
    } else {
      console.error('[DB] Erro fatal na pool PostgreSQL:', err);
      process.exit(-1);
    }
  });
  console.log('[DB] Conectado via DATABASE_URL (Supabase/cloud)');
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'fabulove_erp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ECONNREFUSED') {
      console.error('[DB] Erro idle na pool (recuperável):', err.message);
    } else {
      console.error('[DB] Erro fatal na pool PostgreSQL:', err);
      process.exit(-1);
    }
  });
  console.log('[DB] Conectado localmente em', process.env.DB_HOST || 'localhost');
}

export default pool;
