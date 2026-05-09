const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/", (req, res) => {
  res.send("Product Sales Backend API is running");
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      message: "Backend and database connected",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.get("/api/setup-database", async (req, res) => {
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS organisations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        logo_url TEXT,
        currency VARCHAR(10) DEFAULT 'AUD',
        tax_name VARCHAR(50) DEFAULT 'GST',
        tax_rate NUMERIC(5,2) DEFAULT 10.00,
        invoice_prefix VARCHAR(50) DEFAULT 'INV',
        theme_color VARCHAR(20) DEFAULT '#2563eb',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_system_role BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        barcode VARCHAR(100),
        description TEXT,
        buying_price NUMERIC(12,2) DEFAULT 0,
        selling_price NUMERIC(12,2) NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        low_stock_alert INTEGER DEFAULT 5,
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        sale_number VARCHAR(100) NOT NULL,
        subtotal NUMERIC(12,2) DEFAULT 0,
        discount_amount NUMERIC(12,2) DEFAULT 0,
        tax_amount NUMERIC(12,2) DEFAULT 0,
        total_amount NUMERIC(12,2) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cash',
        status VARCHAR(30) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(12,2) NOT NULL,
        total_price NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        movement_type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        reason TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        table_name VARCHAR(100),
        record_id UUID,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const permissions = [
      ["dashboard.view", "View Dashboard"],
      ["settings.manage", "Manage Settings"],

      ["users.view", "View Users"],
      ["users.create", "Create Users"],
      ["users.edit", "Edit Users"],
      ["users.delete", "Delete Users"],

      ["roles.manage", "Manage Roles"],

      ["products.view", "View Products"],
      ["products.create", "Create Products"],
      ["products.edit", "Edit Products"],
      ["products.delete", "Delete Products"],

      ["suppliers.view", "View Suppliers"],
      ["suppliers.create", "Create Suppliers"],
      ["suppliers.edit", "Edit Suppliers"],
      ["suppliers.delete", "Delete Suppliers"],

      ["sales.view", "View Sales"],
      ["sales.create", "Create Sales"],
      ["sales.refund", "Refund Sales"],

      ["reports.view", "View Reports"],
    ];

    for (const permission of permissions) {
      await pool.query(
        `
        INSERT INTO permissions (code, name)
        VALUES ($1, $2)
        ON CONFLICT (code) DO NOTHING
        `,
        permission
      );
    }

    res.json({
      status: "success",
      message: "Database tables created successfully",
    });
  } catch (error) {
    console.error("Setup database error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database setup failed",
      error: error.message,
    });
  }
});

app.post("/api/auth/register-organisation", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      organisationName,
      organisationEmail,
      organisationPhone,
      organisationAddress,
      adminFullName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!organisationName || !adminFullName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        status: "error",
        message: "Organisation name, admin name, admin email, and password are required",
      });
    }

    if (adminPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters",
      });
    }

    await client.query("BEGIN");

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: "A user with this email already exists",
      });
    }

    const organisationResult = await client.query(
      `
      INSERT INTO organisations (name, email, phone, address)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        organisationName,
        organisationEmail || null,
        organisationPhone || null,
        organisationAddress || null,
      ]
    );

    const organisation = organisationResult.rows[0];

    const adminRoleResult = await client.query(
      `
      INSERT INTO roles (organisation_id, name, description, is_system_role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        organisation.id,
        "Admin",
        "Full access administrator role",
        true,
      ]
    );

    const adminRole = adminRoleResult.rows[0];

    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, id FROM permissions
      ON CONFLICT (role_id, permission_id) DO NOTHING
      `,
      [adminRole.id]
    );

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminUserResult = await client.query(
      `
      INSERT INTO users (
        organisation_id,
        role_id,
        full_name,
        email,
        password_hash,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING id, organisation_id, role_id, full_name, email, status, created_at
      `,
      [
        organisation.id,
        adminRole.id,
        adminFullName,
        adminEmail,
        passwordHash,
      ]
    );

    const adminUser = adminUserResult.rows[0];

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Organisation and admin user created successfully",
      organisation,
      user: adminUser,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Register organisation error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to register organisation",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const userResult = await pool.query(
      `
      SELECT 
        users.id,
        users.organisation_id,
        users.role_id,
        users.full_name,
        users.email,
        users.password_hash,
        users.status,
        roles.name AS role_name,
        organisations.name AS organisation_name
      FROM users
      LEFT JOIN roles ON users.role_id = roles.id
      LEFT JOIN organisations ON users.organisation_id = organisations.id
      WHERE users.email = $1
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const user = userResult.rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        status: "error",
        message: "Your account is deactivated. Please contact admin.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const permissionResult = await pool.query(
      `
      SELECT permissions.code
      FROM role_permissions
      JOIN permissions ON role_permissions.permission_id = permissions.id
      WHERE role_permissions.role_id = $1
      `,
      [user.role_id]
    );

    const permissions = permissionResult.rows.map((row) => row.code);

    const token = jwt.sign(
      {
        userId: user.id,
        organisationId: user.organisation_id,
        roleId: user.role_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    res.json({
      status: "success",
      message: "Login successful",
      token,
      user: {
        id: user.id,
        organisationId: user.organisation_id,
        organisationName: user.organisation_name,
        fullName: user.full_name,
        email: user.email,
        role: user.role_name,
        permissions,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Login failed",
      error: error.message,
    });
  }
});

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await pool.query(
      `
      SELECT 
        users.id,
        users.organisation_id,
        users.role_id,
        users.full_name,
        users.email,
        users.status,
        roles.name AS role_name,
        organisations.name AS organisation_name
      FROM users
      LEFT JOIN roles ON users.role_id = roles.id
      LEFT JOIN organisations ON users.organisation_id = organisations.id
      WHERE users.id = $1
      `,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        status: "error",
        message: "Your account is deactivated",
      });
    }

    const permissionResult = await pool.query(
      `
      SELECT permissions.code
      FROM role_permissions
      JOIN permissions ON role_permissions.permission_id = permissions.id
      WHERE role_permissions.role_id = $1
      `,
      [user.role_id]
    );

    user.permissions = permissionResult.rows.map((row) => row.code);

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
};

const requirePermission = (permissionCode) => {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to perform this action",
        requiredPermission: permissionCode,
      });
    }

    next();
  };
};

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.json({
    status: "success",
    user: {
      id: req.user.id,
      organisationId: req.user.organisation_id,
      organisationName: req.user.organisation_name,
      fullName: req.user.full_name,
      email: req.user.email,
      role: req.user.role_name,
      permissions: req.user.permissions,
    },
  });
});

app.get(
  "/api/protected-test",
  authMiddleware,
  requirePermission("dashboard.view"),
  async (req, res) => {
    res.json({
      status: "success",
      message: "You are authenticated and allowed to view dashboard",
      user: {
        name: req.user.full_name,
        role: req.user.role_name,
        organisation: req.user.organisation_name,
      },
    });
  }
);


const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (error) => {
  console.error("Server error:", error);
});