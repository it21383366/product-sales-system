import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const SUPPLIERS_PER_PAGE = 25;

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
  });

  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = savedUser.permissions || [];

  const hasPermission = (permission) => permissions.includes(permission);

  const filteredSuppliers = useMemo(() => {
    const keyword = search.toLowerCase();

    return suppliers.filter((supplier) => {
      return (
        supplier.name?.toLowerCase().includes(keyword) ||
        supplier.email?.toLowerCase().includes(keyword) ||
        supplier.phone?.toLowerCase().includes(keyword) ||
        supplier.contact_person?.toLowerCase().includes(keyword)
      );
    });
  }, [suppliers, search]);

  const totalPages = Math.ceil(filteredSuppliers.length / SUPPLIERS_PER_PAGE) || 1;

  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * SUPPLIERS_PER_PAGE;
    return filteredSuppliers.slice(start, start + SUPPLIERS_PER_PAGE);
  }, [filteredSuppliers, page]);

  const fetchSuppliers = async () => {
    try {
      setError("");

      const response = await api.get("/api/suppliers");
      setSuppliers(response.data.suppliers);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load suppliers");
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
    });
  };

  const openAddSupplier = () => {
    setEditMode(false);
    setEditingSupplierId(null);
    setMessage("");
    setError("");
    setModalError("");
    resetForm();
    setShowSupplierModal(true);
    setShowReviewModal(false);
  };

  const openEditSupplier = (supplier) => {
    setEditMode(true);
    setEditingSupplierId(supplier.id);
    setMessage("");
    setError("");
    setModalError("");

    setForm({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactPerson: supplier.contact_person || "",
    });

    setShowSupplierModal(true);
    setShowReviewModal(false);
  };

  const closeSupplierModals = () => {
    setShowSupplierModal(false);
    setShowReviewModal(false);
    setEditMode(false);
    setEditingSupplierId(null);
    setModalError("");
    resetForm();
  };

  const openDeleteConfirm = (supplier) => {
    setSelectedSupplier(supplier);
    setShowConfirmModal(true);
  };

  const closeDeleteConfirm = () => {
    setSelectedSupplier(null);
    setShowConfirmModal(false);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleReview = (e) => {
    e.preventDefault();
    setModalError("");

    if (!form.name.trim()) {
      setModalError("Supplier name is required");
      return;
    }

    setShowReviewModal(true);
  };

  const handleSaveSupplier = async () => {
    try {
      setModalError("");
      setError("");
      setMessage("");

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        contactPerson: form.contactPerson,
      };

      if (editMode) {
        await api.patch(`/api/suppliers/${editingSupplierId}`, payload);
        setMessage("Supplier updated successfully");
      } else {
        await api.post("/api/suppliers", payload);
        setMessage("Supplier created successfully");
      }

      closeSupplierModals();
      fetchSuppliers();
    } catch (err) {
      setShowReviewModal(false);
      setModalError(err.response?.data?.message || "Failed to save supplier");
    }
  };

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return;

    try {
      setError("");
      setMessage("");

      await api.delete(`/api/suppliers/${selectedSupplier.id}`);

      setMessage("Supplier deleted successfully");
      closeDeleteConfirm();
      fetchSuppliers();
    } catch (err) {
      closeDeleteConfirm();
      setError(err.response?.data?.message || "Failed to delete supplier");
    }
  };

  return (
    <div className="suppliers-page">
      <div className="page-header">
        <div>
          <h2>Suppliers</h2>
          <p>Manage supplier details, contact information, and records.</p>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="panel table-panel">
        <div className="table-header">
          <div>
            <h3>Supplier Records</h3>
            <p>
              {filteredSuppliers.length} suppliers found · Page {page} of{" "}
              {totalPages}
            </p>
          </div>

          {hasPermission("suppliers.create") && (
            <button className="primary-btn add-product-btn" onClick={openAddSupplier}>
              + Add Supplier
            </button>
          )}
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedSuppliers.length === 0 && (
                <tr>
                  <td colSpan="6">No suppliers found</td>
                </tr>
              )}

              {paginatedSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.contact_person || "-"}</td>
                  <td>{supplier.email || "-"}</td>
                  <td>{supplier.phone || "-"}</td>
                  <td>{supplier.address || "-"}</td>
                  <td>
                    <div className="table-actions">
                      {hasPermission("suppliers.edit") && (
                        <button
                          className="small-btn"
                          onClick={() => openEditSupplier(supplier)}
                        >
                          Edit
                        </button>
                      )}

                      {hasPermission("suppliers.delete") && (
                        <button
                          className="small-btn danger-table-btn"
                          onClick={() => openDeleteConfirm(supplier)}
                        >
                          Delete
                        </button>
                      )}

                      {!hasPermission("suppliers.edit") &&
                        !hasPermission("suppliers.delete") && (
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
            Showing{" "}
            {filteredSuppliers.length === 0
              ? 0
              : (page - 1) * SUPPLIERS_PER_PAGE + 1}
            -
            {Math.min(page * SUPPLIERS_PER_PAGE, filteredSuppliers.length)} of{" "}
            {filteredSuppliers.length}
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

      {showSupplierModal && (
        <div className="modal-overlay">
          <div className={`product-modal ${showReviewModal ? "modal-blurred" : ""}`}>
            <div className="modal-header">
              <div>
                <h3>{editMode ? "Edit Supplier" : "Add Supplier"}</h3>
                <p>
                  {editMode
                    ? "Update supplier details and continue to verify."
                    : "Enter supplier details and continue to verify."}
                </p>
              </div>

              <button className="modal-close-btn" onClick={closeSupplierModals}>
                ×
              </button>
            </div>

            {modalError && <div className="modal-error">{modalError}</div>}

            <form className="product-form" onSubmit={handleReview}>
              <label>Supplier Name *</label>
              <input
                name="name"
                value={form.name}
                placeholder="Example: ABC Wholesale"
                onChange={handleChange}
                required
              />

              <label>Contact Person</label>
              <input
                name="contactPerson"
                value={form.contactPerson}
                placeholder="Example: John Smith"
                onChange={handleChange}
              />

              <div className="form-row">
                <div>
                  <label>Email</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    placeholder="supplier@example.com"
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label>Phone</label>
                  <input
                    name="phone"
                    value={form.phone}
                    placeholder="0400 000 000"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <label>Address</label>
              <textarea
                name="address"
                value={form.address}
                placeholder="Supplier address"
                onChange={handleChange}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeSupplierModals}
                >
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
              <h3>{editMode ? "Confirm Supplier Update" : "Confirm Supplier"}</h3>
              <p>Please verify the supplier details before saving.</p>

              <div className="review-grid">
                <div>
                  <span>Supplier Name</span>
                  <strong>{form.name || "-"}</strong>
                </div>

                <div>
                  <span>Contact Person</span>
                  <strong>{form.contactPerson || "-"}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{form.email || "-"}</strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>{form.phone || "-"}</strong>
                </div>

                <div className="review-full">
                  <span>Address</span>
                  <strong>{form.address || "-"}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowReviewModal(false)}
                >
                  Edit
                </button>

                <button type="button" className="primary-btn" onClick={handleSaveSupplier}>
                  {editMode ? "Confirm & Update" : "Confirm & Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showConfirmModal && selectedSupplier && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <div>
                <h3>Delete Supplier</h3>
                <p>
                  Are you sure you want to delete {selectedSupplier.name}? This
                  cannot be undone.
                </p>
              </div>

              <button className="modal-close-btn" onClick={closeDeleteConfirm}>
                ×
              </button>
            </div>

            <div className="confirm-user-box">
              <span>Supplier</span>
              <strong>{selectedSupplier.name}</strong>
              <small>{selectedSupplier.email || selectedSupplier.phone || "-"}</small>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeDeleteConfirm}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn danger-confirm-btn"
                onClick={handleDeleteSupplier}
              >
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Suppliers;