/**
 * Re-export sendEmail and specialized helpers from centralized emailService.
 * Maintains backwards compatibility across the backend while using Brevo HTTPS API.
 */
export {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
} from '../services/emailService.js';
