import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, KeyRound, Plus } from "lucide-react";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadCsv, toCsv } from "@/lib/csv";
import { queryKeys } from "@/lib/queryClient";
import type { Absence, AdminUser, OverviewResponse, Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";

const newUserSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "member"]),
  allowance_days: z
    .number({ invalid_type_error: "Allowance must be a number" })
    .int("Allowance must be a whole number")
    .min(0, "Allowance cannot be negative"),
});

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

/** Inline-editable allowance for the current year (commit on blur / Enter). */
function AllowanceCell({ user, year }: { user: AdminUser; year: number }) {
  const queryClient = useQueryClient();
  const current = user.allowances.find((a) => a.year === year)?.days ?? 0;
  const [value, setValue] = useState(String(current));

  useEffect(() => {
    setValue(String(current));
  }, [current]);

  const mutation = useMutation({
    mutationFn: (days: number) =>
      api(`/api/users/${user.id}/allowances/${year}`, { method: "PUT", body: { days } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: () => setValue(String(current)),
  });

  const commit = () => {
    const days = Number(value);
    if (!Number.isInteger(days) || days < 0) {
      setValue(String(current));
      return;
    }
    if (days !== current) mutation.mutate(days);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        className="h-8 w-20 text-right tabular-nums"
        value={value}
        disabled={mutation.isPending}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        aria-label={`${user.name}'s ${year} allowance in days`}
      />
      {mutation.isPending && <span className="text-xs text-fg-muted">Saving…</span>}
    </div>
  );
}

function AddUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [allowance, setAllowance] = useState("25");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof newUserSchema>) =>
      api<AdminUser>("/api/users", { method: "POST", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setPassword("");
      setRole("member");
      setAllowance("25");
      setValidationError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);
    const parsed = newUserSchema.safeParse({
      email,
      name,
      password,
      role,
      allowance_days: Number(allowance),
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    mutation.mutate(parsed.data);
  };

  const error = validationError ?? (mutation.isError ? errorMessage(mutation.error) : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Add user</DialogTitle>
        <DialogDescription className="mt-1">
          They can sign in right away and will be asked to change their password.
        </DialogDescription>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Name</Label>
            <Input
              id="new-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-password">Initial password</Label>
            <Input
              id="new-user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-user-role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-allowance">Vacation days / year</Label>
              <Input
                id="new-user-allowance"
                type="number"
                min={0}
                value={allowance}
                onChange={(event) => setAllowance(event.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add user"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SetPasswordDialog({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: { id: string; password: string }) =>
      api<AdminUser>(`/api/users/${body.id}`, { method: "PATCH", body: { password: body.password } }),
    onSuccess: () => onClose(),
  });

  useEffect(() => {
    if (user) {
      setPassword("");
      setValidationError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const error = validationError ?? (mutation.isError ? errorMessage(mutation.error) : null);

  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Set password{user ? ` for ${user.name}` : ""}</DialogTitle>
        <DialogDescription className="mt-1">
          Share the new password with them securely.
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!user) return;
            if (password.length < 8) {
              setValidationError("Password must be at least 8 characters");
              return;
            }
            mutation.mutate({ id: user.id, password });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="set-password">New password</Label>
            <Input
              id="set-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoFocus
            />
          </div>
          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Set password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const year = new Date().getFullYear();
  const [addOpen, setAddOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api<AdminUser[]>("/api/users"),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users });
    void queryClient.invalidateQueries({ queryKey: ["overview"] });
  };

  const activeMutation = useMutation({
    mutationFn: (body: { id: string; active: boolean }) =>
      api<AdminUser>(`/api/users/${body.id}`, { method: "PATCH", body: { active: body.active } }),
    onSuccess: invalidate,
  });

  const roleMutation = useMutation({
    mutationFn: (body: { id: string; role: Role }) =>
      api<AdminUser>(`/api/users/${body.id}`, { method: "PATCH", body: { role: body.role } }),
    onSuccess: invalidate,
  });

  const users = usersQuery.data ?? [];

  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(users.map((u) => u.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportIds = useMemo(
    () => (selected.size > 0 ? selected : new Set(users.map((u) => u.id))),
    [selected, users],
  );

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const [overview, absences] = await Promise.all([
        api<OverviewResponse>(`/api/overview?year=${year}`),
        api<Absence[]>(`/api/absences?year=${year}`),
      ]);
      const included = overview.users.filter((u) => exportIds.has(u.id));
      const byId = new Map(included.map((u) => [u.id, u]));

      const rows: (string | number)[][] = [
        [`Vacation report ${year}`],
        [],
        [
          "Name",
          "Email",
          "Role",
          "Status",
          "Allowance (days)",
          "Vacation taken (days)",
          "Vacation remaining (days)",
          "Sick taken (days)",
          "Utilization (%)",
          "Absence bookings",
        ],
        ...included.map((u) => [
          u.name,
          u.email,
          u.role,
          u.active ? "active" : "inactive",
          u.allowance,
          u.vacation_taken,
          u.remaining,
          u.sick_taken,
          u.allowance > 0 ? Math.round((u.vacation_taken / u.allowance) * 1000) / 10 : "",
          absences.filter((a) => a.user_id === u.id).length,
        ]),
        [],
        ["Absence detail"],
        ["Name", "Email", "Type", "First day", "Last day", "Business days"],
        ...absences
          .filter((a) => byId.has(a.user_id))
          .map((a) => {
            const u = byId.get(a.user_id)!;
            return [u.name, u.email, a.kind, a.start_date, a.end_date, a.business_days];
          }),
      ];

      downloadCsv(`vacation-report-${year}.csv`, toCsv(rows));
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page">Users</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting
              ? "Exporting…"
              : selected.size > 0
                ? `Export ${selected.size} selected (CSV)`
                : "Export all (CSV)"}
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        </div>
      </header>

      {usersQuery.isError && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          Could not load users. Please try again.
        </p>
      )}
      {exportError && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {exportError}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border-default text-left">
              <th className="w-10 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all users"
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
              </th>
              <th className="px-2 py-3.5 font-medium text-fg-muted">Name</th>
              <th className="px-4 py-3.5 font-medium text-fg-muted">Role</th>
              <th className="px-4 py-3.5 font-medium text-fg-muted">Status</th>
              <th className="px-4 py-3.5 font-medium text-fg-muted">Allowance {year}</th>
              <th className="px-6 py-3.5 text-right font-medium text-fg-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {usersQuery.isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-fg-muted">
                  Loading…
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className={user.active ? undefined : "opacity-60"}>
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(user.id)}
                    onChange={() => toggleOne(user.id)}
                    aria-label={`Select ${user.name}`}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                </td>
                <td className="px-2 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
                      {initials(user.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.name}</p>
                      <p className="truncate text-xs text-fg-muted">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={user.role === "admin" ? "vacation" : "default"}>
                    {user.role === "admin" ? "Admin" : "Member"}
                  </Badge>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={user.active ? "default" : "danger"}>
                    {user.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3.5">
                  <AllowanceCell user={user} year={year} />
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={roleMutation.isPending || user.id === currentUser?.id}
                      title={
                        user.id === currentUser?.id
                          ? "You cannot change your own role"
                          : undefined
                      }
                      onClick={() =>
                        roleMutation.mutate({
                          id: user.id,
                          role: user.role === "admin" ? "member" : "admin",
                        })
                      }
                    >
                      {user.role === "admin" ? "Make member" : "Make admin"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPasswordTarget(user)}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Set password
                    </Button>
                    <Button
                      variant={user.active ? "outline" : "subtle"}
                      size="sm"
                      disabled={activeMutation.isPending || user.id === currentUser?.id}
                      title={
                        user.id === currentUser?.id
                          ? "You cannot deactivate your own account"
                          : undefined
                      }
                      onClick={() =>
                        activeMutation.mutate({ id: user.id, active: !user.active })
                      }
                    >
                      {user.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
      <SetPasswordDialog user={passwordTarget} onClose={() => setPasswordTarget(null)} />
    </div>
  );
}
