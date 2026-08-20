export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const fromName = process.env.BREVO_FROM_NAME || 'StudyArena';
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'creatorhub.studios07@gmail.com';
    
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

    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY environment variable is not configured.');
    }

    const payload = {
      sender: {
        name: fromName,
        email: fromEmail
      },
      to: [
        {
          email: to
        }
      ],
      subject,
      htmlContent: finalHtml
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      throw new Error(errorData.message || 'Failed to send email via Brevo');
    }

    return true; // For backwards compatibility if any code relies on truthy return
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error; // Throw so controller can handle appropriately
  }
};
