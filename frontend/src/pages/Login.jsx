import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { cx, Button, Field, inputClass } from '../components/shared.jsx';
import { GraduationCap } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const res = await login(email, password);
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
            <GraduationCap size={28} />
          </div>
          <h1 className="mt-6 font-display text-3xl tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Log in to your StudyArena desk.</p>
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
          
          <Field label="Password">
            <input 
              type="password" 
              required 
              className={inputClass} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter Your Password" 
            />
          </Field>

          <Button type="submit" className="w-full justify-center mt-6" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to StudyArena?{' '}
          <Link to="/register" className="font-bold text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
