export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SIZEN ERP API",
    description: "API RESTful para gestão de ERP com integração de marketplaces",
    version: "1.0.0",
  },
  servers: [{ url: "https://fabulove-erp.vercel.app", description: "Production" }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
  paths: {
    "/": {
      get: { summary: "Service status", tags: ["Health"], responses: { 200: { description: "Service status JSON" } } },
    },
    "/api/health": { get: { summary: "Health check", tags: ["Health"], responses: { 200: { description: "OK" } } } },
    "/api/version": {
      get: { summary: "API version", tags: ["Health"], responses: { 200: { description: "Version info" } } },
    },
    "/api/auth/register": {
      post: {
        summary: "Register user",
        tags: ["Auth"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "User created" }, 400: { description: "Validation error" } },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Login",
        tags: ["Auth"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: { email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Tokens returned" }, 401: { description: "Invalid credentials" } },
      },
    },
    "/api/products": {
      get: {
        summary: "List products",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "limit", schema: { type: "integer", default: 20 } },
          { in: "query", name: "offset", schema: { type: "integer", default: 0 } },
          { in: "query", name: "category_id", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Product list" } },
      },
      post: {
        summary: "Create product",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "price"],
                properties: {
                  name: { type: "string" },
                  price: { type: "number" },
                  category_id: { type: "integer" },
                  stock: { type: "integer", default: 0 },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Product created" } },
      },
    },
    "/api/products/{id}": {
      get: {
        summary: "Get product by ID",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Product" }, 404: { description: "Not found" } },
      },
      put: {
        summary: "Update product",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" }, price: { type: "number" }, stock: { type: "integer" } },
              },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        summary: "Delete product",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/api/marketplaces/ml/status": {
      get: {
        summary: "ML connection status",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Connection status" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/marketplaces/ml/auth-url": {
      post: {
        summary: "Generate ML OAuth URL",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OAuth URL" } },
      },
    },
    "/api/marketplaces/shopee/status": {
      get: {
        summary: "Shopee connection status",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Connection status" } },
      },
    },
    "/api/marketplaces/status": {
      get: {
        summary: "All marketplace statuses",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Integration statuses" } },
      },
    },
    "/api/dashboard/kpis": {
      get: {
        summary: "Dashboard KPIs",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "KPI data" } },
      },
    },
    "/api/ai/generate": {
      post: {
        summary: "Generate AI completion",
        tags: ["AI"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["messages"],
                properties: {
                  messages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        role: { type: "string", enum: ["system", "user", "assistant"] },
                        content: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "AI response" } },
      },
    },
    "/api/ai/config": {
      get: {
        summary: "GET /ai/config",
        tags: ["AI"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/ai/test": {
      post: {
        summary: "POST /ai/test",
        tags: ["AI"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/ai/describe-product": {
      post: {
        summary: "POST /ai/describe-product",
        tags: ["AI"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        summary: "POST /auth/refresh",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "POST /auth/logout",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "GET /auth/me",
        tags: ["Auth"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        summary: "POST /auth/forgot-password",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        summary: "POST /auth/reset-password",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/automation/status": {
      get: {
        summary: "GET /automation/status",
        tags: ["Automation"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/automation/": {
      get: {
        summary: "GET /automation/",
        tags: ["Automation"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/category/": {
      get: {
        summary: "GET /category/",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /category/",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/category/:id": {
      get: {
        summary: "GET /category/:id",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /category/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /category/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/config/": {
      get: {
        summary: "GET /config/",
        tags: ["Config"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/config/:key": {
      get: {
        summary: "GET /config/:key",
        tags: ["Config"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /config/:key",
        tags: ["Config"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /config/:key",
        tags: ["Config"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/leads": {
      get: {
        summary: "GET /crm/leads",
        tags: ["CRM"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /crm/leads",
        tags: ["CRM"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/leads/:id": {
      get: {
        summary: "GET /crm/leads/:id",
        tags: ["CRM"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /crm/leads/:id",
        tags: ["CRM"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /crm/leads/:id",
        tags: ["CRM"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/deals": {
      get: {
        summary: "GET /crm/deals",
        tags: ["CRM"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /crm/deals",
        tags: ["CRM"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/deals/:id": {
      get: {
        summary: "GET /crm/deals/:id",
        tags: ["CRM"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /crm/deals/:id",
        tags: ["CRM"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /crm/deals/:id",
        tags: ["CRM"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/activities": {
      get: {
        summary: "GET /crm/activities",
        tags: ["CRM"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /crm/activities",
        tags: ["CRM"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/activities/:id/complete": {
      post: {
        summary: "POST /crm/activities/:id/complete",
        tags: ["CRM"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/pipeline-stats": {
      get: {
        summary: "GET /crm/pipeline-stats",
        tags: ["CRM"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/funnel": {
      get: {
        summary: "GET /crm/funnel",
        tags: ["CRM"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/crm/upcoming-activities": {
      get: {
        summary: "GET /crm/upcoming-activities",
        tags: ["CRM"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/customer/": {
      get: {
        summary: "GET /customer/",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /customer/",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/customer/:id": {
      get: {
        summary: "GET /customer/:id",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /customer/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /customer/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/customer/:id/orders": {
      get: {
        summary: "GET /customer/:id/orders",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/dashboard/": {
      get: {
        summary: "GET /dashboard/",
        tags: ["Dashboard"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/receivable": {
      get: {
        summary: "GET /financial/receivable",
        tags: ["Financial"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/receivable/:id": {
      get: {
        summary: "GET /financial/receivable/:id",
        tags: ["Financial"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/receivable/:id/pay": {
      post: {
        summary: "POST /financial/receivable/:id/pay",
        tags: ["Financial"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/receivable/:id/writeoff": {
      post: {
        summary: "POST /financial/receivable/:id/writeoff",
        tags: ["Financial"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/payable": {
      get: {
        summary: "GET /financial/payable",
        tags: ["Financial"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /financial/payable",
        tags: ["Financial"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/payable/:id": {
      get: {
        summary: "GET /financial/payable/:id",
        tags: ["Financial"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/payable/:id/pay": {
      post: {
        summary: "POST /financial/payable/:id/pay",
        tags: ["Financial"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/cash": {
      get: {
        summary: "GET /financial/cash",
        tags: ["Financial"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /financial/cash",
        tags: ["Financial"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/financial/summary": {
      get: {
        summary: "GET /financial/summary",
        tags: ["Financial"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/shopee/auth-url": {
      post: {
        summary: "POST /marketplaces/shopee/auth-url",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/shopee/oauth/callback": {
      post: {
        summary: "POST /marketplaces/shopee/oauth/callback",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/shopee/disconnect": {
      post: {
        summary: "POST /marketplaces/shopee/disconnect",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/shopee/config": {
      post: {
        summary: "POST /marketplaces/shopee/config",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/shopee/sync": {
      post: {
        summary: "POST /marketplaces/shopee/sync",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/shopee/export": {
      get: {
        summary: "GET /marketplaces/shopee/export",
        tags: ["Marketplaces"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/shopee/logs": {
      get: {
        summary: "GET /marketplaces/shopee/logs",
        tags: ["Marketplaces"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/shopee/sync-stock": {
      post: {
        summary: "POST /marketplaces/shopee/sync-stock",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/": {
      get: {
        summary: "GET /marketplaces/",
        tags: ["Marketplaces"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/ml/callback": {
      post: {
        summary: "POST /marketplaces/ml/callback",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/ml/disconnect": {
      post: {
        summary: "POST /marketplaces/ml/disconnect",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/ml/sync": {
      post: {
        summary: "POST /marketplaces/ml/sync",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/ml/products": {
      get: {
        summary: "GET /marketplaces/ml/products",
        tags: ["Marketplaces"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/ml/orders": {
      get: {
        summary: "GET /marketplaces/ml/orders",
        tags: ["Marketplaces"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/ml/push-product": {
      post: {
        summary: "POST /marketplaces/ml/push-product",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/marketplaces/ml/webhook": {
      post: {
        summary: "POST /marketplaces/ml/webhook",
        tags: ["Marketplaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/order/": {
      get: {
        summary: "GET /order/",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /order/",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/order/:id": {
      get: {
        summary: "GET /order/:id",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /order/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /order/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/order/:id/status": {
      patch: {
        summary: "PATCH /order/:id/status",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/products/search": {
      get: {
        summary: "GET /pos/products/search",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/products/by-barcode/:barcode": {
      get: {
        summary: "GET /pos/products/by-barcode/:barcode",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts": {
      get: {
        summary: "GET /pos/carts",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /pos/carts",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts/:id": {
      get: {
        summary: "GET /pos/carts/:id",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts/:id/items": {
      post: {
        summary: "POST /pos/carts/:id/items",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts/:id/items/:itemId": {
      patch: {
        summary: "PATCH /pos/carts/:id/items/:itemId",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts/:id/discount": {
      patch: {
        summary: "PATCH /pos/carts/:id/discount",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts/:id/save": {
      patch: {
        summary: "PATCH /pos/carts/:id/save",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts/:id/complete": {
      post: {
        summary: "POST /pos/carts/:id/complete",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts/:id/cancel": {
      post: {
        summary: "POST /pos/carts/:id/cancel",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/carts/:id/refund": {
      post: {
        summary: "POST /pos/carts/:id/refund",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/sales/saved": {
      get: {
        summary: "GET /pos/sales/saved",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/sales": {
      get: {
        summary: "GET /pos/sales",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/sales/:id": {
      get: {
        summary: "GET /pos/sales/:id",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/reports/daily": {
      get: {
        summary: "GET /pos/reports/daily",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/cash/register/active": {
      get: {
        summary: "GET /pos/cash/register/active",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/cash/register/open": {
      post: {
        summary: "POST /pos/cash/register/open",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/cash/register/:id/close": {
      post: {
        summary: "POST /pos/cash/register/:id/close",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/cash/register": {
      get: {
        summary: "GET /pos/cash/register",
        tags: ["POS"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/pos/cash/register/:id/entry": {
      post: {
        summary: "POST /pos/cash/register/:id/entry",
        tags: ["POS"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/product/low-stock": {
      get: {
        summary: "GET /product/low-stock",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/product/": {
      get: {
        summary: "GET /product/",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /product/",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/product/:id": {
      get: {
        summary: "GET /product/:id",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /product/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /product/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/product/:id/stock": {
      patch: {
        summary: "PATCH /product/:id/stock",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/purchase/": {
      get: {
        summary: "GET /purchase/",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /purchase/",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/purchase/:id": {
      get: {
        summary: "GET /purchase/:id",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /purchase/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /purchase/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/report/sales": {
      get: {
        summary: "GET /report/sales",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/report/stock": {
      get: {
        summary: "GET /report/stock",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/stock/movements": {
      get: {
        summary: "GET /stock/movements",
        tags: ["Stock"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/stock/adjust": {
      post: {
        summary: "POST /stock/adjust",
        tags: ["Stock"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/supplier/": {
      get: {
        summary: "GET /supplier/",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      post: {
        summary: "POST /supplier/",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/supplier/:id": {
      get: {
        summary: "GET /supplier/:id",
        tags: ["General"],
        security: [],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "PUT /supplier/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "DELETE /supplier/:id",
        tags: ["General"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Successful response" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
  },
};
