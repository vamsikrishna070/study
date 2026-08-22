import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field, inputClass } from '../components/shared.jsx';
import { ShieldCheck, Eye, EyeOff, Check, X } from 'lucide-react';

export default function ResetPassword() {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { resetPassword, resendOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true });
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

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(email, otp.trim(), newPassword);
    if (res.success) {
      navigate('/login', { replace: true, state: { message: 'Password reset successful. Please log in with your new password.' } });
    } else {
      setError(res.message || 'Failed to reset password. Please check the code.');
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setSuccess('');
    setCooldown(60);

    const res = await resendOtp(email, 'password_reset');
    if (res.success) {
      setSuccess(res.message || 'Reset code resent successfully.');
    } else {
      setError(res.message || 'Failed to resend reset code.');
      setCooldown(0);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-card-border bg-card p-8 sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck size={28} />
          </div>
          <h1 className="mt-6 font-display text-3xl tracking-tight">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span> and choose a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium">{error}</div>}
          {success && <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400 font-medium">{success}</div>}
          
          <Field label="6-Digit Reset Code">
            <input 
              type="text" 
              required 
              maxLength={6}
              className={inputClass + " text-center text-lg tracking-widest font-mono"} 
              value={otp} 
              onChange={e => setOtp(e.target.value)} 
              placeholder="000000" 
              autoFocus
            />
          </Field>

          <Field label="New Password">
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                className={inputClass + " pr-10"} 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="Enter new password (8+ chars)" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          
          <Field label="Confirm New Password">
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                className={inputClass + " pr-10"} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="Confirm your new password" 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {confirmPassword.length > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {newPassword === confirmPassword ? (
                  <>
                    <Check size={14} className="text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">Passwords match</span>
                  </>
                ) : (
                  <>
                    <X size={14} className="text-destructive" />
                    <span className="text-destructive font-medium">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </Field>

          <Button type="submit" className="w-full justify-center mt-6" disabled={isSubmitting || otp.length < 6 || !newPassword}>
            {isSubmitting ? 'Resetting password...' : 'Reset Password'}
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

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/login" className="hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
