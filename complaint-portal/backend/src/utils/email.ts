import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { Complaint } from '../mock/data';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const rawSmtpHost = process.env.SMTP_HOST?.trim();
const rawSmtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();
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
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2 style="color: #2563eb;">Complaint Submitted Successfully</h2>
          <p>Thank you, ${complaint.fullName}, for reporting the issue.</p>
          <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
          <p><strong>Category:</strong> ${complaint.category}</p>
          <p><strong>Status:</strong> ${complaint.status}</p>
          <p><strong>Location:</strong> ${complaint.address}</p>
          <p><strong>Description:</strong> ${complaint.description}</p>
          <p>You can track the status of your complaint using the complaint ID on the portal.</p>
          <p style="margin-top: 24px;">Regards,<br/>Complaint Portal Team</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send complaint notification email:', error);
    return false;
  }
};
