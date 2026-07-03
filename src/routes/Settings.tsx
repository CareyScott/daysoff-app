import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2 } from "lucide-react";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranding, type WorkspaceSettings } from "@/lib/branding";
import type { CompanyDay, User } from "@/lib/types";
import { formatDateRange } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Downscale an uploaded image to a small PNG data URL (fits in the DB). */
async function fileToLogoDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Not a valid image"));
    el.src = dataUrl;
  });
  const MAX = 192;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function WorkspaceCard() {
  const branding = useBranding();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState(branding.company_name);
  const [accentColor, setAccentColor] = useState(branding.accent_color);
  const [useGradient, setUseGradient] = useState(Boolean(branding.accent_color2));
  const [accentColor2, setAccentColor2] = useState(branding.accent_color2 ?? "#7c3aed");
  const [logoData, setLogoData] = useState<string | null>(branding.logo_data);
  const [requireApproval, setRequireApproval] = useState(branding.require_approval);
  const [hideLoginBranding, setHideLoginBranding] = useState(branding.hide_login_branding);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Sync local form once the settings query resolves.
  useEffect(() => {
    setCompanyName(branding.company_name);
    setAccentColor(branding.accent_color);
    setUseGradient(Boolean(branding.accent_color2));
    if (branding.accent_color2) setAccentColor2(branding.accent_color2);
    setLogoData(branding.logo_data);
    setRequireApproval(branding.require_approval);
    setHideLoginBranding(branding.hide_login_branding);
  }, [
    branding.company_name,
    branding.accent_color,
    branding.accent_color2,
    branding.logo_data,
    branding.require_approval,
    branding.hide_login_branding,
  ]);

  const mutation = useMutation({
    mutationFn: (body: WorkspaceSettings) =>
      api<WorkspaceSettings>("/api/settings", { method: "PUT", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
    },
  });

  const error =
    logoError ??
    (mutation.isError
      ? mutation.error instanceof ApiError
        ? mutation.error.message
        : "Something went wrong. Please try again."
      : null);

  const previewBackground = useGradient
    ? `linear-gradient(135deg, ${accentColor}, ${accentColor2})`
    : accentColor;

  return (
    <div className="card max-w-lg p-6">
      <h2 className="text-section">Workspace</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Company name, colors and logo, shown to everyone on this workspace.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          setLogoError(null);
          mutation.mutate({
            company_name: companyName.trim(),
            accent_color: accentColor,
            accent_color2: useGradient ? accentColor2 : null,
            logo_data: logoData,
            require_approval: requireApproval,
            hide_login_branding: hideLoginBranding,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="workspace-name">Company name</Label>
          <Input
            id="workspace-name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            maxLength={60}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="workspace-color">Team color</Label>
          <div className="flex items-center gap-3">
            <input
              id="workspace-color"
              type="color"
              value={accentColor}
              onChange={(event) => setAccentColor(event.target.value)}
              className="h-9 w-14 cursor-pointer rounded-md border border-border-default bg-bg-surface p-1"
            />
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                checked={useGradient}
                onChange={(event) => setUseGradient(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Gradient
            </label>
            {useGradient && (
              <input
                aria-label="Second gradient color"
                type="color"
                value={accentColor2}
                onChange={(event) => setAccentColor2(event.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-border-default bg-bg-surface p-1"
              />
            )}
            <span
              className="ml-auto h-9 w-24 rounded-md border border-border-default"
              style={{ background: previewBackground }}
              aria-hidden
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="workspace-logo">Logo</Label>
          <div className="flex items-center gap-3">
            {logoData ? (
              <img
                src={logoData}
                alt="Company logo"
                className="h-10 w-10 rounded-lg border border-border-default object-contain"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-border-default text-xs text-fg-subtle">
                none
              </span>
            )}
            <input
              id="workspace-logo"
              type="file"
              accept="image/*"
              className="text-sm text-fg-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setLogoError(null);
                fileToLogoDataUrl(file)
                  .then(setLogoData)
                  .catch((err: Error) => setLogoError(err.message));
              }}
            />
            {logoData && (
              <Button type="button" variant="ghost" onClick={() => setLogoData(null)}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-subtle">
            Shown in the sidebar, login screen and browser tab. Downscaled automatically.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(event) => setRequireApproval(event.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Require admin approval for vacation requests
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideLoginBranding}
              onChange={(event) => setHideLoginBranding(event.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Hide company name and logo on the login screen
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">
            Workspace updated.
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save workspace"}
        </Button>
      </form>
    </div>
  );
}

/** Admin-managed workspace-wide days off (public holidays, office closures). */
function CompanyDaysCard() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const companyDaysQuery = useQuery({
    queryKey: ["company-days", currentYear],
    queryFn: () => api<CompanyDay[]>(`/api/company-days?year=${currentYear}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["company-days"] });
  };

  const addMutation = useMutation({
    mutationFn: (body: { name: string; start_date: string; end_date: string }) =>
      api<CompanyDay>("/api/company-days", { method: "POST", body }),
    onSuccess: () => {
      invalidate();
      setName("");
      setStartDate("");
      setEndDate("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/api/company-days/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const companyDays = companyDaysQuery.data ?? [];
  const canAdd =
    Boolean(name.trim() && startDate && endDate) &&
    endDate >= startDate &&
    !addMutation.isPending;

  const mutationError = addMutation.error ?? deleteMutation.error;
  const errorMessage = mutationError
    ? mutationError instanceof ApiError
      ? mutationError.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <div className="card max-w-lg p-6">
      <h2 className="text-section">Company days</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Workspace-wide days off in {currentYear}, shown in blue on everyone's calendar.
      </p>

      {companyDaysQuery.isError && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          Could not load company days. Please try again.
        </p>
      )}

      {companyDays.length === 0 && !companyDaysQuery.isLoading ? (
        <p className="mt-4 py-1 text-sm text-fg-muted">No company days yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border-default">
          {companyDays.map((companyDay) => (
            <li key={companyDay.id} className="flex items-center gap-3 py-2.5">
              <span className="h-3 w-3 shrink-0 rounded bg-company" aria-hidden />
              <span className="flex-1 truncate text-sm font-medium">{companyDay.name}</span>
              <span className="text-sm text-fg-muted">
                {formatDateRange(companyDay.start_date, companyDay.end_date)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(companyDay.id)}
                title={`Delete ${companyDay.name}`}
                className="text-fg-muted hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete company day</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 space-y-3 border-t border-border-default pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canAdd) return;
          addMutation.mutate({ name: name.trim(), start_date: startDate, end_date: endDate });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="company-day-name">Name</Label>
          <Input
            id="company-day-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Summer party"
            maxLength={100}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="company-day-start">First day</Label>
            <Input
              id="company-day-start"
              type="date"
              value={startDate}
              onChange={(event) => {
                const value = event.target.value;
                setStartDate(value);
                if (!endDate || endDate < value) setEndDate(value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-day-end">Last day</Label>
            <Input
              id="company-day-end"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        {errorMessage && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" disabled={!canAdd}>
          {addMutation.isPending ? "Adding…" : "Add"}
        </Button>
      </form>
    </div>
  );
}

/** Inline display-name editor: PATCH /api/me, then sync the stored user. */
function AccountNameRow() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const mutation = useMutation({
    mutationFn: (body: { name: string }) =>
      api<User>("/api/me", { method: "PATCH", body }),
    onSuccess: (_data, variables) => {
      if (user) updateUser({ ...user, name: variables.name });
    },
  });

  const trimmed = name.trim();
  const canSave =
    trimmed.length >= 1 &&
    trimmed.length <= 80 &&
    trimmed !== user?.name &&
    !mutation.isPending;

  const errorMessage = mutation.isError
    ? mutation.error instanceof ApiError
      ? mutation.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <dt className="text-fg-muted">Name</dt>
        <dd className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="h-8 w-48"
            aria-label="Display name"
          />
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => mutation.mutate({ name: trimmed })}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </dd>
      </div>
      {errorMessage && (
        <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.new_password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export function Settings() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const mustChange = user?.must_change_password ?? false;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      api<void>("/api/me/password", { method: "POST", body }),
    onSuccess: () => {
      if (user) updateUser({ ...user, must_change_password: false });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      if (mustChange) {
        navigate("/", { replace: true });
      } else {
        setSuccess(true);
      }
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSuccess(false);
    setValidationError(null);
    const parsed = passwordSchema.safeParse({
      current_password: currentPassword,
      new_password: newPassword,
      confirm,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    mutation.mutate({
      current_password: parsed.data.current_password,
      new_password: parsed.data.new_password,
    });
  };

  const error =
    validationError ??
    (mutation.isError
      ? mutation.error instanceof ApiError
        ? mutation.error.message
        : "Something went wrong. Please try again."
      : null);

  return (
    <div className="space-y-6">
      <h1 className="text-page">Settings</h1>

      {mustChange && (
        <div className="flex items-start gap-3 rounded-xl border border-sick/40 bg-sick-soft px-4 py-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-sick-strong" />
          <div>
            <p className="text-sm font-semibold text-sick-strong">
              Change your password to continue
            </p>
            <p className="mt-0.5 text-sm text-sick-strong/80">
              Your account uses a temporary password. Set a new one below to unlock the rest of
              the app.
            </p>
          </div>
        </div>
      )}

      {user?.role === "admin" && !mustChange && (
        <>
          <WorkspaceCard />
          <CompanyDaysCard />
        </>
      )}

      <div className="card max-w-lg p-6">
        <h2 className="text-section">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <AccountNameRow />
          <div className="flex items-center justify-between gap-4">
            <dt className="text-fg-muted">Email</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-fg-muted">Role</dt>
            <dd>
              <Badge variant={user?.role === "admin" ? "vacation" : "default"}>
                {user?.role === "admin" ? "Admin" : "Member"}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card max-w-lg p-6">
        <h2 className="text-section">Change password</h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">
              Password updated.
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Change password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
