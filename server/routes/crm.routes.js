/**
 * CRM Routes
 */

import express from 'express';
import * as crmController from '../controllers/crm.controller.js';
import { authenticateToken } from '../utils/jwt.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Leads
router.get('/leads', crmController.getLeads);
router.get('/leads/:id', crmController.getLead);
router.post('/leads', crmController.createLead);
router.put('/leads/:id', crmController.updateLead);
router.delete('/leads/:id', crmController.deleteLead);

// Deals
router.get('/deals', crmController.getDeals);
router.get('/deals/:id', crmController.getDeal);
router.post('/deals', crmController.createDeal);
router.put('/deals/:id', crmController.updateDeal);
router.delete('/deals/:id', crmController.deleteDeal);

// Activities
router.get('/activities', crmController.getActivities);
router.post('/activities', crmController.createActivity);
router.post('/activities/:id/complete', crmController.completeActivity);

// Stats
router.get('/pipeline-stats', crmController.getPipelineStats);
router.get('/funnel', crmController.getFunnelData);
router.get('/upcoming-activities', crmController.getUpcomingActivities);

export default router;
