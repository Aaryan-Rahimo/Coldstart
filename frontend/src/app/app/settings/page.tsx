"use client";

import { ChangeEventHandler, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type AuthMe = {
  has_github?: boolean;
  has_google?: boolean;
};

const THEME_STORAGE_KEY = "coldstart-theme";

function applyTheme(isDark: boolean) {
  if (typeof window === "undefined") return;
  document.documentElement.classList.toggle("dark", isDark);
  document.body.classList.toggle("dark", isDark);
}

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

  const [gmailConnected, setGmailConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubIdentity, setGithubIdentity] = useState<GithubIdentity | null>(null);
  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const [disconnectingGithub, setDisconnectingGithub] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState(0);

  const [deleteText, setDeleteText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    const dark = saved === "dark";
    setIsDarkMode(dark);
    applyTheme(dark);
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

      const [authMeResult, draftsResult] = await Promise.all([
        fetch("/api/backend/auth/me", { method: "GET", cache: "no-store" }),
        supabase.from("drafts").select("id, created_at").eq("user_id", user.id),
      ]);

      const authMePayload = (await authMeResult.json().catch(() => ({}))) as AuthMe;
      setGmailConnected(Boolean(authMeResult.ok && authMePayload.has_google));
      setGithubConnected(Boolean(authMeResult.ok && authMePayload.has_github));

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
    const next = !isDarkMode;
    setIsDarkMode(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    applyTheme(next);
  };

  const disconnectGmail = async () => {
    setDisconnectingGmail(true);
    try {
      const res = await fetch("/api/backend/auth/google", { method: "DELETE" });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; detail?: { message?: string } };
      if (!res.ok) {
        throw new Error(payload.detail?.message || payload.error || "Failed to disconnect Gmail");
      }
      setGmailConnected(false);
      setNotice("Gmail disconnected.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to disconnect Gmail");
    } finally {
      setDisconnectingGmail(false);
    }
  };

  const disconnectGithub = async () => {
    setDisconnectingGithub(true);
    try {
      const res = await fetch("/api/backend/github/disconnect", { method: "DELETE" });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; detail?: { message?: string } };
      if (!res.ok) {
        throw new Error(payload.detail?.message || payload.error || "Failed to disconnect GitHub");
      }
      setGithubConnected(false);
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
      <div className="min-h-full bg-[#F5F3F0] px-5 py-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#E8DDD6] bg-white p-10 text-center text-[#765F56]">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F5F3F0] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[22px] font-semibold text-[#1E1310]">Settings</h1>
            <button
              onClick={toggleDarkMode}
              className="rounded-lg border border-[#E1D6CF] px-3 py-1.5 text-[12px] font-medium text-[#3D2C27]"
            >
              {isDarkMode ? "Disable Dark Mode" : "Enable Dark Mode"}
            </button>
          </div>
          <p className="mt-1 text-[14px] text-[#6F5A52]">Manage profile, integrations, and account security.</p>
          {notice && <p className="mt-2 text-[13px] text-[#A23A33]">{notice}</p>}
        </header>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 md:p-6">
            <h2 className="text-[18px] font-semibold text-[#1E1310]">Profile Settings</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-[13px] text-[#6C5850]">
                Display Name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px]"
                />
              </label>

              <label className="block text-[13px] text-[#6C5850]">
                Email (read-only)
                <input value={email} readOnly className="mt-1 w-full rounded-lg border border-[#E1D6CF] bg-[#F7F1EC] px-3 py-2 text-[14px]" />
              </label>

              <label className="block text-[13px] text-[#6C5850]">
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

          <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 md:p-6">
            <h2 className="text-[18px] font-semibold text-[#1E1310]">Password Change</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-[13px] text-[#6C5850]">
                Current Password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px]"
                />
              </label>
              <label className="block text-[13px] text-[#6C5850]">
                New Password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px]"
                />
              </label>
              <label className="block text-[13px] text-[#6C5850]">
                Confirm New Password
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px]"
                />
              </label>
              <button
                onClick={savePassword}
                disabled={savingPassword}
                className="rounded-lg border border-[#E1D6CF] px-4 py-2 text-[13px] font-medium text-[#3D2C27]"
              >
                {savingPassword ? "Saving..." : "Save Password"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E9DDD5] bg-white p-5 md:p-6">
          <h2 className="text-[18px] font-semibold text-[#1E1310]">Integrations</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#E7DDD6] bg-[#FFFEFD] p-4">
              <h3 className="text-[15px] font-semibold text-[#2A1C19]">Gmail Connection</h3>
              <p className="mt-1 inline-flex items-center gap-2 text-[13px] text-[#6D5951]">
                <span className={`h-2 w-2 rounded-full ${gmailConnected ? "bg-[#2E8B57]" : "bg-[#C3AAA0]"}`} />
                {gmailConnected ? "Connected" : "Disconnected"}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href="/api/google/auth"
                  className="inline-flex rounded-lg bg-[#E53935] px-3 py-2 text-[12px] font-medium text-white"
                >
                  {gmailConnected ? "Reconnect Gmail" : "Connect Gmail"}
                </Link>
                {gmailConnected && (
                  <button
                    onClick={disconnectGmail}
                    disabled={disconnectingGmail}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#F1C8C6] bg-[#FDF0EF] px-3 py-2 text-[12px] font-medium text-[#B42523] disabled:opacity-60"
                  >
                    {disconnectingGmail && <Loader2 size={13} className="animate-spin" />} Disconnect
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#E7DDD6] bg-[#FFFEFD] p-4">
              <div className="flex items-center gap-2">
                <Globe size={16} />
                <h3 className="text-[15px] font-semibold text-[#2A1C19]">GitHub Connection</h3>
              </div>

              <p className="mt-1 inline-flex items-center gap-2 text-[13px] text-[#6D5951]">
                <span className={`h-2 w-2 rounded-full ${githubConnected ? "bg-[#2E8B57]" : "bg-[#C3AAA0]"}`} />
                {githubConnected ? "Connected" : "Disconnected"}
              </p>

              {!githubConnected ? (
                <button className="mt-3 rounded-lg border border-[#E1D6CF] px-3 py-2 text-[12px]" onClick={connectGithub}>
                  Connect GitHub
                </button>
              ) : (
                <div className="mt-3">
                  <p className="text-[13px] text-[#2D211E]">Connected as @{githubIdentity?.identity_data?.user_name ?? "github-user"}</p>
                  {githubIdentity.identity_data?.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={githubIdentity.identity_data.avatar_url} alt="GitHub avatar" className="mt-2 h-10 w-10 rounded-full" />
                  )}
                  <button
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#F1C8C6] bg-[#FDF0EF] px-3 py-2 text-[12px] font-medium text-[#B42523] disabled:opacity-60"
                    disabled={disconnectingGithub}
                    onClick={disconnectGithub}
                  >
                    {disconnectingGithub && <Loader2 size={13} className="animate-spin" />} Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 md:p-6">
            <h2 className="text-[18px] font-semibold text-[#1E1310]">Danger Zone</h2>
            <p className="mt-1 text-[13px] text-[#6D5951]">Delete your account and all associated data permanently.</p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#E53935] px-4 py-2 text-[13px] font-medium text-[#C62A27]"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={14} /> Delete Account
            </button>
          </div>

          <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 md:p-6">
            <h2 className="text-[18px] font-semibold text-[#1E1310]">Account Info</h2>
            <div className="mt-3 space-y-2 text-[13px] text-[#5F4B44]">
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
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <div className="flex items-center gap-2 text-[#B42523]">
              <AlertTriangle size={18} />
              <h3 className="text-[17px] font-semibold">Confirm account deletion</h3>
            </div>
            <p className="mt-2 text-[13px] text-[#6B5850]">Type DELETE to confirm. This removes account data permanently.</p>
            <input
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              className="mt-3 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px]"
              placeholder="Type DELETE"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border border-[#E1D6CF] px-3 py-2 text-[12px]"
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
