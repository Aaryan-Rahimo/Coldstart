"use client";

import { ChangeEventHandler, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Globe, Loader2, Trash2 } from "lucide-react";
import { monthKey, truncateUserId } from "@/lib/coldstart";
import { createClient } from "@/lib/supabase/client";

type GithubIdentity = {
  id: string;
  identity_data?: {
    user_name?: string;
    avatar_url?: string;
  };
};

export default function SettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [userId, setUserId] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [hasGithub, setHasGithub] = useState<boolean | null>(null);
  const [hasGmail, setHasGmail] = useState<boolean | null>(null);
  const [githubIdentity, setGithubIdentity] = useState<GithubIdentity | null>(null);
  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const [disconnectingGithub, setDisconnectingGithub] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState(0);

  const [deleteText, setDeleteText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [notice, setNotice] = useState("");

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    setIsDark(isDarkMode);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setDisplayName((user.user_metadata?.display_name as string) || (user.user_metadata?.full_name as string) || "");
      setAvatarUrl((user.user_metadata?.avatar_url as string) || "");
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? "");
      setUserId(user.id);

      const identities = ((user.identities ?? []) as GithubIdentity[]) || [];
      const github = identities.find((identity) => identity.identity_data?.user_name);
      setGithubIdentity(github ?? null);

      const [draftsResult] = await Promise.all([
        supabase.from("drafts").select("id, created_at").eq("user_id", user.id),
      ]);

      const month = monthKey();
      const usage = (draftsResult.data ?? []).filter((draft) => {
        if (!draft.created_at) return false;
        return monthKey(new Date(draft.created_at)) === month;
      }).length;
      setMonthlyUsage(usage);

      setLoading(false);
    }

    loadData();
  }, [supabase]);

  useEffect(() => {
    async function checkConnections() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const text = await res.text();
        if (!text.trim()) return;
        let data: { success?: boolean; has_github?: boolean; has_google?: boolean } = {};
        try {
          data = JSON.parse(text) as { success?: boolean; has_github?: boolean; has_google?: boolean };
        } catch {
          console.error("Failed to parse auth/me response:", text);
          return;
        }
        if (data.success) {
          setHasGithub(Boolean(data.has_github));
          setHasGmail(Boolean(data.has_google));
        }
      } catch (e) {
        console.error("Failed to check connections:", e);
      }
    }
    checkConnections();
  }, []);

  const canDelete = useMemo(() => deleteText === "DELETE", [deleteText]);

  const saveProfile = async () => {
    setSavingProfile(true);

    const result = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        avatar_url: avatarUrl || null,
      },
    });

    setSavingProfile(false);
    setNotice(result.error ? result.error.message : "Profile updated.");
  };

  const onAvatarUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const path = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const upload = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upload.error) {
      setNotice(upload.error.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setNotice("Profile picture uploaded. Save profile to apply.");
  };

  const savePassword = async () => {
    if (!currentPassword) {
      setNotice("Enter your current password before updating.");
      return;
    }

    if (!newPassword || newPassword !== confirmNewPassword) {
      setNotice("New password and confirm password must match.");
      return;
    }

    setSavingPassword(true);
    const result = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setNotice(result.error ? result.error.message : "Password updated.");
  };

  const connectGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/app/settings`,
      },
    });
  };

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleDisconnectGmail = async () => {
    setDisconnectingGmail(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/backend/auth/google", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setHasGmail(false);
      setNotice("Gmail disconnected.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to disconnect Gmail");
    } finally {
      setDisconnectingGmail(false);
    }
  };

  const handleDisconnectGithub = async () => {
    setDisconnectingGithub(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/backend/auth/github", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setHasGithub(false);
      setGithubIdentity(null);
      setNotice("GitHub disconnected.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to disconnect GitHub");
    } finally {
      setDisconnectingGithub(false);
    }
  };

  const deleteAccount = async () => {
    if (!canDelete) return;

    setDeletingAccount(true);
    const rpcResult = await supabase.rpc("delete_user_account");
    if (rpcResult.error) {
      setNotice(rpcResult.error.message);
      setDeletingAccount(false);
      return;
    }

    await supabase.auth.signOut();
    setDeletingAccount(false);
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="settings-page min-h-full bg-[#F5F3F0] px-5 py-8 dark:bg-[#120F0F]">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#E8DDD6] bg-white p-10 text-center text-[#765F56] dark:border-[#2E2626] dark:bg-[#1C1717] dark:text-[#B09898]">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page min-h-full bg-[#F5F3F0] px-5 py-6 md:px-8 md:py-8 dark:bg-[#120F0F]">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className={`rounded-2xl border p-5 md:p-6 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
          <div className="flex items-center justify-between gap-3">
            <h1 className={`text-[22px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>Settings</h1>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                isDark ? "bg-[#D94048]" : "bg-[#EBE0DC]"
              }`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isDark ? "translate-x-8" : "translate-x-1"
              }`}>
                {isDark ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#D94048]">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#A08880]">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                )}
              </span>
            </button>
          </div>
          <p className={`mt-1 text-[14px] ${isDark ? "text-[#B09898]" : "text-[#6F5A52]"}`}>Manage profile, integrations, and account security.</p>
          {notice && <p className="mt-2 text-[13px] text-[#A23A33]">{notice}</p>}
        </header>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className={`rounded-2xl border p-5 md:p-6 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
            <h2 className={`text-[18px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>Profile Settings</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-[13px] text-[#6C5850] dark:text-[#B09898]">
                Display Name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px] dark:border-[#3A3030] dark:bg-[#171313] dark:text-[#F5EFEF]"
                />
              </label>

              <label className="block text-[13px] text-[#6C5850] dark:text-[#B09898]">
                Email (read-only)
                <input value={email} readOnly className="mt-1 w-full rounded-lg border border-[#E1D6CF] bg-[#F7F1EC] px-3 py-2 text-[14px] dark:border-[#3A3030] dark:bg-[#171313] dark:text-[#F5EFEF]" />
              </label>

              <label className="block text-[13px] text-[#6C5850] dark:text-[#B09898]">
                Profile Picture
                <input type="file" accept="image/*" onChange={onAvatarUpload} className="mt-1 w-full text-[13px]" />
              </label>

              {avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
              )}

              <button
                onClick={saveProfile}
                className="rounded-lg bg-[#E53935] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border p-5 md:p-6 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
            <h2 className={`text-[18px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>Password Change</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-[13px] text-[#6C5850] dark:text-[#B09898]">
                Current Password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px] dark:border-[#3A3030] dark:bg-[#171313] dark:text-[#F5EFEF]"
                />
              </label>
              <label className="block text-[13px] text-[#6C5850] dark:text-[#B09898]">
                New Password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px] dark:border-[#3A3030] dark:bg-[#171313] dark:text-[#F5EFEF]"
                />
              </label>
              <label className="block text-[13px] text-[#6C5850] dark:text-[#B09898]">
                Confirm New Password
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px] dark:border-[#3A3030] dark:bg-[#171313] dark:text-[#F5EFEF]"
                />
              </label>
              <button
                onClick={savePassword}
                disabled={savingPassword}
                className="rounded-lg border border-[#E1D6CF] px-4 py-2 text-[13px] font-medium text-[#3D2C27] dark:border-[#3A3030] dark:text-[#F5EFEF]"
              >
                {savingPassword ? "Saving..." : "Save Password"}
              </button>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl border p-5 md:p-6 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
          <h2 className={`text-[18px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>Integrations</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={`flex items-center justify-between p-5 rounded-xl border-2 ${
              hasGmail ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-950/25" : "border-[#E7DDD6] bg-[#FFFEFD] dark:border-[#2E2626] dark:bg-[#171313]"
            }`}>
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <div>
                  <p className="font-semibold text-[15px] text-[#1A1210] dark:text-[#F5EFEF]">Gmail</p>
                  <p className={`text-[13px] font-medium ${hasGmail ? "text-green-600" : "text-[#A08880]"}`}>
                    {hasGmail ? "✓ Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              {hasGmail ? (
                <button
                  onClick={handleDisconnectGmail}
                  disabled={disconnectingGmail}
                  className="text-[13px] font-semibold bg-[#D94048] text-white rounded-full px-4 py-1.5 hover:bg-[#C13540] transition-colors disabled:opacity-60"
                >
                  {disconnectingGmail ? "Disconnecting..." : "Disconnect"}
                </button>
              ) : (
                <button
                  onClick={() => supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`,
                      scopes: "https://www.googleapis.com/auth/gmail.send",
                      queryParams: { access_type: "offline", prompt: "consent" },
                    },
                  })}
                  className="text-[13px] font-semibold bg-[#D94048] text-white rounded-full px-4 py-1.5 hover:bg-[#C13540] transition-colors"
                >
                  Connect
                </button>
              )}
            </div>

            <div className={`flex items-center justify-between p-5 rounded-xl border-2 ${
              hasGithub ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-950/25" : "border-[#E7DDD6] bg-[#FFFEFD] dark:border-[#2E2626] dark:bg-[#171313]"
            }`}>
              <div className="flex items-center gap-3">
                <Globe size={16} />
                <div>
                  <p className="font-semibold text-[15px] text-[#1A1210] dark:text-[#F5EFEF]">GitHub</p>
                  <p className={`text-[13px] font-medium ${hasGithub ? "text-green-600" : "text-[#A08880]"}`}>
                    {hasGithub ? "✓ Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              {hasGithub ? (
                <button
                  onClick={handleDisconnectGithub}
                  disabled={disconnectingGithub}
                  className="text-[13px] font-semibold bg-[#D94048] text-white rounded-full px-4 py-1.5 hover:bg-[#C13540] transition-colors disabled:opacity-60"
                >
                  {disconnectingGithub ? "Disconnecting..." : "Disconnect"}
                </button>
              ) : (
                <button
                  onClick={connectGithub}
                  className="text-[13px] font-semibold bg-[#1A1210] text-white rounded-full px-4 py-1.5 hover:opacity-80 transition-opacity"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className={`rounded-2xl border p-5 md:p-6 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
            <h2 className={`text-[18px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>Danger Zone</h2>
            <p className="mt-1 text-[13px] text-[#6D5951] dark:text-[#B09898]">Delete your account and all associated data permanently.</p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#E53935] px-4 py-2 text-[13px] font-medium text-[#C62A27]"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={14} /> Delete Account
            </button>
          </div>

          <div className={`rounded-2xl border p-5 md:p-6 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
            <h2 className={`text-[18px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>Account Info</h2>
            <div className="mt-3 space-y-2 text-[13px] text-[#5F4B44] dark:text-[#B09898]">
              <p>Account created: {createdAt ? new Date(createdAt).toLocaleDateString() : "-"}</p>
              <p>User ID: {truncateUserId(userId)}</p>
              <p>
                Current plan: Free Plan <span className="ml-1 rounded-full bg-[#FCEBEA] px-2 py-0.5 text-[11px] text-[#AF2F2C]">Upgrade</span>
              </p>
              <p>Usage this month: {monthlyUsage} / 50 emails used</p>
            </div>
          </div>
        </section>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 dark:bg-[#1C1717]">
            <div className="flex items-center gap-2 text-[#B42523]">
              <AlertTriangle size={18} />
              <h3 className="text-[17px] font-semibold">Confirm account deletion</h3>
            </div>
            <p className="mt-2 text-[13px] text-[#6B5850] dark:text-[#B09898]">Type DELETE to confirm. This removes account data permanently.</p>
            <input
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              className="mt-3 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px] dark:border-[#3A3030] dark:bg-[#171313] dark:text-[#F5EFEF]"
              placeholder="Type DELETE"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border border-[#E1D6CF] px-3 py-2 text-[12px] dark:border-[#3A3030] dark:text-[#F5EFEF]"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteText("");
                }}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-[#B42523] px-3 py-2 text-[12px] text-white disabled:opacity-60"
                disabled={!canDelete || deletingAccount}
                onClick={deleteAccount}
              >
                {deletingAccount && <Loader2 size={13} className="animate-spin" />} Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
