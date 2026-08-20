import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field, inputClass } from '../components/shared.jsx';
import { KeyRound } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const res = await forgotPassword(email);
    if (res.success) {
      navigate('/reset-password', { state: { email } });
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
            <KeyRound size={28} />
          </div>
          <h1 className="mt-6 font-display text-3xl tracking-tight">Forgot Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email to receive a reset code.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          
          <Field label="Email">
            <input 
              type="email" 
              required 
              className={inputClass} 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="Enter Your Email" 
            />
          </Field>

          <Button type="submit" className="w-full justify-center mt-6" disabled={isSubmitting || !email}>
            {isSubmitting ? 'Sending...' : 'Send Reset Code'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link to="/login" className="font-bold text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
