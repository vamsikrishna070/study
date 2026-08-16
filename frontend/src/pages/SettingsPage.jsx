import { useEffect, useState } from "react";
import { Moon, Sun, Trophy, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSubscribePush } from "../services/apiHooks.js";
import Shell from "../components/Shell.jsx";
import {
  Button,
  Field,
  PageHeading,
  cx,
  inputClass,
} from "../components/shared.jsx";

export default function SettingsPage() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("study-arena-theme") === "dark",
  );
  const { user, logout, updateProfile } = useAuth();
  const subscribePush = useSubscribePush();

  const [form, setForm] = useState({
    name: user?.name || "",
    university: user?.university || "",
    degree: user?.degree || "",
    branch: user?.branch || "",
    semester: String(user?.semester || "1"),
  });

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("study-arena-theme", next ? "dark" : "light");
  };

  const save = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const data = { ...form, semester: Number(form.semester) };
    const res = await updateProfile(data);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
    setIsSaving(false);
  };

  const setupNotifications = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("Push notifications are not supported by your browser.");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          "BDRsqjlRFYZJS6XPGnKTa9BmgczZN8WH_p4JtMch3fzVBcEEwMjMN1JeGrYb45XCJpsD-U92BQ8k-2_7Tahzwf4", // Public VAPID Key from backend env
      });

      await subscribePush.mutateAsync(sub.toJSON());
      alert("Push notifications enabled!");
    } catch (err) {
      console.error(err);
      alert("Failed to enable notifications.");
    }
  };

  return (
    <Shell>
      <PageHeading
        eyebrow="Your study desk"
        title="Settings"
        detail="Make the space fit how you work best."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-card-border bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
                {user?.name
                  ?.split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <h2 className="font-display text-2xl">Profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A little context for a more personal workspace.
                </p>
              </div>
            </div>
            <form onSubmit={save} className="mt-7 space-y-5">
              <Field label="Name">
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  data-testid="input-profile-name"
                />
              </Field>
              <Field label="University">
                <input
                  className={inputClass}
                  value={form.university}
                  onChange={(e) => set("university", e.target.value)}
                  data-testid="input-profile-university"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Degree">
                  <input
                    className={inputClass}
                    value={form.degree}
                    onChange={(e) => set("degree", e.target.value)}
                    data-testid="input-profile-degree"
                  />
                </Field>
                <Field label="Branch">
                  <input
                    className={inputClass}
                    value={form.branch}
                    onChange={(e) => set("branch", e.target.value)}
                    data-testid="input-profile-branch"
                  />
                </Field>
                <Field label="Semester">
                  <select
                    className={inputClass}
                    value={form.semester}
                    onChange={(e) => set("semester", e.target.value)}
                    data-testid="select-profile-semester"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span
                  className={cx(
                    "text-xs font-semibold text-accent transition-opacity",
                    saved ? "opacity-100" : "opacity-0",
                  )}
                >
                  Preferences saved
                </span>
                <Button
                  type="submit"
                  testId="button-save-profile"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </form>
          </section>
          <section className="rounded-2xl border border-card-border bg-card p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Interface
            </p>
            <h2 className="mt-1 font-display text-2xl">Appearance & Alerts</h2>
            <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  {dark ? <Moon size={17} /> : <Sun size={17} />}
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {dark ? "Night desk" : "Day desk"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dark
                      ? "A quieter, darker canvas"
                      : "Warm light for clear thinking"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggle}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-theme"
              >
                {dark ? (
                  <ToggleRight size={32} className="text-accent" />
                ) : (
                  <ToggleLeft size={32} className="text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-bold">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get reminded when tasks are due
                  </p>
                </div>
              </div>
              <Button
                variant="quiet"
                onClick={setupNotifications}
                className="h-8 px-3 text-xs"
              >
                Enable
              </Button>
            </div>
          </section>
          <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8">
            <h2 className="font-display text-2xl text-destructive">Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Log out of your current session.
            </p>
            <div className="mt-6">
              <Button variant="danger" onClick={logout}>
                Log out
              </Button>
            </div>
          </section>
        </div>
        <aside className="h-fit rounded-2xl border border-accent/20 bg-accent/10 p-6">
          <Trophy size={20} className="text-accent" />
          <h2 className="mt-4 font-display text-2xl">
            A workspace with a pulse
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            StudyArena is built for the quiet stretch between deciding to study
            and actually beginning. Keep it honest, keep it useful.
          </p>
          <div className="mt-6 border-t border-accent/20 pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            StudyArena · v1.0
          </div>
        </aside>
      </div>
    </Shell>
  );
}
