const express = require("express");
const db = require("./database");

const app = express();

const PORT = 3000;

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "AI Freelance Business Assistant API is running",
  });
});

// Get all clients
app.get("/api/clients", (req, res) => {
  const clients = db
    .prepare("SELECT * FROM clients ORDER BY id DESC")
    .all();

  res.json({
    message: "Clients retrieved successfully",
    clients,
  });
});

// Create a new client
app.post("/api/clients", (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});