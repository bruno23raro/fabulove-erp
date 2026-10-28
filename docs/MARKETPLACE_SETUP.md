# SIZEN ERP — Marketplace Setup Guide

## Quick Setup

### 1. Mercado Livre
1. Go to [developers.mercadolivre.com.br](https://developers.mercadolivre.com.br)
2. Create a new application
3. Set redirect URI to: `http://localhost:3000/api/marketplaces/ml/callback`
4. Copy `client_id` and `client_secret`
5. Add to `.env`:
   ```
   ML_CLIENT_ID=your_client_id
   ML_CLIENT_SECRET=your_client_secret
   ML_REDIRECT_URI=http://localhost:3000/api/marketplaces/ml/callback
   ```

### 2. Shopee
1. Go to [open.shopee.com](https://open.shopee.com)
2. Create a Partner Application
3. Set redirect URI to: `http://localhost:3000/api/marketplaces/shopee/oauth/callback`
4. Copy `partner_id` and `partner_key`
5. Add to `.env`:
   ```
   SHOPEE_PARTNER_ID=your_partner_id
   SHOPEE_PARTNER_KEY=your_partner_key
   SHOPEE_REDIRECT_URI=http://localhost:3000/api/marketplaces/shopee/oauth/callback
   ```

### 3. Webhook Configuration
- Mercado Livre: Set webhook URL in your ML app dashboard
- Shopee: Configure webhook URL in Partner App settings

## Status Tracking

See [MARKETPLACE_STATUS.md](MARKETPLACE_STATUS.md) for current connection status of each provider.