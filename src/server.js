const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const {
  generateToken,
  authenticateToken,
} = require("./auth");

dotenv.config();

// ======================================================
// APP CONFIGURATION
// ======================================================

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const appName = "AI Freelance Business Assistant API";

// ======================================================
// DATABASE
// ======================================================

const db = new Database("freelance_assistant.db");

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

// ======================================================
// DATABASE TABLES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    client_id INTEGER,
    status TEXT DEFAULT 'pending',
    deadline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id)
      REFERENCES clients(id)
      ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    project_id INTEGER,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    deadline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE SET NULL
  );
`);

// ======================================================
// PASSWORD HASHING
// ======================================================

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

// ======================================================
// DEMO USER
// ======================================================

const demoEmail = "noor@example.com";

const demoUser = db
  .prepare(
    "SELECT id FROM users WHERE email = ?"
  )
  .get(demoEmail);

if (!demoUser) {
  const hashedPassword = hashPassword("demo123");

  db.prepare(`
    INSERT INTO users
      (name, email, password)
    VALUES
      (?, ?, ?)
  `).run(
    "Noor Fatima",
    demoEmail,
    hashedPassword
  );
}

// ======================================================
// DEMO DATA
// ======================================================

const clientCount = db
  .prepare(
    "SELECT COUNT(*) AS count FROM clients"
  )
  .get().count;

if (clientCount === 0) {
  const insertClient = db.prepare(`
    INSERT INTO clients
      (name, email, phone, company, notes)
    VALUES
      (?, ?, ?, ?, ?)
  `);

  const clientResult = insertClient.run(
    "Noor Fatima",
    "noor@example.com",
    "",
    "Freelance Business",
    "Demo client"
  );

  const insertProject = db.prepare(`
    INSERT INTO projects
      (name, description, client_id, status, deadline)
    VALUES
      (?, ?, ?, ?, ?)
  `);

  const projectResult = insertProject.run(
    "Client Website Project",
    "Website development project for client",
    clientResult.lastInsertRowid,
    "in-progress",
    "2026-10-15"
  );

  const insertTask = db.prepare(`
    INSERT INTO tasks
      (title, description, project_id, status, priority, deadline)
    VALUES
      (?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    "Complete AI Assistant",
    "Finish and test the freelance business assistant",
    projectResult.lastInsertRowid,
    "completed",
    "high",
    "2026-09-05"
  );
}

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

// ======================================================
// RATE LIMITING
// ======================================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    error:
      "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// ======================================================
// SWAGGER CONFIGURATION
// ======================================================

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: appName,
      version: "1.0.0",
      description:
        "API documentation for the AI Freelance Business Assistant.",
    },

    servers: [
      {
        url:
          process.env.API_BASE_URL ||
          `http://localhost:${PORT}`,
        description:
          "Local development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    paths: {
      "/": {
        get: {
          summary: "API health check",

          responses: {
            200: {
              description:
                "API is running successfully.",
            },
          },
        },
      },

      "/api/auth/signup": {
        post: {
          summary:
            "Create a new user account",

          requestBody: {
            required: true,

            content: {
              "application/json": {
                schema: {
                  type: "object",

                  required: [
                    "name",
                    "email",
                    "password",
                  ],

                  properties: {
                    name: {
                      type: "string",
                      example: "Noor Fatima",
                    },

                    email: {
                      type: "string",
                      format: "email",
                      example:
                        "noor@example.com",
                    },

                    password: {
                      type: "string",
                      format: "password",
                      example: "demo123",
                    },
                  },
                },
              },
            },
          },

          responses: {
            201: {
              description:
                "Signup successful.",
            },

            400: {
              description:
                "Invalid signup information.",
            },

            409: {
              description:
                "User already exists.",
            },

            500: {
              description:
                "Unable to create account.",
            },
          },
        },
      },

      "/api/auth/login": {
        post: {
          summary: "Login user",

          requestBody: {
            required: true,

            content: {
              "application/json": {
                schema: {
                  type: "object",

                  required: [
                    "email",
                    "password",
                  ],

                  properties: {
                    email: {
                      type: "string",
                      format: "email",
                      example:
                        "noor@example.com",
                    },

                    password: {
                      type: "string",
                      format: "password",
                      example: "demo123",
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                "Login successful.",
            },

            400: {
              description:
                "Email and password are required.",
            },

            401: {
              description:
                "Invalid email or password.",
            },

            500: {
              description:
                "Unable to login.",
            },
          },
        },
      },

      "/api/auth/profile": {
        get: {
          summary:
            "Get authenticated user profile",

          security: [
            {
              bearerAuth: [],
            },
          ],

          responses: {
            200: {
              description:
                "Authenticated profile returned.",
            },

            401: {
              description:
                "Authentication token is missing or invalid.",
            },

            404: {
              description:
                "User not found.",
            },
          },
        },
      },

      "/api/dashboard": {
        get: {
          summary:
            "Get freelance business dashboard",

          responses: {
            200: {
              description:
                "Dashboard statistics returned.",
            },

            500: {
              description:
                "Unable to load dashboard.",
            },
          },
        },
      },

      "/api/clients": {
        get: {
          summary: "Get all clients",

          responses: {
            200: {
              description:
                "Clients returned successfully.",
            },
          },
        },
      },

      "/api/projects": {
        get: {
          summary: "Get all projects",

          responses: {
            200: {
              description:
                "Projects returned successfully.",
            },
          },
        },
      },

      "/api/tasks": {
        get: {
          summary: "Get all tasks",

          responses: {
            200: {
              description:
                "Tasks returned successfully.",
            },
          },
        },
      },

      "/api/assistant": {
        post: {
          summary:
            "Ask the AI Freelance Business Assistant",

          requestBody: {
            required: true,

            content: {
              "application/json": {
                schema: {
                  type: "object",

                  required: [
                    "message",
                  ],

                  properties: {
                    message: {
                      type: "string",
                      example:
                        "What should I focus on next?",
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                "Assistant response returned.",
            },

            400: {
              description:
                "Message is required.",
            },

            500: {
              description:
                "Unable to process assistant request.",
            },
          },
        },
      },
    },
  },

  apis: [],
};

const swaggerSpec =
  swaggerJsdoc(swaggerOptions);

// ======================================================
// SWAGGER ROUTES
// ======================================================

app.get("/swagger.json", (req, res) => {
  res.json(swaggerSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
  })
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message:
      `${appName} is running`,
    status: "ok",
    version: "1.0.0",
  });
});

// ======================================================
// AUTH - SIGNUP
// ======================================================

app.post(
  "/api/auth/signup",
  (req, res) => {
    try {
      const name = String(
        req.body?.name || ""
      ).trim();

      const email = String(
        req.body?.email || ""
      )
        .trim()
        .toLowerCase();

      const password = String(
        req.body?.password || ""
      );

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          error:
            "Name, email and password are required.",
        });
      }

      if (
        name.length < 2
      ) {
        return res.status(400).json({
          error:
            "Name must contain at least 2 characters.",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error:
            "Please provide a valid email address.",
        });
      }

      if (
        password.length < 6
      ) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters.",
        });
      }

      const existingUser =
        db
          .prepare(
            "SELECT id FROM users WHERE email = ?"
          )
          .get(email);

      if (existingUser) {
        return res.status(409).json({
          error:
            "User already exists.",
        });
      }

      const hashedPassword =
        hashPassword(password);

      const result =
        db
          .prepare(`
            INSERT INTO users
              (name, email, password)
            VALUES
              (?, ?, ?)
          `)
          .run(
            name,
            email,
            hashedPassword
          );

      const user = {
        id: Number(
          result.lastInsertRowid
        ),
        name,
        email,
      };

      const token =
        generateToken(user);

      return res.status(201).json({
        message:
          "Signup successful.",
        token,
        user,
      });
    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to create account.",
      });
    }
  }
);

// ======================================================
// AUTH - LOGIN
// ======================================================

app.post(
  "/api/auth/login",
  (req, res) => {
    try {
      const email = String(
        req.body?.email || ""
      )
        .trim()
        .toLowerCase();

      const password = String(
        req.body?.password || ""
      );

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          error:
            "Email and password are required.",
        });
      }

      const user =
        db
          .prepare(`
            SELECT
              id,
              name,
              email,
              password
            FROM users
            WHERE email = ?
          `)
          .get(email);

      if (!user) {
        return res.status(401).json({
          error:
            "Invalid email or password.",
        });
      }

      const hashedPassword =
        hashPassword(password);

      if (
        hashedPassword !==
        user.password
      ) {
        return res.status(401).json({
          error:
            "Invalid email or password.",
        });
      }

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
      };

      const token =
        generateToken(safeUser);

      return res.json({
        message:
          "Login successful.",
        token,
        user: safeUser,
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to login.",
      });
    }
  }
);

// ======================================================
// AUTH - PROFILE
// ======================================================

app.get(
  "/api/auth/profile",
  authenticateToken,
  (req, res) => {
    try {
      const user =
        db
          .prepare(`
            SELECT
              id,
              name,
              email,
              created_at
            FROM users
            WHERE id = ?
          `)
          .get(req.user.id);

      if (!user) {
        return res.status(404).json({
          error:
            "User not found.",
        });
      }

      return res.json({
        user,
      });
    } catch (error) {
      console.error(
        "Profile error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load profile.",
      });
    }
  }
);

// ======================================================
// DASHBOARD
// ======================================================

app.get(
  "/api/dashboard",
  (req, res) => {
    try {
      const totalClients =
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM clients"
          )
          .get().count;

      const totalProjects =
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM projects"
          )
          .get().count;

      const totalTasks =
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM tasks"
          )
          .get().count;

      const pendingTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(status) = 'pending'
          `)
          .get().count;

      const inProgressTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(status) IN
              ('in-progress', 'in progress')
          `)
          .get().count;

      const completedTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(status) = 'completed'
          `)
          .get().count;

      const highPriorityTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(priority) = 'high'
              AND LOWER(status) != 'completed'
          `)
          .get().count;

      const tasks =
        db
          .prepare(`
            SELECT
              tasks.*,
              projects.name AS project_name
            FROM tasks
            LEFT JOIN projects
              ON tasks.project_id = projects.id
            ORDER BY
              CASE
                WHEN LOWER(tasks.status) = 'pending'
                  THEN 1

                WHEN LOWER(tasks.status) IN
                  ('in-progress', 'in progress')
                  THEN 2

                ELSE 3
              END,
              CASE
                WHEN LOWER(tasks.priority) = 'high'
                  THEN 1

                WHEN LOWER(tasks.priority) = 'medium'
                  THEN 2

                ELSE 3
              END,
              tasks.deadline ASC
          `)
          .all();

      return res.json({
        totalClients,
        totalProjects,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        highPriorityTasks,
        tasks,
      });
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load dashboard.",
      });
    }
  }
);

// ======================================================
// CLIENTS
// ======================================================

app.get(
  "/api/clients",
  (req, res) => {
    try {
      const clients =
        db
          .prepare(`
            SELECT
              *
            FROM clients
            ORDER BY id DESC
          `)
          .all();

      return res.json({
        clients,
      });
    } catch (error) {
      console.error(
        "Clients error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load clients.",
      });
    }
  }
);

// ======================================================
// PROJECTS
// ======================================================

app.get(
  "/api/projects",
  (req, res) => {
    try {
      const projects =
        db
          .prepare(`
            SELECT
              projects.*,
              clients.name AS client_name
            FROM projects
            LEFT JOIN clients
              ON projects.client_id =
                 clients.id
            ORDER BY projects.id DESC
          `)
          .all();

      return res.json({
        projects,
      });
    } catch (error) {
      console.error(
        "Projects error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load projects.",
      });
    }
  }
);

// ======================================================
// TASKS
// ======================================================

app.get(
  "/api/tasks",
  (req, res) => {
    try {
      const tasks =
        db
          .prepare(`
            SELECT
              tasks.*,
              projects.name AS project_name
            FROM tasks
            LEFT JOIN projects
              ON tasks.project_id =
                 projects.id
            ORDER BY
              CASE
                WHEN LOWER(tasks.status) =
                     'pending'
                  THEN 1

                WHEN LOWER(tasks.status) IN
                     ('in-progress',
                      'in progress')
                  THEN 2

                ELSE 3
              END,
              tasks.deadline ASC,
              tasks.id DESC
          `)
          .all();

      return res.json({
        tasks,
      });
    } catch (error) {
      console.error(
        "Tasks error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load tasks.",
      });
    }
  }
);

// ======================================================
// AI BUSINESS ASSISTANT
// ======================================================

app.post(
  "/api/assistant",
  (req, res) => {
    try {
      const rawMessage =
        String(
          req.body?.message || ""
        ).trim();

      if (!rawMessage) {
        return res.status(400).json({
          error:
            "Message is required.",
        });
      }

      const message =
        rawMessage
          .toLowerCase()
          .replace(/[?!.,]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      // ==================================================
      // BUSINESS STATISTICS
      // ==================================================

      const totalClients =
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM clients"
          )
          .get().count;

      const totalProjects =
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM projects"
          )
          .get().count;

      const totalTasks =
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM tasks"
          )
          .get().count;

      const pendingTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(status) = 'pending'
          `)
          .get().count;

      const inProgressTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(status) IN
              ('in-progress', 'in progress')
          `)
          .get().count;

      const completedTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(status) = 'completed'
          `)
          .get().count;

      const highPriorityTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(priority) = 'high'
              AND LOWER(status) != 'completed'
          `)
          .get().count;

      const activeTasks =
        db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE LOWER(status) != 'completed'
          `)
          .get().count;

      let response = "";

      // ==================================================
      // UPCOMING DEADLINES
      // ==================================================

      if (
        message.includes("deadline") ||
        message.includes("deadlines") ||
        message.includes("due") ||
        message.includes("due date")
      ) {
        const upcomingDeadlines =
          db
            .prepare(`
              SELECT
                tasks.title,
                tasks.deadline,
                tasks.status,
                tasks.priority,
                projects.name AS project_name
              FROM tasks
              LEFT JOIN projects
                ON tasks.project_id =
                   projects.id
              WHERE
                tasks.deadline IS NOT NULL
                AND TRIM(tasks.deadline) != ''
                AND LOWER(tasks.status) !=
                    'completed'
              ORDER BY
                tasks.deadline ASC
            `)
            .all();

        if (
          upcomingDeadlines.length ===
          0
        ) {
          response =
            "You currently have no upcoming deadlines for active tasks.\n\n" +
            "Your completed tasks are up to date. " +
            "You can focus on project progress, " +
            "client communication, and business growth.";
        } else {
          response =
            "Your upcoming deadlines:\n\n" +
            upcomingDeadlines
              .map(
                (task, index) =>
                  `${index + 1}. ${task.title}\n` +
                  `Deadline: ${task.deadline}\n` +
                  `Priority: ${task.priority}\n` +
                  `Status: ${task.status}\n` +
                  `Project: ${
                    task.project_name ||
                    "No project"
                  }`
              )
              .join("\n\n") +
            "\n\nFocus first on the task with the closest deadline.";
        }
      }

      // ==================================================
      // HIGH PRIORITY TASKS
      // ==================================================

      else if (
        message.includes("high priority") ||
        message.includes("high-priority") ||
        message.includes("urgent")
      ) {
        const highPriority =
          db
            .prepare(`
              SELECT
                tasks.title,
                tasks.description,
                tasks.status,
                tasks.priority,
                tasks.deadline,
                projects.name AS project_name
              FROM tasks
              LEFT JOIN projects
                ON tasks.project_id =
                   projects.id
              WHERE
                LOWER(tasks.priority) =
                  'high'
                AND LOWER(tasks.status) !=
                  'completed'
              ORDER BY
                tasks.deadline ASC
            `)
            .all();

        if (
          highPriority.length === 0
        ) {
          response =
            "You currently have no active high-priority tasks.\n\n" +
            "Your workload looks organized. " +
            "You can focus on project progress, " +
            "client communication, and business growth.";
        } else {
          response =
            `You have ${highPriority.length} active high-priority task(s):\n\n` +
            highPriority
              .map(
                (task, index) =>
                  `${index + 1}. ${task.title}\n` +
                  `Status: ${task.status}\n` +
                  `Priority: ${task.priority}\n` +
                  `Deadline: ${
                    task.deadline ||
                    "No deadline"
                  }\n` +
                  `Project: ${
                    task.project_name ||
                    "No project"
                  }`
              )
              .join("\n\n") +
            "\n\nThese tasks should receive attention before lower-priority work.";
        }
      }

      // ==================================================
      // PENDING TASKS
      // ==================================================

      else if (
        message.includes("pending task") ||
        message.includes("pending tasks") ||
        message.includes("unfinished task") ||
        message.includes("unfinished tasks")
      ) {
        const pending =
          db
            .prepare(`
              SELECT
                tasks.title,
                tasks.status,
                tasks.priority,
                tasks.deadline,
                projects.name AS project_name
              FROM tasks
              LEFT JOIN projects
                ON tasks.project_id =
                   projects.id
              WHERE LOWER(tasks.status) =
                    'pending'
              ORDER BY
                tasks.deadline ASC
            `)
            .all();

        if (
          pending.length === 0
        ) {
          response =
            "You currently have no pending tasks.\n\n" +
            "Your task list is up to date.";
        } else {
          response =
            `You have ${pending.length} pending task(s):\n\n` +
            pending
              .map(
                (task, index) =>
                  `${index + 1}. ${task.title}\n` +
                  `Priority: ${task.priority}\n` +
                  `Deadline: ${
                    task.deadline ||
                    "No deadline"
                  }\n` +
                  `Project: ${
                    task.project_name ||
                    "No project"
                  }`
              )
              .join("\n\n") +
            "\n\nStart with the task that has the closest deadline.";
        }
      }

      // ==================================================
      // FOCUS / NEXT
      // ==================================================

      else if (
        message.includes("focus") ||
        message.includes("what should i do") ||
        message.includes("what should i focus") ||
        message.includes("next") ||
        message.includes("first") ||
        message.includes("prioritize") ||
        message.includes("priority")
      ) {
        if (
          highPriorityTasks > 0
        ) {
          const firstPriority =
            db
              .prepare(`
                SELECT
                  tasks.title,
                  tasks.deadline,
                  tasks.priority,
                  projects.name AS project_name
                FROM tasks
                LEFT JOIN projects
                  ON tasks.project_id =
                     projects.id
                WHERE
                  LOWER(tasks.priority) =
                    'high'
                  AND LOWER(tasks.status) !=
                    'completed'
                ORDER BY
                  tasks.deadline ASC
                LIMIT 1
              `)
              .get();

          response =
            `Your first priority should be "${firstPriority.title}".\n\n` +
            `Priority: High\n` +
            `Deadline: ${
              firstPriority.deadline ||
              "No deadline"
            }\n` +
            `Project: ${
              firstPriority.project_name ||
              "No project"
            }\n\n` +
            `You have ${highPriorityTasks} active high-priority task(s). ` +
            `Complete those before moving to lower-priority work.`;
        } else if (
          pendingTasks > 0
        ) {
          const firstPending =
            db
              .prepare(`
                SELECT
                  tasks.title,
                  tasks.deadline,
                  tasks.priority,
                  projects.name AS project_name
                FROM tasks
                LEFT JOIN projects
                  ON tasks.project_id =
                     projects.id
                WHERE LOWER(tasks.status) =
                      'pending'
                ORDER BY
                  tasks.deadline ASC
                LIMIT 1
              `)
              .get();

          response =
            `Your next focus should be "${firstPending.title}".\n\n` +
            `Priority: ${firstPending.priority}\n` +
            `Deadline: ${
              firstPending.deadline ||
              "No deadline"
            }\n` +
            `Project: ${
              firstPending.project_name ||
              "No project"
            }\n\n` +
            `You currently have ${pendingTasks} pending task(s). ` +
            `Start with the task having the closest deadline.`;
        } else if (
          inProgressTasks > 0
        ) {
          response =
            `Your workload has no pending or high-priority active tasks.\n\n` +
            `You currently have ${inProgressTasks} in-progress task(s). ` +
            `Focus on completing those tasks and keeping your project deadlines updated.`;
        } else {
          response =
            "Your current workload looks organized.\n\n" +
            "You have no pending or high-priority active tasks. " +
            "You can focus on project progress, client communication, " +
            "business growth, and preparing for new freelance opportunities.";
        }
      }

      // ==================================================
      // BUSINESS SUMMARY
      // ==================================================

      else if (
        message.includes("summary") ||
        message.includes("business") ||
        message.includes("overview") ||
        message.includes("status")
      ) {
        response =
          `Here is your freelance business overview:\n\n` +
          `Clients: ${totalClients}\n` +
          `Projects: ${totalProjects}\n` +
          `Tasks: ${totalTasks}\n\n` +
          `Pending tasks: ${pendingTasks}\n` +
          `In-progress tasks: ${inProgressTasks}\n` +
          `Completed tasks: ${completedTasks}\n` +
          `High-priority active tasks: ${highPriorityTasks}\n` +
          `Active tasks: ${activeTasks}\n\n` +
          `Recommendation:\n\n` +
          `Prioritize active work according to urgency and deadlines, ` +
          `keep project information updated, and maintain regular client communication.`;
      }

      // ==================================================
      // CLIENTS
      // ==================================================

      else if (
        message.includes("client") ||
        message.includes("clients")
      ) {
        const clients =
          db
            .prepare(`
              SELECT
                name,
                email,
                phone,
                company
              FROM clients
              ORDER BY id DESC
            `)
            .all();

        response =
          `You currently have ${totalClients} client(s) in your freelance workspace.\n\n` +
          (
            clients.length > 0
              ? clients
                  .map(
                    (client, index) =>
                      `${index + 1}. ${client.name}\n` +
                      `Email: ${
                        client.email ||
                        "Not provided"
                      }\n` +
                      `Phone: ${
                        client.phone ||
                        "Not provided"
                      }\n` +
                      `Company: ${
                        client.company ||
                        "Not provided"
                      }`
                  )
                  .join("\n\n")
              : "No client records found."
          ) +
          "\n\nYou can use the Clients section to review and manage your client records.";
      }

      // ==================================================
      // PROJECTS
      // ==================================================

      else if (
        message.includes("project") ||
        message.includes("projects")
      ) {
        const projects =
          db
            .prepare(`
              SELECT
                projects.name,
                projects.description,
                projects.status,
                projects.deadline,
                clients.name AS client_name
              FROM projects
              LEFT JOIN clients
                ON projects.client_id =
                   clients.id
              ORDER BY
                projects.deadline ASC
            `)
            .all();

        response =
          `You currently have ${totalProjects} project(s).\n\n` +
          (
            projects.length > 0
              ? projects
                  .map(
                    (project, index) =>
                      `${index + 1}. ${project.name}\n` +
                      `Description: ${
                        project.description ||
                        "Not provided"
                      }\n` +
                      `Client: ${
                        project.client_name ||
                        "No client"
                      }\n` +
                      `Status: ${project.status}\n` +
                      `Deadline: ${
                        project.deadline ||
                        "No deadline"
                      }`
                  )
                  .join("\n\n")
              : "No project records found."
          ) +
          "\n\nKeep your active project deadlines updated.";
      }

      // ==================================================
      // TASKS
      // ==================================================

      else if (
        message.includes("task") ||
        message.includes("tasks")
      ) {
        const tasks =
          db
            .prepare(`
              SELECT
                tasks.title,
                tasks.status,
                tasks.priority,
                tasks.deadline,
                projects.name AS project_name
              FROM tasks
              LEFT JOIN projects
                ON tasks.project_id =
                   projects.id
              ORDER BY
                CASE
                  WHEN LOWER(tasks.status) =
                       'pending'
                    THEN 1

                  WHEN LOWER(tasks.status) IN
                       ('in-progress',
                        'in progress')
                    THEN 2

                  ELSE 3
                END,
                tasks.deadline ASC
            `)
            .all();

        response =
          `Your current task overview:\n\n` +
          `Total tasks: ${totalTasks}\n` +
          `Pending: ${pendingTasks}\n` +
          `In Progress: ${inProgressTasks}\n` +
          `Completed: ${completedTasks}\n` +
          `High-priority active: ${highPriorityTasks}\n\n` +
          (
            tasks.length > 0
              ? tasks
                  .map(
                    (task, index) =>
                      `${index + 1}. ${task.title}\n` +
                      `Status: ${task.status}\n` +
                      `Priority: ${task.priority}\n` +
                      `Deadline: ${
                        task.deadline ||
                        "No deadline"
                      }\n` +
                      `Project: ${
                        task.project_name ||
                        "No project"
                      }`
                  )
                  .join("\n\n")
              : "No task records found."
          );
      }

      // ==================================================
      // DEFAULT RESPONSE
      // ==================================================

      else {
        response =
          `I can help you understand your freelance business.\n\n` +
          `Current overview:\n\n` +
          `Clients: ${totalClients}\n` +
          `Projects: ${totalProjects}\n` +
          `Tasks: ${totalTasks}\n` +
          `Pending: ${pendingTasks}\n` +
          `In Progress: ${inProgressTasks}\n` +
          `Completed: ${completedTasks}\n` +
          `High-priority active: ${highPriorityTasks}\n\n` +
          `Try asking:\n\n` +
          `"Give me a summary of my freelance business."\n\n` +
          `"What should I focus on next?"\n\n` +
          `"Show me my clients."\n\n` +
          `"Show me my projects."\n\n` +
          `"Show me my tasks."\n\n` +
          `"What are my pending tasks?"\n\n` +
          `"What are my high priority tasks?"\n\n` +
          `"What are my upcoming deadlines?"`;
      }

      return res.json({
        response,
      });
    } catch (error) {
      console.error(
        "AI assistant error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to process AI assistant request.",
      });
    }
  }
);

// ======================================================
// 404 HANDLER
// ======================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      error: "Route not found",
      path: req.originalUrl,
    });
  }
);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
  (err, req, res, next) => {
    console.error(
      "Unhandled server error:",
      err
    );

    if (
      err instanceof SyntaxError &&
      err.status === 400 &&
      "body" in err
    ) {
      return res.status(400).json({
        error:
          "Invalid JSON request body.",
      });
    }

    return res.status(500).json({
      error:
        "Internal server error.",
    });
  }
);

// ======================================================
// SERVER START
// ======================================================

const server =
  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        "=========================================="
      );

      console.log(
        `${appName}`
      );

      console.log(
        `Server running on port ${PORT}`
      );

      console.log(
        `Health: http://localhost:${PORT}/`
      );

      console.log(
        `Swagger: http://localhost:${PORT}/api-docs`
      );

      console.log(
        "=========================================="
      );
    }
  );

// ======================================================
// GRACEFUL SHUTDOWN
// ======================================================

function shutdown(signal) {
  console.log(
    `\n${signal} received. Shutting down server...`
  );

  server.close(() => {
    try {
      db.close();

      console.log(
        "Database connection closed."
      );

      console.log(
        "Server stopped."
      );

      process.exit(0);
    } catch (error) {
      console.error(
        "Shutdown error:",
        error
      );

      process.exit(1);
    }
  });
}

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);