/**
 * migrate.js — Versionado e idempotente
 *
 * CORREÇÃO (2026-10-13): a versão anterior rodava TODAS as migrations toda vez.
 * Esta versão:
 * 1. Cria a tabela schema_migrations se não existir (bootstrap).
 * 2. Lê migrations já aplicadas.
 * 3. Executa APENAS as pendentes, em ordem de nome.
 * 4. Registra cada migration na tabela schema_migrations.
 *
 * Rodar duas vezes não duplica dados nem falha.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/**
 * Bootstrap: garante que a tabela de controle existe.
 * Roda fora de transação controlada para não entrar em deadlock.
 */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         BIGSERIAL PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Carrega os filenames já aplicados.
 */
async function getApplied(client) {
  const { rows } = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
  return new Set(rows.map(r => r.filename));
}

/**
 * Executa o SQL UP de uma migration (antes do marcador DOWN) em transação.
 */
async function runMigration(client, filePath, filename) {
  const fullSql = fs.readFileSync(filePath, 'utf-8');
  // Extrai apenas a parte UP (antes do bloco DOWN)
  const sql = fullSql.split(/--\s*={3,}\s*DOWN\s*={3,}/i)[0];

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename]
    );
    await client.query('COMMIT');
    logger.info(`✅ Migration aplicada: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    const pgCode  = error.code || 'N/A';
    const pgDetail = error.detail || '';
    const pgHint   = error.hint || '';
    const pgPos    = error.position !== undefined ? error.position : '';
    const safeMsg = error.message || 'unknown';
    // Nenhuma credencial (password, token, secret) é logada — apenas códigos SQL e metadados do erro
    logger.error(`❌ Migration ${filename} falhou: ${safeMsg} [PG code=${pgCode}] ${pgDetail ? 'detail='+pgDetail+' ' : ''}${pgHint ? 'hint='+pgHint+' ' : ''}${pgPos !== '' ? 'position='+pgPos : ''}`);
    throw new Error(`Erro na migration ${filename}: ${safeMsg} [PG ${pgCode}]`);
  }
}

async function main() {
  const client = await pool.connect();
  try {
    // Conectividade
    await client.query('SELECT 1');
    logger.info('🔌 Conectado ao PostgreSQL.');

    // Bootstrap da tabela de controle
    await ensureMigrationsTable(client);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const allFiles = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (!allFiles.length) {
      logger.info('📍 Nenhuma migration encontrada.');
      return;
    }

    const applied = await getApplied(client);
    const pending = allFiles.filter(f => !applied.has(f));

    if (!pending.length) {
      logger.info(`✅ Todas as ${allFiles.length} migrations já foram aplicadas. Nada a fazer.`);
      return;
    }

    logger.info(`📦 ${pending.length} migration(s) pendente(s). Aplicando...`);

    for (const filename of pending) {
      await runMigration(client, path.join(migrationsDir, filename), filename);
    }

    logger.info(`🎉 ${pending.length} migration(s) aplicada(s) com sucesso.`);
  } catch (error) {
    logger.error('❌ Erro ao aplicar migrations:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
