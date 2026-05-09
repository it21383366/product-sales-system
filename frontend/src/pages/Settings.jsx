import { useEffect, useState } from "react";
import api from "../api/api";

function Settings({ onSettingsUpdated }) {
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [showReviewModal, setShowReviewModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    currency: "AUD",
    invoicePrefix: "INV",
    themeColor: "#2563eb",
  });

  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = savedUser.permissions || [];

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const fetchSettings = async () => {
    try {
      setError("");

      const response = await api.get("/api/settings");
      const data = response.data.settings;

      setSettings(data);

      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        currency: data.currency || "AUD",
        invoicePrefix: data.invoice_prefix || "INV",
        themeColor: data.theme_color || "#2563eb",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settings");
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleReview = (e) => {
    e.preventDefault();
    setModalError("");

    if (!form.name.trim()) {
      setModalError("Store name is required");
      return;
    }

    if (!form.invoicePrefix.trim()) {
      setModalError("Invoice prefix is required");
      return;
    }

    if (!form.currency.trim()) {
      setModalError("Currency is required");
      return;
    }

    setShowReviewModal(true);
  };

  const handleSaveSettings = async () => {
    try {
      setModalError("");
      setError("");
      setMessage("");

      const response = await api.patch("/api/settings", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        currency: form.currency,
        invoicePrefix: form.invoicePrefix,
        themeColor: form.themeColor,
        });

        setMessage("Settings updated successfully");
        setShowReviewModal(false);

        const updatedSettings = response.data.settings;

        setSettings(updatedSettings);

        setForm({
        name: updatedSettings.name || "",
        email: updatedSettings.email || "",
        phone: updatedSettings.phone || "",
        address: updatedSettings.address || "",
        currency: updatedSettings.currency || "AUD",
        invoicePrefix: updatedSettings.invoice_prefix || "INV",
        themeColor: updatedSettings.theme_color || "#2563eb",
        });

        if (onSettingsUpdated) {
        onSettingsUpdated();
        }
    } catch (err) {
      setShowReviewModal(false);
      setModalError(err.response?.data?.message || "Failed to update settings");
    }
  };

  if (!hasPermission("settings.manage")) {
    return (
      <div className="settings-page">
        <div className="panel">
          <h2>Settings</h2>
          <p className="settings-muted">
            You do not have permission to manage settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Manage store details, receipt details, and system preferences.</p>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="settings-grid">
        <section className="panel settings-form-panel">
          <div className="settings-section-title">
            <h3>Store Information</h3>
            <p>This information appears on the header, footer, and receipts.</p>
          </div>

          {modalError && <div className="modal-error">{modalError}</div>}

          <form className="product-form" onSubmit={handleReview}>
            <label>Store Name *</label>
            <input
              name="name"
              value={form.name}
              placeholder="Example: Test Business"
              onChange={handleChange}
              required
            />

            <label>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              placeholder="store@example.com"
              onChange={handleChange}
            />

            <label>Phone</label>
            <input
              name="phone"
              value={form.phone}
              placeholder="0400 000 000"
              onChange={handleChange}
            />

            <label>Address</label>
            <textarea
              name="address"
              value={form.address}
              placeholder="Store address"
              onChange={handleChange}
            />

            <div className="form-row">
              <div>
                <label>Currency *</label>
                <input
                  name="currency"
                  value={form.currency}
                  placeholder="AUD"
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label>Invoice Prefix *</label>
                <input
                  name="invoicePrefix"
                  value={form.invoicePrefix}
                  placeholder="INV"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <label>Theme Color</label>
            <input
              name="themeColor"
              type="color"
              value={form.themeColor}
              onChange={handleChange}
              className="color-input"
            />

            <div className="modal-actions">
              <button type="submit" className="primary-btn">
                Review Settings
              </button>
            </div>
          </form>
        </section>

        <section className="panel settings-preview-panel">
          <div className="settings-section-title">
            <h3>Live Preview</h3>
            <p>How your store details will appear.</p>
          </div>

          <div className="settings-preview-card">
            <span>Store Name</span>
            <strong>{form.name || "Not added"}</strong>
          </div>

          <div className="settings-preview-card">
            <span>Address</span>
            <strong>{form.address || "Not added"}</strong>
          </div>

          <div className="settings-preview-card">
            <span>Contact</span>
            <strong>{form.phone || form.email || "Not added"}</strong>
          </div>

          <div className="settings-preview-card">
            <span>Invoice Example</span>
            <strong>{form.invoicePrefix || "INV"}-00001</strong>
          </div>

          <div className="settings-preview-card">
            <span>Currency</span>
            <strong>{form.currency || "AUD"}</strong>
          </div>

          <div className="receipt-preview">
            <h4>{form.name || "Store Name"}</h4>
            <p>{form.address || "Store address"}</p>
            <p>{form.phone || form.email || "Contact details"}</p>
            <hr />
            <p>Sale: {form.invoicePrefix || "INV"}-00001</p>
            <p>Total: {form.currency || "AUD"} 25.00</p>
            <hr />
            <p>Thank you for your purchase!</p>
          </div>
        </section>
      </div>

      {showReviewModal && (
        <div className="modal-overlay">
          <div className="review-modal">
            <h3>Confirm Settings Update</h3>
            <p>Please verify the store settings before saving.</p>

            <div className="review-grid">
              <div>
                <span>Store Name</span>
                <strong>{form.name || "-"}</strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{form.email || "-"}</strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>{form.phone || "-"}</strong>
              </div>

              <div>
                <span>Currency</span>
                <strong>{form.currency || "-"}</strong>
              </div>

              <div>
                <span>Invoice Prefix</span>
                <strong>{form.invoicePrefix || "-"}</strong>
              </div>

              <div>
                <span>Theme Color</span>
                <strong>{form.themeColor || "-"}</strong>
              </div>

              <div className="review-full">
                <span>Address</span>
                <strong>{form.address || "-"}</strong>
              </div>
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
                onClick={handleSaveSettings}
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;