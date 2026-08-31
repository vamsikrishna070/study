import { useEffect, useState, useRef } from "react";
import { Moon, Sun, Trophy, ToggleLeft, ToggleRight, Camera, Bell, BellOff, ShieldAlert, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSubscribePush, uploadFile } from "../services/apiHooks.js";
import { useGetPortalStatus } from "../services/portalHooks.js";
import apiClient from "../services/apiClient.js";
import Shell from "../components/Shell.jsx";
import {
  Button,
  Field,
  PageHeading,
  cx,
  inputClass,
} from "../components/shared.jsx";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BDRsqjlRFYZJS6XPGnKTa9BmgczZN8WH_p4JtMch3fzVBcEEwMjMN1JeGrYb45XCJpsD-U92BQ8k-2_7Tahzwf4";

export default function SettingsPage() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("study-arena-theme") === "dark"
  );
  const { user, logout, updateProfile } = useAuth();
  const subscribePush = useSubscribePush();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    name: user?.officialName || user?.name || "",
    university: user?.university || "",
    registrationNumber: user?.registrationNumber || "",
    degree: user?.degree || "",
    branch: user?.branch || "",
    section: user?.section || "",
    semester: String(user?.semester || "1"),
  });

  const statusQuery = useGetPortalStatus();
  const isSynced = statusQuery.data?.isConnected;
  const lastSyncDate = statusQuery.data?.lastSuccessfulSync 
    ? new Date(statusQuery.data.lastSuccessfulSync).toLocaleString() 
    : "Recently";

  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || "");
  const [profileImagePublicId, setProfileImagePublicId] = useState(user?.profileImagePublicId || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        displayName: user.displayName || "",
        name: user.officialName || user.name || "",
        university: user.university || "",
        registrationNumber: user.registrationNumber || "",
        degree: user.degree || "",
        branch: user.branch || "",
        section: user.section || "",
        semester: String(user.semester || "1"),
      }));
    }
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Push notification state
  const [pushState, setPushState] = useState("loading"); // loading | unsupported | denied | idle | subscribing | enabled | error
  const [pushError, setPushError] = useState("");

  useEffect(() => {
    checkPushState();
  }, []);

  const checkPushState = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setPushState("enabled");
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    setPushState("idle");
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("study-arena-theme", next ? "dark" : "light");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const data = await uploadFile(file);
      setProfileImageUrl(data.url);
      setProfileImagePublicId(data.publicId);
    } catch (err) {
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setProfileImageUrl("");
    setProfileImagePublicId("");
  };

  const save = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const data = { 
      ...form, 
      semester: Number(form.semester),
      profileImageUrl,
      profileImagePublicId
    };
    const res = await updateProfile(data);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } else {
      toast({
        title: 'Save Failed',
        description: res.message || 'We couldn\'t save your profile. Please try again.',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  const enableNotifications = async () => {
    setPushError("");
    setPushState("subscribing");

    try {
      // Step 1: Check browser support
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("unsupported");
        return;
      }

      // Step 2: Request permission
      const perm = await Notification.requestPermission();
      if (perm === "denied") {
        setPushState("denied");
        return;
      }
      if (perm !== "granted") {
        setPushState("idle");
        setPushError("Notification permission was not granted.");
        return;
      }

      // Step 3: Register service worker
      let reg;
      try {
        reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.error("Service Worker registration failed:", swErr);
        setPushState("error");
        setPushError("Service Worker could not be registered. Make sure you are on HTTPS.");
        return;
      }

      // Step 4: Subscribe to push
      let sub;
      try {
        const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      } catch (subErr) {
        console.error("Push subscription failed:", subErr);
        setPushState("error");
        setPushError("Push subscription could not be created. The VAPID key may be invalid.");
        return;
      }

      // Step 5: Send to backend
      try {
        await subscribePush.mutateAsync(sub.toJSON());
      } catch (apiErr) {
        console.error("Backend subscription save failed:", apiErr);
        setPushState("error");
        setPushError("Unable to save subscription to the server. Check your connection.");
        return;
      }

      setPushState("enabled");
    } catch (err) {
      console.error("Unexpected push setup error:", err);
      setPushState("error");
      setPushError(err.message || "An unexpected error occurred.");
    }
  };

  const disableNotifications = async () => {
    setPushError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Remove from backend
          try {
            await apiClient.post("/notifications/unsubscribe", { endpoint: sub.endpoint });
          } catch (e) {
            // Backend may not have this endpoint yet; that's ok
          }
          await sub.unsubscribe();
        }
      }
      setPushState("idle");
    } catch (err) {
      console.error("Disable notifications error:", err);
      setPushError("Could not disable notifications.");
    }
  };

  const renderPushSection = () => {
    if (pushState === "loading") {
      return (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Checking notification status…
        </div>
      );
    }

    if (pushState === "unsupported") {
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <ShieldAlert size={17} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold">Not Supported</p>
            <p className="text-xs text-muted-foreground">Push notifications are not supported in this browser.</p>
          </div>
        </div>
      );
    }

    if (pushState === "denied") {
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
            <BellOff size={17} className="text-destructive" />
          </div>
          <div>
            <p className="text-sm font-bold text-destructive">Blocked</p>
            <p className="text-xs text-muted-foreground">Notifications are blocked. Enable them in your browser settings.</p>
          </div>
        </div>
      );
    }

    if (pushState === "enabled") {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
              <CheckCircle size={17} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold">Enabled</p>
              <p className="text-xs text-muted-foreground">You'll receive push notifications for reminders.</p>
            </div>
          </div>
          <Button variant="quiet" onClick={disableNotifications} className="h-8 px-3 text-xs">
            Disable
          </Button>
        </div>
      );
    }

    // idle, subscribing, or error
    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <Bell size={17} />
            </div>
            <div>
              <p className="text-sm font-bold">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Get reminded when tasks are due</p>
            </div>
          </div>
          <Button
            variant="quiet"
            onClick={enableNotifications}
            disabled={pushState === "subscribing"}
            className="h-8 px-3 text-xs"
          >
            {pushState === "subscribing" ? "Enabling…" : "Enable"}
          </Button>
        </div>
        {pushError && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{pushError}</p>
        )}
      </div>
    );
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
            <div className="flex items-start gap-5">
              <div className="relative group">
                {profileImageUrl ? (
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-border">
                    <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
                    {user?.name?.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                )}
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Camera size={20} className="text-white" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                />
              </div>

              <div className="flex-1">
                <h2 className="font-display text-2xl">Profile</h2>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {uploadingImage ? "Uploading..." : "A little context for a more personal workspace."}
                  </p>
                  {profileImageUrl && !uploadingImage && (
                    <button 
                      onClick={handleRemoveImage}
                      className="text-xs font-semibold text-destructive hover:underline"
                    >
                      Remove picture
                    </button>
                  )}
                </div>
              </div>
            </div>
            <form onSubmit={save} className="mt-7 space-y-5">
              {isSynced && (
                <div className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-foreground">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle size={16} className="text-accent" />
                    Profile synced with SRM AP Portal
                  </div>
                  <div className="mt-1 ml-6 text-xs text-muted-foreground">
                    Last synced: {lastSyncDate}
                  </div>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Display Name" hint="Appears across StudyArena. Leave blank to use official SRM name.">
                  <input
                    className={inputClass}
                    value={form.displayName}
                    onChange={(e) => set("displayName", e.target.value)}
                    disabled={isSaving}
                    maxLength={60}
                    placeholder="E.g. Vamsi"
                    data-testid="input-profile-display-name"
                  />
                </Field>
                <Field label="Official SRM Name">
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    disabled={isSynced || isSaving}
                    data-testid="input-profile-name"
                  />
                </Field>
              </div>
              <Field label="Registration Number">
                <input
                  className={inputClass}
                  value={form.registrationNumber}
                  onChange={(e) => set("registrationNumber", e.target.value)}
                  disabled={isSynced || isSaving}
                  placeholder="E.g. AP24110010000"
                />
              </Field>
              <Field label="University">
                <input
                  className={inputClass}
                  value={form.university}
                  onChange={(e) => set("university", e.target.value)}
                  disabled={isSynced || isSaving}
                  data-testid="input-profile-university"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Degree">
                  <input
                    className={inputClass}
                    value={form.degree}
                    onChange={(e) => set("degree", e.target.value)}
                    disabled={isSynced || isSaving}
                    data-testid="input-profile-degree"
                  />
                </Field>
                <Field label="Branch">
                  <input
                    className={inputClass}
                    value={form.branch}
                    onChange={(e) => set("branch", e.target.value)}
                    disabled={isSynced || isSaving}
                    data-testid="input-profile-branch"
                  />
                </Field>
                <Field label="Section">
                  <input
                    className={inputClass}
                    value={form.section}
                    onChange={(e) => set("section", e.target.value)}
                    disabled={isSynced || isSaving}
                    placeholder="E.g. Sec D"
                  />
                </Field>
                <Field label="Semester">
                  <select
                    className={inputClass}
                    value={form.semester}
                    onChange={(e) => set("semester", e.target.value)}
                    disabled={isSynced || isSaving}
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
            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              {renderPushSection()}
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

