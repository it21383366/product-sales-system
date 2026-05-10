import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import SearchableSelect from "../components/SearchableSelect";

const DAMAGES_PER_PAGE = 25;

function Damages() {
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = savedUser.permissions || [];

  const hasPermission = (permission) => permissions.includes(permission);

  const [damages, setDamages] = useState([]);
  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [page, setPage] = useState(1);
  const [totalDamages, setTotalDamages] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [modalError, setModalError] = useState("");

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    damageSource: "Store Damage",
    reason: "",
    remark: "",
  });

  const totalPages = Math.ceil(totalDamages / DAMAGES_PER_PAGE) || 1;

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.id === form.productId);
  }, [products, form.productId]);

  const fetchDamages = async (
    pageValue = page,
    searchValue = search,
    sourceValue = sourceFilter
  ) => {
    try {
      setError("");

      const response = await api.get("/api/damages", {
        params: {
          page: pageValue,
          limit: DAMAGES_PER_PAGE,
          search: searchValue || undefined,
          source: sourceValue || undefined,
        },
      });

      setDamages(response.data.damages || []);
      setTotalDamages(response.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load damaged items");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products");
      setProducts(response.data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setPage(1);
      fetchDamages(1, search, sourceFilter);
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [search, sourceFilter]);

  useEffect(() => {
    fetchDamages(page, search, sourceFilter);
  }, [page]);

  const resetForm = () => {
    setForm({
      productId: "",
      quantity: "",
      damageSource: "Store Damage",
      reason: "",
      remark: "",
    });
  };

  const openDamageModal = () => {
    resetForm();
    setModalError("");
    setMessage("");
    setError("");
    setShowDamageModal(true);
    setShowReviewModal(false);
  };

  const closeDamageModal = () => {
    resetForm();
    setModalError("");
    setShowDamageModal(false);
    setShowReviewModal(false);
  };

  const handleReview = (e) => {
    e.preventDefault();
    setModalError("");

    if (!form.productId) {
      setModalError("Product is required");
      return;
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      setModalError("Quantity must be greater than 0");
      return;
    }

    if (!form.damageSource) {
      setModalError("Damage source is required");
      return;
    }

    if (!form.reason.trim()) {
      setModalError("Damage reason is required");
      return;
    }

    if (selectedProduct && Number(form.quantity) > Number(selectedProduct.stock_quantity)) {
      setModalError(
        `Not enough stock. Available stock: ${selectedProduct.stock_quantity}`
      );
      return;
    }

    setShowReviewModal(true);
  };

  const submitDamage = async () => {
    try {
      setModalError("");
      setMessage("");
      setError("");

      await api.post("/api/damages", {
        productId: form.productId,
        quantity: Number(form.quantity),
        damageSource: form.damageSource,
        reason: form.reason,
        remark: form.remark,
      });

      closeDamageModal();
      setMessage("Damaged item recorded and stock reduced");

      await fetchDamages(page, search, sourceFilter);
      await fetchProducts();
    } catch (err) {
      setShowReviewModal(false);
      setModalError(
        err.response?.data?.message || "Failed to record damaged item"
      );
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleString();
  };

  const getSourceBadge = (source) => {
    if (source === "Customer Return") {
      return <span className="badge warning">Customer Return</span>;
    }

    if (source === "Supplier Damage") {
      return <span className="badge danger">Supplier Damage</span>;
    }

    if (source === "Store Damage") {
      return <span className="badge danger">Store Damage</span>;
    }

    return <span className="badge neutral">{source || "Other Damage"}</span>;
  };

  return (
    <div className="damages-page">
      <div className="page-header">
        <div>
          <h2>Damaged Items</h2>
          <p>Track customer return damages, store damages, supplier damages, and other stock losses.</p>
        </div>

        <div className="product-filters">
          <SearchableSelect
            value={sourceFilter}
            onChange={setSourceFilter}
            placeholder="All Sources"
            searchPlaceholder="Search source..."
            options={[
              { value: "", label: "All Sources" },
              { value: "Customer Return", label: "Customer Return" },
              { value: "Store Damage", label: "Store Damage" },
              { value: "Supplier Damage", label: "Supplier Damage" },
              { value: "Other Damage", label: "Other Damage" },
            ]}
          />

          <div className="search-box">
            <input
              type="text"
              placeholder="Search damaged items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="panel table-panel">
        <div className="table-header">
          <div>
            <h3>Damage Records</h3>
            <p>
              {totalDamages} records found · Page {page} of {totalPages}
            </p>
          </div>

          {hasPermission("damages.create") && (
            <button
              className="primary-btn add-product-btn"
              onClick={openDamageModal}
            >
              + Add Damaged Item
            </button>
          )}
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Damage Source</th>
                <th>Reason</th>
                <th>Remark</th>
                <th>Added By</th>
              </tr>
            </thead>

            <tbody>
              {damages.length === 0 && (
                <tr>
                  <td colSpan="8">No damaged items found</td>
                </tr>
              )}

              {damages.map((damage) => (
                <tr key={damage.id}>
                  <td>{formatDate(damage.created_at)}</td>
                  <td>{damage.product_name || "-"}</td>
                  <td>{damage.sku || "-"}</td>
                  <td>{damage.quantity}</td>
                  <td>{getSourceBadge(damage.damage_source)}</td>
                  <td>{damage.reason || "-"}</td>
                  <td>{damage.remark || "-"}</td>
                  <td>{damage.created_by_name || "-"}</td>
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
            {totalDamages === 0
              ? 0
              : (page - 1) * DAMAGES_PER_PAGE + 1}
            -{Math.min(page * DAMAGES_PER_PAGE, totalDamages)} of{" "}
            {totalDamages}
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

      {showDamageModal && (
        <div className="modal-overlay">
          <div
            className={`product-modal ${
              showReviewModal ? "modal-blurred" : ""
            }`}
          >
            <div className="modal-header">
              <div>
                <h3>Add Damaged Item</h3>
                <p>This will reduce sellable stock and create a damage record.</p>
              </div>

              <button className="modal-close-btn" onClick={closeDamageModal}>
                ×
              </button>
            </div>

            <form className="product-form" onSubmit={handleReview}>
              {modalError && <div className="modal-error">{modalError}</div>}

              <SearchableSelect
                label="Product *"
                value={form.productId}
                onChange={(value) => {
                  setModalError("");
                  setForm({
                    ...form,
                    productId: value,
                  });
                }}
                placeholder="Select product"
                searchPlaceholder="Search products..."
                options={products.map((product) => ({
                  value: product.id,
                  label: `${product.name} - Stock: ${product.stock_quantity}`,
                }))}
              />

              {selectedProduct && (
                <div className="damage-stock-box">
                  <div>
                    <span>Current Stock</span>
                    <strong>{selectedProduct.stock_quantity}</strong>
                  </div>

                  <div>
                    <span>SKU</span>
                    <strong>{selectedProduct.sku || "-"}</strong>
                  </div>
                </div>
              )}

              <label>Quantity *</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                placeholder="Enter damaged quantity"
                onChange={(e) => {
                  setModalError("");
                  setForm({
                    ...form,
                    quantity: e.target.value,
                  });
                }}
                required
              />

              <label>Damage Source *</label>
              <select
                value={form.damageSource}
                onChange={(e) => {
                  setModalError("");
                  setForm({
                    ...form,
                    damageSource: e.target.value,
                  });
                }}
              >
                <option value="Store Damage">Store Damage</option>
                <option value="Supplier Damage">Supplier Damage</option>
                <option value="Other Damage">Other Damage</option>
              </select>

              <label>Reason *</label>
              <textarea
                value={form.reason}
                placeholder="Example: Item broken while handling"
                onChange={(e) => {
                  setModalError("");
                  setForm({
                    ...form,
                    reason: e.target.value,
                  });
                }}
                required
              />

              <label>Remark</label>
              <textarea
                value={form.remark}
                placeholder="Optional extra note"
                onChange={(e) =>
                  setForm({
                    ...form,
                    remark: e.target.value,
                  })
                }
              />

              <div className="pending-remark-box danger-remark">
                This action will reduce sellable stock by{" "}
                {Number(form.quantity || 0)} item(s).
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeDamageModal}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn danger-confirm-btn">
                  Continue
                </button>
              </div>
            </form>
          </div>

          {showReviewModal && (
            <div className="review-modal">
              <h3>Confirm Damaged Item</h3>
              <p>Please verify before reducing stock.</p>

              <div className="review-grid">
                <div>
                  <span>Product</span>
                  <strong>{selectedProduct?.name || "-"}</strong>
                </div>

                <div>
                  <span>SKU</span>
                  <strong>{selectedProduct?.sku || "-"}</strong>
                </div>

                <div>
                  <span>Current Stock</span>
                  <strong>{selectedProduct?.stock_quantity || 0}</strong>
                </div>

                <div>
                  <span>Damage Qty</span>
                  <strong>{Number(form.quantity || 0)}</strong>
                </div>

                <div>
                  <span>Stock After</span>
                  <strong>
                    {Math.max(
                      Number(selectedProduct?.stock_quantity || 0) -
                        Number(form.quantity || 0),
                      0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Damage Source</span>
                  <strong>{form.damageSource}</strong>
                </div>

                <div className="review-full">
                  <span>Reason</span>
                  <strong>{form.reason || "-"}</strong>
                </div>

                <div className="review-full">
                  <span>Remark</span>
                  <strong>{form.remark || "-"}</strong>
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

                <button
                  type="button"
                  className="primary-btn danger-confirm-btn"
                  onClick={submitDamage}
                >
                  Confirm & Reduce Stock
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Damages;