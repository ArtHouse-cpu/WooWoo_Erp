import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { KeyRound, Loader2, RefreshCw, Shield, SquarePen, Trash2, Users } from "lucide-react";
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
  handleClearStaffPin,
  handleCreateAccessStaff,
  handleDeleteAccessStaff,
  handleGetAccessRoles,
  handleGetAccessStaff,
  handleSetStaffPin,
  handleUpdateAccessRole,
  handleUpdateAccessStaff,
  handleUpdateStaffPin,
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
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);

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

  const showPinOnce = async (title: string, pin: string, staffName: string) => {
    await Swal.fire({
      icon: "success",
      title,
      html: `
        <p class="mb-2 text-sm text-slate-600">
          Share this PIN securely with <b>${String(staffName).replace(/</g, "&lt;")}</b>.
          It will not be shown again.
        </p>
        <p class="rounded-lg bg-slate-900 px-4 py-3 font-mono text-2xl tracking-[0.35em] text-white">
          ${String(pin).replace(/</g, "&lt;")}
        </p>
      `,
      confirmButtonText: "I have saved the PIN",
    });
  };

  const patchStaffRow = (next: AccessStaffRow) => {
    setStaff((prev) =>
      prev.map((s) => (String(s._id) === String(next._id) ? { ...s, ...next } : s)),
    );
  };

  const onGenerateStaffPin = async (row: AccessStaffRow) => {
    if (!canManage) return;
    const confirm = await Swal.fire({
      title: row.pinSet ? "Regenerate Staff PIN?" : "Generate Staff PIN?",
      text: row.pinSet
        ? "The current PIN will be replaced. The new PIN is shown only once."
        : "A 6-digit PIN will be generated and shown only once.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: row.pinSet ? "Regenerate" : "Generate",
    });
    if (!confirm.isConfirmed) return;
    try {
      setPinBusyId(row._id);
      const res = row.pinSet
        ? await handleUpdateStaffPin(row._id, { reset: true })
        : await handleSetStaffPin(row._id);
      if (res?.staff) patchStaffRow(res.staff);
      if (res?.pin) {
        await showPinOnce(
          row.pinSet ? "PIN regenerated" : "PIN generated",
          res.pin,
          row.fullName,
        );
      } else {
        await Swal.fire("Done", res?.message || "Staff PIN updated.", "success");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "PIN failed",
        err?.response?.data?.message ?? "Could not set Staff PIN.",
        "error",
      );
    } finally {
      setPinBusyId(null);
    }
  };

  const onChangeStaffPin = async (row: AccessStaffRow) => {
    if (!canManage) return;
    const result = await Swal.fire({
      title: "Set custom Staff PIN",
      input: "text",
      inputLabel: "4–6 digit PIN",
      inputPlaceholder: "e.g. 482913",
      inputAttributes: { maxlength: "6", inputmode: "numeric" },
      showCancelButton: true,
      confirmButtonText: "Save PIN",
      inputValidator: (value) => {
        if (!/^\d{4,6}$/.test(String(value || "").trim())) {
          return "Enter a 4–6 digit PIN";
        }
        return null;
      },
    });
    if (!result.isConfirmed) return;
    const pin = String(result.value || "").trim();
    try {
      setPinBusyId(row._id);
      const res = row.pinSet
        ? await handleUpdateStaffPin(row._id, { pin })
        : await handleSetStaffPin(row._id, { pin });
      if (res?.staff) patchStaffRow(res.staff);
      await showPinOnce("PIN saved", res?.pin || pin, row.fullName);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "PIN failed",
        err?.response?.data?.message ?? "Could not change Staff PIN.",
        "error",
      );
    } finally {
      setPinBusyId(null);
    }
  };

  const onToggleStaffPin = async (row: AccessStaffRow) => {
    if (!canManage) return;
    if (!row.pinSet) {
      await Swal.fire(
        "No PIN set",
        "Generate or set a PIN before enabling it.",
        "info",
      );
      return;
    }
    const nextEnabled = !row.pinEnabled;
    try {
      setPinBusyId(row._id);
      const res = await handleUpdateStaffPin(row._id, { enabled: nextEnabled });
      if (res?.staff) patchStaffRow(res.staff);
      await Swal.fire({
        icon: "success",
        title: nextEnabled ? "PIN enabled" : "PIN disabled",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Update failed",
        err?.response?.data?.message ?? "Could not update PIN status.",
        "error",
      );
    } finally {
      setPinBusyId(null);
    }
  };

  const onClearStaffPin = async (row: AccessStaffRow) => {
    if (!canManage) return;
    if (!row.pinSet) return;
    const confirm = await Swal.fire({
      title: "Clear Staff PIN?",
      text: `${row.fullName} will not be able to verify invoices until a new PIN is set.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Clear PIN",
    });
    if (!confirm.isConfirmed) return;
    try {
      setPinBusyId(row._id);
      const res = await handleClearStaffPin(row._id);
      if (res?.staff) patchStaffRow(res.staff);
      await Swal.fire({
        icon: "success",
        title: "PIN cleared",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Clear failed",
        err?.response?.data?.message ?? "Could not clear Staff PIN.",
        "error",
      );
    } finally {
      setPinBusyId(null);
    }
  };

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

  const phoneForForm = (phone?: string) => {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length > 10) return digits.slice(-10);
    return digits;
  };

  const onEditStaff = async (row: AccessStaffRow) => {
    if (!canManage) return;

    const roleOptions = [
      `<option value="">Unassigned</option>`,
      ...roles.map(
        (r) =>
          `<option value="${String(r._id)}" ${
            String(row.role?.id || "") === String(r._id) ? "selected" : ""
          }>${r.name}</option>`,
      ),
    ].join("");

    const result = await Swal.fire({
      title: "Edit staff",
      html: `
        <div class="mt-2 flex flex-col gap-3 text-left">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Full name</label>
            <input id="edit-staff-name" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value="${String(row.fullName || "").replace(/"/g, "&quot;")}" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input id="edit-staff-email" type="email" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value="${String(row.email || "").replace(/"/g, "&quot;")}" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Phone (10 digits)</label>
            <input id="edit-staff-phone" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value="${phoneForForm(row.phoneNumber)}" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Role</label>
            <select id="edit-staff-role" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              ${roleOptions}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">New password (optional)</label>
            <input id="edit-staff-password" type="password" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Leave blank to keep current" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Save",
      confirmButtonColor: "#2563eb",
      focusConfirm: false,
      preConfirm: () => {
        const fullName = (
          document.getElementById("edit-staff-name") as HTMLInputElement | null
        )?.value?.trim();
        const email = (
          document.getElementById("edit-staff-email") as HTMLInputElement | null
        )?.value?.trim();
        const phone = (
          document.getElementById("edit-staff-phone") as HTMLInputElement | null
        )?.value?.trim();
        const roleId = (
          document.getElementById("edit-staff-role") as HTMLSelectElement | null
        )?.value;
        const password = (
          document.getElementById(
            "edit-staff-password",
          ) as HTMLInputElement | null
        )?.value;

        if (!fullName || !email || !phone) {
          Swal.showValidationMessage("Name, email, and phone are required.");
          return undefined;
        }
        if (password && password.length < 8) {
          Swal.showValidationMessage(
            "Password must be at least 8 characters (or leave blank).",
          );
          return undefined;
        }
        return {
          fullName,
          email,
          phone,
          roleId: roleId || null,
          password: password || undefined,
        };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const res = await handleUpdateAccessStaff(row._id, result.value);
      if (res?.staff) {
        setStaff((prev) =>
          prev.map((s) =>
            String(s._id) === String(row._id) ? res.staff : s,
          ),
        );
      }
      await Swal.fire({
        icon: "success",
        title: "Staff updated",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Update failed",
        err?.response?.data?.message ?? "Could not update staff.",
        "error",
      );
    }
  };

  const onDeleteStaff = async (row: AccessStaffRow) => {
    if (!canManage) return;

    if (String(authUser?._id || "") === String(row._id)) {
      await Swal.fire(
        "Not allowed",
        "You cannot delete your own account.",
        "warning",
      );
      return;
    }

    const confirm = await Swal.fire({
      title: "Delete staff?",
      html: `Remove <b>${String(row.fullName || "this staff").replace(/</g, "&lt;")}</b>?<br/><span class="text-xs text-slate-500">This cannot be undone.</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!confirm.isConfirmed) return;

    try {
      await handleDeleteAccessStaff(row._id);
      setStaff((prev) => prev.filter((s) => String(s._id) !== String(row._id)));
      await Swal.fire({
        icon: "success",
        title: "Staff deleted",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Delete failed",
        err?.response?.data?.message ?? "Could not delete staff.",
        "error",
      );
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
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-2 py-2">Staff</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2">Current role</th>
                  <th className="px-2 py-2">Assign role</th>
                  <th className="px-2 py-2">Staff PIN</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && !staff.length ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-8 text-center text-gray-400">
                      Loading staff...
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-8 text-center text-gray-400">
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
                      <td className="px-2 py-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs text-gray-500">
                              PIN: {row.pinSet ? "••••" : "—"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                row.pinSet && row.pinEnabled
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {row.pinSet
                                ? row.pinEnabled
                                  ? "Active"
                                  : "Disabled"
                                : "Not set"}
                            </span>
                          </div>
                          <Can permission={PERMISSIONS.ACCESS_MANAGE}>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                disabled={pinBusyId === row._id}
                                onClick={() => void onGenerateStaffPin(row)}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                              >
                                {pinBusyId === row._id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <KeyRound size={12} />
                                )}
                                {row.pinSet ? "Reset" : "Generate"}
                              </button>
                              <button
                                type="button"
                                disabled={pinBusyId === row._id}
                                onClick={() => void onChangeStaffPin(row)}
                                className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                disabled={pinBusyId === row._id || !row.pinSet}
                                onClick={() => void onToggleStaffPin(row)}
                                className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                              >
                                {row.pinEnabled ? "Disable" : "Enable"}
                              </button>
                              <button
                                type="button"
                                disabled={pinBusyId === row._id || !row.pinSet}
                                onClick={() => void onClearStaffPin(row)}
                                className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                Clear
                              </button>
                            </div>
                          </Can>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <Can permission={PERMISSIONS.ACCESS_MANAGE}>
                            <button
                              type="button"
                              title="Edit staff"
                              onClick={() => void onEditStaff(row)}
                              className="inline-flex items-center justify-center rounded-lg bg-green-100 p-2 text-green-700 transition hover:bg-green-200"
                            >
                              <SquarePen size={16} />
                            </button>
                            <button
                              type="button"
                              title="Delete staff"
                              onClick={() => void onDeleteStaff(row)}
                              className="inline-flex items-center justify-center rounded-lg bg-red-100 p-2 text-red-600 transition hover:bg-red-200"
                            >
                              <Trash2 size={16} />
                            </button>
                          </Can>
                        </div>
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
