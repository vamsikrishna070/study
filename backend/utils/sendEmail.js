import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const fromName = process.env.BREVO_FROM_NAME || 'StudyArena';
    // Use the Brevo SMTP User email as the sender if not specified, 
    // because Brevo requires the sender email to be verified on the account.
    const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.BREVO_SMTP_USER || 'creatorhub.studios07@gmail.com';
    
    // Auto-generate HTML if not provided, to preserve existing OTP functionality but make it production-quality
    let finalHtml = html;
    if (!finalHtml && text) {
      const otpMatch = text.match(/\b\d{6}\b/);
      const otp = otpMatch ? otpMatch[0] : '';
      
      const isVerification = subject.toLowerCase().includes('verify');
      const isPasswordReset = subject.toLowerCase().includes('password');
      
      let title = 'StudyArena';
      if (isVerification) title = 'Verify Your Email';
      if (isPasswordReset) title = 'Password Reset';

      finalHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5; text-align: center; margin-bottom: 24px;">StudyArena</h2>
        <h3 style="color: #333333; text-align: center;">${title}</h3>
        <p style="color: #555555; font-size: 16px; line-height: 1.5; text-align: center;">
          ${text.replace(otp, `<strong style="font-size: 32px; color: #111827; display: block; text-align: center; margin: 20px 0; letter-spacing: 4px;">${otp}</strong>`)}
        </p>
        <p style="color: #777777; font-size: 12px; text-align: center; margin-top: 30px;">
          If you didn't request this email, please ignore it.<br>
          <strong>Never share your OTP with anyone.</strong>
        </p>
      </div>
      `;
    }

    if (!process.env.BREVO_SMTP_HOST || !process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
      throw new Error('Brevo SMTP credentials are not fully configured in environment variables.');
    }

    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html: finalHtml,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};
