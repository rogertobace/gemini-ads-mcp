# Gemini Ads MCP

Servidor MCP privado para gerar anúncios estáticos com a API de imagens do Gemini diretamente em conversas no ChatGPT.

## Fluxo

`ChatGPT → MCP privado → Gemini API → imagem → ChatGPT`

Não há frontend de geração. A Vercel funciona somente como backend.

## Modelo de imagem

O padrão de produção é o `gemini-3-pro-image` (Nano Banana Pro), voltado a ativos profissionais, layouts complexos e melhor renderização de texto.

A integração usa a Interactions API atual do Gemini em modo stateless (`store=false`). O tamanho padrão é `1K` para manter a imagem compatível com a resposta inline do MCP. `2K` e `4K` ficam disponíveis pela variável `GEMINI_IMAGE_SIZE` quando houver armazenamento de objetos para arquivos maiores.

## Requisitos

- ChatGPT Plus ou Pro com Developer Mode habilitado.
- Node.js 20.9+.
- Chave Gemini com acesso ao `gemini-3-pro-image`.
- Projeto Vercel.

## Configuração local

1. Instale dependências com `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Preencha os segredos somente em `.env.local`.
4. Execute `npm run dev`.
5. Verifique `http://localhost:3000/health`.

Gere segredos OAuth com pelo menos 32 caracteres. Nunca publique `.env.local`.

## Endpoints

| Endpoint | Uso |
| --- | --- |
| `/mcp` | MCP Streamable HTTP protegido por OAuth |
| `/health` | Valida somente a presença das configurações |
| `/.well-known/oauth-protected-resource` | Descoberta do recurso protegido |
| `/.well-known/oauth-authorization-server` | Metadados OAuth |
| `/oauth/authorize` | Authorization Code + PKCE |
| `/oauth/token` | Tokens de acesso e renovação |

## Ferramenta v1

### `generate_ad`

Gera exatamente uma imagem por chamada. Entradas principais:

- empresa;
- oferta;
- público;
- ângulo;
- objetivo;
- formato (`4:5`, `1:1` ou `9:16`);
- copy e direção visual opcionais.

Quando o texto de apoio não é informado, o prompt proíbe que o modelo invente frases adicionais.

## Validação

```bash
npm run check
```

O comando executa typecheck, testes e build de produção.

## Conexão no ChatGPT

1. Abra **Settings → Security and login**.
2. Ative **Developer mode**.
3. Em **Plugins**, crie uma conexão MCP privada.
4. Informe `https://SEU-DOMINIO/mcp`.
5. Selecione OAuth e use o client ID/secret configurados na Vercel.
6. Revise a ferramenta descoberta e faça um teste em uma conversa nova.

Consulte [docs/architecture.md](docs/architecture.md) para decisões e evolução.
