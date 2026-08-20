import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const fromEmail = process.env.RESEND_FROM || 'onboarding@resend.dev';
    
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

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      text, // plain-text fallback
      html: finalHtml,
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error('Failed to send email via Resend');
    }

    return true; // For backwards compatibility if any code relies on truthy return
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error; // Throw so controller can handle appropriately
  }
};
