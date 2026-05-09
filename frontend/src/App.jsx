import { useEffect, useState } from "react";
import api from "./api/api";
import axios from "axios";
import Products from "./pages/Products";
import Logs from "./pages/Logs";
import Sales from "./pages/Sales";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activePage, setActivePage] = useState("dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settings, setSettings] = useState(null);

  const hasPermission = (permission) => {
    return user?.permissions?.includes(permission);
  };

  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem("token");

      if (!savedToken) {
        setToken(null);
        setUser(null);
        return;
      }

      try {
        const response = await api.get("/api/auth/me");

        setUser(response.data.user);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setToken(null);
        setUser(null);
      }
    };

    verifySession();
  }, []);

  const getPageTitle = () => {
    if (activePage === "dashboard") return "Dashboard";
    if (activePage === "products") return "Products";
    if (activePage === "suppliers") return "Suppliers";
    if (activePage === "new-sale") return "New Sale";
    if (activePage === "users") return "Users";
    if (activePage === "reports") return "Reports";
    if (activePage === "settings") return "Settings";
    if (activePage === "logs") return "Logs";
    return "Dashboard";
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get("/api/settings");
      setSettings(response.data.settings);
    } catch (error) {
      console.error("Failed to load settings", error);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchSettings();
    }
  }, [token, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      const loginToken = response.data.token;
      const loginUser = response.data.user;

      localStorage.setItem("token", loginToken);
      localStorage.setItem("user", JSON.stringify(loginUser));

      setToken(loginToken);
      setUser(loginUser);
      setActivePage("dashboard");
      setTimeout(() => {
        fetchSettings();
      }, 100);
    } catch (error) {
      setError(error.response?.data?.message || "Login failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
    setActivePage("dashboard");
    setUserMenuOpen(false);
  };

  if (!token || !user) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Product Sales System</h1>
          <p>Login to continue</p>

          {error && <div className="error">{error}</div>}

          <label>Email</label>
          <input
            type="email"
            value={email}
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <h1>{settings?.name || user.organisationName}</h1>
        </div>

        <div className="header-user-area">
          <div className="header-user-text">
            <span>
              {user.fullName} - {user.role}
            </span>
          </div>

          <div className="user-menu">
            <button
              className="user-avatar-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              👤
            </button>

            {userMenuOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-info">
                  <strong>{user.fullName}</strong>
                  <span>{user.role}</span>
                </div>

                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <nav>
            {hasPermission("dashboard.view") && (
              <button
                className={`nav-link ${
                  activePage === "dashboard" ? "active" : ""
                }`}
                onClick={() => setActivePage("dashboard")}
              >
                Dashboard
              </button>
            )}

            {hasPermission("products.view") && (
              <button
                className={`nav-link ${
                  activePage === "products" ? "active" : ""
                }`}
                onClick={() => setActivePage("products")}
              >
                Products
              </button>
            )}

            {hasPermission("suppliers.view") && (
              <button
                className={`nav-link ${
                  activePage === "suppliers" ? "active" : ""
                }`}
                onClick={() => setActivePage("suppliers")}
              >
                Suppliers
              </button>
            )}

            {hasPermission("sales.create") && (
              <button
                className={`nav-link ${
                  activePage === "new-sale" ? "active" : ""
                }`}
                onClick={() => setActivePage("new-sale")}
              >
                New Sale
              </button>
            )}

            {hasPermission("users.view") && (
              <button
                className={`nav-link ${activePage === "users" ? "active" : ""}`}
                onClick={() => setActivePage("users")}
              >
                Users
              </button>
            )}

            {hasPermission("reports.view") && (
              <button
                className={`nav-link ${
                  activePage === "reports" ? "active" : ""
                }`}
                onClick={() => setActivePage("reports")}
              >
                Reports
              </button>
            )}

            {hasPermission("settings.manage") && (
              <button
                className={`nav-link ${
                  activePage === "settings" ? "active" : ""
                }`}
                onClick={() => setActivePage("settings")}
              >
                Settings
              </button>
            )}

            {hasPermission("dashboard.view") && (
              <button
                className={`nav-link ${activePage === "logs" ? "active" : ""}`}
                onClick={() => setActivePage("logs")}
              >
                Logs
              </button>
            )}
          </nav>
        </aside>

        <main className="main-content">
          <section className="page-title">
            <h2>{getPageTitle()}</h2>
          </section>

          {activePage === "dashboard" && (
            <>
              <section className="cards">
                <div className="card">
                  <h3>Organisation</h3>
                  <p>{user.organisationName}</p>
                </div>

                <div className="card">
                  <h3>Your Role</h3>
                  <p>{user.role}</p>
                </div>

                <div className="card">
                  <h3>Permissions</h3>
                  <p>{user.permissions.length} active</p>
                </div>
              </section>

              <section className="panel">
                <h2>Role Based Access</h2>

                <div className="permission-list">
                  {user.permissions.map((permission) => (
                    <span key={permission}>{permission}</span>
                  ))}
                </div>
              </section>
            </>
          )}

          {activePage === "products" && <Products />}

          {activePage === "suppliers" && (
            <section className="panel">
              <h2>Suppliers</h2>
              <p>Suppliers page coming next.</p>
            </section>
          )}

          {activePage === "new-sale" && <Sales />}

          {activePage === "users" && (
            <section className="panel">
              <h2>Users</h2>
              <p>User management page coming soon.</p>
            </section>
          )}

          {activePage === "reports" && (
            <section className="panel">
              <h2>Reports</h2>
              <p>Reports page coming soon.</p>
            </section>
          )}

          {activePage === "settings" && (
            <section className="panel">
              <h2>Settings</h2>
              <p>Settings page coming soon.</p>
            </section>
          )}

          {activePage === "logs" && <Logs />}
        </main>
      </div>

      <footer className="app-footer">
        <div>{settings?.name || user.organisationName}</div>

        <div>
          Address: {settings?.address || "Not added"}
        </div>

        <div>
          Contact us: {settings?.phone || settings?.email || "Not added"}
        </div>

        <p>
          © {new Date().getFullYear()} Sasanka Dahanayake. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default App;