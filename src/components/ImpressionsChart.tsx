import { useMemo, useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProcessedCampaignData } from '../types/campaign';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImpressionsChartProps {
  data: ProcessedCampaignData[]; // Dados já filtrados pelo período
  allData?: ProcessedCampaignData[]; // Todos os dados (para calcular período anterior)
  periodFilter: '7days' | 'all';
  comparisonMode?: 'benchmark' | 'previous';
  showComparison?: boolean;
}

type MetricType = 'impressoes' | 'cliques' | 'views' | 'engajamento' | 'ctr' | 'vtr' | 'taxaEngajamento';

const metricOptions = [
  { value: 'impressoes', label: 'Impressões' },
  { value: 'cliques', label: 'Cliques' },
  { value: 'views', label: 'Views' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'ctr', label: 'CTR' },
  { value: 'vtr', label: 'VTR' },
  { value: 'taxaEngajamento', label: 'Taxa Engajamento' }
];

const ImpressionsChart = ({ data, allData, periodFilter, comparisonMode = 'benchmark', showComparison = false }: ImpressionsChartProps) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('impressoes');

  // Sempre considera D-1 (ontem) como o dia mais recente
  const yesterday = useMemo(() => subDays(new Date(), 1), []);
  const sevenDaysAgo = useMemo(() => subDays(yesterday, 7), []);
  const fourteenDaysAgo = useMemo(() => subDays(yesterday, 14), []);

  // Usa allData se disponível, senão usa data (para manter compatibilidade)
  const sourceData = allData || data;

  // Função auxiliar para processar dados de um período
  const processDataForPeriod = (filteredData: ProcessedCampaignData[]) => {
    const aggregatedData = filteredData.reduce((acc, item) => {
      const dateKey = format(item.date, 'dd/MM/yyyy', { locale: ptBR });

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          impressoes: 0,
          investimento: 0,
          cliques: 0,
          views: 0,
          engajamento: 0,
          totalImpressions: 0,
          videoCompletions: 0,
          dateObj: item.date
        };
      }

      acc[dateKey].impressoes += item.impressions;
      acc[dateKey].investimento += item.cost;
      acc[dateKey].cliques += item.clicks;
      acc[dateKey].views += item.videoViews;
      acc[dateKey].engajamento += item.totalEngagements;
      acc[dateKey].totalImpressions += item.impressions;
      acc[dateKey].videoCompletions += item.videoCompletions;

      return acc;
    }, {} as Record<string, { date: string; impressoes: number; investimento: number; cliques: number; views: number; engajamento: number; totalImpressions: number; videoCompletions: number; dateObj: Date }>);

    return Object.values(aggregatedData)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(({ date, impressoes, investimento, cliques, views, engajamento, totalImpressions, videoCompletions }) => ({
        date,
        impressoes,
        investimento,
        cliques,
        views,
        engajamento,
        cpm: totalImpressions > 0 ? (investimento / totalImpressions) * 1000 : 0,
        cpc: cliques > 0 ? investimento / cliques : 0,
        cpv: views > 0 ? investimento / views : 0,
        cpe: engajamento > 0 ? investimento / engajamento : 0,
        ctr: totalImpressions > 0 ? (cliques / totalImpressions) * 100 : 0,
        vtr: totalImpressions > 0 ? (videoCompletions / totalImpressions) * 100 : 0,
        taxaEngajamento: totalImpressions > 0 ? (engajamento / totalImpressions) * 100 : 0
      }));
  };

  const chartData = useMemo(() => {
    const currentPeriodData = periodFilter === '7days'
      ? data.filter(item => item.date >= sevenDaysAgo && item.date <= yesterday)
      : data.filter(item => item.date <= yesterday);

    const currentData = processDataForPeriod(currentPeriodData);

    // Se não estiver no modo de comparação com período anterior, retorna apenas dados atuais
    if (comparisonMode !== 'previous' || !showComparison || periodFilter !== '7days') {
      return currentData;
    }

    // Calcula dados do período anterior (7 dias antes) usando sourceData (dados completos)
    const previousPeriodData = sourceData.filter(item =>
      item.date >= fourteenDaysAgo && item.date < sevenDaysAgo
    );

    const previousData = processDataForPeriod(previousPeriodData);

    console.log('🔍 Debug - Período atual:', {
      inicio: sevenDaysAgo,
      fim: new Date(),
      registros: currentPeriodData.length,
      dataProcessada: currentData.length
    });

    console.log('🔍 Debug - Período anterior:', {
      inicio: fourteenDaysAgo,
      fim: sevenDaysAgo,
      registros: previousPeriodData.length,
      dataProcessada: previousData.length
    });

    console.log('📅 Dados do período atual:', currentData);
    console.log('📅 Dados do período anterior:', previousData);

    // Se não houver dados do período anterior, retorna apenas os dados atuais
    if (previousData.length === 0) {
      console.warn('⚠️ Não há dados disponíveis para o período anterior. Mostrando apenas período atual.');
      return currentData;
    }

    // Cria um array combinado com TODAS as datas em ordem cronológica
    // Período anterior primeiro, depois período atual
    const combinedData = [
      // Adiciona dados do período anterior (com valores apenas para linha amarela)
      ...previousData.map(item => ({
        date: item.date,
        // Valores do período anterior vão para a linha amarela
        impressoes_anterior: item.impressoes,
        cliques_anterior: item.cliques,
        views_anterior: item.views,
        engajamento_anterior: item.engajamento,
        ctr_anterior: item.ctr,
        vtr_anterior: item.vtr,
        taxaEngajamento_anterior: item.taxaEngajamento,
        // Deixa undefined para não mostrar linha azul nesse período
        impressoes: undefined,
        cliques: undefined,
        views: undefined,
        engajamento: undefined,
        ctr: undefined,
        vtr: undefined,
        taxaEngajamento: undefined,
        investimento: undefined
      })),
      // Adiciona dados do período atual (com valores apenas para linha azul)
      ...currentData.map(item => ({
        date: item.date,
        // Valores do período atual vão para a linha azul
        impressoes: item.impressoes,
        cliques: item.cliques,
        views: item.views,
        engajamento: item.engajamento,
        ctr: item.ctr,
        vtr: item.vtr,
        taxaEngajamento: item.taxaEngajamento,
        investimento: item.investimento,
        // Deixa undefined para não mostrar linha amarela nesse período
        impressoes_anterior: undefined,
        cliques_anterior: undefined,
        views_anterior: undefined,
        engajamento_anterior: undefined,
        ctr_anterior: undefined,
        vtr_anterior: undefined,
        taxaEngajamento_anterior: undefined
      }))
    ];

    console.log('📊 Dados combinados para o gráfico:', combinedData);
    console.log('📊 Primeiro item (período anterior):', combinedData[0]);
    console.log('📊 Item do meio (transição):', combinedData[Math.floor(combinedData.length / 2)]);
    console.log('📊 Último item (período atual):', combinedData[combinedData.length - 1]);

    return combinedData;
  }, [data, sourceData, yesterday, sevenDaysAgo, fourteenDaysAgo, periodFilter, comparisonMode, showComparison, selectedMetric]);

  const formatYAxis = (value: number) => {
    const isPercentage = ['ctr', 'vtr', 'taxaEngajamento'].includes(selectedMetric);
    const isCurrency = ['investimento', 'cpm', 'cpc', 'cpv', 'cpe'].includes(selectedMetric);

    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }

    if (isCurrency) {
      if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(1)} mil`;
      }
      return `R$ ${value.toFixed(0)}`;
    }

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} mi`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)} mil`;
    }
    return value.toString();
  };

  const formatTooltip = (value: number) => {
    const isPercentage = ['ctr', 'vtr', 'taxaEngajamento'].includes(selectedMetric);
    const isCurrency = ['investimento', 'cpm', 'cpc', 'cpv', 'cpe'].includes(selectedMetric);

    if (isPercentage) {
      return `${value.toFixed(2)}%`;
    }

    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const selectedMetricLabel = metricOptions.find(m => m.value === selectedMetric)?.label || 'Impressões';

  // Verifica se há dados do período anterior disponíveis
  const hasPreviousPeriodData = useMemo(() => {
    if (comparisonMode !== 'previous' || !showComparison || periodFilter !== '7days') {
      return true; // Não precisa mostrar aviso se não está no modo de comparação
    }

    const previousPeriodData = sourceData.filter(item =>
      item.date >= fourteenDaysAgo && item.date < sevenDaysAgo
    );

    return previousPeriodData.length > 0;
  }, [sourceData, fourteenDaysAgo, sevenDaysAgo, periodFilter, comparisonMode, showComparison]);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-800 flex-shrink-0">
            {selectedMetricLabel} vs Data
          </h2>

          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {metricOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Aviso quando não há dados do período anterior */}
        {comparisonMode === 'previous' && showComparison && periodFilter === '7days' && !hasPreviousPeriodData && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Não há dados disponíveis para o período anterior (19/11 a 26/11). Mostrando apenas o período atual.
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              {/* Gradiente para a área do período atual */}
              <linearGradient id="colorCurrentPeriod" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05}/>
              </linearGradient>
              {/* Gradiente para a área do período anterior */}
              <linearGradient id="colorPreviousPeriod" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              animationDuration={150}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            {/* Renderiza período anterior PRIMEIRO para aparecer primeiro na legenda */}
            {comparisonMode === 'previous' && showComparison && periodFilter === '7days' && (
              <>
                {/* Área preenchida do período anterior */}
                <Area
                  type="monotone"
                  dataKey={`${selectedMetric}_anterior`}
                  fill="url(#colorPreviousPeriod)"
                  stroke="none"
                  connectNulls={true}
                  legendType="none"
                  isAnimationActive={true}
                  animationDuration={300}
                  animationEasing="ease-in-out"
                />
                {/* Linha do período anterior */}
                <Line
                  type="monotone"
                  dataKey={`${selectedMetric}_anterior`}
                  stroke="#fbbf24"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: '#fbbf24', r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={true}
                  isAnimationActive={true}
                  animationDuration={300}
                  animationEasing="ease-in-out"
                  name={`${selectedMetricLabel} (Período Anterior)`}
                />
              </>
            )}

            {/* Área preenchida do período atual */}
            <Area
              type="monotone"
              dataKey={selectedMetric}
              fill="url(#colorCurrentPeriod)"
              stroke="none"
              legendType="none"
              isAnimationActive={true}
              animationDuration={300}
              animationEasing="ease-in-out"
            />
            {/* Linha do período atual */}
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ fill: '#0ea5e9', r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
              animationDuration={300}
              animationEasing="ease-in-out"
              name={selectedMetricLabel}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ImpressionsChart;
