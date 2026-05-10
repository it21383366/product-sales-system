import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import SearchableSelect from "../components/SearchableSelect";

const reportCards = [
  {
    key: "sales",
    title: "Sales Report",
    permission: "reports.sales.view",
    description:
      "Sales totals, payment methods, sale status, returns, and reservations.",
  },
  {
    key: "products",
    title: "Product Stock Report",
    permission: "reports.products.view",
    description:
      "Product stock, batch count, category, supplier, sales quantity, and stock value.",
  },
  {
    key: "stockBatches",
    title: "Stock Batch Report",
    permission: "reports.stock.view",
    description:
      "Batch-level stock with buying price, selling price, supplier, original stock, and current stock.",
  },
  {
    key: "stock",
    title: "Stock Movement Report",
    permission: "reports.stock.view",
    description:
      "Clear explanation of stock increases, sales, refunds, reservations, and damages.",
  },
  {
    key: "suppliers",
    title: "Supplier Report",
    permission: "reports.suppliers.view",
    description: "Supplier product count, total stock, and low-stock supplier risk.",
  },
  {
    key: "activity",
    title: "User Activity Report",
    permission: "reports.users.view",
    description: "Readable audit log showing who did what and when.",
  },
  {
    key: "profit",
    title: "Profit Report",
    permission: "reports.profit.view",
    description: "Estimated gross profit using batch buying cost and sale value.",
  },
];

function Reports() {
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = savedUser.permissions || [];

  const hasPermission = (permission) => permissions.includes(permission);

  const availableReports = reportCards.filter((report) =>
    hasPermission(report.permission)
  );

  const [activeReport, setActiveReport] = useState(
    availableReports[0]?.key || ""
  );

  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "all",
    paymentMethod: "all",
    search: "",
    categoryId: "",
    supplierId: "",
    lowStock: false,
    lowStockOnly: false,
    movementType: "all",
    tableName: "all",
  });

  useEffect(() => {
    if (!activeReport && availableReports.length > 0) {
      setActiveReport(availableReports[0].key);
    }
  }, [availableReports, activeReport]);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    setSummary(null);
    setRows([]);
    setError("");
  }, [activeReport]);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/api/settings");
      setSettings(response.data.settings);
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/api/categories");
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get("/api/suppliers");
      setSuppliers(response.data.suppliers || []);
    } catch (err) {
      console.error("Failed to load suppliers", err);
    }
  };

  const updateFilter = (name, value) => {
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const money = (value) => `$${Number(value || 0).toFixed(2)}`;

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const labelText = (value) => {
    if (!value) return "-";

    return String(value)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getSaleStatusLabel = (status, isEdited = false) => {
    if (isEdited && status === "completed") return "Completed Sale - Edited";

    const labels = {
      completed: "Completed Sale",
      pending: "Pending Sale / Stock Reserved",
      cancelled: "Cancelled Pending Sale",
      returned: "Fully Returned Sale",
      partially_returned: "Partially Returned Sale",
      refunded: "Refunded Sale",
    };

    return labels[status] || labelText(status);
  };

  const getPaymentLabel = (method) => {
    const labels = {
      cash: "Cash Payment",
      card: "Card Payment",
      split: "Split Payment",
    };

    return labels[method] || labelText(method);
  };

  const getSaleRemark = (sale) => {
    const advance = Number(sale.advance_amount || 0);
    const balance = Number(sale.balance_amount || 0);

    if (sale.status === "pending") {
      return `${money(advance)} paid as advance. ${money(
        balance
      )} still needs to be paid.`;
    }

    if (sale.status === "cancelled") {
      if (advance > 0) {
        return `Pending sale cancelled. ${money(
          advance
        )} advance should be returned to the customer.`;
      }

      return "Sale was cancelled.";
    }

    if (sale.status === "returned") {
      return "All items in this sale have been returned/refunded.";
    }

    if (sale.status === "partially_returned") {
      return "Some items in this sale have been returned/refunded.";
    }

    if (sale.is_edited) {
      return "Sale was edited after completion.";
    }

    if (advance > 0 && sale.status === "completed") {
      return `${money(advance)} was paid as advance. Balance has been completed.`;
    }

    return "Paid in full.";
  };

  const getStockConditionLabel = (product) => {
    const stock = Number(product.stock_quantity || 0);
    const alert = Number(product.low_stock_alert || 0);

    if (stock <= 0) return "Out of Stock";
    if (stock <= alert) return "Low Stock";
    return "Available";
  };

  const getProductPriceRange = (product) => {
    const lowest = Number(
      product.lowest_selling_price || product.selling_price || 0
    );
    const highest = Number(
      product.highest_selling_price || product.selling_price || 0
    );

    if (lowest === highest) return money(highest);

    return `${money(lowest)} - ${money(highest)}`;
  };

  const getProductRemark = (product) => {
    const stock = Number(product.stock_quantity || 0);
    const alert = Number(product.low_stock_alert || 0);
    const qtySold = Number(product.quantity_sold || 0);
    const batchCount = Number(product.batch_count || 0);

    if (stock <= 0) {
      return "No sellable stock available.";
    }

    if (stock <= alert) {
      return `Stock is at or below the alert level of ${alert}. Reorder may be needed.`;
    }

    if (batchCount > 1 && qtySold > 0) {
      return `${batchCount} stock batch(es). ${qtySold} item(s) sold from completed sales.`;
    }

    if (batchCount > 1) {
      return `${batchCount} stock batch(es) with different price/cost records.`;
    }

    if (qtySold > 0) {
      return `${qtySold} item(s) sold from completed sales.`;
    }

    return "Product is in stock but no completed sales recorded in this report.";
  };

  const getBatchStatusLabel = (batch) => {
    const qty = Number(batch.quantity || 0);
    const alert = Number(batch.low_stock_alert || 0);

    if (qty <= 0) return "Out of Stock";
    if (qty <= alert) return "Low Stock";
    return "Available";
  };

  const getBatchRemark = (batch) => {
    const qty = Number(batch.quantity || 0);
    const original = Number(batch.original_quantity || 0);
    const soldOrRemoved = original - qty;

    if (qty <= 0) return "This batch has no remaining sellable stock.";

    if (soldOrRemoved > 0) {
      return `${soldOrRemoved} item(s) have been sold, reserved, returned, or adjusted from this batch.`;
    }

    return "This batch still has its full original stock quantity.";
  };

  const getMovementLabel = (type) => {
    const labels = {
      initial_stock: "Initial Stock Added",
      increase: "Stock Increased",
      decrease: "Stock Decreased",
      set: "Stock Manually Adjusted",
      sale: "Sold Item",
      pending_sale: "Reserved for Pending Sale",
      pending_cancel: "Pending Sale Cancelled",
      refund_return: "Returned to Sellable Stock",
      damage: "Damaged Stock Removed",
    };

    return labels[type] || labelText(type);
  };

  const getMovementDirection = (movement) => {
    const qty = Number(movement.quantity || 0);

    if (qty > 0) return "Stock In";
    if (qty < 0) return "Stock Out";
    return "No Stock Change";
  };

  const getMovementEffect = (movement) => {
    const qty = Number(movement.quantity || 0);
    const absQty = Math.abs(qty);

    if (movement.movement_type === "initial_stock") {
      return `${absQty} item(s) were added as opening stock.`;
    }

    if (movement.movement_type === "increase") {
      return `${absQty} item(s) were added to sellable stock.`;
    }

    if (movement.movement_type === "decrease") {
      return `${absQty} item(s) were removed from sellable stock.`;
    }

    if (movement.movement_type === "set") {
      return `Stock was manually adjusted by ${qty} item(s).`;
    }

    if (movement.movement_type === "sale") {
      return `${absQty} item(s) were sold and removed from stock.`;
    }

    if (movement.movement_type === "pending_sale") {
      return `${absQty} item(s) were reserved for a pending sale.`;
    }

    if (movement.movement_type === "pending_cancel") {
      return `${absQty} item(s) were returned because a pending sale was cancelled.`;
    }

    if (movement.movement_type === "refund_return") {
      return `${absQty} item(s) were returned to sellable stock after a change-of-mind refund.`;
    }

    if (movement.movement_type === "damage") {
      return `${absQty} damaged item(s) were removed from sellable stock.`;
    }

    if (qty > 0) return `${absQty} item(s) were added to stock.`;
    if (qty < 0) return `${absQty} item(s) were removed from stock.`;

    return "No stock quantity change was recorded.";
  };

  const getSupplierRisk = (supplier) => {
    const lowStock = Number(supplier.low_stock_products || 0);
    const productCount = Number(supplier.product_count || 0);

    if (productCount === 0) return "No Products Linked";
    if (lowStock > 0) return "Has Low Stock Products";
    return "Stock Looks Okay";
  };

  const getSupplierRemark = (supplier) => {
    const productCount = Number(supplier.product_count || 0);
    const lowStock = Number(supplier.low_stock_products || 0);
    const totalStock = Number(supplier.total_stock || 0);

    if (productCount === 0) {
      return "This supplier is not linked to any active products.";
    }

    if (lowStock > 0) {
      return `${lowStock} product(s) from this supplier are low in stock.`;
    }

    return `${productCount} product(s) linked with ${totalStock} total item(s) in stock.`;
  };

  const getActivityActionLabel = (action) => {
    const labels = {
      "created product": "Created Product",
      "edited product listing": "Edited Product Listing",
      "updated stock": "Updated Product Stock",
      "added stock batch to existing product": "Added Stock Batch",
      "created sale": "Created Sale",
      "created pending sale": "Created Pending Sale",
      "completed pending sale": "Completed Pending Sale",
      "cancelled pending sale": "Cancelled Pending Sale",
      "created refund": "Created Refund",
      "added damaged item": "Added Damaged Item",
      "created supplier": "Created Supplier",
      "updated supplier": "Updated Supplier",
      "deleted supplier": "Deleted Supplier",
      "updated role permissions": "Updated Role Permissions",
    };

    return labels[action] || labelText(action);
  };

  const getModuleLabel = (tableName) => {
    const labels = {
      sales: "Sales",
      products: "Products",
      suppliers: "Suppliers",
      roles: "User Privileges",
      users: "Users",
      refunds: "Refunds",
      damaged_items: "Damaged Items",
      stock_movements: "Stock Movements",
      settings: "Settings",
    };

    return labels[tableName] || labelText(tableName);
  };

  const parseDetails = (details) => {
    if (!details) return null;

    if (typeof details === "object") {
      return details;
    }

    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  const getActivityExplanation = (activity) => {
    const details = parseDetails(activity.details);

    if (!details) {
      return `${getActivityActionLabel(activity.action)} in ${getModuleLabel(
        activity.table_name
      )}.`;
    }

    if (activity.action === "created refund") {
      return `Refund ${details.refundNumber || ""} was created for sale ${
        details.saleNumber || "-"
      }. Type: ${labelText(details.refundType)}. Amount: ${money(
        details.totalRefundAmount
      )}. Reason: ${details.reason || "No reason added"}.`;
    }

    if (activity.action === "added damaged item") {
      return `${details.quantity || 0} damaged item(s) recorded for ${
        details.productName || "product"
      }. Source: ${details.damageSource || "-"}. Reason: ${
        details.reason || "No reason added"
      }.`;
    }

    if (activity.action === "updated stock") {
      return `Stock was updated for ${
        details.productName || "product"
      }. Type: ${labelText(details.movementType)}. Quantity: ${
        details.quantity || 0
      }. Before: ${details.previousStock ?? "-"}. After: ${
        details.newStock ?? "-"
      }. Reason: ${details.reason || "No reason added"}.`;
    }

    if (activity.action === "added stock batch to existing product") {
      return `New stock batch was added for ${
        details.productName || "product"
      }. Quantity: ${details.quantity || 0}. Selling price: ${money(
        details.sellingPrice
      )}. Buying price: ${money(details.buyingPrice)}.`;
    }

    if (
      activity.action === "created sale" ||
      activity.action === "created pending sale"
    ) {
      return `Sale ${details.saleNumber || "-"} was created. Status: ${labelText(
        details.status
      )}. Total: ${money(details.totalAmount)}.`;
    }

    if (activity.action === "completed pending sale") {
      return `Pending sale ${
        details.saleNumber || "-"
      } was completed. Final payment method: ${getPaymentLabel(
        details.finalPaymentMethod
      )}.`;
    }

    if (activity.action === "cancelled pending sale") {
      return `Pending sale ${
        details.saleNumber || "-"
      } was cancelled. Advance: ${money(
        details.advanceAmount
      )}. Reason: ${details.reason || "No reason added"}.`;
    }

    if (details.productName) {
      return `${getActivityActionLabel(activity.action)}: ${details.productName}.`;
    }

    if (details.saleNumber) {
      return `${getActivityActionLabel(activity.action)}: sale ${details.saleNumber}.`;
    }

    return `${getActivityActionLabel(activity.action)} in ${getModuleLabel(
      activity.table_name
    )}.`;
  };

  const getProfitRemark = (profit) => {
    const salesValue = Number(profit.sales_value || 0);
    const grossProfit = Number(profit.gross_profit || 0);

    if (salesValue <= 0) {
      return "No completed sales recorded for this product in this report.";
    }

    const margin = (grossProfit / salesValue) * 100;

    if (grossProfit < 0) {
      return `Loss-making product. Estimated margin: ${margin.toFixed(2)}%.`;
    }

    return `Estimated gross margin: ${margin.toFixed(2)}%.`;
  };

  const getProfitMargin = (profit) => {
    const salesValue = Number(profit.sales_value || 0);
    const grossProfit = Number(profit.gross_profit || 0);

    if (salesValue <= 0) return "0.00%";

    return `${((grossProfit / salesValue) * 100).toFixed(2)}%`;
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      setError("");
      setSummary(null);
      setRows([]);

      let endpoint = "";
      let params = {};

      if (activeReport === "sales") {
        endpoint = "/api/reports/sales-detail";
        params = {
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          status: filters.status || "all",
          paymentMethod: filters.paymentMethod || "all",
        };
      }

      if (activeReport === "products") {
        endpoint = "/api/reports/products-detail";
        params = {
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          supplierId: filters.supplierId || undefined,
          lowStock: filters.lowStock ? "true" : undefined,
        };
      }

      if (activeReport === "stockBatches") {
        endpoint = "/api/reports/stock-batches";
        params = {
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          supplierId: filters.supplierId || undefined,
          lowStock: filters.lowStock ? "true" : undefined,
        };
      }

      if (activeReport === "stock") {
        endpoint = "/api/reports/stock-movements";
        params = {
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          movementType: filters.movementType || "all",
          search: filters.search || undefined,
        };
      }

      if (activeReport === "suppliers") {
        endpoint = "/api/reports/suppliers-detail";
        params = {
          supplierId: filters.supplierId || undefined,
          lowStockOnly: filters.lowStockOnly ? "true" : undefined,
        };
      }

      if (activeReport === "activity") {
        endpoint = "/api/reports/user-activity";
        params = {
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          search: filters.search || undefined,
          tableName: filters.tableName || "all",
        };
      }

      if (activeReport === "profit") {
        endpoint = "/api/reports/profit";
        params = {
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          supplierId: filters.supplierId || undefined,
        };
      }

      const response = await api.get(endpoint, { params });

      setSummary(response.data.summary || {});

      if (activeReport === "sales") setRows(response.data.sales || []);
      if (activeReport === "products") setRows(response.data.products || []);
      if (activeReport === "stockBatches")
        setRows(response.data.batches || []);
      if (activeReport === "stock") setRows(response.data.movements || []);
      if (activeReport === "suppliers") setRows(response.data.suppliers || []);
      if (activeReport === "activity") setRows(response.data.activities || []);
      if (activeReport === "profit") setRows(response.data.profits || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const activeReportTitle = useMemo(() => {
    return (
      reportCards.find((report) => report.key === activeReport)?.title ||
      "Report"
    );
  }, [activeReport]);

  const getPrintColumns = () => {
    if (activeReport === "sales") {
      return [
        "Sale No",
        "Date",
        "Sold By",
        "Status",
        "Payment",
        "Total",
        "Cash",
        "Card",
        "Remark",
      ];
    }

    if (activeReport === "products") {
      return [
        "Product",
        "SKU",
        "Category",
        "Supplier",
        "Stock Status",
        "Total Stock",
        "Batch Count",
        "Price Range",
        "Stock Value",
        "Stock Cost",
        "Qty Sold",
        "Sales Value",
        "Remark",
      ];
    }

    if (activeReport === "stockBatches") {
      return [
        "Product",
        "SKU",
        "Category",
        "Supplier",
        "Buying Price",
        "Selling Price",
        "Current Stock",
        "Original Stock",
        "Selling Stock Value",
        "Buying Stock Value",
        "Potential Profit",
        "Status",
        "Batch Note",
        "Created",
        "Remark",
      ];
    }

    if (activeReport === "stock") {
      return [
        "Date",
        "Product",
        "SKU",
        "Action",
        "Direction",
        "Qty",
        "Explanation",
        "Recorded By",
      ];
    }

    if (activeReport === "suppliers") {
      return [
        "Supplier",
        "Contact",
        "Phone",
        "Email",
        "Products",
        "Total Stock",
        "Risk",
        "Remark",
      ];
    }

    if (activeReport === "activity") {
      return ["Date", "User", "Role", "Action", "Module", "Explanation"];
    }

    if (activeReport === "profit") {
      return [
        "Product",
        "SKU",
        "Category",
        "Supplier",
        "Qty Sold",
        "Sales Value",
        "Buying Cost",
        "Gross Profit",
        "Margin",
        "Remark",
      ];
    }

    return [];
  };

  const getPrintRow = (row) => {
    if (activeReport === "sales") {
      return [
        row.sale_number,
        formatDate(row.created_at),
        row.sold_by || "-",
        getSaleStatusLabel(row.status, row.is_edited),
        getPaymentLabel(row.payment_method),
        money(row.total_amount),
        money(row.cash_amount),
        money(row.card_amount),
        getSaleRemark(row),
      ];
    }

    if (activeReport === "products") {
      return [
        row.name,
        row.sku || "-",
        row.category_name || "-",
        row.supplier_name || "-",
        getStockConditionLabel(row),
        row.stock_quantity,
        row.batch_count,
        getProductPriceRange(row),
        money(row.stock_value_at_selling_price),
        money(row.stock_cost_value),
        row.quantity_sold,
        money(row.sales_value),
        getProductRemark(row),
      ];
    }

    if (activeReport === "stockBatches") {
      return [
        row.product_name,
        row.sku || "-",
        row.category_name || "-",
        row.supplier_name || "-",
        money(row.buying_price),
        money(row.selling_price),
        row.quantity,
        row.original_quantity,
        money(row.selling_stock_value),
        money(row.buying_stock_value),
        money(row.potential_profit_value),
        getBatchStatusLabel(row),
        row.batch_note || "-",
        formatDate(row.created_at),
        getBatchRemark(row),
      ];
    }

    if (activeReport === "stock") {
      return [
        formatDate(row.created_at),
        row.product_name || "-",
        row.sku || "-",
        getMovementLabel(row.movement_type),
        getMovementDirection(row),
        Math.abs(Number(row.quantity || 0)),
        `${getMovementEffect(row)} Reason: ${row.reason || "No reason added"}`,
        row.created_by_name || "-",
      ];
    }

    if (activeReport === "suppliers") {
      return [
        row.name,
        row.contact_person || "-",
        row.phone || "-",
        row.email || "-",
        row.product_count,
        row.total_stock,
        getSupplierRisk(row),
        getSupplierRemark(row),
      ];
    }

    if (activeReport === "activity") {
      return [
        formatDate(row.created_at),
        row.full_name || "-",
        row.role_name || "-",
        getActivityActionLabel(row.action),
        getModuleLabel(row.table_name),
        getActivityExplanation(row),
      ];
    }

    if (activeReport === "profit") {
      return [
        row.product_name,
        row.sku || "-",
        row.category_name || "-",
        row.supplier_name || "-",
        row.quantity_sold,
        money(row.sales_value),
        money(row.buying_cost),
        money(row.gross_profit),
        getProfitMargin(row),
        getProfitRemark(row),
      ];
    }

    return [];
  };

  const printReport = () => {
    const printWindow = window.open("", "_blank", "width=1000,height=800");

    const storeName = settings?.name || savedUser.organisationName || "Store";
    const address = settings?.address || "Address not added";
    const contact = settings?.phone || settings?.email || "Contact not added";

    const columns = getPrintColumns();
    const tableHead = columns.map((col) => `<th>${col}</th>`).join("");

    const tableRows = rows
      .map((row) => {
        const cells = getPrintRow(row)
          .map((cell) => `<td>${cell ?? "-"}</td>`)
          .join("");

        return `<tr>${cells}</tr>`;
      })
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>${activeReportTitle}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            body {
              font-family: Arial, sans-serif;
              color: #000;
              margin: 0;
              padding: 0;
              font-size: 10.5px;
            }

            .header {
              text-align: center;
              margin-bottom: 16px;
            }

            .header h1 {
              margin: 0;
              font-size: 22px;
            }

            .header p {
              margin: 3px 0;
            }

            .meta {
              margin: 14px 0;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              padding: 8px 0;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            th,
            td {
              border: 1px solid #000;
              padding: 5px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f1f1f1;
              font-weight: bold;
            }

            .footer {
              margin-top: 24px;
              text-align: center;
              font-size: 11px;
              border-top: 1px solid #000;
              padding-top: 8px;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>${storeName}</h1>
            <p>${address}</p>
            <p>${contact}</p>
          </div>

          <h2>${activeReportTitle}</h2>

          <div class="meta">
            <div><strong>Generated Date:</strong> ${new Date().toLocaleString()}</div>
            <div><strong>Generated By:</strong> ${savedUser.fullName || "-"}</div>
            <div><strong>Total Records:</strong> ${rows.length}</div>
          </div>

          <table>
            <thead>
              <tr>${tableHead}</tr>
            </thead>
            <tbody>
              ${
                tableRows ||
                `<tr><td colspan="${columns.length}">No records found</td></tr>`
              }
            </tbody>
          </table>

          <div class="footer">
            This is a system generated report and does not require a signature.
          </div>

          <script>
            window.print();
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const renderSummary = () => {
    if (!summary) return null;

    const items = [];

    if (activeReport === "sales") {
      items.push(["Total Sales Records", summary.salesCount]);
      items.push(["Completed Sales", summary.completedCount]);
      items.push(["Pending Reservations", summary.pendingCount]);
      items.push(["Returned Sales", summary.returnedCount]);
      items.push(["Gross Sales Total", money(summary.totalAmount)]);
      items.push(["Cash Collected", money(summary.cashTotal)]);
      items.push(["Card Collected", money(summary.cardTotal)]);
    }

    if (activeReport === "products") {
      items.push(["Total Products", summary.productCount]);
      items.push(["Total Stock Units", summary.totalStock]);
      items.push(["Stock Batches", summary.batchCount]);
      items.push(["Low Stock Products", summary.lowStockCount]);
      items.push(["Completed Sale Qty", summary.quantitySold]);
      items.push(["Completed Sales Value", money(summary.salesValue)]);
      items.push(["Current Stock Value", money(summary.stockValue)]);
      items.push(["Current Stock Cost", money(summary.stockCostValue)]);
    }

    if (activeReport === "stockBatches") {
      items.push(["Total Batches", summary.batchCount]);
      items.push(["Current Stock Units", summary.totalCurrentStock]);
      items.push(["Original Stock Units", summary.totalOriginalStock]);
      items.push(["Low Stock Batches", summary.lowStockBatchCount]);
      items.push(["Selling Stock Value", money(summary.sellingStockValue)]);
      items.push(["Buying Stock Value", money(summary.buyingStockValue)]);
      items.push([
        "Potential Profit Value",
        money(summary.potentialProfitValue),
      ]);
    }

    if (activeReport === "stock") {
      items.push(["Total Movements", summary.movementCount]);
      items.push(["Stock Added / Returned", summary.totalStockIn]);
      items.push(["Stock Sold / Removed", summary.totalStockOut]);
    }

    if (activeReport === "suppliers") {
      items.push(["Total Suppliers", summary.supplierCount]);
      items.push(["Linked Products", summary.productCount]);
      items.push(["Total Supplier Stock", summary.totalStock]);
      items.push(["Low Stock Products", summary.lowStockProducts]);
    }

    if (activeReport === "activity") {
      items.push(["Total Activities", summary.activityCount]);
    }

    if (activeReport === "profit") {
      items.push(["Quantity Sold", summary.quantitySold]);
      items.push(["Sales Value", money(summary.salesValue)]);
      items.push(["Buying Cost", money(summary.buyingCost)]);
      items.push(["Estimated Gross Profit", money(summary.grossProfit)]);
    }

    return (
      <div className="report-summary-card">
        {items.map(([label, value]) => (
          <div className="report-summary-card" key={label}>
            <span>{label}</span>
            <strong>{value ?? 0}</strong>
          </div>
        ))}
      </div>
    );
  };

  const renderFilters = () => {
    return (
      <div className="report-filter-panel">
        {(activeReport === "sales" ||
          activeReport === "stock" ||
          activeReport === "activity" ||
          activeReport === "profit") && (
          <div className="form-row">
            <div>
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter("startDate", e.target.value)}
              />
            </div>

            <div>
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter("endDate", e.target.value)}
              />
            </div>
          </div>
        )}

        {activeReport === "sales" && (
          <div className="form-row">
            <div>
              <label>Sale Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
              >
                <option value="all">All Sale Statuses</option>
                <option value="completed">Completed Sales</option>
                <option value="pending">Pending Sales / Reserved Stock</option>
                <option value="cancelled">Cancelled Pending Sales</option>
                <option value="returned">Fully Returned Sales</option>
                <option value="partially_returned">
                  Partially Returned Sales
                </option>
              </select>
            </div>

            <div>
              <label>Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => updateFilter("paymentMethod", e.target.value)}
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash Payments</option>
                <option value="card">Card Payments</option>
                <option value="split">Split Payments</option>
              </select>
            </div>
          </div>
        )}

        {(activeReport === "products" ||
          activeReport === "stockBatches" ||
          activeReport === "profit") && (
          <>
            <div className="form-row">
              <SearchableSelect
                label="Category"
                value={filters.categoryId}
                onChange={(value) => updateFilter("categoryId", value)}
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
                label="Supplier"
                value={filters.supplierId}
                onChange={(value) => updateFilter("supplierId", value)}
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
            </div>

            <label>
              {activeReport === "stockBatches"
                ? "Search Product / SKU / Batch Note"
                : "Search Product"}
            </label>
            <input
              value={filters.search}
              placeholder={
                activeReport === "stockBatches"
                  ? "Search product name, SKU, barcode, or batch note..."
                  : "Search product name or SKU..."
              }
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </>
        )}

        {(activeReport === "products" || activeReport === "stockBatches") && (
          <label className="checkbox-line report-checkbox">
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(e) => updateFilter("lowStock", e.target.checked)}
            />
            {activeReport === "stockBatches"
              ? "Show only stock batches at or below low stock alert"
              : "Show only products at or below low stock alert"}
          </label>
        )}

        {activeReport === "stock" && (
          <>
            <div>
              <label>Stock Movement Type</label>
              <select
                value={filters.movementType}
                onChange={(e) => updateFilter("movementType", e.target.value)}
              >
                <option value="all">All Stock Movements</option>
                <option value="initial_stock">Initial Stock Added</option>
                <option value="increase">Stock Increased</option>
                <option value="decrease">Stock Decreased</option>
                <option value="set">Stock Manually Adjusted</option>
                <option value="sale">Sold Items</option>
                <option value="pending_sale">Reserved for Pending Sale</option>
                <option value="pending_cancel">Pending Sale Cancelled</option>
                <option value="refund_return">
                  Returned to Stock After Refund
                </option>
                <option value="damage">Damaged Stock Removed</option>
              </select>
            </div>

            <label>Search Product / Reason</label>
            <input
              value={filters.search}
              placeholder="Search product, SKU, or reason..."
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </>
        )}

        {activeReport === "suppliers" && (
          <>
            <SearchableSelect
              label="Supplier"
              value={filters.supplierId}
              onChange={(value) => updateFilter("supplierId", value)}
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

            <label className="checkbox-line report-checkbox">
              <input
                type="checkbox"
                checked={filters.lowStockOnly}
                onChange={(e) =>
                  updateFilter("lowStockOnly", e.target.checked)
                }
              />
              Show only suppliers with low stock products
            </label>
          </>
        )}

        {activeReport === "activity" && (
          <>
            <div>
              <label>System Module</label>
              <select
                value={filters.tableName}
                onChange={(e) => updateFilter("tableName", e.target.value)}
              >
                <option value="all">All Modules</option>
                <option value="sales">Sales</option>
                <option value="products">Products</option>
                <option value="suppliers">Suppliers</option>
                <option value="roles">User Privileges</option>
                <option value="refunds">Refunds</option>
                <option value="damaged_items">Damaged Items</option>
              </select>
            </div>

            <label>Search User / Action</label>
            <input
              value={filters.search}
              placeholder="Search user, action, or module..."
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </>
        )}

        <div className="report-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={generateReport}
            disabled={loading || !activeReport}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={printReport}
            disabled={rows.length === 0}
          >
            Print Report
          </button>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!summary) {
      return (
        <div className="report-empty">
          Select filters and click Generate Report.
        </div>
      );
    }

    if (rows.length === 0) {
      return <div className="report-empty">No records found.</div>;
    }

    if (activeReport === "sales") {
      return (
        <ReportTable
          columns={[
            "Sale No",
            "Date",
            "Sold By",
            "Sale Status",
            "Payment",
            "Total",
            "Remark",
          ]}
          rows={rows.map((row) => [
            row.sale_number,
            formatDate(row.created_at),
            row.sold_by || "-",
            getSaleStatusLabel(row.status, row.is_edited),
            getPaymentLabel(row.payment_method),
            money(row.total_amount),
            getSaleRemark(row),
          ])}
        />
      );
    }

    if (activeReport === "products") {
      return (
        <ReportTable
          columns={[
            "Product",
            "SKU",
            "Category",
            "Supplier",
            "Stock Status",
            "Total Stock",
            "Batches",
            "Price Range",
            "Stock Value",
            "Qty Sold",
            "Sales Value",
            "Remark",
          ]}
          rows={rows.map((row) => [
            row.name,
            row.sku || "-",
            row.category_name || "-",
            row.supplier_name || "-",
            getStockConditionLabel(row),
            row.stock_quantity,
            row.batch_count,
            getProductPriceRange(row),
            money(row.stock_value_at_selling_price),
            row.quantity_sold,
            money(row.sales_value),
            getProductRemark(row),
          ])}
        />
      );
    }

    if (activeReport === "stockBatches") {
      return (
        <ReportTable
          columns={[
            "Product",
            "SKU",
            "Supplier",
            "Buying Price",
            "Selling Price",
            "Current Stock",
            "Original Stock",
            "Stock Value",
            "Potential Profit",
            "Status",
            "Remark",
          ]}
          rows={rows.map((row) => [
            row.product_name,
            row.sku || "-",
            row.supplier_name || "-",
            money(row.buying_price),
            money(row.selling_price),
            row.quantity,
            row.original_quantity,
            money(row.selling_stock_value),
            money(row.potential_profit_value),
            getBatchStatusLabel(row),
            getBatchRemark(row),
          ])}
        />
      );
    }

    if (activeReport === "stock") {
      return (
        <ReportTable
          columns={[
            "Date",
            "Product",
            "Action",
            "Direction",
            "Qty",
            "Explanation",
            "Recorded By",
          ]}
          rows={rows.map((row) => [
            formatDate(row.created_at),
            `${row.product_name || "-"}${row.sku ? ` (${row.sku})` : ""}`,
            getMovementLabel(row.movement_type),
            getMovementDirection(row),
            Math.abs(Number(row.quantity || 0)),
            `${getMovementEffect(row)} Reason: ${
              row.reason || "No reason added"
            }`,
            row.created_by_name || "-",
          ])}
        />
      );
    }

    if (activeReport === "suppliers") {
      return (
        <ReportTable
          columns={[
            "Supplier",
            "Contact",
            "Phone",
            "Products",
            "Total Stock",
            "Risk",
            "Remark",
          ]}
          rows={rows.map((row) => [
            row.name,
            row.contact_person || "-",
            row.phone || "-",
            row.product_count,
            row.total_stock,
            getSupplierRisk(row),
            getSupplierRemark(row),
          ])}
        />
      );
    }

    if (activeReport === "activity") {
      return (
        <ReportTable
          columns={["Date", "User", "Role", "Action", "Module", "Explanation"]}
          rows={rows.map((row) => [
            formatDate(row.created_at),
            row.full_name || "-",
            row.role_name || "-",
            getActivityActionLabel(row.action),
            getModuleLabel(row.table_name),
            getActivityExplanation(row),
          ])}
        />
      );
    }

    if (activeReport === "profit") {
      return (
        <ReportTable
          columns={[
            "Product",
            "SKU",
            "Supplier",
            "Qty Sold",
            "Sales Value",
            "Buying Cost",
            "Gross Profit",
            "Margin",
            "Remark",
          ]}
          rows={rows.map((row) => [
            row.product_name,
            row.sku || "-",
            row.supplier_name || "-",
            row.quantity_sold,
            money(row.sales_value),
            money(row.buying_cost),
            money(row.gross_profit),
            getProfitMargin(row),
            getProfitRemark(row),
          ])}
        />
      );
    }

    return null;
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p>Generate, view, and print clear business reports.</p>
        </div>
      </div>

      {availableReports.length === 0 && (
        <div className="error">You do not have permission to view reports.</div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="reports-layout">
        <aside className="reports-sidebar">
          {availableReports.map((report) => (
            <button
              key={report.key}
              className={`report-nav-card ${
                activeReport === report.key ? "active" : ""
              }`}
              onClick={() => setActiveReport(report.key)}
            >
              <strong>{report.title}</strong>
              <span>{report.description}</span>
            </button>
          ))}
        </aside>

        <section className="reports-main-panel">
          <div className="panel">
            <div className="table-header">
              <div>
                <h3>{activeReportTitle}</h3>
                <p>Choose filters, generate the report, then print if needed.</p>
              </div>
            </div>

            {renderFilters()}
          </div>

          {renderSummary()}

          <div className="panel table-panel">
            <div className="table-header">
              <div>
                <h3>Report Output</h3>
                <p>{rows.length} records</p>
              </div>
            </div>

            {renderTable()}
          </div>
        </section>
      </div>
    </div>
  );
}

function columnBadgeValue(column, value) {
  if (column === "Direction") {
    if (value === "Stock In") {
      return <span className="badge success">Stock In</span>;
    }

    if (value === "Stock Out") {
      return <span className="badge danger">Stock Out</span>;
    }

    return <span className="badge neutral">No Stock Change</span>;
  }

  if (
    column === "Sale Status" ||
    column === "Stock Status" ||
    column === "Risk" ||
    column === "Status"
  ) {
    if (
      value === "Completed Sale" ||
      value === "Available" ||
      value === "Stock Looks Okay"
    ) {
      return <span className="badge success">{value}</span>;
    }

    if (
      value === "Pending Sale / Stock Reserved" ||
      value === "Low Stock" ||
      value === "Partially Returned Sale" ||
      value === "Has Low Stock Products"
    ) {
      return <span className="badge warning">{value}</span>;
    }

    if (
      value === "Out of Stock" ||
      value === "Fully Returned Sale" ||
      value === "Cancelled Pending Sale"
    ) {
      return <span className="badge danger">{value}</span>;
    }

    return <span className="badge neutral">{value}</span>;
  }

  if (column === "Action") {
    return <span className="badge neutral">{value}</span>;
  }

  return value;
}

function ReportTable({ columns, rows }) {
  return (
    <div className="table-wrapper report-table-wrapper">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  {columnBadgeValue(columns[cellIndex], cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Reports;