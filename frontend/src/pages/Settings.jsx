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
    logoUrl: "",
    iconUrl: "",
    currency: "AUD",
    invoicePrefix: "INV",
  });

  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = savedUser.permissions || [];

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const applyBrowserBranding = (settingsData) => {
    if (!settingsData) return;

    document.title = settingsData.name || "Product Sales System";

    const baseURL = api.defaults.baseURL || "";
    const iconUrl = settingsData.icon_url
      ? `${baseURL}${settingsData.icon_url}`
      : "/icons.svg";

    let favicon = document.querySelector("link[rel='icon']");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    favicon.href = iconUrl;
  };

  const fetchSettings = async () => {
    try {
      setError("");

      const response = await api.get("/api/settings");
      const data = response.data.settings;

      setSettings(data);
      applyBrowserBranding(data);

      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        logoUrl: data.logo_url || "",
        iconUrl: data.icon_url || "",
        currency: data.currency || "AUD",
        invoicePrefix: data.invoice_prefix || "INV",
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

  const handleIconUpload = async (e) => {
    try {
      setError("");
      setMessage("");

      const file = e.target.files[0];

      if (!file) {
        return;
      }

      const formData = new FormData();
      formData.append("icon", file);

      const response = await api.post("/api/settings/upload-icon", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const iconUrl = response.data.iconUrl;
      const updatedSettings = response.data.settings;

      setForm((current) => ({
        ...current,
        iconUrl,
      }));

      setSettings(updatedSettings);

      if (onSettingsUpdated) {
        onSettingsUpdated(updatedSettings);
      }

      applyBrowserBranding(updatedSettings);

      setMessage("Browser tab icon uploaded successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload icon");
    }
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
        logoUrl: form.logoUrl,
        iconUrl: form.iconUrl,
        currency: form.currency,
        invoicePrefix: form.invoicePrefix,
      });

      const updatedSettings = response.data.settings;

      setSettings(updatedSettings);
      applyBrowserBranding(updatedSettings);

      setForm({
        name: updatedSettings.name || "",
        email: updatedSettings.email || "",
        phone: updatedSettings.phone || "",
        address: updatedSettings.address || "",
        logoUrl: updatedSettings.logo_url || "",
        iconUrl: updatedSettings.icon_url || "",
        currency: updatedSettings.currency || "AUD",
        invoicePrefix: updatedSettings.invoice_prefix || "INV",
      });

      if (onSettingsUpdated) {
        onSettingsUpdated(updatedSettings);
      }

      setMessage("Settings updated successfully");
      setShowReviewModal(false);
    } catch (err) {
      setShowReviewModal(false);
      setModalError(err.response?.data?.message || "Failed to update settings");
    }
  };

  const iconPreviewUrl = form.iconUrl
    ? `${api.defaults.baseURL || ""}${form.iconUrl}`
    : "";

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
            <p>This information appears on the header, footer, receipts, and browser tab.</p>
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

            <label>Browser Tab Icon</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/x-icon"
              onChange={handleIconUpload}
            />

            {form.iconUrl && (
              <div className="settings-icon-preview">
                <img src={iconPreviewUrl} alt="Store browser tab icon" />
                <div>
                  <strong>Current browser tab icon</strong>
                  <span>{form.iconUrl}</span>
                </div>
              </div>
            )}

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
            <span>Browser Tab Icon</span>
            {form.iconUrl ? (
              <div className="settings-mini-icon-row">
                <img src={iconPreviewUrl} alt="Browser icon preview" />
                <strong>Added</strong>
              </div>
            ) : (
              <strong>Not added</strong>
            )}
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
                <span>Browser Tab Icon</span>
                <strong>{form.iconUrl ? "Added" : "Not added"}</strong>
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