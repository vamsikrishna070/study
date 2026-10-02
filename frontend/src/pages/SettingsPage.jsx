import { useEffect, useState, useRef, useCallback } from "react";
import {
  Moon,
  Sun,
  Trophy,
  ToggleLeft,
  ToggleRight,
  Camera,
  Bell,
  BellOff,
  ShieldAlert,
  CheckCircle,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
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
  const {
    user,
    logout,
    updateProfile,
    getSessions,
    revokeSession,
    revokeOtherSessions,
    revokeAllSessions,
  } = useAuth();
  const subscribePush = useSubscribePush();
  const fileInputRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [sessionActionTarget, setSessionActionTarget] = useState(null);
  const [sessionStatusMessage, setSessionStatusMessage] = useState("");
  const [confirmModal, setConfirmModal] = useState(null); // { type, sessionId, deviceName, title, message }

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
  const [imgError, setImgError] = useState(false);

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

  const [pushState, setPushState] = useState("loading");
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

    }
    setPushState("idle");
  };

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const data = await getSessions();
      setSessions(data || []);
    } catch (err) {
      console.error("Failed to load active sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, [getSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleExecuteModalAction = async () => {
    if (!confirmModal) return;
    const { type, sessionId } = confirmModal;
    setSessionActionLoading(true);
    setSessionActionTarget(sessionId || type);
    try {
      if (type === "revoke_single" && sessionId) {
        await revokeSession(sessionId);
        setSessionStatusMessage("Device successfully logged out.");
        await loadSessions();
      } else if (type === "revoke_others") {
        const res = await revokeOtherSessions();
        setSessionStatusMessage(
          `Logged out of ${res.data?.revokedCount || "all other"} other device(s).`
        );
        await loadSessions();
      } else if (type === "revoke_all") {
        await revokeAllSessions();
        return;
      }
      setTimeout(() => setSessionStatusMessage(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to complete the requested action.");
    } finally {
      setSessionActionLoading(false);
      setSessionActionTarget(null);
      setConfirmModal(null);
    }
  };

  const formatActivityTime = (dateStr) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 120) return "Active now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeviceIcon = (platform, deviceType) => {
    const p = String(platform || "").toLowerCase();
    const d = String(deviceType || "").toLowerCase();
    if (p === "ios" || p === "android" || d === "mobile") {
      return <Smartphone size={18} className="text-accent" />;
    }
    if (d === "tablet") {
      return <Tablet size={18} className="text-accent" />;
    }
    if (d === "desktop" || p === "web") {
      return <Laptop size={18} className="text-accent" />;
    }
    return <Globe size={18} className="text-accent" />;
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

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("unsupported");
        return;
      }

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

          try {
            await apiClient.post("/notifications/unsubscribe", { endpoint: sub.endpoint });
          } catch (e) {

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
                {profileImageUrl && !imgError ? (
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-border">
                    <img 
                      src={profileImageUrl} 
                      alt="Profile" 
                      className="h-full w-full object-cover" 
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
                    {(user?.displayName || user?.officialName || user?.name || "Student").split(" ").map((p) => p[0]).join("").slice(0, 2) || "S"}
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
          <section className="rounded-2xl border border-card-border bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  Security & Devices
                </p>
                <h2 className="mt-1 font-display text-2xl">Active Sessions</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage devices and web browsers where your StudyArena account is currently active.
                </p>
              </div>
              <button
                type="button"
                onClick={loadSessions}
                disabled={loadingSessions}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-accent hover:text-accent"
                title="Refresh sessions"
              >
                <RefreshCw size={15} className={loadingSessions ? "animate-spin text-accent" : ""} />
              </button>
            </div>

            {sessionStatusMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent">
                <CheckCircle size={15} />
                <span>{sessionStatusMessage}</span>
              </div>
            )}

            <div className="mt-6 space-y-4">
              {loadingSessions && sessions.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <RefreshCw size={18} className="mr-2 animate-spin text-accent" />
                  Loading active devices...
                </div>
              ) : (
                <>
                  {/* Current Session */}
                  {sessions
                    .filter((s) => s.isCurrent)
                    .map((s) => (
                      <div
                        key={s.id || s.sessionId}
                        className="rounded-xl border-2 border-accent/40 bg-accent/5 p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-background shadow-sm">
                              {getDeviceIcon(s.platform, s.deviceType)}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">
                                  {s.deviceName || `${s.browser} on ${s.os}`}
                                </h3>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold text-accent">
                                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                                  CURRENT DEVICE
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {s.browser} • {s.os}
                                {s.ipAddress ? ` • IP: ${s.ipAddress}` : ""}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground/80">
                                <span className="font-semibold text-accent">Active now</span>
                                {s.createdAt
                                  ? ` • Logged in ${new Date(s.createdAt).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center sm:self-center">
                            <Button
                              variant="danger"
                              onClick={logout}
                              className="w-full sm:w-auto text-xs"
                            >
                              Log out this device
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Other Sessions */}
                  <div className="pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Other Active Devices
                    </h3>

                    {sessions.filter((s) => !s.isCurrent).length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-border bg-background/50 p-5 text-center text-xs text-muted-foreground">
                        <ShieldCheck size={24} className="mx-auto mb-2 text-accent/60" />
                        No other active sessions. Your account is only signed in on this device.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {sessions
                          .filter((s) => !s.isCurrent)
                          .map((s) => (
                            <div
                              key={s.id || s.sessionId}
                              className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-start gap-3.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                                  {getDeviceIcon(s.platform, s.deviceType)}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">
                                    {s.deviceName || `${s.browser} on ${s.os}`}
                                  </h4>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {s.browser} • {s.os}
                                    {s.ipAddress ? ` • IP: ${s.ipAddress}` : ""}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Last active: {formatActivityTime(s.lastActiveAt)}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={sessionActionLoading && sessionActionTarget === s.id}
                                onClick={() =>
                                  setConfirmModal({
                                    type: "revoke_single",
                                    sessionId: s.id || s.sessionId,
                                    deviceName: s.deviceName || `${s.browser} on ${s.os}`,
                                    title: "Log Out Device",
                                    message: `Are you sure you want to log out "${s.deviceName || s.browser}"? This device will be signed out immediately and required to log in again.`,
                                  })
                                }
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-white disabled:opacity-50"
                              >
                                <LogOut size={13} />
                                {sessionActionLoading && sessionActionTarget === s.id
                                  ? "Logging out..."
                                  : "Log out"}
                              </button>
                            </div>
                          ))}

                        <div className="flex flex-wrap gap-3 pt-3">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setConfirmModal({
                                type: "revoke_others",
                                title: "Log Out All Other Devices",
                                message:
                                  "Are you sure you want to log out all other active sessions? Only this current device will stay logged in.",
                              })
                            }
                            disabled={sessionActionLoading}
                            className="text-xs"
                          >
                            Log out other devices
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() =>
                              setConfirmModal({
                                type: "revoke_all",
                                title: "Log Out All Devices",
                                message:
                                  "Are you sure you want to log out of ALL devices, including this one? You will be redirected to the login screen.",
                              })
                            }
                            disabled={sessionActionLoading}
                            className="text-xs"
                          >
                            Log out all devices
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Account Quick Logout */}
          <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8">
            <h2 className="font-display text-2xl text-destructive">Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Log out of your current session on this device.
            </p>
            <div className="mt-6">
              <Button variant="danger" onClick={logout}>
                Log out
              </Button>
            </div>
          </section>

          {/* Confirmation Modal */}
          {confirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle size={22} />
                  <h3 className="font-display text-lg text-foreground">{confirmModal.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {confirmModal.message}
                </p>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmModal(null)}
                    disabled={sessionActionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleExecuteModalAction}
                    disabled={sessionActionLoading}
                  >
                    {sessionActionLoading ? "Processing..." : "Confirm Log Out"}
                  </Button>
                </div>
              </div>
            </div>
          )}
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

