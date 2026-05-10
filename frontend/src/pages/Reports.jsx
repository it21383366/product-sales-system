import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import SearchableSelect from "../components/SearchableSelect";

const reportCards = [
  {
    key: "sales",
    title: "Sales Report",
    permission: "reports.sales.view",
    description: "Sales totals, status, payment methods, and sale history.",
  },
  {
    key: "products",
    title: "Product Report",
    permission: "reports.products.view",
    description: "Product stock, category, supplier, and sales performance.",
  },
  {
    key: "stock",
    title: "Stock Movement Report",
    permission: "reports.stock.view",
    description: "Stock increases, decreases, sales, refunds, damages, and reasons.",
  },
  {
    key: "suppliers",
    title: "Supplier Report",
    permission: "reports.suppliers.view",
    description: "Supplier product counts, total stock, and low stock products.",
  },
  {
    key: "activity",
    title: "User Activity Report",
    permission: "reports.users.view",
    description: "Audit log activity by user, role, module, and action.",
  },
  {
    key: "profit",
    title: "Profit Report",
    permission: "reports.profit.view",
    description: "Estimated gross profit using buying price and selling price.",
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

      if (activeReport === "sales") {
        setRows(response.data.sales || []);
      }

      if (activeReport === "products") {
        setRows(response.data.products || []);
      }

      if (activeReport === "stock") {
        setRows(response.data.movements || []);
      }

      if (activeReport === "suppliers") {
        setRows(response.data.suppliers || []);
      }

      if (activeReport === "activity") {
        setRows(response.data.activities || []);
      }

      if (activeReport === "profit") {
        setRows(response.data.profits || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const activeReportTitle = useMemo(() => {
    return reportCards.find((report) => report.key === activeReport)?.title || "Report";
  }, [activeReport]);

  const getPrintColumns = () => {
    if (activeReport === "sales") {
      return [
        "Sale No",
        "Date",
        "Sold By",
        "Status",
        "Payment",
        "Subtotal",
        "Discount",
        "Tax",
        "Total",
      ];
    }

    if (activeReport === "products") {
      return [
        "Product",
        "SKU",
        "Category",
        "Supplier",
        "Stock",
        "Low Alert",
        "Buying",
        "Selling",
        "Qty Sold",
        "Sales Value",
      ];
    }

    if (activeReport === "stock") {
      return ["Date", "Product", "SKU", "Type", "Qty", "Reason", "Updated By"];
    }

    if (activeReport === "suppliers") {
      return [
        "Supplier",
        "Contact",
        "Phone",
        "Email",
        "Products",
        "Total Stock",
        "Low Stock",
      ];
    }

    if (activeReport === "activity") {
      return ["Date", "User", "Role", "Action", "Module", "Details"];
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
        row.status,
        row.payment_method,
        money(row.subtotal),
        money(row.discount_amount),
        money(row.tax_amount),
        money(row.total_amount),
      ];
    }

    if (activeReport === "products") {
      return [
        row.name,
        row.sku || "-",
        row.category_name || "-",
        row.supplier_name || "-",
        row.stock_quantity,
        row.low_stock_alert,
        money(row.buying_price),
        money(row.selling_price),
        row.quantity_sold,
        money(row.sales_value),
      ];
    }

    if (activeReport === "stock") {
      return [
        formatDate(row.created_at),
        row.product_name || "-",
        row.sku || "-",
        row.movement_type,
        row.quantity,
        row.reason || "-",
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
        row.low_stock_products,
      ];
    }

    if (activeReport === "activity") {
      return [
        formatDate(row.created_at),
        row.full_name || "-",
        row.role_name || "-",
        row.action,
        row.table_name || "-",
        row.details ? JSON.stringify(row.details) : "-",
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
              font-size: 11px;
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
              ${tableRows || `<tr><td colspan="${columns.length}">No records found</td></tr>`}
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
      items.push(["Sales", summary.salesCount]);
      items.push(["Completed", summary.completedCount]);
      items.push(["Pending", summary.pendingCount]);
      items.push(["Returned", summary.returnedCount]);
      items.push(["Total", money(summary.totalAmount)]);
      items.push(["Cash", money(summary.cashTotal)]);
      items.push(["Card", money(summary.cardTotal)]);
    }

    if (activeReport === "products") {
      items.push(["Products", summary.productCount]);
      items.push(["Total Stock", summary.totalStock]);
      items.push(["Low Stock", summary.lowStockCount]);
      items.push(["Qty Sold", summary.quantitySold]);
      items.push(["Sales Value", money(summary.salesValue)]);
    }

    if (activeReport === "stock") {
      items.push(["Movements", summary.movementCount]);
      items.push(["Stock In", summary.totalStockIn]);
      items.push(["Stock Out", summary.totalStockOut]);
    }

    if (activeReport === "suppliers") {
      items.push(["Suppliers", summary.supplierCount]);
      items.push(["Products", summary.productCount]);
      items.push(["Total Stock", summary.totalStock]);
      items.push(["Low Stock Products", summary.lowStockProducts]);
    }

    if (activeReport === "activity") {
      items.push(["Activities", summary.activityCount]);
    }

    if (activeReport === "profit") {
      items.push(["Qty Sold", summary.quantitySold]);
      items.push(["Sales Value", money(summary.salesValue)]);
      items.push(["Buying Cost", money(summary.buyingCost)]);
      items.push(["Gross Profit", money(summary.grossProfit)]);
    }

    return (
      <div className="report-summary-grid">
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
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
                <option value="partially_returned">Partially Returned</option>
              </select>
            </div>

            <div>
              <label>Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => updateFilter("paymentMethod", e.target.value)}
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="split">Split</option>
              </select>
            </div>
          </div>
        )}

        {(activeReport === "products" || activeReport === "profit") && (
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

            <label>Search Product</label>
            <input
              value={filters.search}
              placeholder="Search product or SKU..."
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </>
        )}

        {activeReport === "products" && (
          <label className="checkbox-line report-checkbox">
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(e) => updateFilter("lowStock", e.target.checked)}
            />
            Low stock only
          </label>
        )}

        {activeReport === "stock" && (
          <>
            <div>
              <label>Movement Type</label>
              <select
                value={filters.movementType}
                onChange={(e) => updateFilter("movementType", e.target.value)}
              >
                <option value="all">All Movements</option>
                <option value="initial_stock">Initial Stock</option>
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
                <option value="set">Set</option>
                <option value="sale">Sale</option>
                <option value="pending_sale">Pending Sale</option>
                <option value="pending_cancel">Pending Cancel</option>
                <option value="refund_return">Refund Return</option>
                <option value="damage">Damage</option>
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
              Suppliers with low stock products only
            </label>
          </>
        )}

        {activeReport === "activity" && (
          <>
            <div>
              <label>Module</label>
              <select
                value={filters.tableName}
                onChange={(e) => updateFilter("tableName", e.target.value)}
              >
                <option value="all">All Modules</option>
                <option value="sales">Sales</option>
                <option value="products">Products</option>
                <option value="suppliers">Suppliers</option>
                <option value="roles">Roles</option>
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
            "Status",
            "Payment",
            "Total",
          ]}
          rows={rows.map((row) => [
            row.sale_number,
            formatDate(row.created_at),
            row.sold_by || "-",
            row.status,
            row.payment_method,
            money(row.total_amount),
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
            "Stock",
            "Qty Sold",
            "Sales Value",
          ]}
          rows={rows.map((row) => [
            row.name,
            row.sku || "-",
            row.category_name || "-",
            row.supplier_name || "-",
            row.stock_quantity,
            row.quantity_sold,
            money(row.sales_value),
          ])}
        />
      );
    }

    if (activeReport === "stock") {
      return (
        <ReportTable
          columns={["Date", "Product", "Type", "Qty", "Reason", "Updated By"]}
          rows={rows.map((row) => [
            formatDate(row.created_at),
            row.product_name || "-",
            row.movement_type,
            row.quantity,
            row.reason || "-",
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
            "Low Stock",
          ]}
          rows={rows.map((row) => [
            row.name,
            row.contact_person || "-",
            row.phone || "-",
            row.product_count,
            row.total_stock,
            row.low_stock_products,
          ])}
        />
      );
    }

    if (activeReport === "activity") {
      return (
        <ReportTable
          columns={["Date", "User", "Role", "Action", "Module"]}
          rows={rows.map((row) => [
            formatDate(row.created_at),
            row.full_name || "-",
            row.role_name || "-",
            row.action,
            row.table_name || "-",
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
            "Qty Sold",
            "Sales Value",
            "Buying Cost",
            "Gross Profit",
          ]}
          rows={rows.map((row) => [
            row.product_name,
            row.sku || "-",
            row.quantity_sold,
            money(row.sales_value),
            money(row.buying_cost),
            money(row.gross_profit),
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
          <p>Generate, view, and print system reports.</p>
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
                <p>Choose filters, generate report, then print if needed.</p>
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

function ReportTable({ columns, rows }) {
  return (
    <div className="table-wrapper">
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
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Reports;