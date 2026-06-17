import { useCallback, useEffect, useState } from "react";
import type { UserListItem, UserRole } from "@farmeriq/shared";
import { Navigate } from "react-router-dom";
import { canManageUsers } from "../auth";
import { ROLE_LABELS } from "../components/layout/AppNav";
import { SelectField } from "../components/fields/SelectField";
import { useRequireAuth } from "../hooks/useFarmers";
import { createUser, fetchOffices, fetchUsers, updateUser, type OfficeOption } from "../lib/users";

const EMPTY_FORM = {
  email: "",
  full_name: "",
  role: "agent" as UserRole,
  office_id: "",
};

export function UsersPage() {
  const user = useRequireAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, officeRows] = await Promise.all([fetchUsers(), fetchOffices()]);
      setUsers(rows);
      setOffices(officeRows);
    } catch {
      setError("Could not load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  if (!user) return null;
  if (!canManageUsers(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");

    try {
      await createUser(
        {
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
          office_id: form.role === "admin" ? null : form.office_id || null,
        },
        user.id
      );
      setForm(EMPTY_FORM);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(target: UserListItem) {
    if (!user) return;
    setError("");
    try {
      await updateUser(target.id, { is_active: !target.is_active }, user.id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user.");
    }
  }

  return (
    <main className="main main--dashboard">
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Users</h2>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          Create and manage platform accounts
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3 className="card-title">Add user</h3>
        <form className="form-grid form-grid--2" onSubmit={(e) => void handleCreate(e)}>
          <div className="form-group">
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="user-name">Full name</label>
            <input
              id="user-name"
              required
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="user-role">Role</label>
            <SelectField
              id="user-role"
              value={form.role}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, role: value as UserRole }))
              }
              options={[
                { value: "agent", label: "Field Agent" },
                { value: "team_lead", label: "Team Lead" },
                { value: "admin", label: "Administrator" },
              ]}
            />
          </div>
          {form.role !== "admin" && (
            <div className="form-group">
              <label htmlFor="user-office">Office</label>
              <SelectField
                id="user-office"
                value={form.office_id}
                onChange={(value) => setForm((prev) => ({ ...prev, office_id: value }))}
                placeholder="Select office"
                required
                options={[
                  { value: "", label: "Select office" },
                  ...offices.map((office) => ({
                    value: office.id,
                    label: `${office.name} (${office.region})`,
                  })),
                ]}
              />
            </div>
          )}
          <div className="form-group" style={{ alignSelf: "end" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Create user"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3 className="card-title">All users</h3>
        {loading ? (
          <p className="muted">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="muted">No users found.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Office</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name}</td>
                    <td>{row.email}</td>
                    <td>{ROLE_LABELS[row.role]}</td>
                    <td>{row.office_name ?? "—"}</td>
                    <td>{row.is_active ? "Active" : "Inactive"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void toggleActive(row)}
                        disabled={row.id === user.id}
                      >
                        {row.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
