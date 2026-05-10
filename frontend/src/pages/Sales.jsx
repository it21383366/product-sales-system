import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import SearchableSelect from "../components/SearchableSelect";

const SALES_PER_PAGE = 25;

function Sales() {
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = savedUser.permissions || [];

  const hasPermission = (permission) => permissions.includes(permission);

  const defaultSaleStatus = hasPermission("sales.create")
    ? "completed"
    : "pending";

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);

  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [saleModalError, setSaleModalError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedPendingSale, setSelectedPendingSale] = useState(null);
  const [completeModalError, setCompleteModalError] = useState("");
  const [completeForm, setCompleteForm] = useState({
    paymentMethod: "cash",
    cashAmount: "",
    cardAmount: "",
  });

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelModalError, setCancelModalError] = useState("");

  const [form, setForm] = useState({
    saleStatus: defaultSaleStatus,
    paymentMethod: "cash",
    discountAmount: "",
    taxAmount: "",
    advanceAmount: "",
    cashAmount: "",
    cardAmount: "",
    editReason: "",
    items: [{ productId: "", quantity: 1 }],
  });

  const totalPages = Math.ceil(sales.length / SALES_PER_PAGE) || 1;

  const paginatedSales = useMemo(() => {
    const start = (page - 1) * SALES_PER_PAGE;
    return sales.slice(start, start + SALES_PER_PAGE);
  }, [sales, page]);

  const fetchSales = async () => {
    try {
      const response = await api.get("/api/sales");
      setSales(response.data.sales);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load sales");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products");
      setProducts(response.data.products);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get("/api/settings");
      setSettings(response.data.settings);
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchProducts();
    fetchSettings();
  }, []);

  const getProduct = (productId) => {
    return products.find((product) => product.id === productId);
  };

  const subtotal = form.items.reduce((sum, item) => {
    const product = getProduct(item.productId);

    if (!product) {
      return sum;
    }

    return sum + Number(product.selling_price) * Number(item.quantity || 0);
  }, 0);

  const discountAmount = Number(form.discountAmount || 0);
  const taxAmount = Number(form.taxAmount || 0);
  const totalAmount = subtotal - discountAmount + taxAmount;
  const advanceAmount = Number(form.advanceAmount || 0);
  const balanceAmount =
    form.saleStatus === "pending" ? totalAmount - advanceAmount : 0;

  const resetForm = () => {
    setForm({
      saleStatus: defaultSaleStatus,
      paymentMethod: "cash",
      discountAmount: "",
      taxAmount: "",
      advanceAmount: "",
      cashAmount: "",
      cardAmount: "",
      editReason: "",
      items: [{ productId: "", quantity: 1 }],
    });
  };

  const openNewSale = () => {
    setEditMode(false);
    setEditingSaleId(null);
    resetForm();
    setShowSaleModal(true);
    setShowReviewModal(false);
    setSaleModalError("");
    setMessage("");
    setError("");
  };

  const openEditSale = async (saleId) => {
    try {
      const response = await api.get(`/api/sales/${saleId}`);
      const sale = response.data.sale;

      if (sale.status !== "completed") {
        setError("Only completed sales can be edited");
        return;
      }

      setEditMode(true);
      setEditingSaleId(saleId);

      setForm({
        saleStatus: "completed",
        paymentMethod: sale.payment_method || "cash",
        discountAmount: Number(sale.discount_amount || 0),
        taxAmount: Number(sale.tax_amount || 0),
        advanceAmount: "",
        cashAmount: sale.cash_amount || "",
        cardAmount: sale.card_amount || "",
        editReason: "",
        items: sale.items.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
        })),
      });

      setShowSaleModal(true);
      setShowReviewModal(false);
      setSaleModalError("");
      setMessage("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load sale");
    }
  };

  const closeModals = () => {
    setShowSaleModal(false);
    setShowReviewModal(false);
    setEditMode(false);
    setEditingSaleId(null);
    setSaleModalError("");
    resetForm();
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index][field] = value;

    setForm({
      ...form,
      items: updatedItems,
    });

    setSaleModalError("");
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: "", quantity: 1 }],
    });

    setSaleModalError("");
  };

  const removeItemRow = (index) => {
    setForm({
      ...form,
      items: form.items.filter((_, itemIndex) => itemIndex !== index),
    });

    setSaleModalError("");
  };

  const validatePayment = () => {
    if (totalAmount <= 0) {
      return "Sale total must be greater than 0";
    }

    if (form.saleStatus === "pending") {
      if (!hasPermission("sales.pending.create")) {
        return "You do not have permission to create pending sales";
      }

      if (advanceAmount <= 0) {
        return "Advance amount must be greater than 0";
      }

      if (advanceAmount >= totalAmount) {
        return "Advance amount must be less than the total amount";
      }

      if (form.paymentMethod === "split") {
        const paidTotal =
          Number(form.cashAmount || 0) + Number(form.cardAmount || 0);

        if (Number(paidTotal.toFixed(2)) !== Number(advanceAmount.toFixed(2))) {
          return "Cash amount + card amount must match the advance amount";
        }
      }
    }

    if (form.saleStatus === "completed") {
      if (!hasPermission("sales.create")) {
        return "You do not have permission to create completed sales";
      }

      if (form.paymentMethod === "split") {
        const paidTotal =
          Number(form.cashAmount || 0) + Number(form.cardAmount || 0);

        if (Number(paidTotal.toFixed(2)) !== Number(totalAmount.toFixed(2))) {
          return "Cash amount + card amount must match the total amount";
        }
      }
    }

    return "";
  };

  const handleReview = (e) => {
    e.preventDefault();
    setError("");
    setSaleModalError("");

    if (editMode && !form.editReason.trim()) {
      setSaleModalError("Edit reason is required");
      return;
    }

    const invalidItem = form.items.find(
      (item) => !item.productId || Number(item.quantity) <= 0
    );

    if (invalidItem) {
      setSaleModalError("Please select products and valid quantities");
      return;
    }

    const paymentError = validatePayment();

    if (paymentError) {
      setSaleModalError(paymentError);
      return;
    }

    setShowReviewModal(true);
  };

  const submitSale = async () => {
    try {
      setError("");
      setSaleModalError("");
      setMessage("");

      const payload = {
        saleStatus: form.saleStatus,
        paymentMethod: form.paymentMethod,
        discountAmount: Number(form.discountAmount || 0),
        taxAmount: Number(form.taxAmount || 0),
        advanceAmount: Number(form.advanceAmount || 0),
        cashAmount: Number(form.cashAmount || 0),
        cardAmount: Number(form.cardAmount || 0),
        editReason: form.editReason,
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      };

      let response;

      if (editMode) {
        response = await api.patch(`/api/sales/${editingSaleId}`, payload);
        setMessage("Sale edited successfully");
      } else {
        response = await api.post("/api/sales", payload);
        setMessage(
          form.saleStatus === "pending"
            ? "Pending sale created successfully"
            : "Sale completed successfully"
        );
      }

      closeModals();

      await fetchSales();
      await fetchProducts();

      printSaleSlip(response.data.sale);
    } catch (err) {
      setShowReviewModal(false);
      setSaleModalError(err.response?.data?.message || "Failed to save sale");
    }
  };

  const printExistingSale = async (saleId) => {
    try {
      const response = await api.get(`/api/sales/${saleId}`);
      printSaleSlip(response.data.sale);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to print sale");
    }
  };

  const openCompletePending = (sale) => {
    setSelectedPendingSale(sale);
    setCompleteModalError("");
    setCompleteForm({
      paymentMethod: "cash",
      cashAmount: "",
      cardAmount: "",
    });
    setShowCompleteModal(true);
    setError("");
    setMessage("");
  };

  const closeCompletePending = () => {
    setSelectedPendingSale(null);
    setCompleteModalError("");
    setCompleteForm({
      paymentMethod: "cash",
      cashAmount: "",
      cardAmount: "",
    });
    setShowCompleteModal(false);
  };

  const submitCompletePending = async () => {
    try {
      setCompleteModalError("");

      if (!selectedPendingSale) {
        return;
      }

      const balance = Number(selectedPendingSale.balance_amount || 0);

      if (completeForm.paymentMethod === "split") {
        const paidTotal =
          Number(completeForm.cashAmount || 0) +
          Number(completeForm.cardAmount || 0);

        if (Number(paidTotal.toFixed(2)) !== Number(balance.toFixed(2))) {
          setCompleteModalError(
            "Cash amount + card amount must match the balance amount"
          );
          return;
        }
      }

      await api.patch(`/api/sales/${selectedPendingSale.id}/complete-pending`, {
        paymentMethod: completeForm.paymentMethod,
        cashAmount: Number(completeForm.cashAmount || 0),
        cardAmount: Number(completeForm.cardAmount || 0),
      });

      const saleId = selectedPendingSale.id;

      closeCompletePending();
      setMessage("Pending sale completed successfully");

      await fetchSales();
      await fetchProducts();
      await printExistingSale(saleId);
    } catch (err) {
      setCompleteModalError(
        err.response?.data?.message || "Failed to complete pending sale"
      );
    }
  };

  const openCancelPending = (sale) => {
    setSelectedPendingSale(sale);
    setCancelReason("");
    setCancelModalError("");
    setShowCancelModal(true);
    setError("");
    setMessage("");
  };

  const closeCancelPending = () => {
    setSelectedPendingSale(null);
    setCancelReason("");
    setCancelModalError("");
    setShowCancelModal(false);
  };

  const submitCancelPending = async () => {
    try {
      setCancelModalError("");

      if (!selectedPendingSale) {
        return;
      }

      if (!cancelReason.trim()) {
        setCancelModalError("Cancel reason is required");
        return;
      }

      await api.patch(`/api/sales/${selectedPendingSale.id}/cancel-pending`, {
        reason: cancelReason,
      });

      closeCancelPending();
      setMessage("Pending sale cancelled, advance returned, and stock returned");

      await fetchSales();
      await fetchProducts();
    } catch (err) {
      setCancelModalError(
        err.response?.data?.message || "Failed to cancel pending sale"
      );
    }
  };

  const getStatusBadge = (sale) => {
    if (sale.status === "pending") {
      return <span className="badge warning">Pending</span>;
    }

    if (sale.status === "cancelled") {
      return <span className="badge danger">Cancelled</span>;
    }

    if (sale.status === "refunded") {
      return <span className="badge danger">Refunded</span>;
    }

    if (sale.is_edited) {
      return <span className="badge warning">Edited</span>;
    }

    return <span className="badge success">Completed</span>;
  };

  const getSaleRemark = (sale) => {
    const advance = Number(sale.advance_amount || 0);
    const balance = Number(sale.balance_amount || 0);

    if (sale.status === "pending") {
      return `$${advance.toFixed(2)} paid as advance. $${balance.toFixed(
        2
      )} needs to be paid.`;
    }

    if (sale.status === "cancelled") {
      if (advance > 0) {
        return `$${advance.toFixed(2)} advance returned to customer.`;
      }

      return "Cancelled sale.";
    }

    if (sale.is_edited) {
      return "Sale was edited after completion.";
    }

    if (advance > 0 && sale.status === "completed") {
      return `$${advance.toFixed(2)} was paid as advance. Balance completed.`;
    }

    return "Paid in full.";
  };

  const printSaleSlip = (sale) => {
    const printWindow = window.open("", "_blank", "width=320,height=700");

    const storeName = settings?.name || "Store";
    const address = settings?.address || "";
    const contact = settings?.phone || settings?.email || "";

    const rows = (sale.items || [])
      .map(
        (item) => `
          <tr>
            <td>${item.productName || item.product_name}</td>
            <td>${item.quantity}</td>
            <td>$${Number(item.totalPrice || item.total_price).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const statusText =
      sale.status === "pending"
        ? "PENDING SALE / STOCK RESERVED"
        : sale.status === "cancelled"
        ? "CANCELLED SALE / ADVANCE RETURNED"
        : sale.status === "refunded"
        ? "REFUNDED SALE"
        : "COMPLETED SALE";

    const remark =
      sale.status === "pending"
        ? `$${Number(sale.advance_amount || 0).toFixed(
            2
          )} paid as advance. $${Number(sale.balance_amount || 0).toFixed(
            2
          )} needs to be paid.`
        : sale.status === "cancelled"
        ? `$${Number(sale.advance_amount || 0).toFixed(
            2
          )} advance returned to customer.`
        : Number(sale.advance_amount || 0) > 0
        ? `$${Number(sale.advance_amount || 0).toFixed(
            2
          )} was paid as advance. Balance completed.`
        : "Paid in full.";

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @page {
              size: 75mm auto;
              margin: 4mm;
            }

            body {
              width: 75mm;
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #000;
              margin: 0;
              padding: 0;
            }

            .center {
              text-align: center;
            }

            h2 {
              font-size: 15px;
              margin: 0 0 4px;
            }

            p {
              margin: 2px 0;
            }

            .line {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            td {
              padding: 3px 0;
              vertical-align: top;
            }

            td:nth-child(2) {
              text-align: center;
              width: 24px;
            }

            td:nth-child(3) {
              text-align: right;
              width: 52px;
            }

            .total {
              font-size: 14px;
              font-weight: bold;
            }

            .small {
              font-size: 10px;
            }

            .status {
              font-weight: bold;
              text-align: center;
              margin-top: 6px;
            }

            .remark {
              font-weight: bold;
              margin-top: 6px;
            }
          </style>
        </head>

        <body>
          <div class="center">
            <h2>${storeName}</h2>
            <p>${address}</p>
            <p>${contact}</p>
          </div>

          <div class="line"></div>

          <p>Sale: ${sale.sale_number}</p>
          <p>Date: ${new Date(sale.created_at || new Date()).toLocaleString()}</p>
          <p class="status">${statusText}</p>
          ${sale.is_edited ? "<p><strong>Edited Sale</strong></p>" : ""}

          <div class="line"></div>

          <table>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="line"></div>

          <p>Subtotal: $${Number(sale.subtotal || 0).toFixed(2)}</p>
          <p>Discount: $${Number(sale.discount_amount || 0).toFixed(2)}</p>
          <p>Tax: $${Number(sale.tax_amount || 0).toFixed(2)}</p>
          <p class="total">Total: $${Number(sale.total_amount || 0).toFixed(2)}</p>

          <p class="remark">Remark: ${remark}</p>

          <div class="line"></div>

          <p>Payment: ${sale.payment_method || "-"}</p>
          <p>Cash: $${Number(sale.cash_amount || 0).toFixed(2)}</p>
          <p>Card: $${Number(sale.card_amount || 0).toFixed(2)}</p>

          <div class="line"></div>

          <p class="center">
            ${
              sale.status === "pending"
                ? "Thank you. Your items have been reserved."
                : "Thank you for your purchase!"
            }
          </p>
          <p class="center small">Please come again</p>

          <script>
            window.print();
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h2>Sales</h2>
          <p>View sales history, pending reservations, and POS sales.</p>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="panel table-panel">
        <div className="table-header">
          <div>
            <h3>Sales History</h3>
            <p>
              {sales.length} sales found · Page {page} of {totalPages}
            </p>
          </div>

          {(hasPermission("sales.create") ||
            hasPermission("sales.pending.create")) && (
            <button
              className="primary-btn add-product-btn"
              onClick={openNewSale}
            >
              + New Sale
            </button>
          )}
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Sale No</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Remark</th>
                <th>Sold By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedSales.length === 0 && (
                <tr>
                  <td colSpan="8">No sales found</td>
                </tr>
              )}

              {paginatedSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.sale_number}</td>
                  <td>${Number(sale.total_amount || 0).toFixed(2)}</td>
                  <td>{sale.payment_method || "-"}</td>
                  <td>{getStatusBadge(sale)}</td>
                  <td>{getSaleRemark(sale)}</td>
                  <td>{sale.sold_by || "-"}</td>
                  <td>{new Date(sale.created_at).toLocaleString()}</td>
                  <td>
                    <div className="table-actions">
                      {sale.status === "pending" &&
                        hasPermission("sales.pending.complete") && (
                          <button
                            className="small-btn"
                            onClick={() => openCompletePending(sale)}
                          >
                            Complete Sale
                          </button>
                        )}

                      {sale.status === "pending" &&
                        hasPermission("sales.pending.cancel") && (
                          <button
                            className="small-btn danger-table-btn"
                            onClick={() => openCancelPending(sale)}
                          >
                            Cancel Pending
                          </button>
                        )}

                      {sale.status === "completed" &&
                        hasPermission("sales.create") && (
                          <button
                            className="small-btn"
                            onClick={() => openEditSale(sale.id)}
                          >
                            Edit
                          </button>
                        )}

                      <button
                        className="small-btn secondary-table-btn"
                        onClick={() => printExistingSale(sale.id)}
                      >
                        Print
                      </button>
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

      {showSaleModal && (
        <div className="modal-overlay">
          <div
            className={`product-modal ${
              showReviewModal ? "modal-blurred" : ""
            }`}
          >
            <div className="modal-header">
              <div>
                <h3>{editMode ? "Edit Sale" : "New Sale"}</h3>
                <p>Select products, sale type, payment method, and continue.</p>
              </div>

              <button className="modal-close-btn" onClick={closeModals}>
                ×
              </button>
            </div>

            <form className="product-form" onSubmit={handleReview}>
              {saleModalError && (
                <div className="modal-error">{saleModalError}</div>
              )}

              {!editMode && (
                <div>
                  <label>Sale Type</label>
                  <select
                    value={form.saleStatus}
                    onChange={(e) => {
                      setSaleModalError("");
                      setForm({
                        ...form,
                        saleStatus: e.target.value,
                        advanceAmount: "",
                        cashAmount: "",
                        cardAmount: "",
                        paymentMethod: "cash",
                      });
                    }}
                  >
                    {hasPermission("sales.create") && (
                      <option value="completed">Completed Sale</option>
                    )}

                    {hasPermission("sales.pending.create") && (
                      <option value="pending">
                        Pending Sale / Reserve Stock
                      </option>
                    )}
                  </select>
                </div>
              )}

              {form.items.map((item, index) => {
                const product = getProduct(item.productId);

                return (
                  <div className="sale-item-row" key={index}>
                    <div>
                      <SearchableSelect
                        label="Product"
                        value={item.productId}
                        onChange={(value) =>
                          updateItem(index, "productId", value)
                        }
                        placeholder="Select product"
                        searchPlaceholder="Search products..."
                        options={products.map((product) => ({
                          value: product.id,
                          label: `${product.name} - Stock: ${product.stock_quantity}`,
                        }))}
                      />
                    </div>

                    <div>
                      <label>Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <label>Total</label>
                      <input
                        value={
                          product
                            ? `$${(
                                Number(product.selling_price) *
                                Number(item.quantity || 0)
                              ).toFixed(2)}`
                            : "$0.00"
                        }
                        readOnly
                      />
                    </div>

                    <button
                      type="button"
                      className="secondary-btn remove-item-btn"
                      onClick={() => removeItemRow(index)}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                className="secondary-btn"
                onClick={addItemRow}
              >
                + Add Item
              </button>

              <div className="form-row">
                <div>
                  <label>Discount</label>
                  <input
                    type="number"
                    value={form.discountAmount}
                    placeholder="0.00"
                    onChange={(e) => {
                      setSaleModalError("");
                      setForm({ ...form, discountAmount: e.target.value });
                    }}
                  />
                </div>

                <div>
                  <label>Tax</label>
                  <input
                    type="number"
                    value={form.taxAmount}
                    placeholder="0.00"
                    onChange={(e) => {
                      setSaleModalError("");
                      setForm({ ...form, taxAmount: e.target.value });
                    }}
                  />
                </div>
              </div>

              {form.saleStatus === "pending" && !editMode && (
                <div>
                  <label>Advance Amount *</label>
                  <input
                    type="number"
                    value={form.advanceAmount}
                    placeholder="0.00"
                    onChange={(e) => {
                      setSaleModalError("");
                      setForm({ ...form, advanceAmount: e.target.value });
                    }}
                    required
                  />
                </div>
              )}

              <div>
                <label>
                  {form.saleStatus === "pending" && !editMode
                    ? "Advance Payment Method"
                    : "Payment Method"}
                </label>

                <select
                  value={form.paymentMethod}
                  onChange={(e) => {
                    setSaleModalError("");
                    setForm({
                      ...form,
                      paymentMethod: e.target.value,
                      cashAmount: "",
                      cardAmount: "",
                    });
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="split">Split</option>
                </select>
              </div>

              {form.paymentMethod === "split" && (
                <div className="form-row">
                  <div>
                    <label>Cash Amount</label>
                    <input
                      type="number"
                      value={form.cashAmount}
                      placeholder="0.00"
                      onChange={(e) => {
                        setSaleModalError("");
                        setForm({ ...form, cashAmount: e.target.value });
                      }}
                    />
                  </div>

                  <div>
                    <label>Card Amount</label>
                    <input
                      type="number"
                      value={form.cardAmount}
                      placeholder="0.00"
                      onChange={(e) => {
                        setSaleModalError("");
                        setForm({ ...form, cardAmount: e.target.value });
                      }}
                    />
                  </div>
                </div>
              )}

              {editMode && (
                <>
                  <label>Edit Reason *</label>
                  <textarea
                    value={form.editReason}
                    onChange={(e) => {
                      setSaleModalError("");
                      setForm({ ...form, editReason: e.target.value });
                    }}
                    placeholder="Reason for editing this sale"
                    required
                  />
                </>
              )}

              <div className="sale-total-box">
                <div>
                  <span>Subtotal</span>
                  <strong>${subtotal.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Discount</span>
                  <strong>${discountAmount.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Tax</span>
                  <strong>${taxAmount.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>${totalAmount.toFixed(2)}</strong>
                </div>

                {form.saleStatus === "pending" && !editMode && (
                  <>
                    <div>
                      <span>Advance Paid</span>
                      <strong>${advanceAmount.toFixed(2)}</strong>
                    </div>

                    <div>
                      <span>Amount To Be Paid</span>
                      <strong>${Math.max(balanceAmount, 0).toFixed(2)}</strong>
                    </div>
                  </>
                )}
              </div>

              {form.saleStatus === "pending" && !editMode && (
                <div className="pending-remark-box">
                  ${advanceAmount.toFixed(2)} paid as advance. $
                  {Math.max(balanceAmount, 0).toFixed(2)} needs to be paid.
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModals}
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
              <h3>{editMode ? "Confirm Sale Edit" : "Confirm Sale"}</h3>
              <p>Please verify the sale before saving.</p>

              <div className="review-grid">
                <div>
                  <span>Sale Type</span>
                  <strong>
                    {editMode
                      ? "Completed Sale Edit"
                      : form.saleStatus === "pending"
                      ? "Pending Sale"
                      : "Completed Sale"}
                  </strong>
                </div>

                <div>
                  <span>Items</span>
                  <strong>{form.items.length}</strong>
                </div>

                <div>
                  <span>Payment</span>
                  <strong>{form.paymentMethod}</strong>
                </div>

                <div>
                  <span>Subtotal</span>
                  <strong>${subtotal.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Tax</span>
                  <strong>${taxAmount.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Discount</span>
                  <strong>${discountAmount.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>${totalAmount.toFixed(2)}</strong>
                </div>

                {form.saleStatus === "pending" && !editMode && (
                  <>
                    <div>
                      <span>Advance Paid</span>
                      <strong>${advanceAmount.toFixed(2)}</strong>
                    </div>

                    <div>
                      <span>Amount To Be Paid</span>
                      <strong>${Math.max(balanceAmount, 0).toFixed(2)}</strong>
                    </div>

                    <div className="review-full">
                      <span>Remark</span>
                      <strong>
                        ${advanceAmount.toFixed(2)} paid as advance. $
                        {Math.max(balanceAmount, 0).toFixed(2)} needs to be paid.
                      </strong>
                    </div>
                  </>
                )}

                {form.paymentMethod === "split" && (
                  <>
                    <div>
                      <span>Cash</span>
                      <strong>${Number(form.cashAmount || 0).toFixed(2)}</strong>
                    </div>

                    <div>
                      <span>Card</span>
                      <strong>${Number(form.cardAmount || 0).toFixed(2)}</strong>
                    </div>
                  </>
                )}

                {editMode && (
                  <div className="review-full">
                    <span>Edit Reason</span>
                    <strong>{form.editReason}</strong>
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

                <button
                  type="button"
                  className="primary-btn"
                  onClick={submitSale}
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCompleteModal && selectedPendingSale && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <div>
                <h3>Complete Pending Sale</h3>
                <p>{selectedPendingSale.sale_number}</p>
              </div>

              <button className="modal-close-btn" onClick={closeCompletePending}>
                ×
              </button>
            </div>

            <div className="sale-total-box">
              <div>
                <span>Total</span>
                <strong>
                  ${Number(selectedPendingSale.total_amount || 0).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Advance Paid</span>
                <strong>
                  ${Number(selectedPendingSale.advance_amount || 0).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Amount To Be Paid</span>
                <strong>
                  ${Number(selectedPendingSale.balance_amount || 0).toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="pending-remark-box">
              ${Number(selectedPendingSale.advance_amount || 0).toFixed(2)} paid
              as advance. ${Number(selectedPendingSale.balance_amount || 0).toFixed(2)} needs to be paid.
            </div>

            <div className="product-form">
              {completeModalError && (
                <div className="modal-error">{completeModalError}</div>
              )}

              <label>Balance Payment Method</label>
              <select
                value={completeForm.paymentMethod}
                onChange={(e) => {
                  setCompleteModalError("");
                  setCompleteForm({
                    paymentMethod: e.target.value,
                    cashAmount: "",
                    cardAmount: "",
                  });
                }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="split">Split</option>
              </select>

              {completeForm.paymentMethod === "split" && (
                <div className="form-row">
                  <div>
                    <label>Cash Amount</label>
                    <input
                      type="number"
                      value={completeForm.cashAmount}
                      placeholder="0.00"
                      onChange={(e) => {
                        setCompleteModalError("");
                        setCompleteForm({
                          ...completeForm,
                          cashAmount: e.target.value,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label>Card Amount</label>
                    <input
                      type="number"
                      value={completeForm.cardAmount}
                      placeholder="0.00"
                      onChange={(e) => {
                        setCompleteModalError("");
                        setCompleteForm({
                          ...completeForm,
                          cardAmount: e.target.value,
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeCompletePending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={submitCompletePending}
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && selectedPendingSale && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <div>
                <h3>Cancel Pending Sale</h3>
                <p>{selectedPendingSale.sale_number}</p>
              </div>

              <button className="modal-close-btn" onClick={closeCancelPending}>
                ×
              </button>
            </div>

            <div className="sale-total-box">
              <div>
                <span>Total</span>
                <strong>
                  ${Number(selectedPendingSale.total_amount || 0).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Advance To Return</span>
                <strong>
                  ${Number(selectedPendingSale.advance_amount || 0).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Stock</span>
                <strong>Return</strong>
              </div>
            </div>

            <div className="pending-remark-box danger-remark">
              ${Number(selectedPendingSale.advance_amount || 0).toFixed(2)} must
              be returned to the customer when this pending sale is cancelled.
            </div>

            <div className="product-form">
              {cancelModalError && (
                <div className="modal-error">{cancelModalError}</div>
              )}

              <label>Cancel Reason *</label>
              <textarea
                value={cancelReason}
                placeholder="Reason for cancelling this pending sale"
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  setCancelModalError("");
                }}
                required
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeCancelPending}
              >
                Close
              </button>

              <button
                type="button"
                className="primary-btn danger-confirm-btn"
                onClick={submitCancelPending}
              >
                Cancel Pending Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;