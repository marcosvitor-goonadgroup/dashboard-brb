import axios from 'axios';
import { ProcessedCampaignData } from '../types/campaign';
import { subDays, format } from 'date-fns';

const API_KEY = import.meta.env.VITE_GEMINI_API;

// Lista de modelos por prioridade
const MODELS = [
      "gemini-robotics-er-1.5-preview",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash"
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

interface CampaignMetrics {
  campanha: string;
  totalImpressoes: number;
  totalCliques: number;
  totalViews: number;
  totalViews100: number;
  totalEngajamentos: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
  veiculos: VehicleMetrics[];
}

/**
 * Agrupa dados por campanha, depois por veículo e tipo de compra dentro de cada campanha
 */
const aggregateByCampaign = (data: ProcessedCampaignData[]): CampaignMetrics[] => {
  const campaignMap = new Map<string, CampaignMetrics>();

  data.forEach(item => {
    const campanha = item.campanha || 'Sem campanha';

    // Cria campanha se não existir
    if (!campaignMap.has(campanha)) {
      campaignMap.set(campanha, {
        campanha,
        totalImpressoes: 0,
        totalCliques: 0,
        totalViews: 0,
        totalViews100: 0,
        totalEngajamentos: 0,
        ctr: 0,
        vtr: 0,
        taxaEngajamento: 0,
        veiculos: []
      });
    }

    const campaign = campaignMap.get(campanha)!;

    // Acumula totais da campanha
    campaign.totalImpressoes += item.impressions;
    campaign.totalCliques += item.clicks;
    campaign.totalViews += item.videoViews;
    campaign.totalViews100 += item.videoCompletions;
    campaign.totalEngajamentos += item.totalEngagements;

    // Agrupa veículos dentro da campanha
    let vehicleMetrics = campaign.veiculos.find(
      v => v.veiculo === item.veiculo && v.tipoDeCompra === item.tipoDeCompra
    );

    if (!vehicleMetrics) {
      vehicleMetrics = {
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
      };
      campaign.veiculos.push(vehicleMetrics);
    }

    vehicleMetrics.impressoes += item.impressions;
    vehicleMetrics.cliques += item.clicks;
    vehicleMetrics.views += item.videoViews;
    vehicleMetrics.views100 += item.videoCompletions;
    vehicleMetrics.engajamentos += item.totalEngagements;
  });

  // Calcula métricas percentuais para campanhas e veículos
  campaignMap.forEach(campaign => {
    // Métricas da campanha
    if (campaign.totalImpressoes > 0) {
      campaign.ctr = (campaign.totalCliques / campaign.totalImpressoes) * 100;
      campaign.vtr = (campaign.totalViews100 / campaign.totalImpressoes) * 100;
      campaign.taxaEngajamento = (campaign.totalEngajamentos / campaign.totalImpressoes) * 100;
    }

    // Métricas de cada veículo
    campaign.veiculos.forEach(vehicle => {
      if (vehicle.impressoes > 0) {
        vehicle.ctr = (vehicle.cliques / vehicle.impressoes) * 100;
        vehicle.vtr = (vehicle.views100 / vehicle.impressoes) * 100;
        vehicle.taxaEngajamento = (vehicle.engajamentos / vehicle.impressoes) * 100;
      }
    });

    // Ordena veículos por impressões (maior para menor)
    campaign.veiculos.sort((a, b) => b.impressoes - a.impressoes);
  });

  // Retorna campanhas ordenadas por impressões
  return Array.from(campaignMap.values())
    .sort((a, b) => b.totalImpressoes - a.totalImpressoes);
};

/**
 * Monta o prompt para análise da semana
 */
const buildAnalysisPrompt = async (
  currentWeekData: ProcessedCampaignData[],
  previousWeekData: ProcessedCampaignData[] | null
): Promise<string> => {
  const currentCampaigns = aggregateByCampaign(currentWeekData);
  const previousCampaigns = previousWeekData ? aggregateByCampaign(previousWeekData) : null;

  // Importa o serviço de benchmark dinâmico
  const { fetchAllBenchmarks } = await import('./benchmarkService');
  const benchmarksMap = await fetchAllBenchmarks();

  console.log('Métricas por Campanha (Semana Atual):', JSON.stringify(currentCampaigns, null, 2));
  console.log('Métricas por Campanha (Semana Anterior):', previousCampaigns ? JSON.stringify(previousCampaigns, null, 2) : 'Sem dados');

  // Data da semana atual
  const currentDate = currentWeekData.length > 0
    ? format(currentWeekData[0].date, 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');

  // Calcula benchmark GERAL (agregado de todos os dados atuais)
  const totalImpressoes = currentCampaigns.reduce((sum, c) => sum + c.totalImpressoes, 0);
  const totalCliques = currentCampaigns.reduce((sum, c) => sum + c.totalCliques, 0);
  const totalViews100 = currentCampaigns.reduce((sum, c) => sum + c.totalViews100, 0);
  const totalEngajamentos = currentCampaigns.reduce((sum, c) => sum + c.totalEngajamentos, 0);

  const benchGeralCtr = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
  const benchGeralVtr = totalImpressoes > 0 ? (totalViews100 / totalImpressoes) * 100 : 0;
  const benchGeralEng = totalImpressoes > 0 ? (totalEngajamentos / totalImpressoes) * 100 : 0;

  let textoDados = `

BENCHMARK GERAL (TOTAL): CTR ${benchGeralCtr.toFixed(2)}%, VTR ${benchGeralVtr.toFixed(2)}%, Engajamento ${benchGeralEng.toFixed(2)}%
`;

  // Itera por cada campanha
  currentCampaigns.forEach(campaign => {
    const { campanha, ctr, vtr, taxaEngajamento, totalImpressoes } = campaign;

    // Busca campanha da semana anterior
    const previousCampaign = previousCampaigns?.find(c => c.campanha === campanha);

    textoDados += `

📊 CAMPANHA: ${campanha}
   Performance Geral: CTR ${ctr.toFixed(2)}%, VTR ${vtr.toFixed(2)}%, Engajamento ${taxaEngajamento.toFixed(2)}% (${formatNumber(totalImpressoes)} impressões)
   ${previousCampaign ? `Semana Anterior: CTR ${previousCampaign.ctr.toFixed(2)}%, VTR ${previousCampaign.vtr.toFixed(2)}%, Engajamento ${previousCampaign.taxaEngajamento.toFixed(2)}%` : 'Semana Anterior: Sem dados'}

   Veículos:`;

    // Itera por cada veículo da campanha
    campaign.veiculos.forEach(vehicle => {
      const { veiculo, tipoDeCompra, ctr: vCtr, vtr: vVtr, taxaEngajamento: vEng, impressoes } = vehicle;

      // Buscar benchmark dinâmico (das APIs) - estático + vídeo somados
      const benchmarkKeyEstatico = `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|estatico`;
      const benchmarkKeyVideo = `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|video`;

      const benchEstatico = benchmarksMap.get(benchmarkKeyEstatico);
      const benchVideo = benchmarksMap.get(benchmarkKeyVideo);

      // Usa o benchmark que existir, priorizando estático
      const benchmarkToUse = benchEstatico || benchVideo;

      const vBenchCtr = benchmarkToUse?.ctr ?? benchGeralCtr;
      const vBenchVtr = benchmarkToUse?.vtr ?? benchGeralVtr;
      const vBenchEng = benchmarkToUse?.taxaEngajamento ?? benchGeralEng;

      // Buscar veículo da semana anterior
      const previousVehicle = previousCampaign?.veiculos.find(
        v => v.veiculo === veiculo && v.tipoDeCompra === tipoDeCompra
      );

      // IGNORA métricas zeradas
      const metricsText: string[] = [];
      if (vCtr > 0) metricsText.push(`CTR ${vCtr.toFixed(2)}%`);
      if (vVtr > 0) metricsText.push(`VTR ${vVtr.toFixed(2)}%`);
      if (vEng > 0) metricsText.push(`Engajamento ${vEng.toFixed(2)}%`);

      const benchText: string[] = [];
      if (vCtr > 0) benchText.push(`CTR ${vBenchCtr.toFixed(2)}%`);
      if (vVtr > 0) benchText.push(`VTR ${vBenchVtr.toFixed(2)}%`);
      if (vEng > 0) benchText.push(`Engajamento ${vBenchEng.toFixed(2)}%`);

      const prevText: string[] = [];
      if (previousVehicle) {
        if (vCtr > 0 && previousVehicle.ctr > 0) prevText.push(`CTR ${previousVehicle.ctr.toFixed(2)}%`);
        if (vVtr > 0 && previousVehicle.vtr > 0) prevText.push(`VTR ${previousVehicle.vtr.toFixed(2)}%`);
        if (vEng > 0 && previousVehicle.taxaEngajamento > 0) prevText.push(`Engajamento ${previousVehicle.taxaEngajamento.toFixed(2)}%`);
      }

      textoDados += `
      • ${veiculo} (${tipoDeCompra}) - ${formatNumber(impressoes)} impressões
        Atual: ${metricsText.join(', ')}
        Benchmark: ${benchText.join(', ')}${prevText.length > 0 ? `\n        Semana Anterior: ${prevText.join(', ')}` : ''}`;
    });
  });

  return `
Você é um analista de performance de mídia online.
Analise a semana iniciada em ${currentDate}.

DADOS:
${textoDados}

REGRAS IMPORTANTES:
1. NÃO analise métricas zeradas (0.00%)
2. Compare cada campanha com o BENCHMARK GERAL mostrado no topo
3. Compare cada veículo com seu BENCHMARK ESPECÍFICO
4. Se houver dados da semana anterior, mencione evolução/queda

FORMATO DA RESPOSTA (EXATAMENTE 2 PARÁGRAFOS):

Parágrafo 1 - CAMPANHAS:
Analise a performance GERAL de cada campanha vs Benchmark Geral. Mencione explicitamente o nome das campanhas e se estão acima/abaixo do benchmark. Cite números específicos. Compare com semana anterior se houver dados.

Parágrafo 2 - VEÍCULOS:
Analise a performance dos VEÍCULOS dentro de cada campanha vs seus benchmarks específicos. Destaque os veículos com melhor e pior performance. Cite números específicos. Identifique padrões claros (ex: todos os veículos de uma campanha estão abaixo do bench).

IMPORTANTE:
- Seja direto e factual
- NÃO dê sugestões ou recomendações
- Foque na LEITURA do que está acontecendo
- Use português profissional
- Cite números específicos
- Máximo 2 parágrafos
  `;
};

/**
 * Formata número de forma legível
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
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
 * @param forceRefresh Se true, ignora o cache e gera uma nova análise
 */
export const generateWeeklyAnalysis = async (
  currentWeekData: ProcessedCampaignData[],
  allData: ProcessedCampaignData[],
  dataKey: string,
  forceRefresh: boolean = false
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

    // 1. Tenta buscar do cache (se não for refresh forçado)
    if (!forceRefresh) {
      const cached = await getCachedAnalysis(dataKey);
      if (cached) {
        return cached;
      }
    } else {
      console.log('🔄 Forçando nova análise (ignorando cache)...');
    }

    // 2. Se não encontrou no cache ou foi forçado refresh, gera nova análise
    console.log('🔄 Gerando nova análise...');

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
    const prompt = await buildAnalysisPrompt(
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
