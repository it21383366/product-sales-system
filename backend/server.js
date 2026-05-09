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

      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0;

      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS card_amount NUMERIC(12,2) DEFAULT 0;

      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS edit_reason TEXT;
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

// Get all users in the logged-in user's organisation
app.get(
  "/api/users",
  authMiddleware,
  requirePermission("users.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT 
          users.id,
          users.full_name,
          users.email,
          users.phone,
          users.status,
          users.created_at,
          users.last_login,
          roles.name AS role_name
        FROM users
        LEFT JOIN roles ON users.role_id = roles.id
        WHERE users.organisation_id = $1
        ORDER BY users.created_at DESC
        `,
        [req.user.organisation_id]
      );

      res.json({
        status: "success",
        users: result.rows,
      });
    } catch (error) {
      console.error("Get users error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get users",
        error: error.message,
      });
    }
  }
);

const getRoleLevel = (roleName) => {
  const levels = {
    Admin: 1,
    Manager: 2,
    Cashier: 3,
    "Inventory Staff": 3,
  };

  return levels[roleName] || 99;
};

const canAssignRole = (currentUserRole, targetRoleName) => {
  const currentLevel = getRoleLevel(currentUserRole);
  const targetLevel = getRoleLevel(targetRoleName);

  // Admin can assign any role
  if (currentUserRole === "Admin") {
    return true;
  }

  // Others can only assign roles lower than themselves
  return targetLevel > currentLevel;
};

// Create a new user/employee
app.post(
  "/api/users",
  authMiddleware,
  requirePermission("users.create"),
  async (req, res) => {
    try {
      const { fullName, email, password, phone, roleId } = req.body;

      if (!fullName || !email || !password || !roleId) {
        return res.status(400).json({
          status: "error",
          message: "Full name, email, password, and role are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          status: "error",
          message: "Password must be at least 6 characters",
        });
      }

      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          status: "error",
          message: "A user with this email already exists",
        });
      }

      const roleCheck = await pool.query(
        `
        SELECT id, name
        FROM roles
        WHERE id = $1 AND organisation_id = $2
        `,
        [roleId, req.user.organisation_id]
      );

      if (roleCheck.rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Invalid role selected",
        });
      }

      const selectedRole = roleCheck.rows[0];

      if (!canAssignRole(req.user.role_name, selectedRole.name)) {
        return res.status(403).json({
          status: "error",
          message: `You cannot create a ${selectedRole.name} user`,
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `
        INSERT INTO users (
          organisation_id,
          role_id,
          full_name,
          email,
          password_hash,
          phone,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING id, organisation_id, role_id, full_name, email, phone, status, created_at
        `,
        [
          req.user.organisation_id,
          roleId,
          fullName,
          email,
          passwordHash,
          phone || null,
        ]
      );

      res.status(201).json({
        status: "success",
        message: "User created successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Create user error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to create user",
        error: error.message,
      });
    }
  }
);

// Update user details
app.patch(
  "/api/users/:id",
  authMiddleware,
  requirePermission("users.edit"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { fullName, phone, roleId } = req.body;

      const userCheck = await pool.query(
        `
        SELECT id FROM users
        WHERE id = $1 AND organisation_id = $2
        `,
        [id, req.user.organisation_id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      if (roleId) {
        const roleCheck = await pool.query(
          `
          SELECT id, name
          FROM roles
          WHERE id = $1 AND organisation_id = $2
          `,
          [roleId, req.user.organisation_id]
        );

        if (roleCheck.rows.length === 0) {
          return res.status(400).json({
            status: "error",
            message: "Invalid role selected",
          });
        }

        const selectedRole = roleCheck.rows[0];

        if (!canAssignRole(req.user.role_name, selectedRole.name)) {
          return res.status(403).json({
            status: "error",
            message: `You cannot create a ${selectedRole.name} user`,
          });
        }
      }

      const result = await pool.query(
        `
        UPDATE users
        SET 
          full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          role_id = COALESCE($3, role_id),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND organisation_id = $5
        RETURNING id, organisation_id, role_id, full_name, email, phone, status, updated_at
        `,
        [
          fullName || null,
          phone || null,
          roleId || null,
          id,
          req.user.organisation_id,
        ]
      );

      res.json({
        status: "success",
        message: "User updated successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Update user error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to update user",
        error: error.message,
      });
    }
  }
);

// Activate or deactivate user
app.patch(
  "/api/users/:id/status",
  authMiddleware,
  requirePermission("users.edit"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Status must be active or inactive",
        });
      }

      if (id === req.user.id) {
        return res.status(400).json({
          status: "error",
          message: "You cannot change your own status",
        });
      }

      const result = await pool.query(
        `
        UPDATE users
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND organisation_id = $3
        RETURNING id, full_name, email, status
        `,
        [status, id, req.user.organisation_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        message: `User ${status === "active" ? "activated" : "deactivated"} successfully`,
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Update user status error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to update user status",
        error: error.message,
      });
    }
  }
);

// Delete user
app.delete(
  "/api/users/:id",
  authMiddleware,
  requirePermission("users.delete"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (id === req.user.id) {
        return res.status(400).json({
          status: "error",
          message: "You cannot delete your own account",
        });
      }

      const result = await pool.query(
        `
        DELETE FROM users
        WHERE id = $1 AND organisation_id = $2
        RETURNING id, full_name, email
        `,
        [id, req.user.organisation_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        message: "User deleted successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Delete user error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to delete user",
        error: error.message,
      });
    }
  }
);

// Get roles for current organisation
app.get(
  "/api/roles",
  authMiddleware,
  requirePermission("users.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT id, name, description, is_system_role, created_at
        FROM roles
        WHERE organisation_id = $1
        ORDER BY name ASC
        `,
        [req.user.organisation_id]
      );

      res.json({
        status: "success",
        roles: result.rows,
      });
    } catch (error) {
      console.error("Get roles error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get roles",
        error: error.message,
      });
    }
  }
);

// Create / sync default roles for current organisation
app.post(
  "/api/roles/create-defaults",
  authMiddleware,
  requirePermission("roles.manage"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const defaultRoles = [
        {
          name: "Admin",
          description: "Full access administrator role",
          permissions: [
            "dashboard.view",
            "settings.manage",

            "users.view",
            "users.create",
            "users.edit",
            "users.delete",

            "roles.manage",

            "products.view",
            "products.create",
            "products.edit",
            "products.delete",

            "suppliers.view",
            "suppliers.create",
            "suppliers.edit",
            "suppliers.delete",

            "sales.view",
            "sales.create",
            "sales.refund",

            "reports.view",
          ],
        },
        {
          name: "Manager",
          description:
            "Can manage daily store operations but cannot change system settings or delete users",
          permissions: [
            "dashboard.view",

            "users.view",
            "users.create",

            "products.view",
            "products.create",
            "products.edit",

            "suppliers.view",
            "suppliers.create",
            "suppliers.edit",

            "sales.view",
            "sales.create",
            "sales.refund",

            "reports.view",
          ],
        },
        {
          name: "Cashier",
          description: "Can view products and create sales",
          permissions: [
            "dashboard.view",
            "products.view",
            "sales.view",
            "sales.create",
          ],
        },
        {
          name: "Inventory Staff",
          description: "Can manage products, stock, and suppliers",
          permissions: [
            "dashboard.view",

            "products.view",
            "products.create",
            "products.edit",

            "suppliers.view",
            "suppliers.create",
            "suppliers.edit",
          ],
        },
      ];

      const syncedRoles = [];

      for (const role of defaultRoles) {
        const existingRoleResult = await client.query(
          `
          SELECT *
          FROM roles
          WHERE organisation_id = $1 AND name = $2
          `,
          [req.user.organisation_id, role.name]
        );

        let roleRecord;

        if (existingRoleResult.rows.length > 0) {
          const updatedRoleResult = await client.query(
            `
            UPDATE roles
            SET description = $1,
                is_system_role = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND organisation_id = $3
            RETURNING *
            `,
            [role.description, existingRoleResult.rows[0].id, req.user.organisation_id]
          );

          roleRecord = updatedRoleResult.rows[0];
        } else {
          const createdRoleResult = await client.query(
            `
            INSERT INTO roles (organisation_id, name, description, is_system_role)
            VALUES ($1, $2, $3, TRUE)
            RETURNING *
            `,
            [req.user.organisation_id, role.name, role.description]
          );

          roleRecord = createdRoleResult.rows[0];
        }

        // Remove all old permissions from this role first
        await client.query(
          `
          DELETE FROM role_permissions
          WHERE role_id = $1
          `,
          [roleRecord.id]
        );

        // Add only the exact permissions allowed for this role
        for (const permissionCode of role.permissions) {
          await client.query(
            `
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT $1, id
            FROM permissions
            WHERE code = $2
            ON CONFLICT (role_id, permission_id) DO NOTHING
            `,
            [roleRecord.id, permissionCode]
          );
        }

        syncedRoles.push({
          id: roleRecord.id,
          name: roleRecord.name,
          description: roleRecord.description,
          permissions: role.permissions,
        });
      }

      await client.query("COMMIT");

      res.json({
        status: "success",
        message: "Default roles synced successfully",
        roles: syncedRoles,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Sync default roles error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to sync default roles",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// Get all available permissions
app.get(
  "/api/permissions",
  authMiddleware,
  requirePermission("roles.manage"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT id, code, name, description
        FROM permissions
        ORDER BY code ASC
        `
      );

      res.json({
        status: "success",
        permissions: result.rows,
      });
    } catch (error) {
      console.error("Get permissions error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get permissions",
        error: error.message,
      });
    }
  }
);

// Get permissions for one role
app.get(
  "/api/roles/:id/permissions",
  authMiddleware,
  requirePermission("roles.manage"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const roleCheck = await pool.query(
        `
        SELECT id, name
        FROM roles
        WHERE id = $1 AND organisation_id = $2
        `,
        [id, req.user.organisation_id]
      );

      if (roleCheck.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Role not found",
        });
      }

      const permissionResult = await pool.query(
        `
        SELECT permissions.code
        FROM role_permissions
        JOIN permissions ON role_permissions.permission_id = permissions.id
        WHERE role_permissions.role_id = $1
        `,
        [id]
      );

      res.json({
        status: "success",
        role: roleCheck.rows[0],
        permissions: permissionResult.rows.map((row) => row.code),
      });
    } catch (error) {
      console.error("Get role permissions error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get role permissions",
        error: error.message,
      });
    }
  }
);

// Update permissions for one role
app.patch(
  "/api/roles/:id/permissions",
  authMiddleware,
  requirePermission("roles.manage"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          status: "error",
          message: "Permissions must be an array",
        });
      }

      await client.query("BEGIN");

      const roleCheck = await client.query(
        `
        SELECT id, name
        FROM roles
        WHERE id = $1 AND organisation_id = $2
        `,
        [id, req.user.organisation_id]
      );

      if (roleCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Role not found",
        });
      }

      const role = roleCheck.rows[0];

      // Prevent removing roles.manage from Admin accidentally
      if (role.name === "Admin" && !permissions.includes("roles.manage")) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: "Admin role must keep roles.manage permission",
        });
      }

      // Remove old permissions
      await client.query(
        `
        DELETE FROM role_permissions
        WHERE role_id = $1
        `,
        [id]
      );

      // Add selected permissions
      for (const permissionCode of permissions) {
        await client.query(
          `
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT $1, id
          FROM permissions
          WHERE code = $2
          ON CONFLICT (role_id, permission_id) DO NOTHING
          `,
          [id, permissionCode]
        );
      }

      await client.query(
        `
        INSERT INTO audit_logs (
          organisation_id,
          user_id,
          action,
          table_name,
          record_id,
          details
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          req.user.organisation_id,
          req.user.id,
          "updated role privileges",
          "roles",
          id,
          JSON.stringify({
            roleName: role.name,
            permissions,
          }),
        ]
      );

      await client.query("COMMIT");

      res.json({
        status: "success",
        message: "Role privileges updated successfully",
        role,
        permissions,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Update role permissions error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to update role privileges",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// =========================
// SUPPLIERS API
// =========================

// Get all suppliers
app.get(
  "/api/suppliers",
  authMiddleware,
  requirePermission("suppliers.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM suppliers
        WHERE organisation_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.organisation_id]
      );

      res.json({
        status: "success",
        suppliers: result.rows,
      });
    } catch (error) {
      console.error("Get suppliers error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get suppliers",
        error: error.message,
      });
    }
  }
);

// Create supplier
app.post(
  "/api/suppliers",
  authMiddleware,
  requirePermission("suppliers.create"),
  async (req, res) => {
    try {
      const { name, contactPerson, phone, email, address, notes } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Supplier name is required",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO suppliers (
          organisation_id,
          name,
          contact_person,
          phone,
          email,
          address,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          req.user.organisation_id,
          name,
          contactPerson || null,
          phone || null,
          email || null,
          address || null,
          notes || null,
        ]
      );

      res.status(201).json({
        status: "success",
        message: "Supplier created successfully",
        supplier: result.rows[0],
      });
    } catch (error) {
      console.error("Create supplier error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to create supplier",
        error: error.message,
      });
    }
  }
);

// Update supplier
app.patch(
  "/api/suppliers/:id",
  authMiddleware,
  requirePermission("suppliers.edit"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, contactPerson, phone, email, address, notes, isActive } = req.body;

      const result = await pool.query(
        `
        UPDATE suppliers
        SET
          name = COALESCE($1, name),
          contact_person = COALESCE($2, contact_person),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          address = COALESCE($5, address),
          notes = COALESCE($6, notes),
          is_active = COALESCE($7, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND organisation_id = $9
        RETURNING *
        `,
        [
          name || null,
          contactPerson || null,
          phone || null,
          email || null,
          address || null,
          notes || null,
          typeof isActive === "boolean" ? isActive : null,
          id,
          req.user.organisation_id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Supplier not found",
        });
      }

      res.json({
        status: "success",
        message: "Supplier updated successfully",
        supplier: result.rows[0],
      });
    } catch (error) {
      console.error("Update supplier error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to update supplier",
        error: error.message,
      });
    }
  }
);

// Delete supplier
app.delete(
  "/api/suppliers/:id",
  authMiddleware,
  requirePermission("suppliers.delete"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        DELETE FROM suppliers
        WHERE id = $1 AND organisation_id = $2
        RETURNING *
        `,
        [id, req.user.organisation_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Supplier not found",
        });
      }

      res.json({
        status: "success",
        message: "Supplier deleted successfully",
        supplier: result.rows[0],
      });
    } catch (error) {
      console.error("Delete supplier error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to delete supplier",
        error: error.message,
      });
    }
  }
);

// =========================
// CATEGORIES API
// =========================

// Get all categories
app.get(
  "/api/categories",
  authMiddleware,
  requirePermission("products.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM categories
        WHERE organisation_id = $1
        ORDER BY name ASC
        `,
        [req.user.organisation_id]
      );

      res.json({
        status: "success",
        categories: result.rows,
      });
    } catch (error) {
      console.error("Get categories error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get categories",
        error: error.message,
      });
    }
  }
);

// Create category
app.post(
  "/api/categories",
  authMiddleware,
  requirePermission("products.create"),
  async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Category name is required",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO categories (
          organisation_id,
          name,
          description
        )
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [req.user.organisation_id, name, description || null]
      );

      res.status(201).json({
        status: "success",
        message: "Category created successfully",
        category: result.rows[0],
      });
    } catch (error) {
      console.error("Create category error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to create category",
        error: error.message,
      });
    }
  }
);

// Update category
app.patch(
  "/api/categories/:id",
  authMiddleware,
  requirePermission("products.edit"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const result = await pool.query(
        `
        UPDATE categories
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND organisation_id = $4
        RETURNING *
        `,
        [name || null, description || null, id, req.user.organisation_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Category not found",
        });
      }

      res.json({
        status: "success",
        message: "Category updated successfully",
        category: result.rows[0],
      });
    } catch (error) {
      console.error("Update category error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to update category",
        error: error.message,
      });
    }
  }
);

// Delete category
app.delete(
  "/api/categories/:id",
  authMiddleware,
  requirePermission("products.delete"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        DELETE FROM categories
        WHERE id = $1 AND organisation_id = $2
        RETURNING *
        `,
        [id, req.user.organisation_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Category not found",
        });
      }

      res.json({
        status: "success",
        message: "Category deleted successfully",
        category: result.rows[0],
      });
    } catch (error) {
      console.error("Delete category error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to delete category",
        error: error.message,
      });
    }
  }
);

// =========================
// PRODUCTS API
// =========================

// Get all products with search/filter
app.get(
  "/api/products",
  authMiddleware,
  requirePermission("products.view"),
  async (req, res) => {
    try {
      const { search, categoryId, supplierId, lowStock } = req.query;

      let query = `
        SELECT 
          products.*,
          suppliers.name AS supplier_name,
          categories.name AS category_name
        FROM products
        LEFT JOIN suppliers ON products.supplier_id = suppliers.id
        LEFT JOIN categories ON products.category_id = categories.id
        WHERE products.organisation_id = $1
      `;

      const values = [req.user.organisation_id];
      let count = 2;

      if (search) {
        query += `
          AND (
            products.name ILIKE $${count}
            OR products.sku ILIKE $${count}
            OR products.barcode ILIKE $${count}
          )
        `;
        values.push(`%${search}%`);
        count++;
      }

      if (categoryId) {
        query += ` AND products.category_id = $${count}`;
        values.push(categoryId);
        count++;
      }

      if (supplierId) {
        query += ` AND products.supplier_id = $${count}`;
        values.push(supplierId);
        count++;
      }

      if (lowStock === "true") {
        query += ` AND products.stock_quantity <= products.low_stock_alert`;
      }

      query += ` ORDER BY products.created_at DESC`;

      const result = await pool.query(query, values);

      res.json({
        status: "success",
        products: result.rows,
      });
    } catch (error) {
      console.error("Get products error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get products",
        error: error.message,
      });
    }
  }
);

// Get single product
app.get(
  "/api/products/:id",
  authMiddleware,
  requirePermission("products.view"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT 
          products.*,
          suppliers.name AS supplier_name,
          categories.name AS category_name
        FROM products
        LEFT JOIN suppliers ON products.supplier_id = suppliers.id
        LEFT JOIN categories ON products.category_id = categories.id
        WHERE products.id = $1 AND products.organisation_id = $2
        `,
        [id, req.user.organisation_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      res.json({
        status: "success",
        product: result.rows[0],
      });
    } catch (error) {
      console.error("Get product error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get product",
        error: error.message,
      });
    }
  }
);

// Create product
app.post(
  "/api/products",
  authMiddleware,
  requirePermission("products.create"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const {
        name,
        sku,
        barcode,
        description,
        buyingPrice,
        sellingPrice,
        stockQuantity,
        lowStockAlert,
        supplierId,
        categoryId,
        imageUrl,
      } = req.body;

      if (!name || sellingPrice === undefined) {
        return res.status(400).json({
          status: "error",
          message: "Product name and selling price are required",
        });
      }

      await client.query("BEGIN");

      if (supplierId) {
        const supplierCheck = await client.query(
          `
          SELECT id FROM suppliers
          WHERE id = $1 AND organisation_id = $2
          `,
          [supplierId, req.user.organisation_id]
        );

        if (supplierCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: "Invalid supplier selected",
          });
        }
      }

      if (categoryId) {
        const categoryCheck = await client.query(
          `
          SELECT id FROM categories
          WHERE id = $1 AND organisation_id = $2
          `,
          [categoryId, req.user.organisation_id]
        );

        if (categoryCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: "Invalid category selected",
          });
        }
      }

      const productResult = await client.query(
        `
        INSERT INTO products (
          organisation_id,
          supplier_id,
          category_id,
          name,
          sku,
          barcode,
          description,
          buying_price,
          selling_price,
          stock_quantity,
          low_stock_alert,
          image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        `,
        [
          req.user.organisation_id,
          supplierId || null,
          categoryId || null,
          name,
          sku || null,
          barcode || null,
          description || null,
          buyingPrice || 0,
          sellingPrice,
          stockQuantity || 0,
          lowStockAlert || 5,
          imageUrl || null,
        ]
      );

      const product = productResult.rows[0];

      if ((stockQuantity || 0) > 0) {
        await client.query(
          `
          INSERT INTO stock_movements (
            organisation_id,
            product_id,
            movement_type,
            quantity,
            reason,
            created_by
          )
          VALUES ($1, $2, 'initial_stock', $3, 'Initial product stock', $4)
          `,
          [
            req.user.organisation_id,
            product.id,
            stockQuantity || 0,
            req.user.id,
          ]
        );
      }

      // Audit log for product creation
      await client.query(
        `
        INSERT INTO audit_logs (
          organisation_id,
          user_id,
          action,
          table_name,
          record_id,
          details
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          req.user.organisation_id,
          req.user.id,
          "created product",
          "products",
          product.id,
          JSON.stringify({
            productName: product.name,
            sku: product.sku,
            sellingPrice: product.selling_price,
            stockQuantity: product.stock_quantity,
          }),
        ]
      );

      await client.query("COMMIT");

      res.status(201).json({
        status: "success",
        message: "Product created successfully",
        product,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Create product error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to create product",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// Update product
app.patch(
  "/api/products/:id",
  authMiddleware,
  requirePermission("products.edit"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        sku,
        barcode,
        description,
        buyingPrice,
        sellingPrice,
        lowStockAlert,
        supplierId,
        categoryId,
        imageUrl,
        isActive,
      } = req.body;

      const result = await pool.query(
        `
        UPDATE products
        SET
          supplier_id = COALESCE($1, supplier_id),
          category_id = COALESCE($2, category_id),
          name = COALESCE($3, name),
          sku = COALESCE($4, sku),
          barcode = COALESCE($5, barcode),
          description = COALESCE($6, description),
          buying_price = COALESCE($7, buying_price),
          selling_price = COALESCE($8, selling_price),
          low_stock_alert = COALESCE($9, low_stock_alert),
          image_url = COALESCE($10, image_url),
          is_active = COALESCE($11, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $12 AND organisation_id = $13
        RETURNING *
        `,
        [
          supplierId || null,
          categoryId || null,
          name || null,
          sku || null,
          barcode || null,
          description || null,
          buyingPrice !== undefined ? buyingPrice : null,
          sellingPrice !== undefined ? sellingPrice : null,
          lowStockAlert !== undefined ? lowStockAlert : null,
          imageUrl || null,
          typeof isActive === "boolean" ? isActive : null,
          id,
          req.user.organisation_id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      res.json({
        status: "success",
        message: "Product updated successfully",
        product: result.rows[0],
      });
    } catch (error) {
      console.error("Update product error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to update product",
        error: error.message,
      });
    }
  }
);

// Adjust product stock
app.patch(
  "/api/products/:id/stock",
  authMiddleware,
  requirePermission("products.edit"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const { movementType, quantity, reason } = req.body;

      const quantityNumber = Number(quantity);

      if (!movementType || quantity === undefined) {
        return res.status(400).json({
          status: "error",
          message: "Movement type and quantity are required",
        });
      }

      if (!["increase", "decrease", "set"].includes(movementType)) {
        return res.status(400).json({
          status: "error",
          message: "Movement type must be increase, decrease, or set",
        });
      }

      if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
        return res.status(400).json({
          status: "error",
          message: "Quantity must be a number greater than 0",
        });
      }

      await client.query("BEGIN");

      const productCheck = await client.query(
        `
        SELECT id, name, sku, stock_quantity
        FROM products
        WHERE id = $1 AND organisation_id = $2
        `,
        [id, req.user.organisation_id]
      );

      if (productCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      const productBeforeUpdate = productCheck.rows[0];
      const currentStock = Number(productBeforeUpdate.stock_quantity);

      let newStock;
      let movementQuantity;

      if (movementType === "increase") {
        newStock = currentStock + quantityNumber;
        movementQuantity = quantityNumber;
      } else if (movementType === "decrease") {
        newStock = currentStock - quantityNumber;
        movementQuantity = -quantityNumber;
      } else {
        newStock = quantityNumber;
        movementQuantity = quantityNumber - currentStock;
      }

      if (newStock < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: "Stock cannot be negative",
        });
      }

      const productResult = await client.query(
        `
        UPDATE products
        SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND organisation_id = $3
        RETURNING *
        `,
        [newStock, id, req.user.organisation_id]
      );

      await client.query(
        `
        INSERT INTO stock_movements (
          organisation_id,
          product_id,
          movement_type,
          quantity,
          reason,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          req.user.organisation_id,
          id,
          movementType,
          movementQuantity,
          reason || "Manual stock adjustment",
          req.user.id,
        ]
      );

      await client.query(
        `
        INSERT INTO audit_logs (
          organisation_id,
          user_id,
          action,
          table_name,
          record_id,
          details
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          req.user.organisation_id,
          req.user.id,
          "updated stock",
          "products",
          id,
          JSON.stringify({
            productName: productBeforeUpdate.name,
            sku: productBeforeUpdate.sku,
            movementType,
            quantity: quantityNumber,
            movementQuantity,
            previousStock: currentStock,
            newStock,
            reason: reason || "Manual stock adjustment",
          }),
        ]
      );

      await client.query("COMMIT");

      res.json({
        status: "success",
        message: "Stock updated successfully",
        product: productResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Update stock error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to update stock",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// Delete product
app.delete(
  "/api/products/:id",
  authMiddleware,
  requirePermission("products.delete"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        DELETE FROM products
        WHERE id = $1 AND organisation_id = $2
        RETURNING *
        `,
        [id, req.user.organisation_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      res.json({
        status: "success",
        message: "Product deleted successfully",
        product: result.rows[0],
      });
    } catch (error) {
      console.error("Delete product error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to delete product",
        error: error.message,
      });
    }
  }
);

// =========================
// SALES / POS API
// =========================

// Create sale
app.post(
  "/api/sales",
  authMiddleware,
  requirePermission("sales.create"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const {
        customerId,
        items,
        discountAmount,
        taxAmount,
        paymentMethod,
        cashAmount,
        cardAmount,
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Sale items are required",
        });
      }

      if (!["cash", "card", "split"].includes(paymentMethod)) {
        return res.status(400).json({
          status: "error",
          message: "Payment method must be cash, card, or split",
        });
      }

      await client.query("BEGIN");

      let subtotal = 0;
      const saleItems = [];

      for (const item of items) {
        const { productId, quantity } = item;

        if (!productId || !quantity || quantity <= 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: "Each item must have productId and valid quantity",
          });
        }

        const productResult = await client.query(
          `
          SELECT id, name, selling_price, stock_quantity
          FROM products
          WHERE id = $1 
          AND organisation_id = $2
          AND is_active = true
          `,
          [productId, req.user.organisation_id]
        );

        if (productResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            status: "error",
            message: `Product not found: ${productId}`,
          });
        }

        const product = productResult.rows[0];

        if (Number(product.stock_quantity) < Number(quantity)) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: `Not enough stock for ${product.name}. Available stock: ${product.stock_quantity}`,
          });
        }

        const unitPrice = Number(product.selling_price);
        const totalPrice = unitPrice * Number(quantity);

        subtotal += totalPrice;

        saleItems.push({
          productId: product.id,
          productName: product.name,
          quantity: Number(quantity),
          unitPrice,
          totalPrice,
        });
      }

      const orgResult = await client.query(
        `
        SELECT invoice_prefix
        FROM organisations
        WHERE id = $1
        `,
        [req.user.organisation_id]
      );

      const organisation = orgResult.rows[0];

      const finalDiscount = Number(discountAmount || 0);
      const finalTaxAmount = Number(taxAmount || 0);
      const totalAmount = subtotal - finalDiscount + finalTaxAmount;

      const finalCashAmount =
        paymentMethod === "cash" ? totalAmount : Number(cashAmount || 0);

      const finalCardAmount =
        paymentMethod === "card" ? totalAmount : Number(cardAmount || 0);

      if (paymentMethod === "split") {
        const paidTotal = finalCashAmount + finalCardAmount;

        if (Number(paidTotal.toFixed(2)) !== Number(totalAmount.toFixed(2))) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: "Cash amount + card amount must match the total amount",
          });
        }
      }

      const saleCountResult = await client.query(
        `
        SELECT COUNT(*) AS count
        FROM sales
        WHERE organisation_id = $1
        `,
        [req.user.organisation_id]
      );

      const saleNumber = `${organisation.invoice_prefix || "INV"}-${String(
        Number(saleCountResult.rows[0].count) + 1
      ).padStart(5, "0")}`;

      const saleResult = await client.query(
        `
        INSERT INTO sales (
          organisation_id,
          customer_id,
          user_id,
          sale_number,
          subtotal,
          discount_amount,
          tax_amount,
          total_amount,
          payment_method,
          cash_amount,
          card_amount,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed')
        RETURNING *
        `,
        [
          req.user.organisation_id,
          customerId || null,
          req.user.id,
          saleNumber,
          subtotal,
          finalDiscount,
          finalTaxAmount,
          totalAmount,
          paymentMethod,
          finalCashAmount,
          finalCardAmount,
        ]
      );

      const sale = saleResult.rows[0];

      for (const item of saleItems) {
        await client.query(
          `
          INSERT INTO sale_items (
            sale_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            sale.id,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
          ]
        );

        await client.query(
          `
          UPDATE products
          SET stock_quantity = stock_quantity - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND organisation_id = $3
          `,
          [item.quantity, item.productId, req.user.organisation_id]
        );

        await client.query(
          `
          INSERT INTO stock_movements (
            organisation_id,
            product_id,
            movement_type,
            quantity,
            reason,
            created_by
          )
          VALUES ($1, $2, 'sale', $3, $4, $5)
          `,
          [
            req.user.organisation_id,
            item.productId,
            -item.quantity,
            `Sale ${saleNumber}`,
            req.user.id,
          ]
        );
      }

      await client.query(
        `
        INSERT INTO audit_logs (
          organisation_id,
          user_id,
          action,
          table_name,
          record_id,
          details
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          req.user.organisation_id,
          req.user.id,
          "created sale",
          "sales",
          sale.id,
          JSON.stringify({
            saleNumber,
            paymentMethod,
            totalAmount,
            cashAmount: finalCashAmount,
            cardAmount: finalCardAmount,
          }),
        ]
      );

      await client.query("COMMIT");

      res.status(201).json({
        status: "success",
        message: "Sale completed successfully",
        sale: {
          ...sale,
          items: saleItems,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Create sale error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to create sale",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// Edit sale
app.patch(
  "/api/sales/:id",
  authMiddleware,
  requirePermission("sales.create"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const {
        items,
        discountAmount,
        taxAmount,
        paymentMethod,
        cashAmount,
        cardAmount,
        editReason,
      } = req.body;

      if (!editReason || !editReason.trim()) {
        return res.status(400).json({
          status: "error",
          message: "Edit reason is required",
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Sale items are required",
        });
      }

      await client.query("BEGIN");

      const saleCheck = await client.query(
        `
        SELECT *
        FROM sales
        WHERE id = $1 AND organisation_id = $2
        `,
        [id, req.user.organisation_id]
      );

      if (saleCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Sale not found",
        });
      }

      const oldSale = saleCheck.rows[0];

      const oldItemsResult = await client.query(
        `
        SELECT *
        FROM sale_items
        WHERE sale_id = $1
        `,
        [id]
      );

      for (const oldItem of oldItemsResult.rows) {
        if (oldItem.product_id) {
          await client.query(
            `
            UPDATE products
            SET stock_quantity = stock_quantity + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND organisation_id = $3
            `,
            [oldItem.quantity, oldItem.product_id, req.user.organisation_id]
          );
        }
      }

      await client.query(`DELETE FROM sale_items WHERE sale_id = $1`, [id]);

      let subtotal = 0;
      const newSaleItems = [];

      for (const item of items) {
        const { productId, quantity } = item;

        const productResult = await client.query(
          `
          SELECT id, name, selling_price, stock_quantity
          FROM products
          WHERE id = $1 
          AND organisation_id = $2
          AND is_active = true
          `,
          [productId, req.user.organisation_id]
        );

        if (productResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            status: "error",
            message: `Product not found: ${productId}`,
          });
        }

        const product = productResult.rows[0];

        if (Number(product.stock_quantity) < Number(quantity)) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: `Not enough stock for ${product.name}. Available stock: ${product.stock_quantity}`,
          });
        }

        const unitPrice = Number(product.selling_price);
        const totalPrice = unitPrice * Number(quantity);

        subtotal += totalPrice;

        newSaleItems.push({
          productId: product.id,
          productName: product.name,
          quantity: Number(quantity),
          unitPrice,
          totalPrice,
        });
      }

      const finalDiscount = Number(discountAmount || 0);
      const finalTaxAmount = Number(taxAmount || 0);
      const totalAmount = subtotal - finalDiscount + finalTaxAmount;

      const finalCashAmount =
        paymentMethod === "cash" ? totalAmount : Number(cashAmount || 0);

      const finalCardAmount =
        paymentMethod === "card" ? totalAmount : Number(cardAmount || 0);

      if (paymentMethod === "split") {
        const paidTotal = finalCashAmount + finalCardAmount;

        if (Number(paidTotal.toFixed(2)) !== Number(totalAmount.toFixed(2))) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: "error",
            message: "Cash amount + card amount must match the total amount",
          });
        }
      }

      const updatedSaleResult = await client.query(
        `
        UPDATE sales
        SET
          subtotal = $1,
          discount_amount = $2,
          tax_amount = $3,
          total_amount = $4,
          payment_method = $5,
          cash_amount = $6,
          card_amount = $7,
          is_edited = TRUE,
          edit_reason = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND organisation_id = $10
        RETURNING *
        `,
        [
          subtotal,
          finalDiscount,
          finalTaxAmount,
          totalAmount,
          paymentMethod,
          finalCashAmount,
          finalCardAmount,
          editReason,
          id,
          req.user.organisation_id,
        ]
      );

      const updatedSale = updatedSaleResult.rows[0];

      for (const item of newSaleItems) {
        await client.query(
          `
          INSERT INTO sale_items (
            sale_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            id,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
          ]
        );

        await client.query(
          `
          UPDATE products
          SET stock_quantity = stock_quantity - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND organisation_id = $3
          `,
          [item.quantity, item.productId, req.user.organisation_id]
        );
      }

      await client.query(
        `
        INSERT INTO audit_logs (
          organisation_id,
          user_id,
          action,
          table_name,
          record_id,
          details
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          req.user.organisation_id,
          req.user.id,
          "edited sale",
          "sales",
          id,
          JSON.stringify({
            saleNumber: oldSale.sale_number,
            previousTotal: oldSale.total_amount,
            newTotal: totalAmount,
            reason: editReason,
          }),
        ]
      );

      await client.query("COMMIT");

      res.json({
        status: "success",
        message: "Sale edited successfully",
        sale: {
          ...updatedSale,
          items: newSaleItems,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Edit sale error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to edit sale",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// Get sales history
app.get(
  "/api/sales",
  authMiddleware,
  requirePermission("sales.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT 
          sales.*,
          users.full_name AS sold_by,
          customers.name AS customer_name
        FROM sales
        LEFT JOIN users ON sales.user_id = users.id
        LEFT JOIN customers ON sales.customer_id = customers.id
        WHERE sales.organisation_id = $1
        ORDER BY sales.created_at DESC
        `,
        [req.user.organisation_id]
      );

      res.json({
        status: "success",
        sales: result.rows,
      });
    } catch (error) {
      console.error("Get sales error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get sales",
        error: error.message,
      });
    }
  }
);

// Get single sale with items
app.get(
  "/api/sales/:id",
  authMiddleware,
  requirePermission("sales.view"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const saleResult = await pool.query(
        `
        SELECT 
          sales.*,
          users.full_name AS sold_by,
          customers.name AS customer_name
        FROM sales
        LEFT JOIN users ON sales.user_id = users.id
        LEFT JOIN customers ON sales.customer_id = customers.id
        WHERE sales.id = $1 AND sales.organisation_id = $2
        `,
        [id, req.user.organisation_id]
      );

      if (saleResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Sale not found",
        });
      }

      const itemsResult = await pool.query(
        `
        SELECT *
        FROM sale_items
        WHERE sale_id = $1
        ORDER BY created_at ASC
        `,
        [id]
      );

      res.json({
        status: "success",
        sale: {
          ...saleResult.rows[0],
          items: itemsResult.rows,
        },
      });
    } catch (error) {
      console.error("Get sale error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get sale",
        error: error.message,
      });
    }
  }
);

// Refund / cancel sale
app.patch(
  "/api/sales/:id/refund",
  authMiddleware,
  requirePermission("sales.refund"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const { reason } = req.body;

      await client.query("BEGIN");

      const saleResult = await client.query(
        `
        SELECT *
        FROM sales
        WHERE id = $1 AND organisation_id = $2
        `,
        [id, req.user.organisation_id]
      );

      if (saleResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "Sale not found",
        });
      }

      const sale = saleResult.rows[0];

      if (sale.status === "refunded") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          message: "Sale is already refunded",
        });
      }

      const itemsResult = await client.query(
        `
        SELECT *
        FROM sale_items
        WHERE sale_id = $1
        `,
        [id]
      );

      for (const item of itemsResult.rows) {
        if (item.product_id) {
          await client.query(
            `
            UPDATE products
            SET stock_quantity = stock_quantity + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND organisation_id = $3
            `,
            [item.quantity, item.product_id, req.user.organisation_id]
          );

          await client.query(
            `
            INSERT INTO stock_movements (
              organisation_id,
              product_id,
              movement_type,
              quantity,
              reason,
              created_by
            )
            VALUES ($1, $2, 'refund', $3, $4, $5)
            `,
            [
              req.user.organisation_id,
              item.product_id,
              item.quantity,
              reason || `Refund sale ${sale.sale_number}`,
              req.user.id,
            ]
          );
        }
      }

      const updatedSaleResult = await client.query(
        `
        UPDATE sales
        SET status = 'refunded',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND organisation_id = $2
        RETURNING *
        `,
        [id, req.user.organisation_id]
      );

      await client.query("COMMIT");

      res.json({
        status: "success",
        message: "Sale refunded successfully",
        sale: updatedSaleResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Refund sale error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to refund sale",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// =========================
// REPORTS / DASHBOARD API
// =========================

// Dashboard summary
app.get(
  "/api/reports/dashboard",
  authMiddleware,
  requirePermission("reports.view"),
  async (req, res) => {
    try {
      const organisationId = req.user.organisation_id;

      const todaySalesResult = await pool.query(
        `
        SELECT 
          COUNT(*) AS today_sales_count,
          COALESCE(SUM(total_amount), 0) AS today_sales_total
        FROM sales
        WHERE organisation_id = $1
        AND status = 'completed'
        AND DATE(created_at) = CURRENT_DATE
        `,
        [organisationId]
      );

      const totalSalesResult = await pool.query(
        `
        SELECT 
          COUNT(*) AS total_sales_count,
          COALESCE(SUM(total_amount), 0) AS total_sales_amount
        FROM sales
        WHERE organisation_id = $1
        AND status = 'completed'
        `,
        [organisationId]
      );

      const productsResult = await pool.query(
        `
        SELECT 
          COUNT(*) AS total_products,
          COALESCE(SUM(stock_quantity), 0) AS total_stock_quantity
        FROM products
        WHERE organisation_id = $1
        AND is_active = true
        `,
        [organisationId]
      );

      const lowStockResult = await pool.query(
        `
        SELECT COUNT(*) AS low_stock_count
        FROM products
        WHERE organisation_id = $1
        AND is_active = true
        AND stock_quantity <= low_stock_alert
        `,
        [organisationId]
      );

      const usersResult = await pool.query(
        `
        SELECT COUNT(*) AS total_users
        FROM users
        WHERE organisation_id = $1
        `,
        [organisationId]
      );

      const suppliersResult = await pool.query(
        `
        SELECT COUNT(*) AS total_suppliers
        FROM suppliers
        WHERE organisation_id = $1
        AND is_active = true
        `,
        [organisationId]
      );

      const recentSalesResult = await pool.query(
        `
        SELECT 
          sales.id,
          sales.sale_number,
          sales.total_amount,
          sales.payment_method,
          sales.status,
          sales.created_at,
          users.full_name AS sold_by
        FROM sales
        LEFT JOIN users ON sales.user_id = users.id
        WHERE sales.organisation_id = $1
        ORDER BY sales.created_at DESC
        LIMIT 5
        `,
        [organisationId]
      );

      const topProductsResult = await pool.query(
        `
        SELECT 
          sale_items.product_id,
          sale_items.product_name,
          SUM(sale_items.quantity) AS total_quantity_sold,
          SUM(sale_items.total_price) AS total_sales_value
        FROM sale_items
        JOIN sales ON sale_items.sale_id = sales.id
        WHERE sales.organisation_id = $1
        AND sales.status = 'completed'
        GROUP BY sale_items.product_id, sale_items.product_name
        ORDER BY total_quantity_sold DESC
        LIMIT 5
        `,
        [organisationId]
      );

      res.json({
        status: "success",
        dashboard: {
          todaySales: {
            count: Number(todaySalesResult.rows[0].today_sales_count),
            total: Number(todaySalesResult.rows[0].today_sales_total),
          },
          totalSales: {
            count: Number(totalSalesResult.rows[0].total_sales_count),
            amount: Number(totalSalesResult.rows[0].total_sales_amount),
          },
          products: {
            total: Number(productsResult.rows[0].total_products),
            stockQuantity: Number(productsResult.rows[0].total_stock_quantity),
            lowStock: Number(lowStockResult.rows[0].low_stock_count),
          },
          users: {
            total: Number(usersResult.rows[0].total_users),
          },
          suppliers: {
            total: Number(suppliersResult.rows[0].total_suppliers),
          },
          recentSales: recentSalesResult.rows,
          topProducts: topProductsResult.rows,
        },
      });
    } catch (error) {
      console.error("Dashboard report error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get dashboard report",
        error: error.message,
      });
    }
  }
);

// Sales report with optional date filters
app.get(
  "/api/reports/sales",
  authMiddleware,
  requirePermission("reports.view"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `
        SELECT 
          sales.id,
          sales.sale_number,
          sales.subtotal,
          sales.discount_amount,
          sales.tax_amount,
          sales.total_amount,
          sales.payment_method,
          sales.status,
          sales.created_at,
          users.full_name AS sold_by
        FROM sales
        LEFT JOIN users ON sales.user_id = users.id
        WHERE sales.organisation_id = $1
      `;

      const values = [req.user.organisation_id];
      let count = 2;

      if (startDate) {
        query += ` AND DATE(sales.created_at) >= $${count}`;
        values.push(startDate);
        count++;
      }

      if (endDate) {
        query += ` AND DATE(sales.created_at) <= $${count}`;
        values.push(endDate);
        count++;
      }

      query += ` ORDER BY sales.created_at DESC`;

      const salesResult = await pool.query(query, values);

      const summaryQuery = `
        SELECT 
          COUNT(*) AS sales_count,
          COALESCE(SUM(subtotal), 0) AS subtotal,
          COALESCE(SUM(discount_amount), 0) AS discount_total,
          COALESCE(SUM(tax_amount), 0) AS tax_total,
          COALESCE(SUM(total_amount), 0) AS total_amount
        FROM sales
        WHERE organisation_id = $1
        AND status = 'completed'
        ${startDate ? "AND DATE(created_at) >= $2" : ""}
        ${
          endDate
            ? `AND DATE(created_at) <= $${startDate ? "3" : "2"}`
            : ""
        }
      `;

      const summaryValues = [req.user.organisation_id];
      if (startDate) summaryValues.push(startDate);
      if (endDate) summaryValues.push(endDate);

      const summaryResult = await pool.query(summaryQuery, summaryValues);

      res.json({
        status: "success",
        summary: {
          salesCount: Number(summaryResult.rows[0].sales_count),
          subtotal: Number(summaryResult.rows[0].subtotal),
          discountTotal: Number(summaryResult.rows[0].discount_total),
          taxTotal: Number(summaryResult.rows[0].tax_total),
          totalAmount: Number(summaryResult.rows[0].total_amount),
        },
        sales: salesResult.rows,
      });
    } catch (error) {
      console.error("Sales report error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get sales report",
        error: error.message,
      });
    }
  }
);

// Low stock report
app.get(
  "/api/reports/low-stock",
  authMiddleware,
  requirePermission("reports.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT 
          products.id,
          products.name,
          products.sku,
          products.stock_quantity,
          products.low_stock_alert,
          products.selling_price,
          suppliers.name AS supplier_name,
          categories.name AS category_name
        FROM products
        LEFT JOIN suppliers ON products.supplier_id = suppliers.id
        LEFT JOIN categories ON products.category_id = categories.id
        WHERE products.organisation_id = $1
        AND products.is_active = true
        AND products.stock_quantity <= products.low_stock_alert
        ORDER BY products.stock_quantity ASC
        `,
        [req.user.organisation_id]
      );

      res.json({
        status: "success",
        lowStockProducts: result.rows,
      });
    } catch (error) {
      console.error("Low stock report error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get low stock report",
        error: error.message,
      });
    }
  }
);

// Product performance report
app.get(
  "/api/reports/products",
  authMiddleware,
  requirePermission("reports.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT 
          products.id,
          products.name,
          products.sku,
          products.stock_quantity,
          products.buying_price,
          products.selling_price,
          COALESCE(SUM(sale_items.quantity), 0) AS quantity_sold,
          COALESCE(SUM(sale_items.total_price), 0) AS sales_value
        FROM products
        LEFT JOIN sale_items ON products.id = sale_items.product_id
        LEFT JOIN sales 
          ON sale_items.sale_id = sales.id
          AND sales.status = 'completed'
        WHERE products.organisation_id = $1
        GROUP BY 
          products.id,
          products.name,
          products.sku,
          products.stock_quantity,
          products.buying_price,
          products.selling_price
        ORDER BY quantity_sold DESC
        `,
        [req.user.organisation_id]
      );

      res.json({
        status: "success",
        products: result.rows,
      });
    } catch (error) {
      console.error("Product report error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get product report",
        error: error.message,
      });
    }
  }
);

// =========================
// ORGANISATION SETTINGS API
// =========================

// Get current organisation settings
app.get(
  "/api/settings",
  authMiddleware,
  requirePermission("dashboard.view"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT 
          id,
          name,
          email,
          phone,
          address,
          logo_url,
          currency,
          tax_name,
          tax_rate,
          invoice_prefix,
          theme_color,
          is_active,
          created_at,
          updated_at
        FROM organisations
        WHERE id = $1
        `,
        [req.user.organisation_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Organisation not found",
        });
      }

      res.json({
        status: "success",
        settings: result.rows[0],
      });
    } catch (error) {
      console.error("Get settings error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get settings",
        error: error.message,
      });
    }
  }
);

// Update organisation settings
app.patch(
  "/api/settings",
  authMiddleware,
  requirePermission("settings.manage"),
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        address,
        logoUrl,
        currency,
        taxName,
        taxRate,
        invoicePrefix,
        themeColor,
      } = req.body;

      const result = await pool.query(
        `
        UPDATE organisations
        SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          logo_url = COALESCE($5, logo_url),
          currency = COALESCE($6, currency),
          tax_name = COALESCE($7, tax_name),
          tax_rate = COALESCE($8, tax_rate),
          invoice_prefix = COALESCE($9, invoice_prefix),
          theme_color = COALESCE($10, theme_color),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING 
          id,
          name,
          email,
          phone,
          address,
          logo_url,
          currency,
          tax_name,
          tax_rate,
          invoice_prefix,
          theme_color,
          is_active,
          created_at,
          updated_at
        `,
        [
          name || null,
          email || null,
          phone || null,
          address || null,
          logoUrl || null,
          currency || null,
          taxName || null,
          taxRate !== undefined ? taxRate : null,
          invoicePrefix || null,
          themeColor || null,
          req.user.organisation_id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Organisation not found",
        });
      }

      res.json({
        status: "success",
        message: "Settings updated successfully",
        settings: result.rows[0],
      });
    } catch (error) {
      console.error("Update settings error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to update settings",
        error: error.message,
      });
    }
  }
);

// =========================
// AUDIT LOGS API
// =========================

app.get(
  "/api/audit-logs",
  authMiddleware,
  requirePermission("dashboard.view"),
  async (req, res) => {
    try {
      const { tableName, page = 1, limit = 25 } = req.query;

      const pageNumber = Math.max(Number(page), 1);
      const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
      const offset = (pageNumber - 1) * limitNumber;

      let whereClause = `
        WHERE audit_logs.organisation_id = $1
      `;

      const values = [req.user.organisation_id];
      let count = 2;

      if (tableName) {
        whereClause += ` AND audit_logs.table_name = $${count}`;
        values.push(tableName);
        count++;
      }

      const logsQuery = `
        SELECT
          audit_logs.id,
          audit_logs.action,
          audit_logs.table_name,
          audit_logs.record_id,
          audit_logs.details,
          audit_logs.created_at,
          users.full_name,
          roles.name AS role_name
        FROM audit_logs
        LEFT JOIN users ON audit_logs.user_id = users.id
        LEFT JOIN roles ON users.role_id = roles.id
        ${whereClause}
        ORDER BY audit_logs.created_at DESC
        LIMIT $${count} OFFSET $${count + 1}
      `;

      const logsResult = await pool.query(logsQuery, [
        ...values,
        limitNumber,
        offset,
      ]);

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM audit_logs
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, values);
      const total = Number(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limitNumber) || 1;

      res.json({
        status: "success",
        logs: logsResult.rows,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get audit logs error:", error.message);

      res.status(500).json({
        status: "error",
        message: "Failed to get audit logs",
        error: error.message,
      });
    }
  }
);

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (error) => {
  console.error("Server error:", error);
});