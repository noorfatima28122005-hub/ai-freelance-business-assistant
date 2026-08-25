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

// Get all clients - protected route
app.get("/api/clients", authenticateToken, (req, res) => {
  const clients = db
    .prepare("SELECT * FROM clients ORDER BY id DESC")
    .all();

  res.json({
    message: "Clients retrieved successfully",
    clients,
  });
});

// Create a client - protected route
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});