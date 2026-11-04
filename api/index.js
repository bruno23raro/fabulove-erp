/**
 * API Entry Point — Vercel Serverless
 *
 * This file exports the Express app for Vercel serverless deployment.
 * Vercel will automatically wrap this in a serverless handler.
 *
 * Usage in vercel.json:
 * {
 *   "functions": {
 *     "api/index.js": {
 *       "runtime": "nodejs20.x",
 *       "maxDuration": 300
 *     }
 *   }
 * }
 */

import app from '../server/app.js';

export default app;