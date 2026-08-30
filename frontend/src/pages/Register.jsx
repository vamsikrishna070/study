import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field, inputClass } from '../components/shared.jsx';
import { CollegePicker } from '../components/CollegePicker.jsx';
import { GraduationCap, Eye, EyeOff, Check, X } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: '#ef4444' };
    case 2:
      return { score: 2, label: 'Fair', color: '#f59e0b' };
    case 3:
      return { score: 3, label: 'Good', color: '#3b82f6' };
    case 4:
      return { score: 4, label: 'Strong', color: '#10b981' };
    default:
      return { score: 0, label: 'Too short', color: '#ef4444' };
  }
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [collegeId, setCollegeId] = useState(null);
  const [collegeName, setCollegeName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => calculatePasswordStrength(form.password), [form.password]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (error) setError('');
  };

  const validate = () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || name.length < 2) {
      return 'Please enter your full name (at least 2 characters).';
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (!form.password || form.password.length < 8) {
      return 'Password must contain at least 8 characters.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      university: collegeName.trim(),
      ...(collegeId ? { collegeId } : {}),
    };

    const res = await register(payload);
    if (res.success) {
      navigate('/verify-email', { replace: true, state: { email: payload.email } });
    } else {
      setError(res.message || 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-card-border bg-card p-8 sm:p-10 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap size={28} />
          </div>
          <h1 className="mt-6 font-display text-3xl tracking-tight">Create your space</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign up to organize your academic life.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium">{error}</div>}
          
          <Field label="Full Name">
            <input 
              type="text" 
              required 
              className={inputClass} 
              value={form.name} 
              onChange={e => set('name', e.target.value)} 
              placeholder="Enter your full name" 
              disabled={isSubmitting}
            />
          </Field>

          <Field label="Email Address">
            <input 
              type="email" 
              required 
              className={inputClass} 
              value={form.email} 
              onChange={e => set('email', e.target.value)} 
              placeholder="Enter your email address" 
              disabled={isSubmitting}
            />
          </Field>
          
          <Field label="College / University" hint="Where are you currently studying?">
            <CollegePicker
              collegeId={collegeId}
              collegeName={collegeName}
              onSelect={({ collegeId: cid, collegeName: cname }) => {
                setCollegeId(cid);
                setCollegeName(cname);
                if (error) setError('');
              }}
              disabled={isSubmitting}
            />
          </Field>
          
          <Field label="Password">
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                className={inputClass + " pr-10"} 
                value={form.password} 
                onChange={e => set('password', e.target.value)} 
                placeholder="Create a strong password (8+ chars)" 
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {form.password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1.5 h-1">
                  {[1, 2, 3, 4].map(step => (
                    <div 
                      key={step} 
                      className="flex-1 rounded-full transition-all"
                      style={{
                        backgroundColor: passwordStrength.score >= step ? passwordStrength.color : 'var(--card-border, #e2e8f0)'
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Strength:</span>
                  <span className="font-semibold" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
          </Field>

          <Field label="Confirm Password">
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                className={inputClass + " pr-10"} 
                value={form.confirmPassword} 
                onChange={e => set('confirmPassword', e.target.value)} 
                placeholder="Re-enter your password" 
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {form.confirmPassword.length > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {form.password === form.confirmPassword ? (
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

          <Button type="submit" className="w-full justify-center mt-6" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

