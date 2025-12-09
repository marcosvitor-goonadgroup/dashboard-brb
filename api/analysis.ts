import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from 'ioredis';

interface AnalysisRequest {
  dataKey: string;
  analysis?: string;
}

// Cria cliente Redis usando ioredis para Redis Labs
const redis = new Redis(process.env.storage_REDIS_URL || '');

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
    console.log('📥 Request recebida:', req.method, req.url);

    // Para GET, dataKey vem dos query params
    const dataKey = req.method === 'GET'
      ? (req.query.dataKey as string)
      : (req.body as AnalysisRequest).dataKey;

    const analysis = req.method === 'POST'
      ? (req.body as AnalysisRequest).analysis
      : undefined;

    console.log('🔑 DataKey:', dataKey);

    if (!dataKey) {
      console.error('❌ dataKey não fornecido');
      return res.status(400).json({ error: 'dataKey é obrigatório' });
    }

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `analysis:${today}:${dataKey}`;

    // GET - Buscar análise do cache
    if (req.method === 'GET' || !analysis) {
      console.log('🔍 Buscando no Redis, chave:', cacheKey);

      const cached = await redis.get(cacheKey);
      console.log('📦 Resultado do Redis (tipo):', typeof cached, 'valor existe?', !!cached);

      if (cached) {
        const timestamp = await redis.get(`${cacheKey}:timestamp`);
        console.log('✅ Cache HIT:', cacheKey, 'timestamp:', timestamp);

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
      await redis.set(cacheKey, analysis, 'EX', 86400);
      await redis.set(`${cacheKey}:timestamp`, timestamp, 'EX', 86400);

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
    console.error('❌ Erro na API de cache:', error);
    console.error('Stack trace:', error.stack);
    console.error('Redis URL configurado?', !!process.env.storage_REDIS_URL);

    return res.status(500).json({
      error: 'Erro ao processar requisição',
      message: error.message,
      type: error.name,
      details: error.toString()
    });
  }
}
