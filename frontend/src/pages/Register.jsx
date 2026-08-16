import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { cx, Button, Field, inputClass } from '../components/shared.jsx';
import { GraduationCap } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', university: '', degree: 'B.Tech', branch: 'CSE', semester: '1' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const res = await register({ ...form, semester: Number(form.semester) });
    if (res.success) {
      navigate('/', { replace: true });
    } else {
      setError(res.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl space-y-8 rounded-3xl border border-card-border bg-card p-8 sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap size={28} />
          </div>
          <h1 className="mt-6 font-display text-3xl tracking-tight">Create your space</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign up to organize your academic life.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name">
              <input type="text" required className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter Your Name" />
            </Field>
            <Field label="Email">
              <input type="email" required className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="Enter Your Email" />
            </Field>
          </div>
          
          <Field label="Password">
            <input type="password" required className={inputClass} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Enter Your Password" />
          </Field>
          <Field label="Confirm Password">
            <input type="password" required className={inputClass} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Confirm Your Password" />
          </Field>

          <hr className="my-6 border-border" />

          <Field label="University">
            <input type="text" className={inputClass} value={form.university} onChange={e => set('university', e.target.value)} placeholder="Enter Your University" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Degree">
              <input type="text" className={inputClass} value={form.degree} onChange={e => set('degree', e.target.value)} placeholder="Enter Your Degree" />
            </Field>
            <Field label="Branch">
              <input type="text" className={inputClass} value={form.branch} onChange={e => set('branch', e.target.value)} placeholder="Enter Your Branch" />
            </Field>
            <Field label="Semester">
              <select className={inputClass} value={form.semester} onChange={e => set('semester', e.target.value)} placeholder="Enter Your Semester">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </Field>
          </div>

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
