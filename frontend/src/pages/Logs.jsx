import { useEffect, useState } from "react";
import api from "../api/api";

const LOGS_PER_PAGE = 25;

function Logs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: LOGS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });
  const [tableName, setTableName] = useState("");
  const [error, setError] = useState("");

  const fetchLogs = async (pageNumber = page) => {
    try {
      setError("");

      const response = await api.get("/api/audit-logs", {
        params: {
          page: pageNumber,
          limit: LOGS_PER_PAGE,
          tableName: tableName || undefined,
        },
      });

      setLogs(response.data.logs || []);
      setPagination(
        response.data.pagination || {
          page: 1,
          limit: LOGS_PER_PAGE,
          total: 0,
          totalPages: 1,
        }
      );
      setPage(response.data.pagination?.page || 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load logs");
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  const money = (value) => `$${Number(value || 0).toFixed(2)}`;

  const labelText = (value) => {
    if (!value) return "-";

    return String(value)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const parseDetails = (details) => {
    if (!details) return {};

    if (typeof details === "object") {
      return details;
    }

    try {
      return JSON.parse(details);
    } catch {
      return {
        rawMessage: String(details),
      };
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      "created product": "Created Product",
      "deleted product": "Deleted Product",
      "edited product listing": "Edited Product Listing",
      "updated stock": "Updated Stock",
      "added stock batch to existing product": "Added Stock Batch",

      "created sale": "Created Sale",
      "created pending sale": "Created Pending Sale",
      "completed pending sale": "Completed Pending Sale",
      "cancelled pending sale": "Cancelled Pending Sale",
      "edited sale": "Edited Sale",

      "created refund": "Created Refund",
      "added damaged item": "Added Damaged Item",

      "created supplier": "Created Supplier",
      "updated supplier": "Updated Supplier",
      "deleted supplier": "Deleted Supplier",

      "created user": "Created User",
      "updated user": "Updated User",
      "deleted user": "Deleted User",

      "updated role permissions": "Updated Role Permissions",
      "updated settings": "Updated Settings",
    };

    return labels[action] || labelText(action);
  };

  const getAreaLabel = (area) => {
    const labels = {
      products: "Products",
      sales: "Sales",
      sale_items: "Sale Items",
      suppliers: "Suppliers",
      users: "Users",
      roles: "User Privileges",
      refunds: "Refunds",
      refund_items: "Refund Items",
      damaged_items: "Damaged Items",
      stock_movements: "Stock Movements",
      settings: "Settings",
      organisations: "Organisation",
    };

    return labels[area] || labelText(area);
  };

  const getReadableSummary = (log) => {
    const details = parseDetails(log.details);

    if (details.rawMessage) {
      return details.rawMessage;
    }

    switch (log.action) {
      case "created product":
        return `Product created: ${details.productName || "Unknown product"}`;

      case "deleted product":
        return `Product deleted: ${
          details.productName || "Unknown product"
        }${details.sku ? ` (${details.sku})` : ""}`;

      case "edited product listing":
        return `Product listing updated: ${
          details.productName || "Unknown product"
        }`;

      case "updated stock":
        return `Stock updated for ${
          details.productName || "product"
        }. ${labelText(details.movementType)} ${details.quantity || 0} item(s).`;

      case "added stock batch to existing product":
        return `New stock batch added for ${
          details.productName || "product"
        }. Quantity: ${details.quantity || 0}.`;

      case "created sale":
        return `Completed sale created: ${
          details.saleNumber || "-"
        }. Total: ${money(details.totalAmount)}.`;

      case "created pending sale":
        return `Pending sale created: ${
          details.saleNumber || "-"
        }. Advance: ${money(details.advanceAmount)}. Balance: ${money(
          details.balanceAmount
        )}.`;

      case "completed pending sale":
        return `Pending sale completed: ${
          details.saleNumber || "-"
        }. Final payment: ${labelText(details.finalPaymentMethod)}.`;

      case "cancelled pending sale":
        return `Pending sale cancelled: ${
          details.saleNumber || "-"
        }. Advance returned: ${money(details.advanceAmount)}.`;

      case "edited sale":
        return `Sale edited: ${
          details.saleNumber || "-"
        }. Previous total: ${money(details.previousTotal)}. New total: ${money(
          details.newTotal
        )}.`;

      case "created refund":
        return `Refund created: ${
          details.refundNumber || "-"
        } for sale ${details.saleNumber || "-"}. Amount: ${money(
          details.totalRefundAmount
        )}.`;

      case "added damaged item":
        return `Damaged item recorded: ${
          details.productName || "product"
        }. Quantity: ${details.quantity || 0}.`;

      case "created supplier":
        return `Supplier created: ${details.supplierName || details.name || "-"}`;

      case "updated supplier":
        return `Supplier updated: ${details.supplierName || details.name || "-"}`;

      case "deleted supplier":
        return `Supplier deleted: ${details.supplierName || details.name || "-"}`;

      case "updated role permissions":
        return `Role permissions updated${
          details.roleName ? ` for ${details.roleName}` : ""
        }.`;

      default:
        if (details.productName) {
          return `${getActionLabel(log.action)}: ${details.productName}`;
        }

        if (details.saleNumber) {
          return `${getActionLabel(log.action)}: ${details.saleNumber}`;
        }

        return `${getActionLabel(log.action)} in ${getAreaLabel(
          log.table_name
        )}.`;
    }
  };

  const getDetailRows = (log) => {
    const details = parseDetails(log.details);

    if (details.rawMessage) {
      return [["Message", details.rawMessage]];
    }

    switch (log.action) {
      case "created product":
        return [
          ["Product", details.productName],
          ["SKU", details.sku],
          ["Selling Price", details.sellingPrice && money(details.sellingPrice)],
          ["Buying Price", details.buyingPrice && money(details.buyingPrice)],
          ["Stock", details.stockQuantity],
        ];

      case "deleted product":
        return [
          ["Product", details.productName],
          ["SKU", details.sku],
          ["Soft Delete", details.softDelete ? "Yes" : "No"],
        ];

      case "updated stock":
        return [
          ["Product", details.productName],
          ["Movement", labelText(details.movementType)],
          ["Quantity", details.quantity],
          ["Before", details.previousStock],
          ["After", details.newStock],
          ["Reason", details.reason || "No reason added"],
        ];

      case "added stock batch to existing product":
        return [
          ["Product", details.productName],
          ["Quantity", details.quantity],
          ["Selling Price", money(details.sellingPrice)],
          ["Buying Price", money(details.buyingPrice)],
          ["Supplier", details.supplierName],
          ["Note", details.batchNote],
        ];

      case "created sale":
      case "created pending sale":
        return [
          ["Sale No", details.saleNumber],
          ["Status", labelText(details.status)],
          ["Payment", labelText(details.paymentMethod)],
          ["Total", money(details.totalAmount)],
          ["Advance", money(details.advanceAmount)],
          ["Balance", money(details.balanceAmount)],
          ["Cash", money(details.cashAmount)],
          ["Card", money(details.cardAmount)],
        ];

      case "completed pending sale":
        return [
          ["Sale No", details.saleNumber],
          ["Final Payment", labelText(details.finalPaymentMethod)],
          ["Cash", money(details.cashAmount)],
          ["Card", money(details.cardAmount)],
        ];

      case "cancelled pending sale":
        return [
          ["Sale No", details.saleNumber],
          ["Total", money(details.totalAmount)],
          ["Advance Returned", money(details.advanceAmount)],
          ["Returned Items", details.returnedItems],
          ["Reason", details.reason || "No reason added"],
        ];

      case "edited sale":
        return [
          ["Sale No", details.saleNumber],
          ["Previous Total", money(details.previousTotal)],
          ["New Total", money(details.newTotal)],
          ["Old Items", details.oldItemCount],
          ["New Items", details.newItemCount],
          ["Reason", details.reason || "No reason added"],
        ];

      case "created refund":
        return [
          ["Refund No", details.refundNumber],
          ["Sale No", details.saleNumber],
          ["Refund Type", labelText(details.refundType)],
          ["Receipt Received", details.receiptReceived ? "Yes" : "No"],
          ["Refund Amount", money(details.totalRefundAmount)],
          ["Reason", details.reason || "No reason added"],
        ];

      case "added damaged item":
        return [
          ["Product", details.productName],
          ["Quantity", details.quantity],
          ["Damage Source", details.damageSource],
          ["Reason", details.reason || "No reason added"],
          ["Remark", details.remark],
        ];

      default:
        return Object.entries(details).map(([key, value]) => [
          labelText(key),
          typeof value === "object" ? JSON.stringify(value) : value,
        ]);
    }
  };

  const renderDetails = (log) => {
    const rows = getDetailRows(log).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    );

    return (
      <div className="log-readable-details">
        <strong>{getReadableSummary(log)}</strong>

        {rows.length > 0 && (
          <div className="log-detail-grid-inline">
            {rows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <b>{String(value)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="logs-page">
      <div className="page-header">
        <div>
          <h2>System Logs</h2>
          <p>View all recorded activities with clear explanations.</p>
        </div>

        <div className="search-box">
          <select
            value={tableName}
            onChange={(e) => {
              setTableName(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Logs</option>
            <option value="products">Product Logs</option>
            <option value="sales">Sales Logs</option>
            <option value="refunds">Refund Logs</option>
            <option value="damaged_items">Damaged Item Logs</option>
            <option value="users">User Logs</option>
            <option value="suppliers">Supplier Logs</option>
            <option value="roles">Privilege Logs</option>
            <option value="settings">Settings Logs</option>
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="panel table-panel">
        <div className="table-header">
          <div>
            <h3>Activity History</h3>
            <p>
              {pagination.total} logs found · Page {pagination.page} of{" "}
              {pagination.totalPages}
            </p>
          </div>
        </div>

        <div className="table-wrapper logs-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Area</th>
                <th>Details</th>
                <th>Date / Time</th>
              </tr>
            </thead>

            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan="6">No logs found</td>
                </tr>
              )}

              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.full_name || "Unknown User"}</td>
                  <td>{log.role_name || "Unknown Role"}</td>
                  <td>
                    <span className="badge neutral">
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td>{getAreaLabel(log.table_name)}</td>
                  <td>{renderDetails(log)}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <button
            className="secondary-btn"
            disabled={page === 1}
            onClick={() => fetchLogs(page - 1)}
          >
            Previous
          </button>

          <span>
            Showing page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            className="secondary-btn"
            disabled={page === pagination.totalPages}
            onClick={() => fetchLogs(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Logs;