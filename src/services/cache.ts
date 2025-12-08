import axios from 'axios';

interface CacheResponse {
  analysis: string;
  cached: boolean;
  timestamp: string;
}

const CACHE_API_URL = import.meta.env.PROD
  ? '/api/analysis'  // Produção (Vercel)
  : null;            // Local (usa localStorage)

/**
 * Busca análise do cache
 */
export const getCachedAnalysis = async (dataKey: string): Promise<CacheResponse | null> => {
  try {
    // Produção: Busca do Redis via API
    if (CACHE_API_URL) {
      try {
        const response = await axios.get(CACHE_API_URL, {
          params: { dataKey },
          timeout: 5000
        });
        console.log('📦 Cache Redis HIT:', dataKey);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('❌ Cache Redis MISS:', dataKey);
          return null;
        }
        throw error;
      }
    }

    // Local: Usa localStorage
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `analysis:${today}:${dataKey}`;

    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}:timestamp`);

    if (cached) {
      console.log('📦 Cache localStorage HIT:', cacheKey);
      return {
        analysis: cached,
        cached: true,
        timestamp: timestamp || new Date().toISOString()
      };
    }

    console.log('❌ Cache localStorage MISS:', cacheKey);
    return null;

  } catch (error) {
    console.error('Erro ao buscar cache:', error);
    return null;
  }
};

/**
 * Salva análise no cache
 */
export const setCachedAnalysis = async (
  dataKey: string,
  analysis: string
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();

    // Produção: Salva no Redis via API
    if (CACHE_API_URL) {
      await axios.post(CACHE_API_URL, {
        dataKey,
        analysis
      });
      console.log('💾 Cache Redis SAVED:', dataKey);
      return;
    }

    // Local: Salva no localStorage
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `analysis:${today}:${dataKey}`;

    localStorage.setItem(cacheKey, analysis);
    localStorage.setItem(`${cacheKey}:timestamp`, timestamp);

    console.log('💾 Cache localStorage SAVED:', cacheKey);

    // Limpa cache antigo (mais de 2 dias)
    cleanOldCache();

  } catch (error) {
    console.error('Erro ao salvar cache:', error);
  }
};

/**
 * Limpa cache antigo do localStorage (mais de 2 dias)
 */
const cleanOldCache = () => {
  try {
    const keys = Object.keys(localStorage);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const cutoffDate = twoDaysAgo.toISOString().split('T')[0];

    keys.forEach(key => {
      if (key.startsWith('analysis:')) {
        const dateMatch = key.match(/analysis:(\d{4}-\d{2}-\d{2}):/);
        if (dateMatch && dateMatch[1] < cutoffDate) {
          localStorage.removeItem(key);
          console.log('🗑️ Cache antigo removido:', key);
        }
      }
    });
  } catch (error) {
    console.error('Erro ao limpar cache antigo:', error);
  }
};
