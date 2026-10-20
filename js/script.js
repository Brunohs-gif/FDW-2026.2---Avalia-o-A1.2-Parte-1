"use strict";

const API_BASE = "https://brasilapi.com.br/api";
const TEMPO_LIMITE = 15000;
const elemento = (id) => document.getElementById(id);

// O timeout também cobre a leitura do JSON. O temporizador é sempre removido.
async function consultarAPI(caminho, mensagemNaoEncontrado) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE);
  try {
    const resposta = await fetch(`${API_BASE}${caminho}`, { signal: controlador.signal });
    if (!resposta.ok) {
      if (resposta.status === 404) throw new Error(mensagemNaoEncontrado);
      throw new Error(`O serviço não conseguiu concluir a consulta (HTTP ${resposta.status}). Tente novamente mais tarde.`);
    }
    return await resposta.json();
  } catch (erro) {
    if (erro.name === "AbortError") throw new Error("A consulta excedeu 15 segundos. Tente novamente.");
    if (erro instanceof TypeError) throw new Error("Não foi possível conectar à BrasilAPI. Confira sua conexão e tente novamente.");
    if (erro instanceof SyntaxError) throw new Error("O serviço retornou uma resposta inválida. Tente novamente mais tarde.");
    throw erro;
  } finally {
    clearTimeout(temporizador);
  }
}

function mensagem(id, texto, estado = "") {
  elemento(id).textContent = texto;
  elemento(id).dataset.state = estado;
}

function carregando(botao, ativo, textoNormal) {
  botao.disabled = ativo;
  botao.setAttribute("aria-busy", String(ativo));
  botao.textContent = ativo ? "Consultando…" : textoNormal;
}

// Não convertemos o ISPB para número: seus zeros à esquerda são significativos.
function textoOuAusente(valor) {
  return valor === null || valor === undefined || String(valor).trim() === "" ? "Não informado" : String(valor);
}

function formatarCodigo(codigo) {
  if (codigo === null || codigo === undefined || String(codigo).trim() === "") return "Não informado";
  return String(codigo).padStart(3, "0");
}

function verificarObjeto(dados) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    throw new Error("O serviço retornou dados em formato inesperado. Tente novamente mais tarde.");
  }
}

async function carregarBancos() {
  const botao = elemento("carregar-bancos");
  if (botao.disabled) return;
  elemento("lista-resultado").hidden = true;
  elemento("bancos-corpo").replaceChildren();
  mensagem("lista-status", "Carregando instituições bancárias…");
  carregando(botao, true);
  try {
    const bancos = await consultarAPI("/banks/v1", "A lista de bancos não foi encontrada.");
    if (!Array.isArray(bancos) || bancos.some((banco) => !banco || typeof banco !== "object" || Array.isArray(banco))) {
      throw new Error("O serviço retornou uma lista inválida. Tente novamente mais tarde.");
    }
    const linhas = document.createDocumentFragment();
    // Repetição: cada objeto do array se transforma em uma linha da tabela.
    bancos.forEach((banco) => {
      const linha = document.createElement("tr");
      [formatarCodigo(banco.code), textoOuAusente(banco.name), textoOuAusente(banco.ispb)].forEach((valor) => {
        const celula = document.createElement("td");
        celula.textContent = valor;
        linha.appendChild(celula);
      });
      linhas.appendChild(linha);
    });
    elemento("bancos-corpo").appendChild(linhas);
    elemento("quantidade").textContent = `${bancos.length} instituições encontradas`;
    elemento("lista-resultado").hidden = bancos.length === 0;
    mensagem("lista-status", bancos.length ? `Consulta concluída. ${bancos.length} instituições disponíveis na tabela.` : "Nenhum banco foi retornado pelo serviço.", "success");
  } catch (erro) {
    mensagem("lista-status", erro.message, "error");
  } finally {
    carregando(botao, false, "Carregar bancos");
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
    // Parâmetro de caminho: faz uma NOVA requisição, sem filtrar a tabela local.
    const banco = await consultarAPI(`/banks/v1/${Number(codigo)}`, "Banco não encontrado. Confira o código informado.");
    verificarObjeto(banco);
    // Objeto único: preenche os campos diretamente, sem percorrer uma lista.
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
    // Terceiro endpoint real: consulta sem filtros de participantes do PIX.
    const participantes = await consultarAPI("/pix/v1/participants", "A lista de participantes do PIX não foi encontrada.");
    if (!Array.isArray(participantes) || participantes.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      throw new Error("O serviço retornou uma lista inválida. Tente novamente mais tarde.");
    }
    const linhas = document.createDocumentFragment();
    participantes.forEach((participante) => {
      const linha = document.createElement("tr");
      [participante.nome, participante.ispb, participante.tipo_participacao, participante.modalidade_participacao].forEach((valor) => {
        const celula = document.createElement("td");
        celula.textContent = textoOuAusente(valor);
        linha.appendChild(celula);
      });
      linhas.appendChild(linha);
    });
    elemento("pix-corpo").appendChild(linhas);
    elemento("pix-quantidade").textContent = `${participantes.length} participantes encontrados`;
    elemento("pix-resultado").hidden = participantes.length === 0;
    mensagem("pix-status", participantes.length ? `Consulta concluída. ${participantes.length} participantes disponíveis na tabela.` : "Nenhum participante foi retornado pelo serviço.", "success");
  } catch (erro) {
    mensagem("pix-status", erro.message, "error");
  } finally {
    carregando(botao, false, "Carregar participantes PIX");
  }
}

// Nenhuma consulta automática: clique ou Enter em um formulário inicia a busca.
elemento("carregar-bancos").addEventListener("click", carregarBancos);
elemento("banco-form").addEventListener("submit", buscarBanco);
elemento("carregar-pix").addEventListener("click", carregarParticipantesPIX);
