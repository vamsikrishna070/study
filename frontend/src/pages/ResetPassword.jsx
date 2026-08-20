import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field, inputClass } from '../components/shared.jsx';
import { ShieldCheck } from 'lucide-react';

export default function ResetPassword() {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(email, otp, newPassword);
    if (res.success) {
      navigate('/', { replace: true });
    } else {
      setError(res.message);
      setIsSubmitting(false);
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
            Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span> and your new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          
          <Field label="Reset Code">
            <input 
              type="text" 
              required 
              maxLength={6}
              className={inputClass + " text-center text-lg tracking-widest"} 
              value={otp} 
              onChange={e => setOtp(e.target.value)} 
              placeholder="000000" 
            />
          </Field>

          <Field label="New Password">
            <input 
              type="password" 
              required 
              className={inputClass} 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Enter New Password" 
            />
          </Field>
          
          <Field label="Confirm New Password">
            <input 
              type="password" 
              required 
              className={inputClass} 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Confirm New Password" 
            />
          </Field>

          <Button type="submit" className="w-full justify-center mt-6" disabled={isSubmitting || otp.length < 6 || !newPassword}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
