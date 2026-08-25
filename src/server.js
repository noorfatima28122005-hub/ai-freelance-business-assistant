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

// Get one client by ID
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

// Create a new client
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

// Update a client
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

// Delete a client
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});