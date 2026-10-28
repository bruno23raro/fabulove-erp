/**
 * CRM Controller — Leads, Deals, Activities
 */

import * as crmModel from '../models/crm.model.js';
import logger from '../utils/logger.js';

// ─── Leads ────────────────────────────────────────────────────────────────────

export const getLeads = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      source: req.query.source,
      search: req.query.search,
      offset: parseInt(req.query.offset) || 0,
    };
    const leads = await crmModel.findAllLeads(req.user.id, filters);
    res.json({ success: true, data: leads });
  } catch (err) {
    logger.error('CRM getLeads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

export const getLead = async (req, res) => {
  try {
    const lead = await crmModel.findLeadById(req.user.id, req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    logger.error('CRM getLead error:', err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
};

export const createLead = async (req, res) => {
  try {
    const lead = await crmModel.createLead(req.user.id, req.body);
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    logger.error('CRM createLead error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await crmModel.updateLead(req.user.id, req.params.id, req.body);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    logger.error('CRM updateLead error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const deleted = await crmModel.deleteLead(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    logger.error('CRM deleteLead error:', err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
};

// ─── Deals ────────────────────────────────────────────────────────────────────

export const getDeals = async (req, res) => {
  try {
    const filters = {
      pipeline_stage: req.query.pipeline_stage,
      search: req.query.search,
      offset: parseInt(req.query.offset) || 0,
    };
    const deals = await crmModel.findAllDeals(req.user.id, filters);
    res.json({ success: true, data: deals });
  } catch (err) {
    logger.error('CRM getDeals error:', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
};

export const getDeal = async (req, res) => {
  try {
    const deal = await crmModel.findDealById(req.user.id, req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json({ success: true, data: deal });
  } catch (err) {
    logger.error('CRM getDeal error:', err);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
};

export const createDeal = async (req, res) => {
  try {
    const deal = await crmModel.createDeal(req.user.id, req.body);
    res.status(201).json({ success: true, data: deal });
  } catch (err) {
    logger.error('CRM createDeal error:', err);
    res.status(500).json({ error: err.message || 'Failed to create deal' });
  }
};

export const updateDeal = async (req, res) => {
  try {
    const deal = await crmModel.updateDeal(req.user.id, req.params.id, req.body);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json({ success: true, data: deal });
  } catch (err) {
    logger.error('CRM updateDeal error:', err);
    res.status(500).json({ error: 'Failed to update deal' });
  }
};

export const deleteDeal = async (req, res) => {
  try {
    const deleted = await crmModel.deleteDeal(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Deal not found' });
    res.json({ success: true, message: 'Deal deleted' });
  } catch (err) {
    logger.error('CRM deleteDeal error:', err);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
};

// ─── Activities ───────────────────────────────────────────────────────────────

export const getActivities = async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      lead_id: req.query.lead_id,
      offset: parseInt(req.query.offset) || 0,
    };
    const activities = await crmModel.findAllActivities(req.user.id, filters);
    res.json({ success: true, data: activities });
  } catch (err) {
    logger.error('CRM getActivities error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

export const createActivity = async (req, res) => {
  try {
    const activity = await crmModel.createActivity(req.user.id, req.body);
    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    logger.error('CRM createActivity error:', err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

export const completeActivity = async (req, res) => {
  try {
    const activity = await crmModel.completeActivity(req.user.id, req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json({ success: true, data: activity });
  } catch (err) {
    logger.error('CRM completeActivity error:', err);
    res.status(500).json({ error: 'Failed to complete activity' });
  }
};

// ─── Stats & Funnel ──────────────────────────────────────────────────────────

export const getPipelineStats = async (req, res) => {
  try {
    const stats = await crmModel.getPipelineStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error('CRM getPipelineStats error:', err);
    res.status(500).json({ error: 'Failed to get pipeline stats' });
  }
};

export const getFunnelData = async (req, res) => {
  try {
    const funnel = await crmModel.getFunnelData(req.user.id);
    res.json({ success: true, data: funnel });
  } catch (err) {
    logger.error('CRM getFunnelData error:', err);
    res.status(500).json({ error: 'Failed to get funnel data' });
  }
};

export const getUpcomingActivities = async (req, res) => {
  try {
    const activities = await crmModel.getUpcomingActivities(req.user.id, 5);
    res.json({ success: true, data: activities });
  } catch (err) {
    logger.error('CRM getUpcomingActivities error:', err);
    res.status(500).json({ error: 'Failed to get upcoming activities' });
  }
};
