/**
 * CRM Model — Leads, Deals, Activities
 */

import pool from '../config/database.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeDecimal = (val) => {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

// ─── Leads ────────────────────────────────────────────────────────────────────

export const findAllLeads = async (userId, filters = {}) => {
  let sql = `
    SELECT id, company, contact_name, email, phone, source, status,
           value, notes, created_at, updated_at
    FROM crm_leads
    WHERE user_id = $1
  `;
  const params = [userId];
  let paramIdx = 2;

  if (filters.status) {
    sql += ` AND status = $${paramIdx++}`;
    params.push(filters.status);
  }
  if (filters.source) {
    sql += ` AND source = $${paramIdx++}`;
    params.push(filters.source);
  }
  if (filters.search) {
    sql += ` AND (contact_name ILIKE $${paramIdx} OR company ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  sql += ` ORDER BY created_at DESC LIMIT 100 OFFSET $${paramIdx}`;
  params.push(filters.offset || 0);

  const result = await pool.query(sql, params);
  return result.rows;
};

export const findLeadById = async (userId, id) => {
  const result = await pool.query(
    'SELECT * FROM crm_leads WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows[0] || null;
};

export const createLead = async (userId, data) => {
  const { company, contact_name, email, phone, source, value, notes } = data;
  const result = await pool.query(
    `INSERT INTO crm_leads (user_id, company, contact_name, email, phone, source, value, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, company || null, contact_name, email || null, phone || null, source || 'manual', safeDecimal(value), notes || null]
  );
  return result.rows[0];
};

export const updateLead = async (userId, id, data) => {
  const existing = await findLeadById(userId, id);
  if (!existing) return null;

  const { company, contact_name, email, phone, source, status, value, notes } = data;
  const result = await pool.query(
    `UPDATE crm_leads
     SET company = COALESCE($1, company),
         contact_name = COALESCE($2, contact_name),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         source = COALESCE($5, source),
         status = COALESCE($6, status),
         value = COALESCE($7, value),
         notes = COALESCE($8, notes)
     WHERE id = $9 AND user_id = $10
     RETURNING *`,
    [company, contact_name, email, phone, source, status, safeDecimal(value), notes, id, userId]
  );
  return result.rows[0];
};

export const deleteLead = async (userId, id) => {
  const existing = await findLeadById(userId, id);
  if (!existing) return false;
  await pool.query('DELETE FROM crm_leads WHERE id = $1 AND user_id = $2', [id, userId]);
  return true;
};

// ─── Pipeline Stats (for dashboard) ──────────────────────────────────────────

export const getPipelineStats = async (userId) => {
  const result = await pool.query(
    `SELECT status, COUNT(*) AS count, COALESCE(SUM(value), 0) AS total_value
     FROM crm_leads
     WHERE user_id = $1
     GROUP BY status`,
    [userId]
  );

  const stages = ['new', 'contacted', 'qualified', 'proposal', 'closed_won', 'closed_lost'];
  const stats = {};
  let totalValue = 0;
  let totalCount = 0;

  for (const row of result.rows) {
    stats[row.status] = { count: parseInt(row.count), total_value: safeDecimal(row.total_value) };
    totalValue += safeDecimal(row.total_value);
    totalCount += parseInt(row.count);
  }

  for (const stage of stages) {
    if (!stats[stage]) stats[stage] = { count: 0, total_value: 0 };
  }

  return { stages: stats, total_count: totalCount, total_value: totalValue };
};

// ─── Deals ────────────────────────────────────────────────────────────────────

export const findAllDeals = async (userId, filters = {}) => {
  let sql = `
    SELECT d.id, d.title, d.description, d.pipeline_stage,
           d.expected_value, d.close_date, d.probability,
           l.contact_name, l.company, l.email, l.phone,
           d.created_at, d.updated_at
    FROM crm_deals d
    JOIN crm_leads l ON d.lead_id = l.id
    WHERE d.user_id = $1
  `;
  const params = [userId];
  let paramIdx = 2;

  if (filters.pipeline_stage) {
    sql += ` AND d.pipeline_stage = $${paramIdx++}`;
    params.push(filters.pipeline_stage);
  }
  if (filters.search) {
    sql += ` AND (d.title ILIKE $${paramIdx} OR l.contact_name ILIKE $${paramIdx} OR l.company ILIKE $${paramIdx})`;
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  sql += ` ORDER BY d.created_at DESC LIMIT 100 OFFSET $${paramIdx}`;
  params.push(filters.offset || 0);

  const result = await pool.query(sql, params);
  return result.rows;
};

export const findDealById = async (userId, id) => {
  const result = await pool.query(
    `SELECT d.*, l.contact_name, l.company, l.email, l.phone, l.status AS lead_status
     FROM crm_deals d
     JOIN crm_leads l ON d.lead_id = l.id
     WHERE d.id = $1 AND d.user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
};

export const createDeal = async (userId, data) => {
  const { lead_id, title, description, pipeline_stage, expected_value, close_date, probability } = data;

  // Verify lead belongs to user
  const lead = await findLeadById(userId, lead_id);
  if (!lead) throw new Error('Lead not found');

  const result = await pool.query(
    `INSERT INTO crm_deals (user_id, lead_id, title, description, pipeline_stage, expected_value, close_date, probability)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, lead_id, title, description || null, pipeline_stage || 'prospecting',
     safeDecimal(expected_value), close_date || null, probability || 50]
  );
  return result.rows[0];
};

export const updateDeal = async (userId, id, data) => {
  const existing = await findDealById(userId, id);
  if (!existing) return null;

  const { pipeline_stage, expected_value, close_date, probability, title, description } = data;
  const result = await pool.query(
    `UPDATE crm_deals
     SET pipeline_stage = COALESCE($1, pipeline_stage),
         expected_value = COALESCE($2, expected_value),
         close_date = COALESCE($3, close_date),
         probability = COALESCE($4, probability),
         title = COALESCE($5, title),
         description = COALESCE($6, description)
     WHERE id = $7 AND user_id = $8
     RETURNING *`,
    [pipeline_stage, safeDecimal(expected_value), close_date, probability, title, description, id, userId]
  );

  // Update lead status when deal closes
  if (pipeline_stage === 'closed_won' || pipeline_stage === 'closed_lost') {
    const newStatus = pipeline_stage === 'closed_won' ? 'qualified' : 'new';
    await pool.query(
      `UPDATE crm_leads SET status = $1 WHERE id = $2`,
      [newStatus, existing.lead_id]
    );
  }

  return result.rows[0];
};

export const deleteDeal = async (userId, id) => {
  const existing = await findDealById(userId, id);
  if (!existing) return false;
  await pool.query('DELETE FROM crm_deals WHERE id = $1 AND user_id = $2', [id, userId]);
  return true;
};

// ─── Activities ───────────────────────────────────────────────────────────────

export const findAllActivities = async (userId, filters = {}) => {
  let sql = `
    SELECT a.id, a.type, a.subject, a.description,
           a.scheduled_at, a.completed_at, a.created_at,
           l.contact_name, l.company, d.title AS deal_title
    FROM crm_activities a
    LEFT JOIN crm_leads l ON a.lead_id = l.id
    LEFT JOIN crm_deals d ON a.deal_id = d.id
    WHERE a.user_id = $1
  `;
  const params = [userId];
  let paramIdx = 2;

  if (filters.type) {
    sql += ` AND a.type = $${paramIdx++}`;
    params.push(filters.type);
  }
  if (filters.lead_id) {
    sql += ` AND a.lead_id = $${paramIdx++}`;
    params.push(filters.lead_id);
  }

  sql += ` ORDER BY a.scheduled_at ASC NULLS LAST, a.created_at DESC LIMIT 50 OFFSET $${paramIdx}`;
  params.push(filters.offset || 0);

  const result = await pool.query(sql, params);
  return result.rows;
};

export const createActivity = async (userId, data) => {
  const { lead_id, deal_id, type, subject, description, scheduled_at } = data;
  const result = await pool.query(
    `INSERT INTO crm_activities (user_id, lead_id, deal_id, type, subject, description, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, lead_id || null, deal_id || null, type, subject || null, description || null, scheduled_at || null]
  );
  return result.rows[0];
};

export const completeActivity = async (userId, id) => {
  const result = await pool.query(
    `UPDATE crm_activities
     SET completed_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  return result.rows[0] || null;
};

// ─── Upcoming Activities (for dashboard) ──────────────────────────────────────

export const getUpcomingActivities = async (userId, limit = 5) => {
  const result = await pool.query(
    `SELECT a.id, a.type, a.subject, a.scheduled_at,
            l.contact_name, l.company, d.title AS deal_title
     FROM crm_activities a
     LEFT JOIN crm_leads l ON a.lead_id = l.id
     LEFT JOIN crm_deals d ON a.deal_id = d.id
     WHERE a.user_id = $1
       AND a.completed_at IS NULL
       AND a.scheduled_at > NOW()
     ORDER BY a.scheduled_at ASC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

// ─── Funnel Data ──────────────────────────────────────────────────────────────

export const getFunnelData = async (userId) => {
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'closed_won'];
  const results = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM crm_leads
     WHERE user_id = $1 AND status = ANY($2)
     GROUP BY status`,
    [userId, stages]
  );

  const funnel = {};
  for (const stage of stages) {
    const found = results.rows.find(r => r.status === stage);
    funnel[stage] = found ? parseInt(found.count) : 0;
  }
  return funnel;
};
