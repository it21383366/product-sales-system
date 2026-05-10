import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  const money = (value) => `$${Number(value || 0).toFixed(2)}`;

  const fetchDashboard = async () => {
    try {
      setError("");
      const response = await api.get("/api/dashboard/overview");
      setDashboard(response.data.dashboard);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const salesLast7Days = dashboard?.salesLast7Days || [];
  const topProducts = dashboard?.topProducts || [];
  const lowStockProducts = dashboard?.lowStockProducts || [];
  const recentActivity = dashboard?.recentActivity || [];

  const maxSales = useMemo(() => {
    return Math.max(
      ...salesLast7Days.map((day) => Number(day.total_sales || 0)),
      1
    );
  }, [salesLast7Days]);

  const formatDateShort = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const cleanAction = (action) => {
    if (!action) return "System activity";

    return String(action)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="dashboard-page">
        <div className="panel">
          <h2>Loading dashboard...</h2>
        </div>
      </div>
    );
  }

  const todaySales = dashboard.todaySales || {};
  const pendingSales = dashboard.pendingSales || {};
  const productStats = dashboard.productStats || {};
  const refundStats = dashboard.refundStats || {};
  const damageStats = dashboard.damageStats || {};

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Business overview, sales performance, stock alerts, and recent activity.</p>
        </div>

        <button className="secondary-btn" onClick={fetchDashboard}>
          Refresh
        </button>
      </div>

      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card highlight">
          <span>Today Sales</span>
          <strong>{money(todaySales.total_sales)}</strong>
          <p>{todaySales.sales_count || 0} completed sale(s) today</p>
        </div>

        <div className="dashboard-kpi-card">
          <span>Cash Collected Today</span>
          <strong>{money(todaySales.cash_total)}</strong>
          <p>Cash payment total</p>
        </div>

        <div className="dashboard-kpi-card">
          <span>Card Collected Today</span>
          <strong>{money(todaySales.card_total)}</strong>
          <p>Card payment total</p>
        </div>

        <div className="dashboard-kpi-card warning">
          <span>Pending Sales</span>
          <strong>{pendingSales.pending_count || 0}</strong>
          <p>{money(pendingSales.balance_total)} still needs to be paid</p>
        </div>

        <div className="dashboard-kpi-card">
          <span>Total Products</span>
          <strong>{productStats.product_count || 0}</strong>
          <p>{productStats.total_stock || 0} total stock units</p>
        </div>

        <div className="dashboard-kpi-card danger">
          <span>Low Stock Products</span>
          <strong>{productStats.low_stock_count || 0}</strong>
          <p>Products at or below alert level</p>
        </div>

        <div className="dashboard-kpi-card danger">
          <span>Refunds Last 30 Days</span>
          <strong>{refundStats.refund_count || 0}</strong>
          <p>{money(refundStats.refund_total)} refunded</p>
        </div>

        <div className="dashboard-kpi-card danger">
          <span>Damages Last 30 Days</span>
          <strong>{damageStats.damage_count || 0}</strong>
          <p>{damageStats.damaged_quantity || 0} damaged item(s)</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel dashboard-chart-panel">
          <div className="table-header">
            <div>
              <h3>Sales Last 7 Days</h3>
              <p>Completed sales only</p>
            </div>
          </div>

          <div className="sales-bar-chart">
            {salesLast7Days.map((day) => {
              const value = Number(day.total_sales || 0);
              const height = Math.max((value / maxSales) * 180, value > 0 ? 12 : 4);

              return (
                <div className="bar-item" key={day.sale_date}>
                  <div className="bar-value">{money(value)}</div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${height}px` }}
                    />
                  </div>
                  <div className="bar-label">{formatDateShort(day.sale_date)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="table-header">
            <div>
              <h3>Top Selling Products</h3>
              <p>Last 30 days</p>
            </div>
          </div>

          <div className="dashboard-list">
            {topProducts.length === 0 && (
              <div className="dashboard-empty">No completed sales yet.</div>
            )}

            {topProducts.map((product, index) => (
              <div className="dashboard-list-row" key={`${product.name}-${index}`}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.sku || "No SKU"}</span>
                </div>

                <div className="dashboard-list-value">
                  <strong>{product.quantity_sold}</strong>
                  <span>{money(product.sales_value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="table-header">
            <div>
              <h3>Low Stock Alerts</h3>
              <p>Products that need attention</p>
            </div>
          </div>

          <div className="dashboard-list">
            {lowStockProducts.length === 0 && (
              <div className="dashboard-empty">No low stock products.</div>
            )}

            {lowStockProducts.map((product) => (
              <div className="dashboard-list-row danger-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.sku || "No SKU"}</span>
                </div>

                <div className="dashboard-list-value">
                  <strong>{product.stock_quantity}</strong>
                  <span>Alert: {product.low_stock_alert}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="table-header">
            <div>
              <h3>Recent System Activity</h3>
              <p>Latest actions recorded in logs</p>
            </div>
          </div>

          <div className="dashboard-activity-list">
            {recentActivity.length === 0 && (
              <div className="dashboard-empty">No recent activity.</div>
            )}

            {recentActivity.map((activity, index) => (
              <div className="dashboard-activity-row" key={index}>
                <div className="activity-dot" />
                <div>
                  <strong>{cleanAction(activity.action)}</strong>
                  <span>
                    {activity.full_name || "System"} · {formatDateTime(activity.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;