import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProcessedCampaignData } from '../types/campaign';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImpressionsChartProps {
  data: ProcessedCampaignData[];
  periodFilter: '7days' | 'all';
  onPeriodFilterChange: (period: '7days' | 'all') => void;
}

type MetricType = 'impressoes' | 'investimento' | 'cliques' | 'views' | 'engajamento' | 'cpm' | 'cpc' | 'cpv' | 'cpe' | 'ctr' | 'vtr' | 'taxaEngajamento';

const metricOptions = [
  { value: 'impressoes', label: 'Impressões' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'cliques', label: 'Cliques' },
  { value: 'views', label: 'Views' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'cpm', label: 'CPM' },
  { value: 'cpc', label: 'CPC' },
  { value: 'cpv', label: 'CPV' },
  { value: 'cpe', label: 'CPE' },
  { value: 'ctr', label: 'CTR' },
  { value: 'vtr', label: 'VTR' },
  { value: 'taxaEngajamento', label: 'Taxa Engajamento' }
];

const ImpressionsChart = ({ data, periodFilter, onPeriodFilterChange }: ImpressionsChartProps) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('impressoes');

  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);

  const chartData = useMemo(() => {
    const filteredData = periodFilter === '7days'
      ? data.filter(item => item.date >= sevenDaysAgo)
      : data;

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
  }, [data, sevenDaysAgo, periodFilter]);

  const formatYAxis = (value: number) => {
    const isPercentage = ['ctr', 'vtr', 'taxaEngajamento'].includes(selectedMetric);
    const isCurrency = ['investimento', 'cpm', 'cpc', 'cpv', 'cpe'].includes(selectedMetric);

    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }

    if (isCurrency) {
      if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(1)}K`;
      }
      return `R$ ${value.toFixed(0)}`;
    }

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
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

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-800 flex-shrink-0">
            {selectedMetricLabel} vs Data
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPeriodFilterChange('7days')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                periodFilter === '7days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => onPeriodFilterChange('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                periodFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todo o período
            </button>
          </div>

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
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
            <Legend />
            <Line
              type="monotone"
              dataKey={selectedMetric}
              name={selectedMetricLabel}
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ fill: '#0ea5e9', r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
              animationDuration={300}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ImpressionsChart;
