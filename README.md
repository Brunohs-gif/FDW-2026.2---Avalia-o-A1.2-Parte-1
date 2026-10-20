# Consulta Brasil — Bancos e PIX

Bruno Henrique Siemer | FDW | Avaliação A1.2 — Parte 1 | 2026.2

## Objetivo
Consultar instituições do sistema financeiro brasileiro com a BrasilAPI: listar bancos, buscar banco pelo código e listar participantes do PIX. A versão atual atende à solicitação de manter o projeto no tema bancário, sem consulta de endereços. A lista do PIX inclui bancos e outras instituições de pagamento; não significa uma lista exclusiva de bancos.

## Tecnologias e arquivos
HTML, CSS e JavaScript puro, sem frameworks, banco de dados, backend próprio ou dependências.

- `index.html`: seções, tabela de bancos, formulário individual, tabela PIX e rodapé.
- `css/style.css`: identidade visual, layout responsivo e foco visível.
- `js/script.js`: integração, validações, tabelas e mensagens.
- `README.md`: documentação e publicação.

## Executar localmente
Abra `index.html` em um navegador atualizado, com JavaScript ativo e internet. As consultas só ocorrem após clique ou envio do formulário por Enter.

Opcionalmente, se Python já estiver instalado, execute `python -m http.server 8000` dentro da pasta e acesse `http://localhost:8000`. Também é possível usar o Live Server do VS Code. São servidores de arquivos estáticos para desenvolvimento, não um backend da aplicação.

## Três endpoints
1. **GET https://brasilapi.com.br/api/banks/v1**: retorna array com todos os bancos, sem filtros.
2. **GET https://brasilapi.com.br/api/banks/v1/{code}**: retorna objeto de um banco; exemplo `/banks/v1/1`.
3. **GET https://brasilapi.com.br/api/pix/v1/participants**: retorna array de instituições participantes do PIX, sem filtros.

Documentação oficial consultada: https://brasilapi.com.br/docs

“3 métodos” significa três operações/endpoints distintos; todos utilizam o método HTTP **GET**. O código bancário é um **parâmetro de caminho**, não um filtro por query string. A busca individual faz sua própria requisição; não filtra a tabela local. As duas listagens não recebem parâmetros.

O código aceita de 1 a 3 dígitos: `001` é enviado como `1` e exibido como `001`. Código zero é preservado; código ausente aparece como “Não informado”. O ISPB permanece texto, preservando zeros à esquerda. No PIX, a tabela mostra nome, ISPB, tipo e modalidade de participação. Não há consultas a chaves PIX, transações ou dados de contas pessoais.

## Critérios da avaliação
| Critério | Trecho que atende |
| --- | --- |
| Interface e apresentação — 1 ponto | `index.html` e media queries, cartões, cores e tabelas com rolagem interna em `css/style.css` |
| Integração — 6 pontos | `consultarAPI`, `carregarBancos`, `buscarBanco` e `carregarParticipantesPIX` em `js/script.js` |
| Três operações distintas | Dois endpoints BANKS e um endpoint PIX, todos GET |
| Exibição com repetição | `forEach` cria linhas nas tabelas de bancos e participantes PIX |
| Exibição sem repetição | `buscarBanco` atribui nome completo, código e ISPB diretamente aos campos do objeto único |
| Consulta com parâmetro | Formulário `#banco-form`, endpoint `/banks/v1/{code}` |
| Consulta sem parâmetros | Botões `#carregar-bancos` e `#carregar-pix` |
| Identificação acadêmica | Rodapé de `index.html` |
| Implementação própria | Estrutura, estilos e lógica criados para o projeto, sem cópia de aplicações completas |
| GitHub Pages | Caminhos relativos preparados; publicação ainda pendente |

## Conceitos para apresentar
- **fetch**: envia a requisição HTTP. `async/await` aguarda a resposta sem bloquear a interface. `response.ok` é conferido antes da leitura do corpo.
- **JSON**: formato de intercâmbio da API. `resposta.json()` converte o corpo em arrays ou objetos JavaScript.
- **Repetição**: cada banco ou participante PIX recebido vira uma linha com `forEach` e `createElement`.
- **Objeto único**: a busca de banco preenche os campos diretamente, sem percorrer uma lista.
- **Parâmetro de caminho**: o código informado substitui `{code}` na URL; não há `?code=` nem outro parâmetro inventado.
- **Erros e carregamento**: `try/catch/finally`, timeout de 15 segundos com `AbortController`, botão desabilitado durante a operação e reativado tanto no sucesso quanto no erro. Cada nova operação oculta o resultado anterior.
- **Apresentação segura e acessível**: dados externos inseridos com `textContent`, campos ausentes tratados, labels visíveis, foco, envio por Enter e mensagens com `aria-live`.

Referência de estudo: https://www.w3schools.com/js/js_json_server.asp

## Verificação e limitações
A sintaxe JavaScript foi validada com `node --check js/script.js`. Os testes com DOM simulado passaram para bancos, banco individual e PIX: criação de linhas, ISPB com zeros, campos ausentes, validações sem requisição, erros 404/500, rede, timeout, JSON inválido, listas vazias/inválidas, carregamento, bloqueio de duplo clique, botões reativados, evento submit e caminhos relativos. Também foi conferida a remoção da consulta postal do HTML e JavaScript. O teste foi executado separadamente dos arquivos da aplicação. Respostas simuladas não são exibidas como dados reais e não substituem uma consulta real.

As novas tentativas reais de `/banks/v1`, `/banks/v1/1` e `/pix/v1/participants` foram bloqueadas pelo ambiente com `fetch failed` / `EACCES`, e o controle de navegador não disponibilizou nenhum navegador conectado. Portanto, não há confirmação da integração real em navegador, CORS, aparência em celular/desktop ou ausência de erros no console. Esses itens precisam ser conferidos manualmente.

Repositório de destino: https://github.com/Brunohs-gif/FDW-2026.2---Avalia-o-A1.2-Parte-1 . O envio dos arquivos utiliza a conexão GitHub. A publicação do site depende da ativação do GitHub Pages; não há endereço publicado confirmado nesta documentação.

## Conferência manual
1. Abra a aplicação: nenhuma requisição deve ocorrer automaticamente.
2. Clique em **Carregar bancos** e confira quantidade, linhas, códigos e ISPB.
3. Busque `001`, `1` e `341`, inclusive por Enter. O endpoint individual deve aparecer em Network, mesmo sem carregar a lista.
4. Teste código vazio, `abc`, `1234` e `-1`: nenhuma requisição deve ocorrer.
5. Busque `999`, caso continue ausente da API, e confira a mensagem de banco não encontrado.
6. Clique em **Carregar participantes PIX**. Confira quantidade, nomes, ISPB, tipo e modalidade. Dados ausentes devem aparecer como “Não informado”.
7. No DevTools, ative Network → Offline e repita cada operação. Confira erro compreensível, resultado anterior oculto e botão reativado. Desative Offline e tente novamente.
8. Confira larguras de 360, 768 e 1280 px, foco por Tab e rolagem apenas dentro das tabelas. Verifique Console e carregamento dos assets.
9. Se o serviço estiver indisponível, confira mensagem de erro e recuperação do botão. Nunca substitua a resposta por dados fictícios.

## Publicar no GitHub Pages
1. Entre no GitHub com sua conta e crie um repositório dedicado `consulta-brasil`, público se seu plano exigir isso para Pages.
2. Escolha **Add file → Upload files** e envie o conteúdo da pasta: `index.html`, `README.md`, `css/style.css` e `js/script.js`. Preserve as pastas; o `index.html` deve ficar na raiz do repositório.
3. Clique em **Commit changes**.
4. Abra **Settings → Pages** e selecione **Deploy from a branch** em Source.
5. Escolha o branch dos arquivos, normalmente `main`, e a pasta **/ (root)**. Clique em **Save**.
6. Aguarde o workflow de Pages terminar em **Actions**.
7. Volte a **Settings → Pages**, abra **Visit site** e verifique as três operações.
8. Copie o endereço real informado pelo GitHub e anexe-o à entrega. Não há endereço publicado presumido neste README.

Os caminhos `./css/style.css` e `./js/script.js` funcionam no subdiretório do repositório no Pages. Não há etapa de build.

## Pendências da entrega
Registrar a BrasilAPI e as três operações GET; confirmar com o professor que a escolha, incluindo o endpoint PIX, não conflita com trabalhos ou exemplos das aulas; publicar e anexar o link funcionando. O documento compartilhado da turma e o portal não foram preenchidos ou enviados.
