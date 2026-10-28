/**
 * resendTransport.js — Transporter de email usando Resend API
 *
 * Usa o SDK oficial da Resend (resend) para enviar emails transacionais.
 * Fallback para nodemailer SMTP se RESEND_API_KEY não estiver configurada.
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const RESEND_API_KEY = process.env.RESEND_API_KEY || null;
const SMTP_HOST = process.env.SMTP_HOST || null;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || null;
const SMTP_PASS = process.env.SMTP_PASS || null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@sizen.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'SIZEN ERP';

let resendClient = null;
let smtpTransporter = null;

/** Inicializa cliente Resend se chave disponível */
export function initResend() {
  if (RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
    return true;
  }
  return false;
}

/** Inicializa transporter SMTP se credenciais disponíveis */
export function initSmtp() {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return true;
  }
  return false;
}

/** Verifica qual transport está disponível */
export function getActiveTransport() {
  if (resendClient) return 'resend';
  if (smtpTransporter) return 'smtp';
  return null;
}

/** Envia email com fallback automático */
export async function sendEmail({ to, subject, html, text }) {
  // Tentar Resend primeiro
  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to,
        subject,
        html,
        text,
      });
      return {
        success: true,
        provider: 'resend',
        messageId: result.data?.id || 'unknown',
      };
    } catch (err) {
      console.error('[email] Resend falhou, tentando SMTP:', err.message);
    }
  }

  // Fallback para SMTP
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to,
        subject,
        html,
        text,
      });
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error('[email] SMTP também falhou:', err.message);
    }
  }

  // Nenhum transporte disponível
  console.log('[email] Nenhum transporte configurado — email simulado para:', to);
  return { success: false, provider: null, simulated: true };
}

/** Envia email de recuperação de senha com retry */
export async function sendPasswordResetEmail({ to, name, resetLink, expiresInMinutes = 60 }) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendEmail({
        to,
        subject: 'SIZEN — Recuperação de Senha',
        html: buildResetTemplate({ name, resetLink, expiresInMinutes }),
        text: `Recuperação de senha SIZEN. Link (expira em ${expiresInMinutes} min): ${resetLink}. Se não solicitou, ignore.`,
      });

      if (result.success) {
        console.log(`[email] ✅ Email de recuperação enviado para ${to} via ${result.provider} (tentativa ${attempt})`);
        return result;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[email] ⚠️  Tentativa ${attempt}/${maxRetries} falhou para ${to}:`, err.message);
    }

    // Backoff exponencial entre retries
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  console.error(`[email] ❌ Falhou após ${maxRetries} tentativas para ${to}:`, lastError?.message);
  return { success: false, provider: null, simulated: false, error: lastError?.message };
}

/** Template de recuperação de senha (mesmo design responsivo) */
function buildResetTemplate({ name, resetLink, expiresInMinutes }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recuperação de Senha — SIZEN</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #f6f7fa; color: #222; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 14px; box-shadow: 0 4px 24px rgba(0,0,0,.06); padding: 36px 28px; }
  h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
  p { line-height: 1.6; color: #334155; margin: 10px 0; }
  .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; }
  .link { word-break: break-all; color: #6366f1; text-decoration: underline; font-size: 13px; }
  .footer { font-size: 11px; color: #94a3b8; margin-top: 22px; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <h1>Olá, ${name || 'usuário'} 👋</h1>
  <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>SIZEN ERP</strong>.</p>
  <p>Se foi você, clique no botão abaixo. Este link expira em <strong>${expiresInMinutes} minutos</strong>.</p>
  <p style="text-align:center; margin: 24px 0;">
    <a class="btn" href="${resetLink}" target="_blank" rel="noopener noreferrer">Redefinir minha senha</a>
  </p>
  <p><a class="link" href="${resetLink}">${resetLink}</a></p>
  <div class="footer">SIZEN ERP — ${new Date().getFullYear()}</div>
</div>
</body>
</html>`;
}

// Auto-init on module load
initResend();
initSmtp();
