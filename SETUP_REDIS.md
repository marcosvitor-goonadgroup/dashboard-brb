# 🚀 Configuração do Redis Cache na Vercel

## ✅ O que já está pronto:

- ✅ Código do cache implementado (`src/services/cache.ts`)
- ✅ API serverless criada (`api/analysis.ts`)
- ✅ Componente atualizado para usar cache
- ✅ Fallback para localStorage em desenvolvimento

---

## 📋 Próximos Passos (no Dashboard da Vercel):

### 1. Conectar o Redis KV ao Projeto

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **dashboard-brb**
3. Vá em **Storage** → **Connect Store**
4. Clique em **Create** ao lado de **KV**
5. Nome do database: `redis-emerald-garden` (ou o que você quiser)
6. Região: **São Paulo, Brazil (East)** (já selecionado)
7. Clique em **Create**

### 2. Conectar ao Projeto

1. Após criar, clique em **Connect to Project**
2. Selecione seu projeto
3. As variáveis serão adicionadas automaticamente:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

### 3. Adicionar Variável da API Gemini

1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: `AIzaSyAvl3UOXU07S91hfczBrMFIjL2trYZJc_U`
   - **Environments**: ✅ Production ✅ Preview ✅ Development

### 4. Deploy

1. Faça commit das mudanças:
```bash
git add .
git commit -m "feat: adiciona cache Redis para análises IA"
git push
```

2. A Vercel fará o deploy automaticamente

---

## 🧪 Testar Localmente (Sem Redis)

O código já funciona localmente usando **localStorage**:

```bash
npm run dev
```

**Comportamento:**
- 💾 Primeira análise: Chama a API Gemini e salva no localStorage
- 📦 Próximas análises (mesmo dia): Carrega do localStorage
- 🔄 Novo dia: Gera nova análise

---

## 🌐 Produção (Com Redis)

Após o deploy, o comportamento será:

1. **Usuário A** acessa e clica em "Últimos 7 dias"
   - 🔄 Cache vazio, chama API Gemini
   - 💾 Salva no Redis (TTL: 24h)
   - ✅ Mostra análise

2. **Usuário B** acessa logo depois
   - 📦 Cache HIT no Redis
   - ✅ Mostra mesma análise (sem chamar API)
   - ⚡ Instantâneo

3. **24 horas depois**
   - 🗑️ Cache expira automaticamente
   - 🔄 Próximo usuário gera nova análise

---

## 📊 Logs para Debug

### Desenvolvimento (localStorage):
```
🚀 Iniciando busca/geração de análise...
❌ Cache localStorage MISS: analysis:2025-12-08:all-245-1582340
🔄 Cache não encontrado, gerando nova análise...
🔄 [1/3] Tentando análise com modelo: gemini-2.5-flash...
✅ Análise gerada com sucesso usando gemini-2.5-flash (modelo 1 de 3)
💾 Cache localStorage SAVED: analysis:2025-12-08:all-245-1582340
✅ Nova análise gerada e salva no cache
```

### Produção (Redis):
```
🚀 Iniciando busca/geração de análise...
❌ Cache Redis MISS: all-245-1582340
🔄 Cache não encontrado, gerando nova análise...
💾 Cache Redis SAVED: all-245-1582340
✅ Nova análise gerada e salva no cache
```

**Segunda chamada (cache hit):**
```
🚀 Iniciando busca/geração de análise...
📦 Cache Redis HIT: all-245-1582340
📦 Análise carregada do cache (gerada em: 2025-12-08T15:30:00.000Z)
```

---

## 🎯 Estrutura de Cache

### Chave do Cache:
```
analysis:{DATA}:{DATAKEY}
```

**Exemplo:**
```
analysis:2025-12-08:all-245-1582340
```

**Onde:**
- `2025-12-08` = Data atual (renova todo dia)
- `all` = Campanha selecionada (ou "all")
- `245` = Total de registros
- `1582340` = Soma de impressões

**Por que essa chave?**
- ✅ Garante que análises de dias diferentes não se misturem
- ✅ Garante que análises de campanhas diferentes sejam separadas
- ✅ Detecta quando os dados mudaram (novas impressões)

---

## 💰 Custos

**Vercel KV (Redis):**
- ✅ **Grátis**: 256MB + 100K requisições/mês
- ✅ Suficiente para centenas de análises/dia
- ✅ Cada análise ~2KB = 128K análises no plano grátis

**Gemini API:**
- ✅ Com cache, só gera 1 análise por dia (máximo)
- ✅ Economiza 99% das chamadas à API
- ✅ Exemplo: 100 usuários/dia = 1 chamada ao invés de 100

---

## 🔧 Troubleshooting

### "Failed to connect to Redis"
1. Verifique se as variáveis estão configuradas:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
2. Refaça o deploy

### Cache não está funcionando
1. Abra o console do navegador
2. Procure pelos logs: `📦 Cache HIT` ou `❌ Cache MISS`
3. Verifique se a API está respondendo: `/api/analysis`

### Erro 405 na API
- Certifique-se que a pasta `api/` está na raiz do projeto
- A Vercel detecta automaticamente APIs na pasta `/api`
