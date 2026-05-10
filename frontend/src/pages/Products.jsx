import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import SearchableSelect from "../components/SearchableSelect";

const PRODUCTS_PER_PAGE = 25;

function Products() {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [stockModalError, setStockModalError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [showProductModal, setShowProductModal] = useState(false);
  const [showProductReview, setShowProductReview] = useState(false);

  const [showStockModal, setShowStockModal] = useState(false);
  const [showStockReview, setShowStockReview] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState("");

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    id: "",
    name: "",
    description: "",
  });
  const [categoryError, setCategoryError] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    buyingPrice: "",
    sellingPrice: "",
    stockQuantity: "",
    lowStockAlert: "5",
    categoryId: "",
    supplierId: "",
  });

  const [stockForm, setStockForm] = useState({
    movementType: "increase",
    quantity: "",
    buyingPrice: "",
    sellingPrice: "",
    supplierId: "",
    reason: "Stock added from frontend",
    batchNote: "",
  });

  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = savedUser.permissions || [];

  const hasPermission = (permission) => permissions.includes(permission);

  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE) || 1;

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return products.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [products, currentPage]);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/api/categories");
      setCategories(response.data.categories);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get("/api/suppliers");
      setSuppliers(response.data.suppliers);
    } catch (err) {
      console.error("Failed to load suppliers", err);
    }
  };

  const fetchProducts = async (
    searchValue = search,
    categoryValue = selectedCategory,
    supplierValue = selectedSupplier
  ) => {
    try {
      setError("");

      const response = await api.get("/api/products", {
        params: {
          search: searchValue || undefined,
          categoryId: categoryValue || undefined,
          supplierId: supplierValue || undefined,
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
    fetchProducts("", "", "");
    fetchLogs();
    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      fetchProducts(search, selectedCategory, selectedSupplier);
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [search, selectedCategory, selectedSupplier]);

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
      categoryId: "",
      supplierId: "",
    });
  };

  const resetStockForm = (product = null) => {
    setStockForm({
      movementType: "increase",
      quantity: "",
      buyingPrice: product?.buying_price || "",
      sellingPrice:
        product?.highest_selling_price ||
        product?.selling_price ||
        "",
      supplierId: product?.supplier_id || "",
      reason: "Stock added from frontend",
      batchNote: "",
    });
  };

  const closeProductModals = () => {
    setShowProductModal(false);
    setShowProductReview(false);
    setEditMode(false);
    setEditingProductId(null);
    setModalError("");
  };

  const closeStockModals = () => {
    setShowStockModal(false);
    setShowStockReview(false);
    setSelectedProduct(null);
    setStockModalError("");
    resetStockForm();
  };

  const openCategoryModal = () => {
    setCategoryForm({
      id: "",
      name: "",
      description: "",
    });
    setCategoryError("");
    setCategoryMessage("");
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryForm({
      id: "",
      name: "",
      description: "",
    });
    setCategoryError("");
    setCategoryMessage("");
  };

  const handleCategorySelect = (categoryId) => {
    setCategoryError("");
    setCategoryMessage("");

    if (!categoryId) {
      setCategoryForm({
        id: "",
        name: "",
        description: "",
      });
      return;
    }

    const selected = categories.find((category) => category.id === categoryId);

    if (!selected) {
      setCategoryForm({
        id: "",
        name: "",
        description: "",
      });
      return;
    }

    setCategoryForm({
      id: selected.id,
      name: selected.name || "",
      description: selected.description || "",
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();

    try {
      setCategoryError("");
      setCategoryMessage("");

      if (!categoryForm.name.trim()) {
        setCategoryError("Category name is required");
        return;
      }

      if (categoryForm.id) {
        await api.patch(`/api/categories/${categoryForm.id}`, {
          name: categoryForm.name,
          description: categoryForm.description,
        });

        setCategoryMessage("Category updated successfully");
      } else {
        await api.post("/api/categories", {
          name: categoryForm.name,
          description: categoryForm.description,
        });

        setCategoryMessage("Category created successfully");
      }

      await fetchCategories();
      await fetchProducts(search, selectedCategory, selectedSupplier);

      setCategoryForm({
        id: "",
        name: "",
        description: "",
      });
    } catch (err) {
      setCategoryError(err.response?.data?.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async () => {
    try {
      setCategoryError("");
      setCategoryMessage("");

      if (!categoryForm.id) {
        setCategoryError("Select a category to delete");
        return;
      }

      await api.delete(`/api/categories/${categoryForm.id}`);

      setCategoryMessage("Category deleted successfully");

      const deletedCategoryId = categoryForm.id;

      if (selectedCategory === deletedCategoryId) {
        setSelectedCategory("");
      }

      setCategoryForm({
        id: "",
        name: "",
        description: "",
      });

      await fetchCategories();
      await fetchProducts(search, "", selectedSupplier);
    } catch (err) {
      setCategoryError(
        err.response?.data?.message || "Failed to delete category"
      );
    }
  };

  const handleOpenAddProduct = () => {
    setEditMode(false);
    setEditingProductId(null);
    setMessage("");
    setError("");
    setModalError("");
    resetProductForm();
    setShowProductModal(true);
    setShowProductReview(false);
  };

  const handleOpenEditProduct = (product) => {
    setEditMode(true);
    setEditingProductId(product.id);
    setMessage("");
    setError("");
    setModalError("");

    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      description: product.description || "",
      buyingPrice: product.buying_price || "",
      sellingPrice: product.selling_price || "",
      stockQuantity: product.stock_quantity || "",
      lowStockAlert: product.low_stock_alert || "5",
      categoryId: product.category_id || "",
      supplierId: product.supplier_id || "",
    });

    setShowProductModal(true);
    setShowProductReview(false);
  };

  const handleOpenStockModal = (product) => {
    setMessage("");
    setError("");
    setStockModalError("");
    setSelectedProduct(product);
    resetStockForm(product);
    setShowStockModal(true);
    setShowStockReview(false);
  };

  const handleOpenDeleteProduct = (product) => {
    setMessage("");
    setError("");
    setDeleteModalError("");
    setDeleteProduct(product);
  };

  const handleChange = (e) => {
    setModalError("");
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleStockChange = (e) => {
    setStockModalError("");
    setStockForm({
      ...stockForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleProductReview = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setModalError("");

    if (!form.name.trim()) {
      setModalError("Product name is required");
      return;
    }

    if (!form.sellingPrice || Number(form.sellingPrice) <= 0) {
      setModalError("Selling price is required and must be greater than 0");
      return;
    }

    setShowProductReview(true);
  };

  const handleStockReview = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setStockModalError("");

    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) {
      setStockModalError("Stock quantity must be greater than 0");
      return;
    }

    if (
      stockForm.movementType === "increase" &&
      (!stockForm.sellingPrice || Number(stockForm.sellingPrice) <= 0)
    ) {
      setStockModalError("Selling price is required for a new stock batch");
      return;
    }

    const newStock = getStockAfterUpdate();

    if (stockForm.movementType === "decrease" && newStock < 0) {
      setStockModalError("Stock cannot be negative");
      return;
    }

    setShowStockReview(true);
  };

  const handleConfirmSaveProduct = async () => {
    try {
      setError("");
      setMessage("");
      setModalError("");

      const payload = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        description: form.description,
        buyingPrice: Number(form.buyingPrice || 0),
        sellingPrice: Number(form.sellingPrice),
        lowStockAlert: Number(form.lowStockAlert || 5),
        categoryId: form.categoryId || null,
        supplierId: form.supplierId || null,
      };

      if (editMode) {
        await api.patch(`/api/products/${editingProductId}`, payload);
        setMessage("Product listing updated successfully");
      } else {
        await api.post("/api/products", {
          ...payload,
          stockQuantity: Number(form.stockQuantity || 0),
        });

        setMessage("Product created successfully");
      }

      closeProductModals();
      resetProductForm();
      fetchProducts(search, selectedCategory, selectedSupplier);
      fetchLogs();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to save product");
      setShowProductReview(false);
    }
  };

  const handleConfirmStockUpdate = async () => {
    try {
      setError("");
      setMessage("");
      setStockModalError("");

      await api.patch(`/api/products/${selectedProduct.id}/stock`, {
        movementType: stockForm.movementType,
        quantity: Number(stockForm.quantity),
        reason: stockForm.reason || "Stock updated from frontend",
        buyingPrice: Number(stockForm.buyingPrice || 0),
        sellingPrice: Number(stockForm.sellingPrice || 0),
        supplierId: stockForm.supplierId || null,
        batchNote: stockForm.batchNote,
      });

      setMessage("Stock updated successfully");
      closeStockModals();
      fetchProducts(search, selectedCategory, selectedSupplier);
      fetchLogs();
    } catch (err) {
      setStockModalError(
        err.response?.data?.message || "Failed to update stock"
      );
      setShowStockReview(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    try {
      setDeleteModalError("");

      if (!deleteProduct) {
        return;
      }

      await api.delete(`/api/products/${deleteProduct.id}`);

      setMessage("Product deleted successfully");
      setDeleteProduct(null);

      await fetchProducts(search, selectedCategory, selectedSupplier);
      await fetchLogs();
    } catch (err) {
      setDeleteModalError(
        err.response?.data?.message || "Failed to delete product"
      );
    }
  };

  const getStockAfterUpdate = () => {
    if (!selectedProduct) return 0;

    const currentStock = Number(selectedProduct.stock_quantity || 0);
    const quantity = Number(stockForm.quantity || 0);

    if (stockForm.movementType === "increase") {
      return currentStock + quantity;
    }

    if (stockForm.movementType === "decrease") {
      return currentStock - quantity;
    }

    return quantity;
  };

  const getSelectedCategoryName = () => {
    const category = categories.find((item) => item.id === form.categoryId);
    return category?.name || "No category";
  };

  const getSelectedSupplierName = () => {
    const supplier = suppliers.find((item) => item.id === form.supplierId);
    return supplier?.name || "No supplier";
  };

  const getStockFormSupplierName = () => {
    const supplier = suppliers.find((item) => item.id === stockForm.supplierId);
    return supplier?.name || "No supplier";
  };

  const getPriceRangeText = (product) => {
    const lowest = Number(
      product.lowest_selling_price || product.selling_price || 0
    );
    const highest = Number(
      product.highest_selling_price || product.selling_price || 0
    );

    if (lowest === highest) {
      return `$${highest.toFixed(2)}`;
    }

    return `$${lowest.toFixed(2)} - $${highest.toFixed(2)}`;
  };

  const formatLogDetails = (log) => {
    const details = log.details || {};

    if (log.action === "updated stock") {
      return `${details.movementType || "stock update"} ${
        details.quantity || 0
      }. Reason: ${details.reason || "No reason added"}`;
    }

    if (log.action === "created product") {
      return `Product: ${details.productName || "Unknown product"}`;
    }

    if (log.action === "edited product listing") {
      return `Edited: ${details.productName || "Unknown product"}`;
    }

    if (log.action === "deleted product") {
      return `Deleted: ${details.productName || "Unknown product"}`;
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
              <p>View, search, filter, and manage all product records.</p>
            </div>

            <div className="product-filters">
              <SearchableSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder="All Categories"
                searchPlaceholder="Search categories..."
                options={[
                  { value: "", label: "All Categories" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />

              <SearchableSelect
                value={selectedSupplier}
                onChange={setSelectedSupplier}
                placeholder="All Suppliers"
                searchPlaceholder="Search suppliers..."
                options={[
                  { value: "", label: "All Suppliers" },
                  ...suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                  })),
                ]}
              />

              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search products..."
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
                <h3>Products</h3>
                <p>
                  {products.length} products found · Page {currentPage} of{" "}
                  {totalPages}
                </p>
              </div>

              <div className="table-header-actions">
                {hasPermission("categories.manage") && (
                  <button className="secondary-btn" onClick={openCategoryModal}>
                    Add / Edit Category
                  </button>
                )}

                {hasPermission("products.create") && (
                  <button
                    className="primary-btn add-product-btn"
                    onClick={handleOpenAddProduct}
                  >
                    + Add Product
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Price Range</th>
                    <th>Batches</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedProducts.length === 0 && (
                    <tr>
                      <td colSpan="9">No products found</td>
                    </tr>
                  )}

                  {paginatedProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.sku || "-"}</td>
                      <td>{product.category_name || "-"}</td>
                      <td>{product.supplier_name || "-"}</td>
                      <td>
                        <span className="batch-price-badge">
                          {getPriceRangeText(product)}
                        </span>
                      </td>
                      <td>
                        <span className="badge neutral">
                          {Number(product.batch_count || 0)} batch(es)
                        </span>
                      </td>
                      <td>{product.stock_quantity}</td>
                      <td>
                        {Number(product.stock_quantity || 0) <=
                        Number(product.low_stock_alert || 0) ? (
                          <span className="badge danger">Low Stock</span>
                        ) : (
                          <span className="badge success">In Stock</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {hasPermission("products.edit") && (
                            <button
                              className="small-btn"
                              onClick={() => handleOpenStockModal(product)}
                            >
                              Add Stock
                            </button>
                          )}

                          {hasPermission("products.listing.edit") && (
                            <button
                              className="small-btn secondary-table-btn"
                              onClick={() => handleOpenEditProduct(product)}
                            >
                              Edit
                            </button>
                          )}

                          {hasPermission("products.delete") && (
                            <button
                              className="small-btn danger-table-btn"
                              onClick={() => handleOpenDeleteProduct(product)}
                            >
                              Delete
                            </button>
                          )}

                          {!hasPermission("products.edit") &&
                            !hasPermission("products.listing.edit") &&
                            !hasPermission("products.delete") && (
                              <span className="muted-action-text">
                                No actions
                              </span>
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
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                Previous
              </button>

              <span>
                Showing{" "}
                {products.length === 0
                  ? 0
                  : (currentPage - 1) * PRODUCTS_PER_PAGE + 1}
                -{Math.min(currentPage * PRODUCTS_PER_PAGE, products.length)} of{" "}
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
              const isProductEdit = log.action === "edited product listing";
              const isProductDelete = log.action === "deleted product";

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
                          Updated{" "}
                          <strong>{details.productName || "product"}</strong>
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
                        <span className="log-badge success">
                          Product Created
                        </span>
                        <p>
                          Added{" "}
                          <strong>{details.productName || "new product"}</strong>
                        </p>
                      </>
                    )}

                    {isProductEdit && (
                      <>
                        <span className="log-badge neutral">
                          Listing Edited
                        </span>
                        <p>
                          Edited{" "}
                          <strong>{details.productName || "product"}</strong>
                        </p>
                      </>
                    )}

                    {isProductDelete && (
                      <>
                        <span className="log-badge warning">
                          Product Deleted
                        </span>
                        <p>
                          Deleted{" "}
                          <strong>{details.productName || "product"}</strong>
                        </p>
                      </>
                    )}

                    {!isStockUpdate &&
                      !isProductCreate &&
                      !isProductEdit &&
                      !isProductDelete && (
                        <>
                          <span className="log-badge neutral">
                            {log.action}
                          </span>
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
          <div
            className={`product-modal ${
              showProductReview ? "modal-blurred" : ""
            }`}
          >
            <div className="modal-header">
              <div>
                <h3>{editMode ? "Edit Product Listing" : "Add Product"}</h3>
                <p>
                  {editMode
                    ? "Update product listing details and continue to verify."
                    : "Enter product details and continue to verify."}
                </p>
              </div>

              <button className="modal-close-btn" onClick={closeProductModals}>
                ×
              </button>
            </div>

            <form className="product-form" onSubmit={handleProductReview}>
              {modalError && <div className="modal-error">{modalError}</div>}

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

              <SearchableSelect
                label="Category"
                value={form.categoryId}
                onChange={(value) =>
                  setForm({
                    ...form,
                    categoryId: value,
                  })
                }
                placeholder="No category"
                searchPlaceholder="Search categories..."
                options={[
                  { value: "", label: "No category" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />

              <SearchableSelect
                label="Supplier"
                value={form.supplierId}
                onChange={(value) =>
                  setForm({
                    ...form,
                    supplierId: value,
                  })
                }
                placeholder="No supplier"
                searchPlaceholder="Search suppliers..."
                options={[
                  { value: "", label: "No supplier" },
                  ...suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                  })),
                ]}
              />

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
                    step="0.01"
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
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {!editMode && (
                <div className="batch-info-box">
                  Initial stock will create the first stock batch using this
                  buying price and selling price.
                </div>
              )}

              <div className="form-row">
                {!editMode && (
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
                )}

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
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeProductModals}
                >
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
              <h3>
                {editMode
                  ? "Confirm Product Update"
                  : "Confirm Product Details"}
              </h3>
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
                  <span>Category</span>
                  <strong>{getSelectedCategoryName()}</strong>
                </div>

                <div>
                  <span>Supplier</span>
                  <strong>{getSelectedSupplierName()}</strong>
                </div>

                <div>
                  <span>Buying Price</span>
                  <strong>${Number(form.buyingPrice || 0).toFixed(2)}</strong>
                </div>

                <div>
                  <span>Selling Price</span>
                  <strong>${Number(form.sellingPrice || 0).toFixed(2)}</strong>
                </div>

                {!editMode && (
                  <div>
                    <span>Initial Batch Stock</span>
                    <strong>{Number(form.stockQuantity || 0)}</strong>
                  </div>
                )}

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
                  onClick={handleConfirmSaveProduct}
                >
                  {editMode ? "Confirm & Update" : "Confirm & Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showStockModal && selectedProduct && (
        <div className="modal-overlay">
          <div
            className={`stock-modal ${showStockReview ? "modal-blurred" : ""}`}
          >
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
              {stockModalError && (
                <div className="modal-error">{stockModalError}</div>
              )}

              <label>Movement Type</label>
              <select
                name="movementType"
                value={stockForm.movementType}
                onChange={handleStockChange}
              >
                <option value="increase">Increase Stock / New Batch</option>
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

              {(stockForm.movementType === "increase" ||
                stockForm.movementType === "set") && (
                <>
                  <div className="form-row">
                    <div>
                      <label>Buying Price</label>
                      <input
                        name="buyingPrice"
                        type="number"
                        step="0.01"
                        value={stockForm.buyingPrice}
                        onChange={handleStockChange}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label>Selling Price *</label>
                      <input
                        name="sellingPrice"
                        type="number"
                        step="0.01"
                        value={stockForm.sellingPrice}
                        onChange={handleStockChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <SearchableSelect
                    label="Supplier"
                    value={stockForm.supplierId}
                    onChange={(value) =>
                      setStockForm({
                        ...stockForm,
                        supplierId: value,
                      })
                    }
                    placeholder="No supplier"
                    searchPlaceholder="Search suppliers..."
                    options={[
                      { value: "", label: "No supplier" },
                      ...suppliers.map((supplier) => ({
                        value: supplier.id,
                        label: supplier.name,
                      })),
                    ]}
                  />

                  <label>Batch Note</label>
                  <input
                    name="batchNote"
                    value={stockForm.batchNote}
                    onChange={handleStockChange}
                    placeholder="Example: New supplier stock with higher selling price"
                  />

                  <div className="batch-info-box">
                    This will create a stock batch with its own selling price.
                    Sales will use the highest selling price batch first unless
                    the cashier selects a specific batch.
                  </div>
                </>
              )}

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
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeStockModals}
                >
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

                {(stockForm.movementType === "increase" ||
                  stockForm.movementType === "set") && (
                  <>
                    <div>
                      <span>Buying Price</span>
                      <strong>
                        ${Number(stockForm.buyingPrice || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <span>Selling Price</span>
                      <strong>
                        ${Number(stockForm.sellingPrice || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <span>Supplier</span>
                      <strong>{getStockFormSupplierName()}</strong>
                    </div>

                    <div>
                      <span>Batch Note</span>
                      <strong>{stockForm.batchNote || "-"}</strong>
                    </div>
                  </>
                )}

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

      {deleteProduct && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <div>
                <h3>Delete Product</h3>
                <p>This product will be removed from active product lists.</p>
              </div>

              <button
                className="modal-close-btn"
                onClick={() => setDeleteProduct(null)}
              >
                ×
              </button>
            </div>

            {deleteModalError && (
              <div className="modal-error">{deleteModalError}</div>
            )}

            <div className="confirm-user-box">
              <span>Product</span>
              <strong>{deleteProduct.name}</strong>
              <small>SKU: {deleteProduct.sku || "No SKU"}</small>
            </div>

            <div className="pending-remark-box danger-remark">
              This is a soft delete. Old sales and reports will still keep this
              product history.
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setDeleteProduct(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn danger-confirm-btn"
                onClick={handleConfirmDeleteProduct}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="category-modal">
            <div className="modal-header">
              <div>
                <h3>Add / Edit Category</h3>
                <p>Create, update, or delete product categories.</p>
              </div>

              <button className="modal-close-btn" onClick={closeCategoryModal}>
                ×
              </button>
            </div>

            {categoryMessage && (
              <div className="success-message">{categoryMessage}</div>
            )}

            {categoryError && <div className="modal-error">{categoryError}</div>}

            <form className="product-form" onSubmit={handleSaveCategory}>
              <SearchableSelect
                label="Select Existing Category"
                value={categoryForm.id}
                onChange={handleCategorySelect}
                placeholder="Create new category"
                searchPlaceholder="Search categories..."
                options={[
                  { value: "", label: "Create new category" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />

              <label>Category Name *</label>
              <input
                value={categoryForm.name}
                placeholder="Example: Electronics"
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    name: e.target.value,
                  })
                }
                required
              />

              <label>Description</label>
              <textarea
                value={categoryForm.description}
                placeholder="Category description"
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeCategoryModal}
                >
                  Close
                </button>

                {categoryForm.id && (
                  <button
                    type="button"
                    className="danger-table-btn category-delete-btn"
                    onClick={handleDeleteCategory}
                  >
                    Delete Category
                  </button>
                )}

                <button type="submit" className="primary-btn">
                  {categoryForm.id ? "Update Category" : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;