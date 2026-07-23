/**
 * Email Service for Claim Code Distribution
 * Supports SendGrid, AWS SES, or standard SMTP
 */

import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@stunity.com';
const FROM_NAME = process.env.FROM_NAME || 'Stunity Enterprise';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter;
};

/**
 * Send claim code email to a student
 */
export async function sendClaimCodeEmail(params: {
  to: string;
  studentName: string;
  claimCode: string;
  schoolName: string;
  expiresAt: Date;
  grade?: string;
}) {
  const { to, studentName, claimCode, schoolName, expiresAt, grade } = params;

  const transporter = getTransporter();

  // Format expiration date
  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Email HTML template
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Claim Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                Welcome to ${schoolName}
              </h1>
              <p style="color: #e6e6ff; margin: 10px 0 0 0; font-size: 16px;">
                Your student registration code is ready
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${studentName}</strong>,
              </p>
              
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your account has been created at <strong>${schoolName}</strong>. Use the claim code below to complete your registration and access the school portal.
              </p>

              ${grade ? `
              <div style="background-color: #f1f5f9; border-left: 4px solid #667eea; padding: 15px 20px; margin: 0 0 30px 0; border-radius: 4px;">
                <p style="color: #475569; font-size: 14px; margin: 0;">
                  <strong>Grade:</strong> ${grade}
                </p>
              </div>
              ` : ''}

              <!-- Claim Code Box -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
                <p style="color: #e6e6ff; font-size: 14px; margin: 0 0 10px 0; letter-spacing: 1px; text-transform: uppercase;">
                  Your Claim Code
                </p>
                <div style="background-color: rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 20px; margin: 0 auto; display: inline-block;">
                  <p style="color: #ffffff; font-size: 32px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 4px; margin: 0;">
                    ${claimCode}
                  </p>
                </div>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 0 0 30px 0; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>⏰ Important:</strong> This code expires on <strong>${expirationDate}</strong>. Please register before this date.
                </p>
              </div>

              <!-- Instructions -->
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 25px; margin: 0 0 30px 0;">
                <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">
                  How to Register
                </h2>
                <ol style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Visit the Stunity Enterprise portal</li>
                  <li>Click on "Register with Claim Code"</li>
                  <li>Enter your claim code: <strong style="color: #667eea;">${claimCode}</strong></li>
                  <li>Complete your profile information</li>
                  <li>Start exploring your school portal!</li>
                </ol>
              </div>

              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions or need assistance, please contact your school administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px 0;">
                This email was sent by ${schoolName}
              </p>
              <p style="color: #cbd5e1; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Stunity Enterprise. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Plain text version
  const textContent = `
Welcome to ${schoolName}

Hi ${studentName},

Your account has been created at ${schoolName}. Use the claim code below to complete your registration and access the school portal.

Your Claim Code: ${claimCode}

${grade ? `Grade: ${grade}\n` : ''}
IMPORTANT: This code expires on ${expirationDate}. Please register before this date.

How to Register:
1. Visit the Stunity Enterprise portal
2. Click on "Register with Claim Code"
3. Enter your claim code: ${claimCode}
4. Complete your profile information
5. Start exploring your school portal!

If you have any questions or need assistance, please contact your school administrator.

---
This email was sent by ${schoolName}
© ${new Date().getFullYear()} Stunity Enterprise. All rights reserved.
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: `Your ${schoolName} Registration Code`,
      text: textContent,
      html: htmlContent,
    });

    return {
      success: true,
      messageId: info.messageId,
      email: to,
    };
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error.message,
      email: to,
    };
  }
}

/**
 * Send bulk claim code emails
 */
export async function sendBulkClaimCodeEmails(params: {
  recipients: Array<{
    email: string;
    name: string;
    code: string;
    grade?: string;
  }>;
  schoolName: string;
  expiresAt: Date;
}) {
  const { recipients, schoolName, expiresAt } = params;

  const results = {
    sent: [] as string[],
    failed: [] as Array<{ email: string; error: string }>,
  };

  // Send emails one by one (could be parallelized with Promise.all for better performance)
  for (const recipient of recipients) {
    const result = await sendClaimCodeEmail({
      to: recipient.email,
      studentName: recipient.name,
      claimCode: recipient.code,
      schoolName,
      expiresAt,
      grade: recipient.grade,
    });

    if (result.success) {
      results.sent.push(recipient.email);
    } else {
      results.failed.push({
        email: recipient.email,
        error: result.error || 'Unknown error',
      });
    }

    // Small delay to avoid rate limiting (adjust based on your email provider)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Test email configuration
 */
export async function testEmailConfig() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
