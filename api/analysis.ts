import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from 'ioredis';

interface AnalysisRequest {
  dataKey: string;
  analysis?: string;
  date?: string;
}

interface HistoryEntry {
  date: string;
  analysis: string;
  timestamp: string;
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

    // Verifica se é uma requisição de histórico
    if (req.method === 'GET' && req.url?.includes('/history')) {
      const dataKey = req.query.dataKey as string;

      if (!dataKey) {
        console.error('❌ dataKey não fornecido para histórico');
        return res.status(400).json({ error: 'dataKey é obrigatório' });
      }

      console.log('📚 Buscando histórico para:', dataKey);

      // Busca análises dos últimos 30 dias
      const history: HistoryEntry[] = [];
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const cacheKey = `analysis:${dateStr}:${dataKey}`;

        const cached = await redis.get(cacheKey);
        const timestamp = await redis.get(`${cacheKey}:timestamp`);

        if (cached) {
          history.push({
            date: dateStr,
            analysis: cached,
            timestamp: timestamp || new Date(date).toISOString()
          });
        }
      }

      console.log('✅ Histórico encontrado:', history.length, 'entradas');
      return res.status(200).json(history);
    }

    // Para GET, dataKey vem dos query params
    const dataKey = req.method === 'GET'
      ? (req.query.dataKey as string)
      : (req.body as AnalysisRequest).dataKey;

    const analysis = req.method === 'POST'
      ? (req.body as AnalysisRequest).analysis
      : undefined;

    // Suporte para buscar por data específica
    const requestDate = req.method === 'GET'
      ? (req.query.date as string)
      : undefined;

    console.log('🔑 DataKey:', dataKey, 'Date:', requestDate || 'hoje');

    if (!dataKey) {
      console.error('❌ dataKey não fornecido');
      return res.status(400).json({ error: 'dataKey é obrigatório' });
    }

    // Define a data (usa a data especificada ou hoje)
    const targetDate = requestDate || new Date().toISOString().split('T')[0];
    const cacheKey = `analysis:${targetDate}:${dataKey}`;

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

      // Salva por 30 dias (2592000 segundos)
      await redis.set(cacheKey, analysis, 'EX', 2592000);
      await redis.set(`${cacheKey}:timestamp`, timestamp, 'EX', 2592000);

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
