const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

app.post("/gerar-pix", async (req, res) => {
  const { valor, descricao, email } = req.body;
  try {
    const idempotencyKey = uuidv4();
    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: valor,
        payment_method_id: "pix",
        description: descricao,
        payer: {
          email: email || "comprador@email.com",
          first_name: "Comprador",
          last_name: "Bingo"
        }
      })
    });
    const json = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ erro: "Erro ao criar pagamento", detalhes: json });
    }
    return res.json(json);
  } catch (error) {
    res.status(500).json({ erro: "Erro interno", detalhes: error.message });
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado via WebSocket");

  socket.on("nova-rodada", (config) => {
    io.emit("nova-rodada", config);
  });

  socket.on("reset-rodada", () => {
    io.emit("reset-rodada");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});