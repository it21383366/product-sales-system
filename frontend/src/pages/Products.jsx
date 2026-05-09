import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const PRODUCTS_PER_PAGE = 25;

function Products() {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [showProductModal, setShowProductModal] = useState(false);
  const [showProductReview, setShowProductReview] = useState(false);

  const [showStockModal, setShowStockModal] = useState(false);
  const [showStockReview, setShowStockReview] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    buyingPrice: "",
    sellingPrice: "",
    stockQuantity: "",
    lowStockAlert: "5",
  });

  const [stockForm, setStockForm] = useState({
    movementType: "increase",
    quantity: "",
    reason: "Stock added from frontend",
  });

  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE) || 1;

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return products.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [products, currentPage]);

  const fetchProducts = async (searchValue = search) => {
    try {
      setError("");

      const response = await api.get("/api/products", {
        params: {
          search: searchValue || undefined,
        },
      });

      setProducts(response.data.products);
      setCurrentPage(1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    }
  };

  const fetchLogs = async () => {
    try {
        const response = await api.get("/api/audit-logs", {
        params: {
            tableName: "products",
            page: 1,
            limit: 25,
        },
        });

        setLogs(response.data.logs);
    } catch (err) {
        console.error("Failed to load product logs", err);
    }
  };

  useEffect(() => {
    fetchProducts("");
    fetchLogs();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      fetchProducts(search);
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [search]);

  const resetProductForm = () => {
    setForm({
      name: "",
      sku: "",
      barcode: "",
      description: "",
      buyingPrice: "",
      sellingPrice: "",
      stockQuantity: "",
      lowStockAlert: "5",
    });
  };

  const resetStockForm = () => {
    setStockForm({
      movementType: "increase",
      quantity: "",
      reason: "Stock added from frontend",
    });
  };

  const closeProductModals = () => {
    setShowProductModal(false);
    setShowProductReview(false);
  };

  const closeStockModals = () => {
    setShowStockModal(false);
    setShowStockReview(false);
    setSelectedProduct(null);
    resetStockForm();
  };

  const handleOpenAddProduct = () => {
    setMessage("");
    setError("");
    resetProductForm();
    setShowProductModal(true);
    setShowProductReview(false);
  };

  const handleOpenStockModal = (product) => {
    setMessage("");
    setError("");
    setSelectedProduct(product);
    resetStockForm();
    setShowStockModal(true);
    setShowStockReview(false);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleStockChange = (e) => {
    setStockForm({
      ...stockForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleProductReview = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Product name is required");
      return;
    }

    if (!form.sellingPrice) {
      setError("Selling price is required");
      return;
    }

    setShowProductReview(true);
  };

  const handleStockReview = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) {
      setError("Stock quantity must be greater than 0");
      return;
    }

    setShowStockReview(true);
  };

  const handleConfirmCreateProduct = async () => {
    try {
      setError("");
      setMessage("");

      await api.post("/api/products", {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        description: form.description,
        buyingPrice: Number(form.buyingPrice || 0),
        sellingPrice: Number(form.sellingPrice),
        stockQuantity: Number(form.stockQuantity || 0),
        lowStockAlert: Number(form.lowStockAlert || 5),
      });

      setMessage("Product created successfully");
      closeProductModals();
      resetProductForm();
      fetchProducts(search);
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create product");
      setShowProductReview(false);
    }
  };

  const handleConfirmStockUpdate = async () => {
    try {
      setError("");
      setMessage("");

      await api.patch(`/api/products/${selectedProduct.id}/stock`, {
        movementType: stockForm.movementType,
        quantity: Number(stockForm.quantity),
        reason: stockForm.reason || "Stock updated from frontend",
      });

      setMessage("Stock updated successfully");
      closeStockModals();
      fetchProducts(search);
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update stock");
      setShowStockReview(false);
    }
  };

  const getStockAfterUpdate = () => {
    if (!selectedProduct) return 0;

    const currentStock = Number(selectedProduct.stock_quantity);
    const quantity = Number(stockForm.quantity || 0);

    if (stockForm.movementType === "increase") {
      return currentStock + quantity;
    }

    if (stockForm.movementType === "decrease") {
      return currentStock - quantity;
    }

    return quantity;
  };

  const formatLogDetails = (log) => {
    const details = log.details || {};

    if (log.action === "updated stock") {
      return `${details.movementType || "stock update"} ${details.quantity || 0}. Reason: ${
        details.reason || "No reason added"
      }`;
    }

    if (log.action === "created product") {
      return `Product: ${details.productName || "Unknown product"}`;
    }

    return "";
  };

  return (
    <div className="products-page">
      <div className="products-layout">
        <div className="products-main">
          <div className="page-header">
            <div>
              <h2>Product Database</h2>
              <p>View, search, and manage all product records.</p>
            </div>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search products..."
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
                <h3>Products</h3>
                <p>
                  {products.length} products found · Page {currentPage} of {totalPages}
                </p>
              </div>

              <button
                className="primary-btn add-product-btn"
                onClick={handleOpenAddProduct}
              >
                + Add Product
              </button>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedProducts.length === 0 && (
                    <tr>
                      <td colSpan="6">No products found</td>
                    </tr>
                  )}

                  {paginatedProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.sku || "-"}</td>
                      <td>${Number(product.selling_price).toFixed(2)}</td>
                      <td>{product.stock_quantity}</td>
                      <td>
                        {product.stock_quantity <= product.low_stock_alert ? (
                          <span className="badge danger">Low Stock</span>
                        ) : (
                          <span className="badge success">In Stock</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="small-btn"
                          onClick={() => handleOpenStockModal(product)}
                        >
                          Add Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-bar">
              <button
                className="secondary-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                Previous
              </button>

              <span>
                Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-
                {Math.min(currentPage * PRODUCTS_PER_PAGE, products.length)} of{" "}
                {products.length}
              </span>

              <button
                className="secondary-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className="product-log-panel">
          <div className="log-header">
            <h3>Activity Log</h3>
            <p>Product page actions</p>
          </div>

          <div className="log-list">
            {logs.length === 0 && <p className="empty-log">No activity yet.</p>}

            {logs.map((log) => {
                const details = log.details || {};
                const isStockUpdate = log.action === "updated stock";
                const isProductCreate = log.action === "created product";

                return (
                    <div className="log-item" key={log.id}>
                    <div className="log-top">
                        <div className="log-avatar">👤</div>

                        <div>
                        <strong>{log.full_name || "Unknown User"}</strong>
                        <span>{log.role_name || "Unknown Role"}</span>
                        </div>
                    </div>

                    <div className="log-action">
                        {isStockUpdate && (
                        <>
                            <span className="log-badge warning">Stock Update</span>
                            <p>
                            Updated <strong>{details.productName || "product"}</strong>
                            </p>

                            <div className="log-details-grid">
                            <div>
                                <span>Type</span>
                                <strong>{details.movementType}</strong>
                            </div>

                            <div>
                                <span>Qty</span>
                                <strong>{details.quantity}</strong>
                            </div>

                            <div>
                                <span>Before</span>
                                <strong>{details.previousStock}</strong>
                            </div>

                            <div>
                                <span>After</span>
                                <strong>{details.newStock}</strong>
                            </div>
                            </div>

                            <p className="log-reason">
                            Reason: {details.reason || "No reason added"}
                            </p>
                        </>
                        )}

                        {isProductCreate && (
                        <>
                            <span className="log-badge success">Product Created</span>
                            <p>
                            Added <strong>{details.productName || "new product"}</strong>
                            </p>
                        </>
                        )}

                        {!isStockUpdate && !isProductCreate && (
                        <>
                            <span className="log-badge neutral">{log.action}</span>
                            <p>{formatLogDetails(log)}</p>
                        </>
                        )}
                    </div>

                    <div className="log-time">
                        {new Date(log.created_at).toLocaleString()}
                    </div>
                    </div>
                );
            })}
          </div>
        </aside>
      </div>

      {showProductModal && (
        <div className="modal-overlay">
          <div className={`product-modal ${showProductReview ? "modal-blurred" : ""}`}>
            <div className="modal-header">
              <div>
                <h3>Add Product</h3>
                <p>Enter product details and continue to verify.</p>
              </div>

              <button className="modal-close-btn" onClick={closeProductModals}>
                ×
              </button>
            </div>

            <form className="product-form" onSubmit={handleProductReview}>
              <label>Product Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: Laptop"
                required
              />

              <div className="form-row">
                <div>
                  <label>SKU</label>
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="Example: LAP-001"
                  />
                </div>

                <div>
                  <label>Barcode</label>
                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    placeholder="Barcode number"
                  />
                </div>
              </div>

              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Product description"
              />

              <div className="form-row">
                <div>
                  <label>Buying Price</label>
                  <input
                    name="buyingPrice"
                    type="number"
                    value={form.buyingPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label>Selling Price *</label>
                  <input
                    name="sellingPrice"
                    type="number"
                    value={form.sellingPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>Stock Quantity</label>
                  <input
                    name="stockQuantity"
                    type="number"
                    value={form.stockQuantity}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Low Stock Alert</label>
                  <input
                    name="lowStockAlert"
                    type="number"
                    value={form.lowStockAlert}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeProductModals}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Continue
                </button>
              </div>
            </form>
          </div>

          {showProductReview && (
            <div className="review-modal">
              <h3>Confirm Product Details</h3>
              <p>Please verify the product before saving it.</p>

              <div className="review-grid">
                <div>
                  <span>Product Name</span>
                  <strong>{form.name || "-"}</strong>
                </div>

                <div>
                  <span>SKU</span>
                  <strong>{form.sku || "-"}</strong>
                </div>

                <div>
                  <span>Barcode</span>
                  <strong>{form.barcode || "-"}</strong>
                </div>

                <div>
                  <span>Buying Price</span>
                  <strong>${Number(form.buyingPrice || 0).toFixed(2)}</strong>
                </div>

                <div>
                  <span>Selling Price</span>
                  <strong>${Number(form.sellingPrice || 0).toFixed(2)}</strong>
                </div>

                <div>
                  <span>Stock Quantity</span>
                  <strong>{Number(form.stockQuantity || 0)}</strong>
                </div>

                <div>
                  <span>Low Stock Alert</span>
                  <strong>{Number(form.lowStockAlert || 5)}</strong>
                </div>

                <div className="review-full">
                  <span>Description</span>
                  <strong>{form.description || "-"}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowProductReview(false)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleConfirmCreateProduct}
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showStockModal && selectedProduct && (
        <div className="modal-overlay">
          <div className={`stock-modal ${showStockReview ? "modal-blurred" : ""}`}>
            <div className="modal-header">
              <div>
                <h3>Update Stock</h3>
                <p>{selectedProduct.name}</p>
              </div>

              <button className="modal-close-btn" onClick={closeStockModals}>
                ×
              </button>
            </div>

            <form className="product-form" onSubmit={handleStockReview}>
              <label>Movement Type</label>
              <select
                name="movementType"
                value={stockForm.movementType}
                onChange={handleStockChange}
              >
                <option value="increase">Increase Stock</option>
                <option value="decrease">Decrease Stock</option>
                <option value="set">Set Stock Quantity</option>
              </select>

              <label>Quantity *</label>
              <input
                name="quantity"
                type="number"
                value={stockForm.quantity}
                onChange={handleStockChange}
                placeholder="Enter quantity"
                required
              />

              <label>Reason</label>
              <textarea
                name="reason"
                value={stockForm.reason}
                onChange={handleStockChange}
                placeholder="Reason for stock update"
              />

              <div className="stock-preview-box">
                <div>
                  <span>Current Stock</span>
                  <strong>{selectedProduct.stock_quantity}</strong>
                </div>

                <div>
                  <span>New Stock</span>
                  <strong>{getStockAfterUpdate()}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeStockModals}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Continue
                </button>
              </div>
            </form>
          </div>

          {showStockReview && (
            <div className="review-modal">
              <h3>Confirm Stock Update</h3>
              <p>Please verify this stock change before saving it.</p>

              <div className="review-grid">
                <div>
                  <span>Product</span>
                  <strong>{selectedProduct.name}</strong>
                </div>

                <div>
                  <span>SKU</span>
                  <strong>{selectedProduct.sku || "-"}</strong>
                </div>

                <div>
                  <span>Movement Type</span>
                  <strong>{stockForm.movementType}</strong>
                </div>

                <div>
                  <span>Quantity</span>
                  <strong>{Number(stockForm.quantity || 0)}</strong>
                </div>

                <div>
                  <span>Current Stock</span>
                  <strong>{selectedProduct.stock_quantity}</strong>
                </div>

                <div>
                  <span>New Stock</span>
                  <strong>{getStockAfterUpdate()}</strong>
                </div>

                <div className="review-full">
                  <span>Reason</span>
                  <strong>{stockForm.reason || "-"}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowStockReview(false)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleConfirmStockUpdate}
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Products;