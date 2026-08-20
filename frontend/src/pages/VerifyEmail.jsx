import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field, inputClass } from '../components/shared.jsx';
import { MailCheck } from 'lucide-react';

export default function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { verifyEmail, resendOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const res = await verifyEmail(email, otp);
    if (res.success) {
      navigate('/', { replace: true });
    } else {
      setError(res.message);
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setSuccess('');
    setCooldown(60); // 60 seconds cooldown

    const res = await resendOtp(email);
    if (res.success) {
      setSuccess(res.message || 'OTP resent successfully.');
    } else {
      setError(res.message);
      setCooldown(0);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-card-border bg-card p-8 sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <MailCheck size={28} />
          </div>
          <h1 className="mt-6 font-display text-3xl tracking-tight">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {location.state?.message || (
              <>We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>.</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          {success && <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">{success}</div>}
          
          <Field label="Verification Code">
            <input 
              type="text" 
              required 
              maxLength={6}
              className={inputClass} 
              value={otp} 
              onChange={e => setOtp(e.target.value)} 
              placeholder="Enter 6-digit OTP" 
            />
          </Field>

          <Button type="submit" className="w-full justify-center mt-6" disabled={isSubmitting || otp.length < 6}>
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Didn't receive the code?{' '}
          <button 
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="font-bold text-accent hover:underline disabled:opacity-50 disabled:hover:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </p>
      </div>
    </div>
  );
}
