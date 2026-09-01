import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useConnectPortal } from '../services/portalHooks.js';
import { Button, Field, inputClass } from '../components/shared.jsx';
import { GraduationCap, Lock, Save, RefreshCw } from 'lucide-react';

export default function Onboarding({ onComplete }) {
  const { user, refreshUser, updateProfile } = useAuth();
  const connectMutation = useConnectPortal();

  const [mode, setMode] = useState(null);
  const [srmUsername, setSrmUsername] = useState('');
  const [srmPassword, setSrmPassword] = useState('');
  const [error, setError] = useState('');

  const [manualForm, setManualForm] = useState({
    degree: '',
    branch: '',
    section: '',
    semester: '1',
  });

  const isSrm = user?.university?.toLowerCase().includes('srm');

  if (!isSrm) {

    return null;
  }

  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!srmUsername.trim() || !srmPassword) {
      setError('Please enter your Registration Number and Password.');
      return;
    }

    try {
      await connectMutation.mutateAsync({
        srmUsername: srmUsername.trim().toUpperCase(),
        srmPassword,
      });
      await refreshUser();
      onComplete();
    } catch (err) {
      setError(err.message || 'Unable to connect to the portal. Please verify your credentials.');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!manualForm.degree.trim() || !manualForm.branch.trim()) {
      setError('Degree and Branch are required.');
      return;
    }

    try {
      const res = await updateProfile({
        degree: manualForm.degree.trim(),
        branch: manualForm.branch.trim(),
        section: manualForm.section.trim(),
        semester: Number(manualForm.semester),
      });
      if (res.success) {
        await refreshUser();
        onComplete();
      } else {
        setError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
  };

  if (mode === 'sync') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-card-border bg-card p-8 shadow-sm">
          <div className="text-center">
            <h1 className="font-display text-2xl tracking-tight">Sync from SRM Portal</h1>
            <p className="mt-2 text-sm text-muted-foreground">Automatically fetch your profile, subjects, and academic records.</p>
          </div>

          <form onSubmit={handleSyncSubmit} className="space-y-4 mt-6">
            {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <Field label="Registration Number">
              <input
                type="text"
                required
                className={inputClass}
                value={srmUsername}
                onChange={e => setSrmUsername(e.target.value)}
                placeholder="e.g. AP2411001000"
                disabled={connectMutation.isPending}
              />
            </Field>

            <Field label="Portal Password">
              <input
                type="password"
                required
                className={inputClass}
                value={srmPassword}
                onChange={e => setSrmPassword(e.target.value)}
                placeholder="Enter your portal password"
                disabled={connectMutation.isPending}
              />
            </Field>

            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full justify-center" disabled={connectMutation.isPending}>
                {connectMutation.isPending ? <RefreshCw className="mr-2 animate-spin" size={18} /> : null}
                {connectMutation.isPending ? 'Connecting...' : 'Connect Portal'}
              </Button>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="text-sm text-muted-foreground hover:text-foreground mt-2"
                disabled={connectMutation.isPending}
              >
                Go back
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'manual') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-card-border bg-card p-8 shadow-sm">
          <div className="text-center">
            <h1 className="font-display text-2xl tracking-tight">Set up manually</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your academic details to get started.</p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4 mt-6">
            {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <Field label="Degree">
              <input
                type="text"
                required
                className={inputClass}
                value={manualForm.degree}
                onChange={e => setManualForm({...manualForm, degree: e.target.value})}
                placeholder="e.g. B.Tech"
              />
            </Field>

            <Field label="Branch">
              <input
                type="text"
                required
                className={inputClass}
                value={manualForm.branch}
                onChange={e => setManualForm({...manualForm, branch: e.target.value})}
                placeholder="e.g. Computer Science"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Section (Optional)">
                <input
                  type="text"
                  className={inputClass}
                  value={manualForm.section}
                  onChange={e => setManualForm({...manualForm, section: e.target.value})}
                  placeholder="e.g. A"
                />
              </Field>
              <Field label="Semester">
                <select
                  className={inputClass}
                  value={manualForm.semester}
                  onChange={e => setManualForm({...manualForm, semester: e.target.value})}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => <option key={s} value={s}>Sem {s}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full justify-center">
                <Save className="mr-2" size={18} /> Complete Setup
              </Button>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="text-sm text-muted-foreground hover:text-foreground mt-2"
              >
                Go back
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-card-border bg-card p-8 sm:p-10 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <GraduationCap size={28} />
        </div>
        <div>
          <h1 className="mt-6 font-display text-3xl tracking-tight">Academic Setup</h1>
          <p className="mt-3 text-base text-muted-foreground">
            We noticed you are studying at <strong>{user?.university || 'SRM AP'}</strong>.<br/>
            Connect your portal to instantly fetch your subjects, timetable, and attendance.
          </p>
        </div>

        <div className="grid gap-4 mt-8">
          <Button onClick={() => setMode('sync')} className="h-14 text-base shadow-md">
            <Lock className="mr-2" size={20} /> Sync from SRM Portal
          </Button>
          <button
            onClick={() => setMode('manual')}
            className="flex h-14 items-center justify-center rounded-xl border-2 border-transparent bg-secondary text-secondary-foreground font-semibold transition-colors hover:bg-secondary/80"
          >
            Set up manually
          </button>
        </div>
      </div>
    </div>
  );
}
