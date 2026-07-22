import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Loader2, RefreshCw, Shield, Users } from "lucide-react";
import {
  PERMISSION_CATALOG,
  PERMISSIONS,
  type Permission,
} from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/authStore";
import Can from "@/components/rbac/Can";
import {
  handleAssignStaffRole,
  handleCreateAccessStaff,
  handleGetAccessRoles,
  handleGetAccessStaff,
  handleUpdateAccessRole,
  type AccessRole,
  type AccessStaffRow,
} from "@/services/apiClient";

type TabKey = "staff" | "roles" | "mine";

/**
 * Step 10 — Access Control management UI.
 * - ACCESS_READ: view staff + roles + own permissions
 * - ACCESS_MANAGE: assign roles, edit role permission sets
 */
export default function AccessScreen() {
  const { permissions, role, can } = usePermission();
  const authUser = useAuthStore((s) => s.user);
  const canManage = can(PERMISSIONS.ACCESS_MANAGE);

  const [tab, setTab] = useState<TabKey>("staff");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState<AccessStaffRow[]>([]);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newStaff, setNewStaff] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
  });

  const modules = useMemo(
    () => [...new Set(PERMISSION_CATALOG.map((p) => p.module))],
    [],
  );

  const selectedRole = useMemo(
    () => roles.find((r) => String(r._id) === String(selectedRoleId)) || null,
    [roles, selectedRoleId],
  );

  const loadAll = useCallback(async (searchTerm = "") => {
    try {
      setLoading(true);
      const [staffRes, rolesRes] = await Promise.all([
        handleGetAccessStaff(searchTerm),
        handleGetAccessRoles(),
      ]);
      setStaff(Array.isArray(staffRes?.staff) ? staffRes.staff : []);
      const nextRoles: AccessRole[] = Array.isArray(rolesRes?.roles)
        ? rolesRes.roles
        : [];
      setRoles(nextRoles);
      setSelectedRoleId((prev) => {
        if (prev && nextRoles.some((r) => String(r._id) === String(prev))) {
          return prev;
        }
        return nextRoles.length ? String(nextRoles[0]._id) : null;
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Failed to load",
        err?.response?.data?.message ?? "Could not load access data.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll("");
  }, [loadAll]);

  useEffect(() => {
    if (!selectedRole) return;
    setDraftPermissions(selectedRole.permissions || []);
  }, [selectedRole]);

  const onSearchStaff = async () => {
    await loadAll(search);
  };

  const onAssignRole = async (staffId: string, roleId: string) => {
    try {
      setAssigningId(staffId);
      const res = await handleAssignStaffRole(staffId, roleId || null);
      setStaff((prev) =>
        prev.map((row) =>
          String(row._id) === String(staffId) && res?.staff ? res.staff : row,
        ),
      );
      Swal.fire({
        icon: "success",
        title: "Role updated",
        text: "Staff will see new permissions after they re-login (or refresh session).",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Assign failed",
        err?.response?.data?.message ?? "Could not assign role.",
        "error",
      );
    } finally {
      setAssigningId(null);
    }
  };

  const onCreateStaff = async () => {
    if (!canManage) return;
    try {
      setCreating(true);
      const res = await handleCreateAccessStaff({
        fullName: newStaff.fullName.trim(),
        email: newStaff.email.trim(),
        phone: newStaff.phone.trim(),
        password: newStaff.password,
        roleId: newStaff.roleId || null,
      });
      if (res?.staff) {
        setStaff((prev) => [res.staff, ...prev]);
      }
      setNewStaff({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        roleId: "",
      });
      Swal.fire({
        icon: "success",
        title: "Staff created",
        text: "They can log in with the email/phone and password you set.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create staff.",
        "error",
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleDraftPermission = (key: string) => {
    if (!canManage) return;
    setDraftPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const onSaveRolePermissions = async () => {
    if (!selectedRole || !canManage) return;
    try {
      setSavingRole(true);
      const res = await handleUpdateAccessRole(String(selectedRole._id), {
        permissions: draftPermissions,
      });
      const updated = res?.role as AccessRole | undefined;
      if (updated) {
        setRoles((prev) =>
          prev.map((r) =>
            String(r._id) === String(updated._id)
              ? {
                  ...r,
                  ...updated,
                  permissionCount: updated.permissions?.length ?? 0,
                }
              : r,
          ),
        );
      }
      Swal.fire({
        icon: "success",
        title: "Role saved",
        text: "Users with this role pick up changes on next permission resolve (re-login recommended).",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not update role.",
        "error",
      );
    } finally {
      setSavingRole(false);
    }
  };

  const dirty =
    !!selectedRole &&
    JSON.stringify([...(selectedRole.permissions || [])].sort()) !==
      JSON.stringify([...draftPermissions].sort());

  return (
    <div className="space-y-5 p-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Access Control</h1>
          <p className="mt-1 text-sm text-gray-500">
            Assign roles to staff and review permission bundles. Frontend gates
            are UX; APIs enforce the real rules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll(search)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500">Your RBAC role</div>
          <div className="text-lg font-bold capitalize">
            {authUser?.rbacRole?.name || role || "—"}
          </div>
          <div className="mt-1 font-mono text-xs text-gray-400">
            {authUser?.rbacRole?.slug || "no role assigned"}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500">Your permissions</div>
          <div className="text-2xl font-bold">{permissions.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500">Can manage access</div>
          <div className="text-lg font-bold">
            {canManage ? "Yes" : "View only"}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Needs <code>access.manage</code>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(
          [
            { key: "staff", label: "Staff roles", icon: Users },
            { key: "roles", label: "Role permissions", icon: Shield },
            { key: "mine", label: "My permissions", icon: Shield },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                active
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "staff" && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <Can permission={PERMISSIONS.ACCESS_MANAGE}>
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="mb-2 text-sm font-semibold text-blue-900">
                Create staff account
              </div>
              <p className="mb-3 text-xs text-blue-800/80">
                Public signup is disabled once the first account exists. Create
                users here and assign a role.
              </p>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
                <input
                  value={newStaff.fullName}
                  onChange={(e) =>
                    setNewStaff((s) => ({ ...s, fullName: e.target.value }))
                  }
                  placeholder="Full name"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  value={newStaff.email}
                  onChange={(e) =>
                    setNewStaff((s) => ({ ...s, email: e.target.value }))
                  }
                  placeholder="Email"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  value={newStaff.phone}
                  onChange={(e) =>
                    setNewStaff((s) => ({ ...s, phone: e.target.value }))
                  }
                  placeholder="10-digit phone"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  value={newStaff.password}
                  onChange={(e) =>
                    setNewStaff((s) => ({ ...s, password: e.target.value }))
                  }
                  placeholder="Password (min 8)"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <select
                  value={newStaff.roleId}
                  onChange={(e) =>
                    setNewStaff((s) => ({ ...s, roleId: e.target.value }))
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Viewer (default)</option>
                  {roles.map((r) => (
                    <option key={r._id} value={String(r._id)}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={creating}
                onClick={() => void onCreateStaff()}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create staff"}
              </button>
            </div>
          </Can>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSearchStaff();
              }}
              placeholder="Search staff by name, email, phone..."
              className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void onSearchStaff()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Search
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-2 py-2">Staff</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2">Current role</th>
                  <th className="px-2 py-2">Assign role</th>
                </tr>
              </thead>
              <tbody>
                {loading && !staff.length ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-8 text-center text-gray-400">
                      Loading staff...
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-8 text-center text-gray-400">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  staff.map((row) => (
                    <tr key={row._id} className="border-b border-gray-50">
                      <td className="px-2 py-3">
                        <div className="font-medium text-gray-900">
                          {row.fullName}
                        </div>
                        <div className="font-mono text-xs text-gray-400">
                          {row.m_staff_id}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div>{row.email}</div>
                        <div className="text-xs text-gray-500">
                          {row.phoneNumber}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="font-medium">
                          {row.role?.name || "Unassigned"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {row.permissionCount} permissions
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <Can
                          permission={PERMISSIONS.ACCESS_MANAGE}
                          fallback={
                            <span className="text-xs text-gray-400">
                              View only
                            </span>
                          }
                        >
                          <select
                            className="w-full max-w-[220px] rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-60"
                            disabled={assigningId === row._id}
                            value={row.role?.id || ""}
                            onChange={(e) =>
                              void onAssignRole(row._id, e.target.value)
                            }
                          >
                            <option value="">Unassigned</option>
                            {roles.map((r) => (
                              <option key={r._id} value={String(r._id)}>
                                {r.name} ({r.permissionCount ?? r.permissions?.length ?? 0})
                              </option>
                            ))}
                          </select>
                        </Can>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Roles
            </div>
            <div className="space-y-1">
              {roles.map((r) => {
                const active = String(r._id) === String(selectedRoleId);
                return (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => setSelectedRoleId(String(r._id))}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-gray-500">
                      {r.slug}
                      {r.isSystem ? " · system" : ""} ·{" "}
                      {r.permissionCount ?? r.permissions?.length ?? 0} perms
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {!selectedRole ? (
              <p className="text-sm text-gray-500">Select a role.</p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedRole.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedRole.description || "No description"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-gray-400">
                      {selectedRole.slug}
                    </p>
                  </div>
                  <Can permission={PERMISSIONS.ACCESS_MANAGE}>
                    <button
                      type="button"
                      disabled={!dirty || savingRole}
                      onClick={() => void onSaveRolePermissions()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {savingRole ? "Saving..." : "Save permissions"}
                    </button>
                  </Can>
                </div>

                <div className="space-y-4">
                  {modules.map((module) => (
                    <div key={module}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {module}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {PERMISSION_CATALOG.filter((p) => p.module === module).map(
                          (item) => {
                            const checked = draftPermissions.includes(item.key);
                            return (
                              <label
                                key={item.key}
                                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                                  checked
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-gray-100 bg-gray-50"
                                } ${!canManage ? "cursor-default opacity-90" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={checked}
                                  disabled={!canManage}
                                  onChange={() =>
                                    toggleDraftPermission(item.key)
                                  }
                                />
                                <span>
                                  <span className="block font-medium text-gray-800">
                                    {item.label}
                                  </span>
                                  <code className="text-[11px] text-violet-700">
                                    {item.key}
                                  </code>
                                </span>
                              </label>
                            );
                          },
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-4">
          {modules.map((module) => (
            <div
              key={module}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
                <h2 className="text-sm font-semibold capitalize text-gray-800">
                  {module}
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {PERMISSION_CATALOG.filter((p) => p.module === module).map(
                  (item) => {
                    const owned = permissions.includes(item.key as Permission);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                      >
                        <div>
                          <div className="font-medium text-gray-800">
                            {item.label}
                          </div>
                          <code className="text-xs text-violet-700">
                            {item.key}
                          </code>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            owned
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {owned ? "Granted" : "Not granted"}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
