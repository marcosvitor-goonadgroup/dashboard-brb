import axios from 'axios';
import { ProcessedCampaignData } from '../types/campaign';
import { benchmarkConfig, getBenchmarkByVehicleAndType } from '../config/benchmarks';
import { subDays, format } from 'date-fns';

const API_KEY = import.meta.env.VITE_GEMINI_API;

// Lista de modelos por prioridade
const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-robotics-er-1.5-preview"
];

interface VehicleMetrics {
  veiculo: string;
  tipoDeCompra: string;
  impressoes: number;
  cliques: number;
  views: number;
  views100: number;
  engajamentos: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

/**
 * Agrupa dados por veículo e tipo de compra
 */
const aggregateByVehicle = (data: ProcessedCampaignData[]): VehicleMetrics[] => {
  const grouped = new Map<string, VehicleMetrics>();

  data.forEach(item => {
    const key = `${item.veiculo}_${item.tipoDeCompra}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        veiculo: item.veiculo,
        tipoDeCompra: item.tipoDeCompra,
        impressoes: 0,
        cliques: 0,
        views: 0,
        views100: 0,
        engajamentos: 0,
        ctr: 0,
        vtr: 0,
        taxaEngajamento: 0
      });
    }

    const metrics = grouped.get(key)!;
    metrics.impressoes += item.impressions;
    metrics.cliques += item.clicks;
    metrics.views += item.videoViews;
    metrics.views100 += item.videoCompletions;
    metrics.engajamentos += item.totalEngagements;
  });

  // Calcula métricas percentuais
  grouped.forEach(metrics => {
    if (metrics.impressoes > 0) {
      metrics.ctr = (metrics.cliques / metrics.impressoes) * 100;
      metrics.vtr = (metrics.views100 / metrics.impressoes) * 100;
      metrics.taxaEngajamento = (metrics.engajamentos / metrics.impressoes) * 100;
    }
  });

  return Array.from(grouped.values());
};

/**
 * Monta o prompt para análise da semana
 */
const buildAnalysisPrompt = (
  currentWeekData: ProcessedCampaignData[],
  previousWeekData: ProcessedCampaignData[] | null
): string => {
  const currentMetrics = aggregateByVehicle(currentWeekData);
  const previousMetrics = previousWeekData ? aggregateByVehicle(previousWeekData) : null;

  // Data da semana atual
  const currentDate = currentWeekData.length > 0
    ? format(currentWeekData[0].date, 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');

  let textoDados = '';

  currentMetrics.forEach(current => {
    const { veiculo, tipoDeCompra, ctr, vtr, taxaEngajamento } = current;

    // Buscar benchmark
    const benchmark = getBenchmarkByVehicleAndType(veiculo, tipoDeCompra);
    const benchCtr = benchmark?.ctr ?? benchmarkConfig.geral.ctr;
    const benchVtr = benchmark?.vtr ?? benchmarkConfig.geral.vtr;
    const benchEng = benchmark?.taxaEngajamento ?? benchmarkConfig.geral.taxaEngajamento;

    // Buscar dados da semana anterior
    const previous = previousMetrics?.find(
      p => p.veiculo === veiculo && p.tipoDeCompra === tipoDeCompra
    );

    textoDados += `
    - Veículo: ${veiculo} | Tipo: ${tipoDeCompra}
      Performance Atual: CTR ${ctr.toFixed(2)}%, VTR ${vtr.toFixed(2)}%, Engajamento ${taxaEngajamento.toFixed(2)}%
      Benchmark (Meta): CTR ${benchCtr.toFixed(2)}%, VTR ${benchVtr.toFixed(2)}%, Engajamento ${benchEng.toFixed(2)}%
      ${previous ? `Semana Anterior: CTR ${previous.ctr.toFixed(2)}%, VTR ${previous.vtr.toFixed(2)}%, Engajamento ${previous.taxaEngajamento.toFixed(2)}%` : 'Semana Anterior: Sem dados'}
    `;
  });

  return `
    Você é um analista de performance de mídia sênior.
    Analise a semana iniciada em ${currentDate}.

    DADOS DA SEMANA:
    ${textoDados}

    DIRETRIZES DA ANÁLISE:
    1. Compare a performance geral (CTR, VTR, Engajamento) por campanha com o Benchmark (Total). Estamos acima ou abaixo?
    2. Se houver dados da "Semana Anterior", compare se houve evolução ou queda.
    3. Analise especificamente os destaques por Veículo e Tipo de Compra seguindo a mesma lógica (1º vs Bench, 2º vs Semana Anterior). Compare com o bench do veículo com o seu tipo de compra.
    4. Identifique veículos ou tipos de compra que precisam de atenção ou otimização.

    FORMATO DA RESPOSTA:
    - Escreva no máximo 2 parágrafos.
    - Seja direto, analítico e use português profissional.
    - Não use marcadores (bullets) excessivos, prefira texto corrido fluido.
    - Foque nos insights acionáveis (o que melhorou, o que piorou).
    - Seja objetivo e vá direto ao ponto mais importante.
  `;
};

/**
 * Chama a API do Gemini com fallback entre modelos
 * Tenta cada modelo em ordem de prioridade:
 * 1. Se obtém sucesso (200), retorna imediatamente (para as tentativas)
 * 2. Se erro 429/503 (rate limit/indisponível), tenta o próximo modelo
 * 3. Se erro 400/403 (inválido/proibido), lança exceção (para tudo)
 */
const callGeminiAPI = async (prompt: string): Promise<string> => {
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  let lastError: Error | null = null;

  // Itera pelos modelos em ordem de prioridade
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];

    try {
      console.log(`🔄 [${i + 1}/${MODELS.length}] Tentando análise com modelo: ${model}...`);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos de timeout
      });

      // SUCESSO - Retorna imediatamente e para o loop
      if (response.status === 200 && response.data.candidates?.length > 0) {
        console.log(`✅ Análise gerada com sucesso usando ${model} (modelo ${i + 1} de ${MODELS.length})`);
        return response.data.candidates[0].content.parts[0].text;
      }

      // Se chegou aqui mas não tem candidates, tenta próximo modelo
      console.warn(`⚠️ Modelo ${model} retornou 200 mas sem candidates válidos`);
      lastError = new Error(`Modelo ${model} não retornou conteúdo válido`);

    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error?.message || error.message;

      console.warn(`⚠️ Modelo ${model} falhou: ${statusCode || 'Erro de rede'} - ${errorMessage}`);
      lastError = error;

      // ERRO DE COTA/INDISPONIBILIDADE - Tenta próximo modelo
      if (statusCode === 429 || statusCode === 503 || statusCode === 500) {
        console.log(`🔄 Erro ${statusCode} no modelo ${model}. Tentando próximo modelo...`);

        // Se não for o último modelo, aguarda antes de tentar o próximo
        if (i < MODELS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        continue; // Pula para o próximo modelo
      }

      // ERRO FATAL - Para tudo e lança exceção
      if (statusCode === 400 || statusCode === 403 || statusCode === 401) {
        throw new Error(`Erro fatal na API do Gemini (${statusCode}): ${errorMessage}`);
      }

      // OUTROS ERROS - Tenta próximo modelo se houver
      if (i < MODELS.length - 1) {
        console.log(`🔄 Erro desconhecido no modelo ${model}. Tentando próximo modelo...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
    }
  }

  // Se chegou aqui, todos os modelos falharam
  throw new Error(
    `Todos os ${MODELS.length} modelos falharam ou atingiram o limite. ` +
    `Último erro: ${lastError?.message || 'Desconhecido'}. ` +
    `Tente novamente em alguns minutos.`
  );
};

/**
 * Gera análise da semana usando IA (com cache)
 */
export const generateWeeklyAnalysis = async (
  currentWeekData: ProcessedCampaignData[],
  allData: ProcessedCampaignData[],
  dataKey: string
): Promise<{ analysis: string; cached: boolean; timestamp: string }> => {
  try {
    if (currentWeekData.length === 0) {
      return {
        analysis: 'Não há dados disponíveis para análise desta semana.',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }

    // Importa o serviço de cache dinamicamente para evitar problemas no build
    const { getCachedAnalysis, setCachedAnalysis } = await import('./cache');

    // 1. Tenta buscar do cache
    const cached = await getCachedAnalysis(dataKey);
    if (cached) {
      return cached;
    }

    // 2. Se não encontrou no cache, gera nova análise
    console.log('🔄 Cache não encontrado, gerando nova análise...');

    // Identifica o período da semana atual
    const dates = currentWeekData.map(d => d.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Busca dados da semana anterior (7 dias antes)
    const previousWeekStart = subDays(minDate, 7);
    const previousWeekEnd = subDays(maxDate, 7);

    const previousWeekData = allData.filter(
      item => item.date >= previousWeekStart && item.date <= previousWeekEnd
    );

    // Monta o prompt
    const prompt = buildAnalysisPrompt(
      currentWeekData,
      previousWeekData.length > 0 ? previousWeekData : null
    );

    // Chama a API
    const analysis = await callGeminiAPI(prompt);

    // 3. Salva no cache
    await setCachedAnalysis(dataKey, analysis);

    return {
      analysis,
      cached: false,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Erro ao gerar análise:', error);
    throw new Error(error.message || 'Erro ao gerar análise');
  }
};
