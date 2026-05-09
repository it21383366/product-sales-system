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

      setLogs(response.data.logs);
      setPagination(response.data.pagination);
      setPage(response.data.pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load logs");
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [tableName]);

  const formatDetails = (log) => {
    const details = log.details || {};

    if (log.action === "updated stock") {
      return `Updated ${details.productName || "product"} | ${details.movementType} ${details.quantity} | Before: ${details.previousStock} | After: ${details.newStock} | Reason: ${details.reason || "No reason"}`;
    }

    if (log.action === "created product") {
      return `Created product: ${details.productName || "Unknown product"}`;
    }

    return JSON.stringify(details);
  };

  return (
    <div className="logs-page">
      <div className="page-header">
        <div>
          <h2>System Logs</h2>
          <p>View all recorded activities with pagination.</p>
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
            <option value="users">User Logs</option>
            <option value="suppliers">Supplier Logs</option>
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

        <div className="table-wrapper">
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
                    <span className="badge neutral">{log.action}</span>
                  </td>
                  <td>{log.table_name || "-"}</td>
                  <td>{formatDetails(log)}</td>
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