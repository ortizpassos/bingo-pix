const socket = io();
let config = {};
let cartelas = [];

socket.on("nova-rodada", (cfg) => {
  config = cfg;
  document.getElementById("tempoRestante").textContent = "--:--";
  iniciarContagem(cfg.fimRodada);
  document.getElementById("inicioUsuario").style.display = "block";
  document.getElementById("formQtdCartelas").style.display = "none";
  document.getElementById("formNumerosCartelas").style.display = "none";
  document.getElementById("resumoSection").style.display = "none";
  document.getElementById("pagamentoSection").style.display = "none";
});

socket.on("reset-rodada", () => {
  location.reload();
});

function iniciarContagem(fim) {
  const intervalo = setInterval(() => {
    const restante = fim - Date.now();
    if (restante <= 0) {
      document.getElementById("tempoRestante").textContent = "Encerrado";
      clearInterval(intervalo);
      document.getElementById("inicioUsuario").style.display = "none";
      return;
    }
    const min = Math.floor(restante / 60000);
    const sec = Math.floor((restante % 60000) / 1000);
    document.getElementById("tempoRestante").textContent = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }, 1000);
}

function mostrarFormularioQtd() {
  document.getElementById("inicioUsuario").style.display = "none";
  document.getElementById("formQtdCartelas").style.display = "block";
}

function confirmarQtd() {
  const qtd = parseInt(document.getElementById("qtdCartelas").value);
  if (qtd < 1 || qtd > 10) return;
  const div = document.getElementById("formNumerosCartelas");
  div.innerHTML = "";
  cartelas = [];
  for (let i = 0; i < qtd; i++) {
    div.innerHTML += `<input class="form-control w-25 mx-auto mb-2" id="cartela-${i}" placeholder="Número da cartela ${i+1}">`;
  }
  div.innerHTML += `<button class="btn btn-primary" onclick="confirmarNumeros()">Confirmar Cartelas</button>`;
  div.innerHTML += `<button class="btn btn-secondary mt-2" onclick="voltarInicio()">Voltar</button>`;
  div.style.display = "block";
  document.getElementById("formQtdCartelas").style.display = "none";
}

function confirmarNumeros() {
  const qtd = parseInt(document.getElementById("qtdCartelas").value);
  cartelas = [];
  for (let i = 0; i < qtd; i++) {
    const val = document.getElementById(`cartela-${i}`).value.trim();
    if (!val) return;
    cartelas.push(val);
  }
  document.getElementById("resumoLista").innerHTML = "";
  cartelas.forEach(c => {
    const li = document.createElement("li");
    li.className = "list-group-item bg-dark text-white";
    li.textContent = c;
    document.getElementById("resumoLista").appendChild(li);
  });
  const total = (config.valorCartela * cartelas.length).toFixed(2);
  document.getElementById("valorTotal").textContent = total;
  document.getElementById("formNumerosCartelas").style.display = "none";
  document.getElementById("resumoSection").style.display = "block";
}

async function gerarPagamentoPix() {
  const valor = config.valorCartela * cartelas.length;
  const res = await fetch("/gerar-pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      valor: valor,
      descricao: `Validação de ${cartelas.length} cartelas`,
      email: "comprador@email.com"
    })
  });
  const json = await res.json();
  if (json.status === "pending") {
    document.getElementById("pagamentoSection").style.display = "block";
    document.getElementById("qrCodePix").src = `data:image/png;base64,${json.point_of_interaction.transaction_data.qr_code_base64}`;
    document.getElementById("codigoCopiaCola").value = json.point_of_interaction.transaction_data.qr_code;
    aguardarPagamento(json.id);
  }
}

async function aguardarPagamento(paymentId) {
  let tentativas = 0;
  const intervalo = setInterval(async () => {
    tentativas++;
    if (tentativas > 20) {
      clearInterval(intervalo);
      document.getElementById("mensagemFinal").textContent = "⛔ Pagamento não confirmado. Tente novamente.";
      return;
    }
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    });
    const json = await res.json();
    if (json.status === "approved") {
      clearInterval(intervalo);
      salvarCartelasLocalmente();
      document.getElementById("mensagemFinal").textContent = "✅ Cartelas validadas! Boa sorte!";
    }
  }, 5000);
}

function salvarCartelasLocalmente() {
  const pagas = JSON.parse(localStorage.getItem("cartelasPagas") || "[]");
  pagas.push(...cartelas);
  localStorage.setItem("cartelasPagas", JSON.stringify(pagas));
}

function voltarInicio() {
  location.reload();
}