import { useCallback, useEffect, useState } from "react";
import type { UserListItem, UserRole } from "@farmeriq/shared";
import { Navigate } from "react-router-dom";
import { canManageUsers } from "../auth";
import { ROLE_LABELS } from "../components/layout/AppNav";
import { SelectField } from "../components/fields/SelectField";
import { UserListMobileCard } from "../components/UserListMobileCard";
import { Pagination } from "../components/Pagination";
import { useRequireAuth } from "../hooks/useFarmers";
import { createUser, fetchOffices, fetchUsers, updateUser, type OfficeOption } from "../lib/users";

const EMPTY_FORM = {
  email: "",
  full_name: "",
  role: "agent" as UserRole,
  office_id: "",
};

function formatOffice(name: string | null, region?: string | null): string {
  if (!name) return "—";
  if (!region) return name;
  return `${name} - ${region}`;
}

export function UsersPage() {
  const user = useRequireAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "agent" as UserRole,
    office_id: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [response, officeRows] = await Promise.all([fetchUsers(page, 20, search), fetchOffices()]);
      setUsers(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });
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

  // reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!user) return null;
  if (!canManageUsers(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setInviteLink(null);

    try {
      const result = await createUser(
        {
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
          office_id: form.role === "admin" ? null : form.office_id || null,
        },
        user.id
      );
      setInviteLink(result.invite_link);
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

  function startEdit(target: UserListItem) {
    setEditingUser(target);
    setEditForm({
      full_name: target.full_name,
      role: target.role,
      office_id: target.office_id ?? "",
    });
    setEditError("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !editingUser) return;
    setEditSaving(true);
    setEditError("");

    try {
      await updateUser(
        editingUser.id,
        {
          full_name: editForm.full_name.trim(),
          role: editForm.role,
          office_id: editForm.role === "admin" ? null : editForm.office_id || null,
        },
        user.id
      );
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not update user.");
    } finally {
      setEditSaving(false);
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
                    label: `${office.name} - ${office.region}`,
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

        {inviteLink && (
          <div style={{ marginTop: "1.25rem", padding: "1rem", background: "var(--color-surface-alt, #f0fdf4)", borderRadius: "var(--radius)", border: "1px solid var(--color-success, #16a34a)" }}>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "var(--color-success, #16a34a)" }}>
              ✓ User created — share this invite link with them:
            </p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                readOnly
                value={inviteLink}
                style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void navigator.clipboard.writeText(inviteLink)}
              >
                Copy
              </button>
            </div>
            <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
              Link expires in 72 hours. The user must open it to set their password before they can log in.
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 className="card-title" style={{ margin: 0 }}>All users</h3>
          <div className="form-group" style={{ margin: 0, width: "300px", maxWidth: "100%" }}>
            <label htmlFor="user-search" className="sr-only">Search users</label>
            <input
              id="user-search"
              type="search"
              placeholder="Search by name, email or office…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ margin: 0 }}
            />
          </div>
        </div>
        {loading ? (
          <p className="muted">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="muted">No users found.</p>
        ) : (
          <>
            <div className="table-scroll farmer-list--desktop-only">
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
                      <td>{formatOffice(row.office_name, row.office_region)}</td>
                      <td>{row.is_active ? "Active" : "Inactive"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => startEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => void toggleActive(row)}
                            disabled={row.id === user.id}
                          >
                            {row.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="farmer-list--mobile-only">
              {users.map((row) => (
                <UserListMobileCard
                  key={row.id}
                  name={row.full_name}
                  email={row.email}
                  roleLabel={ROLE_LABELS[row.role]}
                  officeName={formatOffice(row.office_name, row.office_region)}
                  isActive={row.is_active}
                  actions={
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void toggleActive(row)}
                        disabled={row.id === user.id}
                      >
                        {row.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
            <Pagination
              page={pagination.page}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      {editingUser && (
        <div
          className="confirm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingUser(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "min(100%, 480px)",
              background: "var(--color-surface)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h3 className="card-title" style={{ margin: 0 }}>
                Edit user
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  padding: "0.25rem",
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {editError && <p className="error">{editError}</p>}

            <form onSubmit={(e) => void handleUpdate(e)}>
              <div className="form-group">
                <label htmlFor="edit-user-email">Email</label>
                <input
                  id="edit-user-email"
                  type="email"
                  value={editingUser.email}
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-user-name">Full name</label>
                <input
                  id="edit-user-name"
                  required
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-user-role">Role</label>
                <SelectField
                  id="edit-user-role"
                  value={editForm.role}
                  onChange={(value) =>
                    setEditForm((prev) => ({ ...prev, role: value as UserRole }))
                  }
                  options={[
                    { value: "agent", label: "Field Agent" },
                    { value: "team_lead", label: "Team Lead" },
                    { value: "admin", label: "Administrator" },
                  ]}
                />
              </div>

              {editForm.role !== "admin" && (
                <div className="form-group">
                  <label htmlFor="edit-user-office">Office</label>
                  <SelectField
                    id="edit-user-office"
                    value={editForm.office_id}
                    onChange={(value) =>
                      setEditForm((prev) => ({ ...prev, office_id: value }))
                    }
                    placeholder="Select office"
                    required
                    options={[
                      { value: "", label: "Select office" },
                      ...offices.map((office) => ({
                        value: office.id,
                        label: `${office.name} - ${office.region}`,
                      })),
                    ]}
                  />
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSaving}
                >
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
