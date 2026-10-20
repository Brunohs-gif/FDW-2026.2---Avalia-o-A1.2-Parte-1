"use strict";

const API_BASE = "https://brasilapi.com.br/api";
const TEMPO_LIMITE = 15000;
function elemento(id) {
  return document.getElementById(id);
}

async function requisitar(url, mensagem404) {
  const controle = new AbortController();
  const tempo = setTimeout(function () { controle.abort(); }, TEMPO_LIMITE);
  try {
    const resposta = await fetch(url, { signal: controle.signal, cache: "no-store" });
    if (resposta.status === 404 && mensagem404) throw new Error(mensagem404);
    if (!resposta.ok) throw new Error("Erro na consulta: HTTP " + resposta.status);
    const texto = await resposta.text();
    try { return JSON.parse(texto); } catch { return texto; }
  } catch (erro) {
    if (erro.name === "AbortError") throw new Error("A consulta excedeu 15 segundos. Tente novamente.");
    if (erro instanceof TypeError) throw new Error("Não foi possível conectar ao serviço. Tente novamente.");
    throw erro;
  } finally {
    clearTimeout(tempo);
  }
}

async function consultarAPI(caminho, mensagem404) {
  const matricula = matriculaAtual;
  const dados = await requisitar(API_BASE + caminho, mensagem404);
  await registrarLog(caminho, dados, matricula);
  return dados;
}

function mensagem(id, texto, estado = "") {
  elemento(id).textContent = texto;
  elemento(id).dataset.state = estado;
  let cor = "secondary";
  if (estado === "success") cor = "success";
  if (estado === "error") cor = "danger";
  elemento(id).className = "status alert alert-" + cor + " mt-3 mb-0";
}

function carregando(botao, ativo, textoNormal) {
  botao.disabled = ativo;
  botao.setAttribute("aria-busy", String(ativo));
  if (ativo) {
    botao.textContent = "Consultando…";
  } else {
    botao.textContent = textoNormal;
  }
}

function textoOuAusente(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") return "Não informado";
  return String(valor);
}

function formatarCodigo(codigo) {
  if (codigo === null || codigo === undefined || String(codigo).trim() === "") return "Não informado";
  let texto = String(codigo);
  while (texto.length < 3) {
    texto = "0" + texto;
  }
  return texto;
}

function verificarObjeto(dados) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) throw new Error("O serviço retornou dados em formato inesperado. Tente novamente mais tarde.");
}

function verificarLista(dados) {
  if (!Array.isArray(dados)) throw new Error("O serviço não retornou uma lista válida.");
  for (const item of dados) {
    verificarObjeto(item);
  }
}

function adicionarCelula(linha, valor) {
  const celula = document.createElement("td");
  celula.textContent = textoOuAusente(valor);
  linha.appendChild(celula);
}

function criarLinha(tabela, valores) {
  const linha = document.createElement("tr");
  for (const valor of valores) adicionarCelula(linha, valor);
  elemento(tabela).appendChild(linha);
  return linha;
}

function mostrarQuantidade(resultado, contador, status, quantidade, descricao) {
  elemento(resultado).hidden = quantidade === 0;
  elemento(contador).textContent = quantidade + " " + descricao;
  mensagem(status, quantidade + " " + descricao + ".", "success");
}

let bancosCarregados = null;

function normalizarNome(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function filtrarBancosPorNome() {
  if (bancosCarregados === null) return;
  const termo = normalizarNome(elemento("nome-banco").value);
  const bancos = [];
  for (const banco of bancosCarregados) {
    const nome = normalizarNome((banco.name || "") + " " + (banco.fullName || ""));
    if (termo === "" || nome.includes(termo)) {
      bancos.push(banco);
    }
  }
  elemento("bancos-corpo").replaceChildren();
  for (const banco of bancos) {
    criarLinha("bancos-corpo", [formatarCodigo(banco.code), banco.name || banco.fullName, banco.ispb]);
  }
  mostrarQuantidade("lista-resultado", "quantidade", "lista-status", bancos.length, "instituições encontradas");
  if (bancos.length === 0) mensagem("lista-status", "Nenhum banco encontrado.", "success");
  return bancos;
}

async function pesquisarBancoPorNome(evento) {
  evento.preventDefault();
  const botao = elemento("buscar-nome-banco");
  if (botao.disabled) return;
  const matricula = matriculaAtual;
  const nome = elemento("nome-banco").value.trim();
  carregando(botao, true);
  try {
    if (bancosCarregados === null) await carregarBancos();
    if (bancosCarregados === null) return;
    const encontrados = filtrarBancosPorNome();
    let metodo = "Pesquisar todos os bancos";
    if (nome !== "") {
      metodo = "Pesquisar banco por nome: " + nome;
    }
    await registrarLog("/banks/v1", encontrados, matricula, metodo);
  } finally {
    carregando(botao, false, "Pesquisar nome");
  }
}

elemento("nome-banco-form").addEventListener("submit", pesquisarBancoPorNome);
elemento("listar-bancos").addEventListener("click", async function () {
  const botao = elemento("listar-bancos");
  const pesquisa = elemento("buscar-nome-banco");
  if (botao.disabled || pesquisa.disabled) return;
  elemento("nome-banco").value = "";
  carregando(botao, true);
  pesquisa.disabled = true;
  try {
    await carregarBancos();
  } finally {
    carregando(botao, false, "Listar todos os bancos");
    pesquisa.disabled = false;
  }
});
elemento("nome-banco").addEventListener("input", function () {
  if (elemento("nome-banco").value.trim() === "") filtrarBancosPorNome();
});

async function carregarBancos() {
  bancosCarregados = null;
  elemento("lista-resultado").hidden = true;
  elemento("bancos-corpo").replaceChildren();
  mensagem("lista-status", "Carregando instituições bancárias…");
  try {
    const bancos = await consultarAPI("/banks/v1", "A lista de bancos não foi encontrada.");
    verificarLista(bancos);
    bancosCarregados = bancos;
    filtrarBancosPorNome();
  } catch (erro) {
    mensagem("lista-status", erro.message, "error");
  }
}

async function buscarBanco(evento) {
  evento.preventDefault();
  const botao = elemento("buscar-banco");
  if (botao.disabled) return;
  const campo = elemento("codigo-banco");
  const codigo = campo.value.trim();
  elemento("banco-resultado").hidden = true;
  campo.removeAttribute("aria-invalid");
  if (!/^\d{1,3}$/.test(codigo)) {
    campo.setAttribute("aria-invalid", "true");
    mensagem("banco-status", "Informe um código bancário com 1 a 3 dígitos, por exemplo 001.", "error");
    campo.focus();
    return;
  }
  carregando(botao, true);
  mensagem("banco-status", "Buscando banco…");
  try {
    const banco = await consultarAPI(`/banks/v1/${Number(codigo)}`, "Banco não encontrado. Confira o código informado.");
    verificarObjeto(banco);
    elemento("banco-nome").textContent = textoOuAusente(banco.fullName || banco.name);
    elemento("banco-codigo").textContent = formatarCodigo(banco.code);
    elemento("banco-ispb").textContent = textoOuAusente(banco.ispb);
    elemento("banco-resultado").hidden = false;
    mensagem("banco-status", "Banco encontrado.", "success");
  } catch (erro) {
    mensagem("banco-status", erro.message, "error");
  } finally {
    carregando(botao, false, "Buscar banco");
  }
}

async function carregarParticipantesPIX() {
  const botao = elemento("carregar-pix");
  if (botao.disabled) return;
  elemento("pix-resultado").hidden = true;
  elemento("pix-corpo").replaceChildren();
  carregando(botao, true);
  mensagem("pix-status", "Carregando participantes do PIX…");
  try {
    const participantes = await consultarAPI("/pix/v1/participants", "A lista de participantes do PIX não foi encontrada.");
    verificarLista(participantes);
    for (const participante of participantes) {
      criarLinha("pix-corpo", [participante.nome, participante.ispb, participante.tipo_participacao, participante.modalidade_participacao]);
    }
    mostrarQuantidade("pix-resultado", "pix-quantidade", "pix-status", participantes.length, "participantes encontrados");
    if (participantes.length === 0) mensagem("pix-status", "Nenhum participante encontrado.", "success");
  } catch (erro) {
    mensagem("pix-status", erro.message, "error");
  } finally {
    carregando(botao, false, "Carregar participantes PIX");
  }
}

elemento("banco-form").addEventListener("submit", buscarBanco);
elemento("carregar-pix").addEventListener("click", carregarParticipantesPIX);

const LOG_API = "https://www.piway.com.br/unoesc/api";
let matriculaAtual = "";
try { matriculaAtual = localStorage.getItem("consulta-brasil-matricula") || ""; } catch {}
if (!/^\d+$/.test(matriculaAtual)) matriculaAtual = "";
elemento("matricula").value = matriculaAtual;
if (matriculaAtual) mensagem("matricula-status", `Matrícula ${matriculaAtual} configurada. As próximas consultas serão registradas.`, "success");

elemento("matricula-form").addEventListener("submit", function (evento) {
  evento.preventDefault();
  const campo = elemento("matricula");
  const valor = campo.value.trim();
  if (!/^\d+$/.test(valor)) {
    campo.setAttribute("aria-invalid", "true");
    mensagem("matricula-status", "Informe sua matrícula usando somente números.", "error");
    campo.focus();
    return;
  }
  campo.removeAttribute("aria-invalid");
  matriculaAtual = valor;
  elemento("logs-resultado").hidden = true;
  elemento("logs-corpo").replaceChildren();
  try {
    localStorage.setItem("consulta-brasil-matricula", valor);
    mensagem("matricula-status", `Matrícula ${valor} salva. As próximas consultas serão registradas.`, "success");
  } catch {
    mensagem("matricula-status", `Matrícula ${valor} configurada nesta sessão. O navegador não permitiu salvá-la.`, "success");
  }
});

async function consultarLogsAPI(segmentos) {
  let url = LOG_API;
  for (const parte of segmentos) {
    url += "/" + encodeURIComponent(String(parte));
  }
  let dados = await requisitar(url);
  if (dados && typeof dados === "object" && !Array.isArray(dados)) {
    const mensagemRetorno = dados.msg || dados.message;
    if (["inserir", "excluir"].includes(segmentos[0]) && operacaoLogConfirmada(mensagemRetorno, segmentos[0])) return mensagemRetorno.trim();
    if (segmentos[0] === "logs") {
      if (Array.isArray(dados.logs)) return dados.logs;
      if (Array.isArray(dados.msg)) return dados.msg;
      if (typeof mensagemRetorno === "string" && /^(nenhum log|nenhum registro|não há logs|n[aã]o existem logs)/i.test(mensagemRetorno.trim())) return [];
    }
    if (dados.erro === true || dados.erro === 1 || dados.erro === "true") throw new Error(dados.msg || dados.message || "A API de logs recusou a operação.");
    if (typeof dados.msg === "string") dados = dados.msg;
  }
  if (typeof dados === "string" && /inválid|invalido|inválido|erro|não informada/i.test(dados)) throw new Error(dados);
  return dados;
}

function operacaoLogConfirmada(retorno, operacao) {
  if (typeof retorno !== "string") return false;
  const texto = retorno.trim();
  if (operacao === "inserir") return /^1\s+logs?\s+(?:foi|foram)\s+inseridos?\.?$/i.test(texto);
  return /^1\s+logs?\s+(?:foi|foram)\s+exclu[ií]dos?\.?$/i.test(texto);
}

async function registrarLog(caminho, dados, matricula, metodoPesquisa) {
  if (!matricula) {
    mensagem("logs-status", "Consulta realizada sem log: configure sua matrícula e repita a consulta.", "error");
    return;
  }
  let metodo = metodoPesquisa;
  if (!metodo) {
    if (caminho === "/banks/v1") metodo = "Listar bancos";
    else if (caminho === "/pix/v1/participants") metodo = "Listar participantes PIX";
    else metodo = `Buscar banco ${caminho.split("/").pop()}`;
  }
  let resultado = "Resposta recebida";
  if (Array.isArray(dados)) {
    resultado = dados.length + " resultados";
  } else if (dados && dados.fullName) {
    resultado = dados.fullName;
  } else if (dados && dados.name) {
    resultado = dados.name;
  }
  try {
    const retorno = await consultarLogsAPI(["inserir", "log", matricula, "BrasilAPI", metodo, resultado]);
    if (!operacaoLogConfirmada(retorno, "inserir")) throw new Error("O serviço não confirmou a gravação do log.");
    mensagem("logs-status", "Consulta registrada. Clique em Atualizar logs para visualizar o histórico.", "success");
  } catch (erro) {
    mensagem("logs-status", `A consulta retornou dados, mas o log não foi registrado: ${erro.message}`, "error");
  }
}

async function carregarLogs() {
  const botao = elemento("carregar-logs");
  if (botao.disabled) return;
  if (!matriculaAtual) { mensagem("logs-status", "Configure sua matrícula para consultar os logs.", "error"); return; }
  const matricula = matriculaAtual;
  elemento("logs-resultado").hidden = true;
  elemento("logs-corpo").replaceChildren();
  carregando(botao, true);
  mensagem("logs-status", "Carregando histórico…");
  try {
    const respostaLogs = await consultarLogsAPI(["logs", matricula]);
    if (matricula !== matriculaAtual) return;
    if (!Array.isArray(respostaLogs)) throw new Error("A API não retornou uma lista de logs. " + textoOuAusente(respostaLogs));
    const logs = respostaLogs;
    for (const item of logs) {
      if (!item || typeof item !== "object") throw new Error("A API retornou um log inválido.");
      let log;
      if (item.idlog !== undefined) {
        log = { id: item.idlog, data: item.log, api: item.api, metodo: item.metodo, resultado: item.resultado };
      } else {
        log = { id: item.id, data: item.desclog, api: item.descapi, metodo: item.descmetodo, resultado: item.descresultado };
      }
      if (log.id === undefined || log.id === null) throw new Error("Um log veio sem o número de identificação.");
      const linha = criarLinha("logs-corpo", [log.data, log.api, log.metodo, log.resultado]);
      const acao = document.createElement("td");
      const excluir = document.createElement("button");
      excluir.type = "button";
      excluir.className = "btn btn-outline-danger btn-sm";
      excluir.textContent = "Excluir";
      excluir.setAttribute("aria-label", `Excluir log ${log.id}`);
      excluir.addEventListener("click", function () {
        excluirLog(log.id, matricula, excluir, linha);
      });
      acao.appendChild(excluir);
      linha.appendChild(acao);
    }
    mostrarQuantidade("logs-resultado", "logs-quantidade", "logs-status", logs.length, "logs encontrados");
  } catch (erro) { mensagem("logs-status", erro.message, "error"); }
  finally { carregando(botao, false, "Atualizar logs"); }
}

async function excluirLog(id, matricula, botao, linha) {
  if (botao.disabled || matricula !== matriculaAtual) return;
  carregando(botao, true);
  try {
    const retorno = await consultarLogsAPI(["excluir", "log", id, "aluno", matricula]);
    if (!operacaoLogConfirmada(retorno, "excluir")) throw new Error("O serviço não confirmou a exclusão. Atualize o histórico.");
    if (matricula !== matriculaAtual) return;
    linha.remove();
    const quantidade = elemento("logs-corpo").children.length;
    elemento("logs-quantidade").textContent = `${quantidade} logs encontrados`;
    elemento("logs-resultado").hidden = quantidade === 0;
    mensagem("logs-status", "Log excluído com sucesso.", "success");
  } catch (erro) { mensagem("logs-status", `Não foi possível excluir: ${erro.message}`, "error"); }
  finally { carregando(botao, false, "Excluir"); }
}

elemento("carregar-logs").addEventListener("click", carregarLogs);
