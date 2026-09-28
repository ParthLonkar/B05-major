import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { Complaint } from '../mock/data';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const rawSmtpHost = process.env.SMTP_HOST?.trim();
const rawSmtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpUser = process.env.SMTP_USER?.trim();
// Gmail app passwords are often copied with spaces between groups of characters.
const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, '');
const senderEmail = process.env.EMAIL_FROM?.trim() || 'no-reply@complaint-portal.local';

const smtpHost = rawSmtpHost?.includes('@') ? 'smtp.gmail.com' : rawSmtpHost;
const smtpPort = rawSmtpPort || (smtpHost?.includes('gmail') ? 587 : undefined);

const createTransporter = () => {
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const transporter = createTransporter();

const escapeHtml = (value: string | undefined): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const statusColor = (status: Complaint['status']): string => {
  if (status === 'Done') return '#059669';
  if (status === 'Under Construction') return '#d97706';
  if (status === 'Progressed') return '#2563eb';
  return '#dc2626';
};

const statusBackground = (status: Complaint['status']): string => {
  if (status === 'Done') return '#ecfdf5';
  if (status === 'Under Construction') return '#fffbeb';
  if (status === 'Progressed') return '#eff6ff';
  return '#fef2f2';
};

const emailLayout = (content: string): string => `
  <!doctype html>
  <html>
    <body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2f7;padding:32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #dbe3ee;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="background:#0f2747;padding:28px 32px;text-align:center;">
                  <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8ed7ff;font-weight:bold;">Pothole Guard</div>
                  <div style="margin-top:8px;font-size:25px;line-height:32px;color:#ffffff;font-weight:bold;">Complaint Management Portal</div>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">${content}</td>
              </tr>
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;color:#64748b;font-size:12px;line-height:19px;">
                  This is an automated message from Pothole Guard.<br/>
                  Please do not reply to this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const complaintDetails = (complaint: Complaint): string => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:24px 0;">
    <tr><td style="padding:12px 16px;background:#f8fafc;color:#64748b;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;">Complaint details</td></tr>
    <tr><td style="padding:0 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;line-height:22px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #eef2f7;color:#64748b;">Complaint ID</td><td align="right" style="padding:10px 0;border-bottom:1px solid #eef2f7;font-weight:bold;color:#0f2747;">${escapeHtml(complaint.complaintId)}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #eef2f7;color:#64748b;">Category</td><td align="right" style="padding:10px 0;border-bottom:1px solid #eef2f7;font-weight:bold;">${escapeHtml(complaint.category)}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #eef2f7;color:#64748b;">Location</td><td align="right" style="padding:10px 0;border-bottom:1px solid #eef2f7;font-weight:bold;">${escapeHtml(complaint.address)}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;">Reported</td><td align="right" style="padding:10px 0;font-weight:bold;">${new Date(complaint.createdAt).toLocaleDateString()}</td></tr>
      </table>
    </td></tr>
  </table>
`;

export const sendComplaintReceipt = async (complaint: Complaint): Promise<boolean> => {
  if (!complaint.email) {
    console.log('No reporter email provided. Skipping email notification.');
    return false;
  }

  if (!transporter) {
    console.error('Email transporter not configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in the backend .env file.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: senderEmail,
      to: complaint.email,
      subject: `Complaint submitted: ${complaint.complaintId}`,
      html: emailLayout(`
        <div style="text-align:center;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:12px;font-weight:bold;">COMPLAINT RECEIVED</div>
          <h1 style="margin:18px 0 8px;font-size:26px;line-height:34px;color:#0f2747;">Thank you for reporting this issue</h1>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:24px;">Hello ${escapeHtml(complaint.fullName)}, your complaint has been registered successfully.</p>
        </div>
        ${complaintDetails(complaint)}
        <div style="padding:16px;border-radius:10px;background:${statusBackground(complaint.status)};border-left:4px solid ${statusColor(complaint.status)};">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:bold;letter-spacing:.5px;">Current status</div>
          <div style="margin-top:5px;font-size:20px;color:${statusColor(complaint.status)};font-weight:bold;">${escapeHtml(complaint.status)}</div>
        </div>
        <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:10px;">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:bold;letter-spacing:.5px;">Your report</div>
          <p style="margin:8px 0 0;font-size:14px;line-height:22px;color:#374151;">${escapeHtml(complaint.description)}</p>
        </div>
        <p style="margin:24px 0 0;text-align:center;color:#64748b;font-size:13px;line-height:20px;">You can use your complaint ID to track future updates.</p>
      `),
    });
    return true;
  } catch (error) {
    console.error('Failed to send complaint notification email:', error);
    return false;
  }
};

export const sendComplaintStatusUpdate = async (complaint: Complaint): Promise<boolean> => {
  if (!complaint.email) {
    console.log('No reporter email provided. Skipping status update email.');
    return false;
  }

  if (!transporter) {
    console.error('Email transporter not configured. Skipping status update email.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: senderEmail,
      to: complaint.email,
      subject: `Complaint status updated: ${complaint.complaintId}`,
      html: emailLayout(`
        <div style="text-align:center;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:${statusBackground(complaint.status)};color:${statusColor(complaint.status)};font-size:12px;font-weight:bold;">STATUS UPDATE</div>
          <h1 style="margin:18px 0 8px;font-size:26px;line-height:34px;color:#0f2747;">Your complaint status changed</h1>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:24px;">Hello ${escapeHtml(complaint.fullName)}, here is the latest update on your application.</p>
        </div>
        <div style="margin:26px 0;text-align:center;padding:22px 16px;border-radius:12px;background:${statusBackground(complaint.status)};border:1px solid ${statusColor(complaint.status)};">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:bold;letter-spacing:1px;">Application status</div>
          <div style="margin-top:8px;font-size:25px;line-height:32px;color:${statusColor(complaint.status)};font-weight:bold;">${escapeHtml(complaint.status)}</div>
        </div>
        ${complaintDetails(complaint)}
        ${complaint.notes ? `<div style="padding:16px;border-radius:10px;background:#eff6ff;border-left:4px solid #2563eb;"><div style="font-size:12px;color:#1d4ed8;text-transform:uppercase;font-weight:bold;letter-spacing:.5px;">Latest update</div><p style="margin:8px 0 0;color:#374151;font-size:14px;line-height:22px;">${escapeHtml(complaint.notes)}</p></div>` : ''}
        <p style="margin:24px 0 0;text-align:center;color:#64748b;font-size:13px;line-height:20px;">Keep this email for your records. Use your complaint ID to track further updates.</p>
      `),
    });
    return true;
  } catch (error) {
    console.error('Failed to send complaint status email:', error);
    return false;
  }
};
