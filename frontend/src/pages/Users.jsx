import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import SearchableSelect from "../components/SearchableSelect";

const USERS_PER_PAGE = 25;

function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [showUserModal, setShowUserModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [showPrivilegeModal, setShowPrivilegeModal] = useState(false);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPrivilegeRoleId, setSelectedPrivilegeRoleId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [privilegeError, setPrivilegeError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    roleId: "",
  });

  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = savedUser.permissions || [];

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE) || 1;

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * USERS_PER_PAGE;
    return users.slice(start, start + USERS_PER_PAGE);
  }, [users, page]);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/api/users");
      setUsers(response.data.users);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get("/api/roles");
      setRoles(response.data.roles);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load roles");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const resetForm = () => {
    setForm({
      fullName: "",
      email: "",
      password: "",
      phone: "",
      roleId: "",
    });
  };

  const closeModals = () => {
    setShowUserModal(false);
    setShowReviewModal(false);
    setEditMode(false);
    setEditingUserId(null);
    setModalError("");
    resetForm();
  };

  const openAddUser = () => {
    setEditMode(false);
    setEditingUserId(null);
    resetForm();
    setMessage("");
    setError("");
    setModalError("");
    setShowUserModal(true);
    setShowReviewModal(false);
  };

  const openEditUser = (user) => {
    setEditMode(true);
    setEditingUserId(user.id);

    setForm({
      fullName: user.full_name || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      roleId: roles.find((role) => role.name === user.role_name)?.id || "",
    });

    setMessage("");
    setError("");
    setModalError("");
    setShowUserModal(true);
    setShowReviewModal(false);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const selectedRole = roles.find((role) => role.id === form.roleId);

  const handleReview = (e) => {
    e.preventDefault();
    setModalError("");

    if (!form.fullName.trim()) {
      setModalError("Full name is required");
      return;
    }

    if (!editMode && !form.email.trim()) {
      setModalError("Email is required");
      return;
    }

    if (!editMode && !form.password.trim()) {
      setModalError("Password is required");
      return;
    }

    if (!editMode && form.password.length < 6) {
      setModalError("Password must be at least 6 characters");
      return;
    }

    if (!form.roleId) {
      setModalError("Role is required");
      return;
    }

    setShowReviewModal(true);
  };

  const handleSaveUser = async () => {
    try {
      setModalError("");
      setError("");
      setMessage("");

      if (editMode) {
        await api.patch(`/api/users/${editingUserId}`, {
          fullName: form.fullName,
          phone: form.phone,
          roleId: form.roleId,
        });

        setMessage("User updated successfully");
      } else {
        await api.post("/api/users", {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          phone: form.phone,
          roleId: form.roleId,
        });

        setMessage("User created successfully");
      }

      closeModals();
      fetchUsers();
    } catch (err) {
      setShowReviewModal(false);
      setModalError(err.response?.data?.message || "Failed to save user");
    }
  };

  const handleStatusChange = (user) => {
    const newStatus = user.status === "active" ? "inactive" : "active";

    setConfirmAction({
      type: "status",
      title: newStatus === "active" ? "Activate User" : "Deactivate User",
      message: `Are you sure you want to ${
        newStatus === "active" ? "activate" : "deactivate"
      } ${user.full_name}?`,
      user,
      newStatus,
    });

    setShowConfirmModal(true);
  };

  const handleDeleteUser = (user) => {
    setConfirmAction({
      type: "delete",
      title: "Delete User",
      message: `Are you sure you want to delete ${user.full_name}? This cannot be undone.`,
      user,
    });

    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      setError("");
      setMessage("");

      if (confirmAction.type === "status") {
        await api.patch(`/api/users/${confirmAction.user.id}/status`, {
          status: confirmAction.newStatus,
        });

        setMessage(
          `User ${
            confirmAction.newStatus === "active" ? "activated" : "deactivated"
          } successfully`
        );
      }

      if (confirmAction.type === "delete") {
        await api.delete(`/api/users/${confirmAction.user.id}`);
        setMessage("User deleted successfully");
      }

      setShowConfirmModal(false);
      setConfirmAction(null);
      fetchUsers();
    } catch (err) {
      setShowConfirmModal(false);
      setConfirmAction(null);
      setError(err.response?.data?.message || "Action failed");
    }
  };

  const fetchAllPermissions = async () => {
    try {
        const response = await api.get("/api/permissions");
        setAllPermissions(response.data.permissions);
    } catch (err) {
        setPrivilegeError(err.response?.data?.message || "Failed to load permissions");
    }
    };

    const openPrivilegeModal = async () => {
    setPrivilegeError("");
    setSelectedPrivilegeRoleId("");
    setSelectedPermissions([]);
    await fetchAllPermissions();
    setShowPrivilegeModal(true);
    };

    const closePrivilegeModal = () => {
    setShowPrivilegeModal(false);
    setSelectedPrivilegeRoleId("");
    setSelectedPermissions([]);
    setPrivilegeError("");
    };

    const handlePrivilegeRoleChange = async (roleId) => {
    setSelectedPrivilegeRoleId(roleId);
    setSelectedPermissions([]);
    setPrivilegeError("");

    if (!roleId) return;

    try {
        const response = await api.get(`/api/roles/${roleId}/permissions`);
        setSelectedPermissions(response.data.permissions);
    } catch (err) {
        setPrivilegeError(
        err.response?.data?.message || "Failed to load role permissions"
        );
    }
    };

    const getRoleLevel = (roleName) => {
        const levels = {
            Admin: 1,
            Manager: 2,
            Cashier: 3,
            "Inventory Staff": 3,
        };

        return levels[roleName] || 99;
        };

        const roleOrder = {
        Admin: 1,
        Manager: 2,
        Cashier: 3,
        "Inventory Staff": 3,
        };

        const currentUserRole = savedUser.role;
        const currentUserLevel = getRoleLevel(currentUserRole);

        const sortedRoles = [...roles].sort((a, b) => {
        return (roleOrder[a.name] || 99) - (roleOrder[b.name] || 99);
        });

        const assignableRoles = sortedRoles.filter((role) => {
        if (currentUserRole === "Admin") return true;
        return getRoleLevel(role.name) > currentUserLevel;
        });

    const togglePermission = (permissionCode) => {
    if (selectedPermissions.includes(permissionCode)) {
        setSelectedPermissions(
        selectedPermissions.filter((code) => code !== permissionCode)
        );
    } else {
        setSelectedPermissions([...selectedPermissions, permissionCode]);
    }
    };

    const saveRolePrivileges = async () => {
    try {
        setPrivilegeError("");

        if (!selectedPrivilegeRoleId) {
        setPrivilegeError("Please select a role");
        return;
        }

        await api.patch(`/api/roles/${selectedPrivilegeRoleId}/permissions`, {
        permissions: selectedPermissions,
        });

        setMessage("Role privileges updated successfully");
        closePrivilegeModal();
    } catch (err) {
        setPrivilegeError(
        err.response?.data?.message || "Failed to update role privileges"
        );
    }
    };

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h2>Users</h2>
          <p>Manage employees, roles, and account status.</p>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="panel table-panel">
        <div className="table-header">
          <div>
            <h3>User Accounts</h3>
            <p>
              {users.length} users found · Page {page} of {totalPages}
            </p>
          </div>

          <div className="table-header-actions">
            {hasPermission("roles.manage") && (
                <button className="secondary-btn" onClick={openPrivilegeModal}>
                User Privilege Settings
                </button>
            )}

            {hasPermission("users.create") && (
                <button className="primary-btn add-product-btn" onClick={openAddUser}>
                + Add User
                </button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan="7">No users found</td>
                </tr>
              )}

              {paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || "-"}</td>
                  <td>{user.role_name || "-"}</td>
                  <td>
                    {user.status === "active" ? (
                      <span className="badge success">Active</span>
                    ) : (
                      <span className="badge danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : "Never"}
                  </td>
                  <td>
                    <div className="table-actions">
                      {hasPermission("users.edit") && (
                        <>
                          <button
                            className="small-btn"
                            onClick={() => openEditUser(user)}
                          >
                            Edit
                          </button>

                          <button
                            className="small-btn secondary-table-btn"
                            onClick={() => handleStatusChange(user)}
                          >
                            {user.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </>
                      )}

                      {hasPermission("users.delete") && (
                        <button
                          className="small-btn danger-table-btn"
                          onClick={() => handleDeleteUser(user)}
                        >
                          Delete
                        </button>
                      )}

                      {!hasPermission("users.edit") &&
                        !hasPermission("users.delete") && (
                          <span className="muted-action-text">No actions</span>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <button
            className="secondary-btn"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>

          <span>
            Showing page {page} of {totalPages}
          </span>

          <button
            className="secondary-btn"
            disabled={page === totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {showUserModal && (
        <div className="modal-overlay">
          <div className={`product-modal ${showReviewModal ? "modal-blurred" : ""}`}>
            <div className="modal-header">
              <div>
                <h3>{editMode ? "Edit User" : "Add User"}</h3>
                <p>
                  {editMode
                    ? "Update user role, phone, or name."
                    : "Create a new employee account."}
                </p>
              </div>

              <button className="modal-close-btn" onClick={closeModals}>
                ×
              </button>
            </div>

            {modalError && <div className="modal-error">{modalError}</div>}

            <form className="product-form" onSubmit={handleReview}>
              <label>Full Name *</label>
              <input
                name="fullName"
                value={form.fullName}
                placeholder="Example: John Smith"
                onChange={handleChange}
                required
              />

              <label>Email *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                placeholder="example@email.com"
                onChange={handleChange}
                disabled={editMode}
                required={!editMode}
              />

              {!editMode && (
                <>
                  <label>Password *</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    placeholder="Minimum 6 characters"
                    onChange={handleChange}
                    required
                  />
                </>
              )}

              <label>Phone</label>
              <input
                name="phone"
                value={form.phone}
                placeholder="Phone number"
                onChange={handleChange}
              />

              <label>Role *</label>
              <SearchableSelect
                label="Select User Role"
                value={selectedPrivilegeRoleId}
                onChange={handlePrivilegeRoleChange}
                placeholder="Select role"
                searchPlaceholder="Search roles..."
                options={sortedRoles.map((role) => ({
                  value: role.id,
                  label: role.name,
                }))}
              />

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeModals}>
                  Cancel
                </button>

                <button type="submit" className="primary-btn">
                  Continue
                </button>
              </div>
            </form>
          </div>

          {showReviewModal && (
            <div className="review-modal">
              <h3>{editMode ? "Confirm User Update" : "Confirm New User"}</h3>
              <p>Please verify the user details before saving.</p>

              <div className="review-grid">
                <div>
                  <span>Full Name</span>
                  <strong>{form.fullName || "-"}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{form.email || "-"}</strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>{form.phone || "-"}</strong>
                </div>

                <div>
                  <span>Role</span>
                  <strong>{selectedRole?.name || "-"}</strong>
                </div>

                {!editMode && (
                  <div className="review-full">
                    <span>Password</span>
                    <strong>Hidden for security</strong>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowReviewModal(false)}
                >
                  Edit
                </button>

                <button type="button" className="primary-btn" onClick={handleSaveUser}>
                  Confirm & Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showConfirmModal && confirmAction && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <div>
                <h3>{confirmAction.title}</h3>
                <p>{confirmAction.message}</p>
              </div>

              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="confirm-user-box">
              <span>User</span>
              <strong>{confirmAction.user.full_name}</strong>
              <small>{confirmAction.user.email}</small>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  confirmAction.type === "delete"
                    ? "primary-btn danger-confirm-btn"
                    : "primary-btn"
                }
                onClick={handleConfirmAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {showPrivilegeModal && (
        <div className="modal-overlay">
            <div className="privilege-modal">
            <div className="modal-header">
                <div>
                <h3>User Privilege Settings</h3>
                <p>Select a role and choose the permissions allowed for that role.</p>
                </div>

                <button className="modal-close-btn" onClick={closePrivilegeModal}>
                ×
                </button>
            </div>

            {privilegeError && <div className="modal-error">{privilegeError}</div>}

            <div className="product-form">
                <label>Select User Role</label>
                <SearchableSelect
                  label="Role *"
                  value={form.roleId}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      roleId: value,
                    })
                  }
                  placeholder="Select role"
                  searchPlaceholder="Search roles..."
                  options={assignableRoles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }))}
                />

                {selectedPrivilegeRoleId && (
                <div className="permission-list">
                    {allPermissions.map((permission) => (
                    <label className="permission-item" key={permission.code}>
                        <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.code)}
                        onChange={() => togglePermission(permission.code)}
                        />

                        <div>
                        <strong>{permission.code}</strong>
                        <span>{permission.name}</span>
                        </div>
                    </label>
                    ))}
                </div>
                )}

                <div className="modal-actions">
                <button
                    type="button"
                    className="secondary-btn"
                    onClick={closePrivilegeModal}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    className="primary-btn"
                    onClick={saveRolePrivileges}
                >
                    Save Privileges
                </button>
                </div>
            </div>
            </div>
        </div>
        )}
    </div>
  );
}

export default Users;