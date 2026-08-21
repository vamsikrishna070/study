/**
 * Central Transactional Email Service for StudyArena
 * Uses Brevo HTTPS REST API (api.brevo.com/v3/smtp/email)
 * Eliminates SMTP port blocking on Render and serverless environments.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Builds standard branded HTML email template for StudyArena OTPs.
 */
function buildOtpHtml({ title, subtitle, otp, expiryMinutes = 15 }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #023c69; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">StudyArena</h1>
              <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 13px;">Your Academic Success Companion</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 20px; font-weight: 600; text-align: center;">${title}</h2>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.5; text-align: center;">${subtitle}</p>
              
              <!-- OTP Code Display -->
              <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 18px 12px; text-align: center; margin: 20px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; color: #023c69; letter-spacing: 8px; display: inline-block;">${otp}</span>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 13px; text-align: center; line-height: 1.4;">
                This one-time code expires in <strong>${expiryMinutes} minutes</strong>.
              </p>
              
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5; text-align: center;">
                  <strong>Security Alert:</strong> Never share your verification code with anyone. StudyArena support will never ask for your code.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                If you did not request this code, you can safely ignore this email.
              </p>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px;">
                &copy; ${new Date().getFullYear()} StudyArena. All rights reserved.
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
}

/**
 * Sends a transactional email using the Brevo HTTPS REST API.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} [options.text] - Plain text email content
 * @param {string} [options.html] - HTML email content
 * @returns {Promise<Object>} Brevo API response data (e.g. { messageId: '...' })
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[EmailService] BREVO_API_KEY is not configured in environment variables.');
    throw new Error('Brevo API key is not configured.');
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'creatorhub.studios07@gmail.com';
  const fromName = process.env.BREVO_FROM_NAME || 'StudyArena';

  // Ensure recipient is valid
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Invalid recipient email address.');
  }

  // Format HTML if plain text was provided without HTML
  let finalHtml = html;
  if (!finalHtml && text) {
    const otpMatch = text.match(/\b\d{6}\b/);
    const otp = otpMatch ? otpMatch[0] : '';
    const isVerification = subject.toLowerCase().includes('verify');
    const isPasswordReset = subject.toLowerCase().includes('password');

    if (otp) {
      finalHtml = buildOtpHtml({
        title: isPasswordReset ? 'Password Reset Code' : 'Verify Your Email',
        subtitle: isPasswordReset
          ? 'Enter this verification code to reset your StudyArena account password.'
          : 'Enter this verification code to complete your StudyArena registration.',
        otp,
        expiryMinutes: 15,
      });
    } else {
      finalHtml = `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">${text}</div>`;
    }
  }

  const requestBody = {
    sender: {
      name: fromName,
      email: fromEmail,
    },
    to: [
      {
        email: to.trim().toLowerCase(),
      },
    ],
    subject: subject || 'StudyArena Notification',
    htmlContent: finalHtml || `<p>${text || ''}</p>`,
    textContent: text || '',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} (${response.statusText})`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = `${errorMessage} - ${errorData.message}`;
        }
      } catch (_) {
        // Response wasn't JSON
      }
      console.error(`[EmailService] Brevo API email request failed: ${errorMessage}`);
      throw new Error('Unable to send verification email. Please try again shortly.');
    }

    const data = await response.json().catch(() => ({}));
    return { success: true, messageId: data.messageId };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[EmailService] Brevo API email request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
      throw new Error('Email service timed out. Please try again shortly.');
    }
    // Re-throw sanitized error for caller
    if (error.message.startsWith('Unable to send') || error.message.startsWith('Email service')) {
      throw error;
    }
    console.error(`[EmailService] Unexpected error sending email: ${error.message}`);
    throw new Error('Unable to send verification email. Please try again shortly.');
  }
};

/**
 * Sends an email verification OTP.
 */
export const sendVerificationEmail = async (email, otp) => {
  const html = buildOtpHtml({
    title: 'Verify Your Email',
    subtitle: 'Welcome to StudyArena! Enter the verification code below to activate your account.',
    otp,
    expiryMinutes: 15,
  });

  return sendEmail({
    to: email,
    subject: 'StudyArena - Email Verification OTP',
    text: `Your verification code is: ${otp}. It expires in 15 minutes.`,
    html,
  });
};

/**
 * Sends a password reset OTP.
 */
export const sendPasswordResetEmail = async (email, otp) => {
  const html = buildOtpHtml({
    title: 'Reset Your Password',
    subtitle: 'We received a request to reset your StudyArena password. Enter the code below to proceed.',
    otp,
    expiryMinutes: 15,
  });

  return sendEmail({
    to: email,
    subject: 'StudyArena - Password Reset OTP',
    text: `Your password reset code is: ${otp}. It expires in 15 minutes.`,
    html,
  });
};

/**
 * Generic OTP dispatcher helper.
 */
export const sendOtpEmail = async (email, otp, purpose = 'registration') => {
  if (purpose === 'password_reset') {
    return sendPasswordResetEmail(email, otp);
  }
  return sendVerificationEmail(email, otp);
};
