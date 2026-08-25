const express = require("express");

const app = express();

const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "AI Freelance Business Assistant API is running",
  });
});

app.get("/api/clients", (req, res) => {
  res.json({
    message: "Clients endpoint is working",
    clients: [],
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:3000`);
});