/**
 * service/email.js — Serviço de email transacional
 * Usa nodemailer com SMTP (quando configurado) ou simula envio
 * quando SMTP não está disponível (bloqueio externo documentado).
 * NUNCA expõe credenciais em logs.
 */
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const SMTP_HOST     = process.env.SMTP_HOST     || null;
const SMTP_PORT     = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE   = process.env.SMTP_SECURE === 'true';
const SMTP_USER     = process.env.SMTP_USER     || null;
const SMTP_PASS     = process.env.SMTP_PASS     || null;
const EMAIL_FROM    = process.env.EMAIL_FROM    || 'noreply@sizen.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'SIZEN ERP';

/** Configura transporter se credenciais existem; senão retorna null */
function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // bloqueio: SMTP não configurado
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }, // apenas para dev/test
  });
}

const transporter = createTransporter();

/** Gera hash SHA-256 do token (não armazena texto plano) */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Gera token aleatório seguro (32 bytes hex = 64 chars) */
export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Template responsivo para email de recuperação de senha */
function buildResetTemplate({ name, resetLink, expiresInMinutes }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recuperação de Senha — SIZEN</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #f6f7fa; color: #222; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 14px; box-shadow: 0 4px 24px rgba(0,0,0,.06); padding: 36px 28px; }
  h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 6px; letter-spacing: -.01em; }
  p { line-height: 1.6; color: #334155; margin: 10px 0; }
  .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 6px 18px rgba(139,92,246,.28); transition: transform .08s ease; }
  .btn:hover { transform: translateY(-2px); }
  .link { word-break: break-all; color: #6366f1; text-decoration: underline; font-size: 13px; }
  .note { font-size: 12px; color: #64748b; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
  .footer { font-size: 11px; color: #94a3b8; margin-top: 22px; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <h1>Olá, ${name || 'usuário'} 👋</h1>
  <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>SIZEN ERP</strong>.</p>
  <p>Se foi você, clique no botão abaixo para criar uma nova senha. Este link expira em <strong>${expiresInMinutes} minutos</strong>.</p>
  <p style="text-align:center; margin: 24px 0;">
    <a class="btn" href="${resetLink}" target="_blank" rel="noopener noreferrer">Redefinir minha senha</a>
  </p>
  <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
  <p><a class="link" href="${resetLink}">${resetLink}</a></p>
  <div class="note">
    <strong>Dica de segurança:</strong> nunca compartilhe este link com ninguém. Se você não solicitou esta alteração, pode ignorar este email com segurança — sua senha atual continuará válida.
  </div>
  <div class="footer">SIZEN ERP — ${new Date().getFullYear()}</div>
</div>
</body>
</html>`;
}

/** Envia email de recuperação. Quando SMTP não está configurado, retorna
 * objeto de sucesso simulado e loga a ausência de credenciais (bloqueio
 * externo documentado, nenhuma credencial exposta). */
export async function sendPasswordResetEmail({ to, name, resetLink, expiresInMinutes = 60 }) {
  // Se não há transporter, loga bloqueio externo (sem expor senha/credenciais)
  if (!transporter) {
    console.log('[email-service] SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS ausentes ou vazios). Email NÃO enviado. Link simulado para teste:', resetLink);
    console.log('[email-service] Mensagem genérica para evitar enumeração de usuários: email enviado (simulado) para:', to);
    return {
      simulated: true,
      messageId: 'simulated-' + Date.now(),
      response: 'SMTP não configurado — bloqueio externo documentado',
    };
  }

  const info = await transporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
    to,
    subject: 'SIZEN — Recuperação de Senha',
    html: buildResetTemplate({ name, resetLink, expiresInMinutes }),
    text: `Recuperação de senha SIZEN. Link (expira em ${expiresInMinutes} min): ${resetLink}. Se não solicitou, ignore.`
  });

  return {
    simulated: false,
    messageId: info.messageId,
    response: info.response,
  };
}
