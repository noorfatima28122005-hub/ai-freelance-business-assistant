const express = require("express");
const db = require("./database");
const { generateToken, authenticateToken } = require("./auth");

const app = express();

const PORT = 3000;

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "AI Freelance Business Assistant API is running",
  });
});

// Demo login
app.post("/api/login", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "Email is required",
    });
  }

  const user = {
    id: 1,
    email,
  };

  const token = generateToken(user);

  res.json({
    message: "Login successful",
    token,
  });
});

// ==================== CLIENTS ====================

// Get all clients
app.get("/api/clients", authenticateToken, (req, res) => {
  const clients = db
    .prepare("SELECT * FROM clients ORDER BY id DESC")
    .all();

  res.json({
    message: "Clients retrieved successfully",
    clients,
  });
});

// Get one client
app.get("/api/clients/:id", authenticateToken, (req, res) => {
  const client = db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(req.params.id);

  if (!client) {
    return res.status(404).json({
      error: "Client not found",
    });
  }

  res.json({
    message: "Client retrieved successfully",
    client,
  });
});

// Create client
app.post("/api/clients", authenticateToken, (req, res) => {
  const { name, email, project, deadline } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "Client name is required",
    });
  }

  const result = db
    .prepare(
      "INSERT INTO clients (name, email, project, deadline) VALUES (?, ?, ?, ?)"
    )
    .run(name, email, project, deadline);

  const client = db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json({
    message: "Client created successfully",
    client,
  });
});

// Update client
app.put("/api/clients/:id", authenticateToken, (req, res) => {
  const { name, email, project, deadline } = req.body;

  const existingClient = db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(req.params.id);

  if (!existingClient) {
    return res.status(404).json({
      error: "Client not found",
    });
  }

  const updatedName = name ?? existingClient.name;
  const updatedEmail = email ?? existingClient.email;
  const updatedProject = project ?? existingClient.project;
  const updatedDeadline = deadline ?? existingClient.deadline;

  db.prepare(
    `UPDATE clients
     SET name = ?, email = ?, project = ?, deadline = ?
     WHERE id = ?`
  ).run(
    updatedName,
    updatedEmail,
    updatedProject,
    updatedDeadline,
    req.params.id
  );

  const client = db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(req.params.id);

  res.json({
    message: "Client updated successfully",
    client,
  });
});

// Delete client
app.delete("/api/clients/:id", authenticateToken, (req, res) => {
  const existingClient = db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(req.params.id);

  if (!existingClient) {
    return res.status(404).json({
      error: "Client not found",
    });
  }

  db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);

  res.json({
    message: "Client deleted successfully",
    client: existingClient,
  });
});

// ==================== PROJECTS ====================

// Get all projects
app.get("/api/projects", authenticateToken, (req, res) => {
  const projects = db
    .prepare(`
      SELECT
        projects.*,
        clients.name AS client_name
      FROM projects
      LEFT JOIN clients ON projects.client_id = clients.id
      ORDER BY projects.id DESC
    `)
    .all();

  res.json({
    message: "Projects retrieved successfully",
    projects,
  });
});

// Get one project
app.get("/api/projects/:id", authenticateToken, (req, res) => {
  const project = db
    .prepare(`
      SELECT
        projects.*,
        clients.name AS client_name
      FROM projects
      LEFT JOIN clients ON projects.client_id = clients.id
      WHERE projects.id = ?
    `)
    .get(req.params.id);

  if (!project) {
    return res.status(404).json({
      error: "Project not found",
    });
  }

  res.json({
    message: "Project retrieved successfully",
    project,
  });
});

// Create project
app.post("/api/projects", authenticateToken, (req, res) => {
  const {
    name,
    description,
    status,
    deadline,
    client_id,
  } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "Project name is required",
    });
  }

  if (client_id) {
    const client = db
      .prepare("SELECT id FROM clients WHERE id = ?")
      .get(client_id);

    if (!client) {
      return res.status(404).json({
        error: "Client not found",
      });
    }
  }

  const result = db
    .prepare(`
      INSERT INTO projects
      (name, description, status, deadline, client_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      name,
      description,
      status || "pending",
      deadline,
      client_id || null
    );

  const project = db
    .prepare(`
      SELECT
        projects.*,
        clients.name AS client_name
      FROM projects
      LEFT JOIN clients ON projects.client_id = clients.id
      WHERE projects.id = ?
    `)
    .get(result.lastInsertRowid);

  res.status(201).json({
    message: "Project created successfully",
    project,
  });
});

// Update project
app.put("/api/projects/:id", authenticateToken, (req, res) => {
  const existingProject = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(req.params.id);

  if (!existingProject) {
    return res.status(404).json({
      error: "Project not found",
    });
  }

  const {
    name,
    description,
    status,
    deadline,
    client_id,
  } = req.body;

  if (client_id) {
    const client = db
      .prepare("SELECT id FROM clients WHERE id = ?")
      .get(client_id);

    if (!client) {
      return res.status(404).json({
        error: "Client not found",
      });
    }
  }

  const updatedName = name ?? existingProject.name;
  const updatedDescription =
    description ?? existingProject.description;
  const updatedStatus = status ?? existingProject.status;
  const updatedDeadline =
    deadline ?? existingProject.deadline;
  const updatedClientId =
    client_id ?? existingProject.client_id;

  db.prepare(`
    UPDATE projects
    SET name = ?,
        description = ?,
        status = ?,
        deadline = ?,
        client_id = ?
    WHERE id = ?
  `).run(
    updatedName,
    updatedDescription,
    updatedStatus,
    updatedDeadline,
    updatedClientId,
    req.params.id
  );

  const project = db
    .prepare(`
      SELECT
        projects.*,
        clients.name AS client_name
      FROM projects
      LEFT JOIN clients ON projects.client_id = clients.id
      WHERE projects.id = ?
    `)
    .get(req.params.id);

  res.json({
    message: "Project updated successfully",
    project,
  });
});

// Delete project
app.delete("/api/projects/:id", authenticateToken, (req, res) => {
  const existingProject = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(req.params.id);

  if (!existingProject) {
    return res.status(404).json({
      error: "Project not found",
    });
  }

  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);

  res.json({
    message: "Project deleted successfully",
    project: existingProject,
  });
});

// ==================== TASKS ====================

// Get all tasks
app.get("/api/tasks", authenticateToken, (req, res) => {
  const tasks = db
    .prepare(`
      SELECT
        tasks.*,
        projects.name AS project_name
      FROM tasks
      LEFT JOIN projects ON tasks.project_id = projects.id
      ORDER BY tasks.id DESC
    `)
    .all();

  res.json({
    message: "Tasks retrieved successfully",
    tasks,
  });
});

// Get one task
app.get("/api/tasks/:id", authenticateToken, (req, res) => {
  const task = db
    .prepare(`
      SELECT
        tasks.*,
        projects.name AS project_name
      FROM tasks
      LEFT JOIN projects ON tasks.project_id = projects.id
      WHERE tasks.id = ?
    `)
    .get(req.params.id);

  if (!task) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  res.json({
    message: "Task retrieved successfully",
    task,
  });
});

// Create task
app.post("/api/tasks", authenticateToken, (req, res) => {
  const {
    title,
    description,
    status,
    priority,
    deadline,
    project_id,
  } = req.body;

  if (!title) {
    return res.status(400).json({
      error: "Task title is required",
    });
  }

  if (project_id) {
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ?")
      .get(project_id);

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
      });
    }
  }

  const result = db
    .prepare(`
      INSERT INTO tasks
      (title, description, status, priority, deadline, project_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      title,
      description,
      status || "pending",
      priority || "medium",
      deadline,
      project_id || null
    );

  const task = db
    .prepare(`
      SELECT
        tasks.*,
        projects.name AS project_name
      FROM tasks
      LEFT JOIN projects ON tasks.project_id = projects.id
      WHERE tasks.id = ?
    `)
    .get(result.lastInsertRowid);

  res.status(201).json({
    message: "Task created successfully",
    task,
  });
});

// Update task
app.put("/api/tasks/:id", authenticateToken, (req, res) => {
  const existingTask = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);

  if (!existingTask) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  const {
    title,
    description,
    status,
    priority,
    deadline,
    project_id,
  } = req.body;

  if (project_id) {
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ?")
      .get(project_id);

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
      });
    }
  }

  const updatedTitle = title ?? existingTask.title;
  const updatedDescription =
    description ?? existingTask.description;
  const updatedStatus = status ?? existingTask.status;
  const updatedPriority = priority ?? existingTask.priority;
  const updatedDeadline =
    deadline ?? existingTask.deadline;
  const updatedProjectId =
    project_id ?? existingTask.project_id;

  db.prepare(`
    UPDATE tasks
    SET title = ?,
        description = ?,
        status = ?,
        priority = ?,
        deadline = ?,
        project_id = ?
    WHERE id = ?
  `).run(
    updatedTitle,
    updatedDescription,
    updatedStatus,
    updatedPriority,
    updatedDeadline,
    updatedProjectId,
    req.params.id
  );

  const task = db
    .prepare(`
      SELECT
        tasks.*,
        projects.name AS project_name
      FROM tasks
      LEFT JOIN projects ON tasks.project_id = projects.id
      WHERE tasks.id = ?
    `)
    .get(req.params.id);

  res.json({
    message: "Task updated successfully",
    task,
  });
});

// Delete task
app.delete("/api/tasks/:id", authenticateToken, (req, res) => {
  const existingTask = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);

  if (!existingTask) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);

  res.json({
    message: "Task deleted successfully",
    task: existingTask,
  });
});

// ==================== SERVER ====================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});