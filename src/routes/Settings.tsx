import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

      <div className="card max-w-lg p-6">
        <h2 className="text-section">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-fg-muted">Name</dt>
            <dd className="font-medium">{user?.name}</dd>
          </div>
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
