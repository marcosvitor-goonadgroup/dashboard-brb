# Implementação de Cache para Análise IA

## Opção 1: Vercel KV (Redis) - RECOMENDADA ⭐

### Passo 1: Instalar Vercel KV

```bash
npm install @vercel/kv
```

### Passo 2: Configurar no Dashboard da Vercel

1. Acesse: https://vercel.com/dashboard
2. Vá em seu projeto → Storage → Create Database
3. Escolha **KV (Redis)**
4. Nome: `dashboard-cache`
5. Copie as variáveis de ambiente geradas

### Passo 3: Adicionar variáveis ao `.env.local`

```env
KV_URL="redis://..."
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."
```

### Passo 4: Criar API Route no Backend

Crie: `src/pages/api/analysis.ts` (ou `/app/api/analysis/route.ts` se usar App Router)

```typescript
import { kv } from '@vercel/kv';
import { generateWeeklyAnalysis } from '@/services/gemini';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { currentWeekData, allData } = req.body;

  // Cria chave única baseada nos dados
  const totalImpressions = currentWeekData.reduce((sum, item) => sum + item.impressions, 0);
  const cacheKey = `analysis:${new Date().toISOString().split('T')[0]}:${totalImpressions}`;

  try {
    // Verifica se já existe no cache
    const cached = await kv.get(cacheKey);
    if (cached) {
      console.log('✅ Análise encontrada no cache');
      return res.status(200).json({
        analysis: cached,
        cached: true,
        timestamp: await kv.get(`${cacheKey}:timestamp`)
      });
    }

    // Gera nova análise
    console.log('🚀 Gerando nova análise...');
    const analysis = await generateWeeklyAnalysis(currentWeekData, allData);

    // Salva no cache por 24 horas (86400 segundos)
    await kv.set(cacheKey, analysis, { ex: 86400 });
    await kv.set(`${cacheKey}:timestamp`, new Date().toISOString(), { ex: 86400 });

    return res.status(200).json({
      analysis,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar análise:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### Passo 5: Atualizar o Frontend

Modifique `src/services/gemini.ts`:

```typescript
export const generateWeeklyAnalysis = async (
  currentWeekData: ProcessedCampaignData[],
  allData: ProcessedCampaignData[]
): Promise<{ analysis: string; cached: boolean; timestamp: string }> => {
  try {
    const response = await axios.post('/api/analysis', {
      currentWeekData,
      allData
    });

    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar análise:', error);
    throw error;
  }
};
```

### Passo 6: Atualizar o Componente

Modifique `src/components/AIAnalysis.tsx`:

```typescript
const generateAnalysis = async () => {
  try {
    const { analysis, cached, timestamp } = await generateWeeklyAnalysis(data, allData);
    setAnalysis(analysis);

    if (cached) {
      console.log('📦 Análise carregada do cache (gerada em:', timestamp, ')');
    } else {
      console.log('✅ Nova análise gerada');
    }
  } catch (err: any) {
    setError(err.message);
  }
};
```

---

## Opção 2: Vercel Blob Storage (Arquivos JSON)

Se preferir não usar Redis, pode usar **Vercel Blob** para salvar arquivos JSON:

### Instalação:

```bash
npm install @vercel/blob
```

### Implementação:

```typescript
import { put, get } from '@vercel/blob';

export default async function handler(req, res) {
  const cacheKey = `analysis-${new Date().toISOString().split('T')[0]}.json`;

  try {
    // Tenta buscar arquivo do dia
    const cached = await get(cacheKey);
    if (cached) {
      const data = await cached.json();
      return res.status(200).json({ ...data, cached: true });
    }

    // Gera nova análise
    const analysis = await generateWeeklyAnalysis(currentWeekData, allData);

    // Salva no Blob
    await put(cacheKey, JSON.stringify({
      analysis,
      timestamp: new Date().toISOString()
    }), {
      access: 'public'
    });

    return res.status(200).json({ analysis, cached: false });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

## Opção 3: Variável de Ambiente + Vercel Edge Config

Para cache mais simples (apenas 1 análise por dia):

```typescript
import { get, set } from '@vercel/edge-config';

export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `analysis_${today}`;

  const cached = await get(cacheKey);
  if (cached) {
    return res.status(200).json({ analysis: cached, cached: true });
  }

  const analysis = await generateWeeklyAnalysis(currentWeekData, allData);
  await set(cacheKey, analysis);

  return res.status(200).json({ analysis, cached: false });
}
```

---

## Comparação das Opções:

| Feature | Vercel KV (Redis) | Vercel Blob | Edge Config |
|---------|-------------------|-------------|-------------|
| **Complexidade** | Baixa | Média | Baixa |
| **Velocidade** | 🚀 Muito rápida | ⚡ Rápida | 🚀 Muito rápida |
| **Capacidade** | 256MB (grátis) | 100GB (grátis) | 512KB |
| **TTL Automático** | ✅ Sim | ❌ Manual | ❌ Manual |
| **Custo (além grátis)** | $0.25/100K reads | $0.15/GB | Grátis |
| **Melhor para** | Cache temporário | Arquivos grandes | Config pequena |

---

## Recomendação Final:

**Use Vercel KV (Opção 1)** porque:
1. ✅ TTL automático (expira após 24h sem código adicional)
2. ✅ Performance excelente
3. ✅ Fácil de implementar
4. ✅ Plano grátis generoso
5. ✅ Feito para esse caso de uso

---

## Estrutura de Cache Recomendada:

```
Chave: analysis:2025-12-08:1582340
Valor: "A performance da semana apresenta..."
TTL: 86400 segundos (24 horas)

Chave: analysis:2025-12-08:1582340:timestamp
Valor: "2025-12-08T15:30:00.000Z"
TTL: 86400 segundos (24 horas)
```

**Benefícios:**
- Todos os usuários veem a mesma análise
- Economiza chamadas à API Gemini
- Cache expira automaticamente à meia-noite
- Se os dados mudarem (impressões diferentes), gera nova análise
