import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import SearchableSelect from "../components/SearchableSelect";

const SALES_PER_PAGE = 25;

function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);

  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);

  const [form, setForm] = useState({
    paymentMethod: "cash",
    discountAmount: "",
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
    const response = await api.get("/api/sales");
    setSales(response.data.sales);
  };

  const fetchProducts = async () => {
    const response = await api.get("/api/products");
    setProducts(response.data.products);
  };

  const fetchSettings = async () => {
    const response = await api.get("/api/settings");
    setSettings(response.data.settings);
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
    if (!product) return sum;

    return sum + Number(product.selling_price) * Number(item.quantity || 0);
  }, 0);

  const discountAmount = Number(form.discountAmount || 0);
  const taxAmount = Number(form.taxAmount || 0);
  const totalAmount = subtotal - discountAmount + taxAmount;

  const resetForm = () => {
    setForm({
      paymentMethod: "cash",
      discountAmount: "",
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
    setMessage("");
    setError("");
    setModalError("");
  };

  const openEditSale = async (saleId) => {
    try {
      const response = await api.get(`/api/sales/${saleId}`);
      const sale = response.data.sale;

      setEditMode(true);
      setEditingSaleId(saleId);

      setForm({
        paymentMethod: sale.payment_method || "cash",
        discountAmount: sale.discount_amount || "",
        taxAmount: sale.tax_amount || "",
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
      setMessage("");
      setError("");
      setModalError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load sale");
    }
  };

  const closeModals = () => {
    setShowSaleModal(false);
    setShowReviewModal(false);
    setEditMode(false);
    setEditingSaleId(null);
    setModalError("");
    resetForm();
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index][field] = value;

    setForm({
      ...form,
      items: updatedItems,
    });
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: "", quantity: 1 }],
    });
  };

  const removeItemRow = (index) => {
    setForm({
      ...form,
      items: form.items.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const validatePayment = () => {
    if (form.paymentMethod === "split") {
      const paidTotal =
        Number(form.cashAmount || 0) + Number(form.cardAmount || 0);

      if (Number(paidTotal.toFixed(2)) !== Number(totalAmount.toFixed(2))) {
        return "Cash amount + card amount must match the total amount";
      }
    }

    return "";
  };

  const handleReview = (e) => {
    e.preventDefault();
    setModalError("");

    if (editMode && !form.editReason.trim()) {
      setModalError("Edit reason is required");
      return;
    }

    const invalidItem = form.items.find(
      (item) => !item.productId || Number(item.quantity) <= 0
    );

    if (invalidItem) {
      setModalError("Please select products and valid quantities");
      return;
    }

    const paymentError = validatePayment();

    if (paymentError) {
      setModalError(paymentError);
      return;
    }

    setShowReviewModal(true);
  };

  const submitSale = async () => {
    try {
      setModalError("");
      setError("");
      setMessage("");

      const payload = {
        paymentMethod: form.paymentMethod,
        discountAmount: Number(form.discountAmount || 0),
        taxAmount: Number(form.taxAmount || 0),
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
        setMessage("Sale completed successfully");
      }

      closeModals();
      await fetchSales();
      await fetchProducts();

      printSaleSlip(response.data.sale);
    } catch (err) {
      setShowReviewModal(false);
      setModalError(err.response?.data?.message || "Failed to save sale");
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

  const printSaleSlip = (sale) => {
    const printWindow = window.open("", "_blank", "width=320,height=700");

    const storeName = settings?.name || "Store";
    const address = settings?.address || "";
    const contact = settings?.phone || settings?.email || "";

    const rows = sale.items
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
          ${sale.is_edited ? "<p><strong>Edited Sale</strong></p>" : ""}

          <div class="line"></div>

          <table>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="line"></div>

          <p>Subtotal: $${Number(sale.subtotal).toFixed(2)}</p>
          <p>Discount: $${Number(sale.discount_amount).toFixed(2)}</p>
          <p>Tax: $${Number(sale.tax_amount).toFixed(2)}</p>
          <p class="total">Total: $${Number(sale.total_amount).toFixed(2)}</p>

          <div class="line"></div>

          <p>Payment: ${sale.payment_method}</p>
          ${
            sale.payment_method === "split"
              ? `<p>Cash: $${Number(sale.cash_amount || 0).toFixed(2)}</p>
                 <p>Card: $${Number(sale.card_amount || 0).toFixed(2)}</p>`
              : ""
          }

          <div class="line"></div>

          <p class="center">Thank you for your purchase!</p>
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
          <p>View sales history and create new POS sales.</p>
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

          <button className="primary-btn add-product-btn" onClick={openNewSale}>
            + New Sale
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Sale No</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Sold By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedSales.length === 0 && (
                <tr>
                  <td colSpan="7">No sales found</td>
                </tr>
              )}

              {paginatedSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.sale_number}</td>
                  <td>${Number(sale.total_amount).toFixed(2)}</td>
                  <td>{sale.payment_method}</td>
                  <td>
                    {sale.is_edited ? (
                      <span className="badge warning">Edited</span>
                    ) : (
                      <span className="badge success">{sale.status}</span>
                    )}
                  </td>
                  <td>{sale.sold_by || "-"}</td>
                  <td>{new Date(sale.created_at).toLocaleString()}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="small-btn"
                        onClick={() => openEditSale(sale.id)}
                      >
                        Edit
                      </button>

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

          <span>Showing page {page} of {totalPages}</span>

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
            className={`product-modal ${showReviewModal ? "modal-blurred" : ""}`}
          >
            <div className="modal-header">
              <div>
                <h3>{editMode ? "Edit Sale" : "New Sale"}</h3>
                <p>Select products, payment method, and continue.</p>
              </div>

              <button className="modal-close-btn" onClick={closeModals}>
                ×
              </button>
            </div>

            {modalError && <div className="modal-error">{modalError}</div>}

            <form className="product-form" onSubmit={handleReview}>
              {form.items.map((item, index) => {
                const product = getProduct(item.productId);

                return (
                  <div className="sale-item-row" key={index}>
                    <div>
                      <label>Product</label>
                      <SearchableSelect
                        label="Product"
                        value={item.productId}
                        onChange={(value) => updateItem(index, "productId", value)}
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

              <button type="button" className="secondary-btn" onClick={addItemRow}>
                + Add Item
              </button>

              <div className="form-row">
                <div>
                    <label>Discount</label>
                    <input
                    type="number"
                    value={form.discountAmount}
                    placeholder="0.00"
                    onChange={(e) =>
                        setForm({ ...form, discountAmount: e.target.value })
                    }
                    />
                </div>

                <div>
                    <label>Tax</label>
                    <input
                    type="number"
                    value={form.taxAmount}
                    placeholder="0.00"
                    onChange={(e) =>
                        setForm({ ...form, taxAmount: e.target.value })
                    }
                    />
                </div>
            </div>

            <div className="form-row">
                <div>
                    <label>Payment Method</label>
                    <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                        setForm({ ...form, paymentMethod: e.target.value })
                    }
                    >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="split">Split</option>
                    </select>
                </div>
            </div>

              {form.paymentMethod === "split" && (
                <div className="form-row">
                  <div>
                    <label>Cash Amount</label>
                    <input
                      type="number"
                      value={form.cashAmount}
                      onChange={(e) =>
                        setForm({ ...form, cashAmount: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label>Card Amount</label>
                    <input
                      type="number"
                      value={form.cardAmount}
                      onChange={(e) =>
                        setForm({ ...form, cardAmount: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {editMode && (
                <>
                  <label>Edit Reason *</label>
                  <textarea
                    value={form.editReason}
                    onChange={(e) =>
                      setForm({ ...form, editReason: e.target.value })
                    }
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
              </div>

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
            <div className="review-modal sale-review-modal">
                <h3>{editMode ? "Confirm Sale Edit" : "Confirm Sale"}</h3>
                <p>Please verify the sale before saving.</p>

                <div className="sale-review-items">
                <h4>Sale Products</h4>

                {form.items.map((item, index) => {
                    const product = getProduct(item.productId);
                    const quantity = Number(item.quantity || 0);
                    const unitPrice = Number(product?.selling_price || 0);
                    const lineTotal = unitPrice * quantity;

                    return (
                    <div className="sale-review-item" key={index}>
                        <div>
                        <strong>{product?.name || "Unknown Product"}</strong>
                        <span>Qty: {quantity}</span>
                        </div>

                        <div>
                        <span>Unit</span>
                        <strong>${unitPrice.toFixed(2)}</strong>
                        </div>

                        <div>
                        <span>Total</span>
                        <strong>${lineTotal.toFixed(2)}</strong>
                        </div>
                    </div>
                    );
                })}
                </div>

                <div className="review-grid">
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

                <button type="button" className="primary-btn" onClick={submitSale}>
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

export default Sales;