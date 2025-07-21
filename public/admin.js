
const socket = io();
let intervaloTempo = null;

function loginAdmin() {
  const senha = document.getElementById("senhaMaster").value;
  if (senha === "master123") {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("painelAdmin").style.display = "block";
  }
}

function mostrarConfiguracoes() {
  document.getElementById("btnIniciar").style.display = "none";
  document.getElementById("configuracoes").style.display = "block";
}

function iniciarRodada() {
  const valor = parseFloat(document.getElementById("inputValorCartela").value);
  const tempo = parseInt(document.getElementById("inputTempoCompra").value);
  if (isNaN(valor) || isNaN(tempo)) return;

  const fimRodada = Date.now() + tempo * 60000;
  const config = { valorCartela: valor, tempoMin: tempo, fimRodada };

  localStorage.setItem("configCartela", JSON.stringify(config));
  socket.emit("novaRodada", config);

  document.getElementById("configuracoes").style.display = "none";
  document.getElementById("dadosRodada").style.display = "block";
  atualizarRodadaInfo();
  intervaloTempo = setInterval(atualizarRodadaInfo, 1000);
}

function atualizarRodadaInfo() {
  const config = JSON.parse(localStorage.getItem("configCartela"));
  if (!config) return;

  const agora = Date.now();
  const restante = config.fimRodada - agora;
  if (restante <= 0) {
    clearInterval(intervaloTempo);
    document.getElementById("tempoRestante").textContent = "Encerrado";
  } else {
    const min = Math.floor(restante / 60000);
    const sec = Math.floor((restante % 60000) / 1000);
    document.getElementById("tempoRestante").textContent = `${min.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  }

  const pagas = JSON.parse(localStorage.getItem("cartelasPagas") || "[]");
  document.getElementById("totalValidadas").textContent = pagas.length;
}

function consultarCartela() {
  const numero = document.getElementById("consultaCartela").value.trim();
  const pagas = JSON.parse(localStorage.getItem("cartelasPagas") || "[]");
  const resultado = document.getElementById("resultadoConsulta");
  resultado.textContent = pagas.includes(numero)
    ? "✅ Cartela validada e paga!"
    : "❌ Cartela não encontrada.";
}

function confirmarReset() {
  const senha = prompt("Digite a senha para confirmar:");
  if (senha === "master123") {
    localStorage.removeItem("cartelasPagas");
    localStorage.removeItem("configCartela");
    socket.emit("resetRodada");
    location.reload();
  }
}
