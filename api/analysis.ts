import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/kv';

interface AnalysisRequest {
  dataKey: string;
  analysis?: string;
}

// Cria cliente Redis com as variáveis de ambiente do Storage
const kv = createClient({
  url: process.env.STORAGE_REST_API_URL || process.env.KV_REST_API_URL,
  token: process.env.STORAGE_REST_API_TOKEN || process.env.KV_REST_API_TOKEN,
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers para permitir chamadas do frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { dataKey, analysis } = req.body as AnalysisRequest;

    if (!dataKey) {
      return res.status(400).json({ error: 'dataKey é obrigatório' });
    }

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `analysis:${today}:${dataKey}`;

    // GET - Buscar análise do cache
    if (req.method === 'GET' || !analysis) {
      const cached = await kv.get(cacheKey);

      if (cached) {
        const timestamp = await kv.get(`${cacheKey}:timestamp`);
        console.log('✅ Cache HIT:', cacheKey);

        return res.status(200).json({
          analysis: cached,
          cached: true,
          timestamp: timestamp || new Date().toISOString()
        });
      }

      console.log('❌ Cache MISS:', cacheKey);
      return res.status(404).json({
        cached: false,
        message: 'Análise não encontrada no cache'
      });
    }

    // POST - Salvar análise no cache
    if (req.method === 'POST' && analysis) {
      const timestamp = new Date().toISOString();

      // Salva por 24 horas (86400 segundos)
      await kv.set(cacheKey, analysis, { ex: 86400 });
      await kv.set(`${cacheKey}:timestamp`, timestamp, { ex: 86400 });

      console.log('💾 Cache SAVED:', cacheKey);

      return res.status(200).json({
        analysis,
        cached: false,
        timestamp,
        message: 'Análise salva no cache'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error: any) {
    console.error('Erro na API de cache:', error);
    return res.status(500).json({
      error: 'Erro ao processar requisição',
      message: error.message
    });
  }
}
