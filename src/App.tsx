import { useState, useMemo, useEffect } from 'react';
import { CampaignProvider, useCampaign } from './contexts/CampaignContext';
import Header from './components/Header';
import BigNumbers from './components/BigNumbers';
import CampaignList from './components/CampaignList';
import ImpressionsChart from './components/ImpressionsChart';
import Filters from './components/Filters';
import VehicleMetrics from './components/VehicleMetrics';
import CreativePerformance from './components/CreativePerformance';
import SearchTermsAnalysis from './components/SearchTermsAnalysis';
import ComparisonToggle from './components/ComparisonToggle';
import AIAnalysis from './components/AIAnalysis';
import { fetchSearchTermsData } from './services/api';
import { ProcessedSearchData } from './types/campaign';
import { subDays } from 'date-fns';

const DashboardContent = () => {
  const { loading, error, campaigns, filteredData, filters, data } = useCampaign();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'7days' | 'all'>('7days');
  const [comparisonMode, setComparisonMode] = useState<'benchmark' | 'previous'>('benchmark');
  const [searchTermsData, setSearchTermsData] = useState<ProcessedSearchData[]>([]);
  const [loadingSearchTerms, setLoadingSearchTerms] = useState(false);

  // Load search terms data
  useEffect(() => {
    const loadSearchTerms = async () => {
      try {
        setLoadingSearchTerms(true);
        const data = await fetchSearchTermsData();
        setSearchTermsData(data);
      } catch (err) {
        console.error('Erro ao carregar termos de busca:', err);
      } finally {
        setLoadingSearchTerms(false);
      }
    };

    loadSearchTerms();
  }, []);

  // Calcula os benchmarks gerais a partir de TODOS os dados (sem filtros) - CÁLCULO LOCAL
  const generalBenchmarks = useMemo(() => {
    const totalImpressoes = data.reduce((sum, item) => sum + item.impressions, 0);
    const totalCliques = data.reduce((sum, item) => sum + item.clicks, 0);
    const totalVideoCompletions = data.reduce((sum, item) => sum + item.videoCompletions, 0);
    const totalEngajamento = data.reduce((sum, item) => sum + item.totalEngagements, 0);

    return {
      ctr: totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0,
      vtr: totalImpressoes > 0 ? (totalVideoCompletions / totalImpressoes) * 100 : 0,
      taxaEngajamento: totalImpressoes > 0 ? (totalEngajamento / totalImpressoes) * 100 : 0
    };
  }, [data]);

  // Calcula os benchmarks por veículo a partir de TODOS os dados (sem filtros)
  const vehicleBenchmarks = useMemo(() => {
    const benchmarksByVehicle = new Map<string, { ctr: number; vtr: number; taxaEngajamento: number }>();

    // Agrupa dados por veículo
    const vehicleMap = new Map<string, {
      impressoes: number;
      cliques: number;
      videoCompletions: number;
      engajamento: number;
    }>();

    data.forEach(item => {
      const veiculo = item.veiculo;
      if (!veiculo) return;

      if (vehicleMap.has(veiculo)) {
        const existing = vehicleMap.get(veiculo)!;
        existing.impressoes += item.impressions;
        existing.cliques += item.clicks;
        existing.videoCompletions += item.videoCompletions;
        existing.engajamento += item.totalEngagements;
      } else {
        vehicleMap.set(veiculo, {
          impressoes: item.impressions,
          cliques: item.clicks,
          videoCompletions: item.videoCompletions,
          engajamento: item.totalEngagements
        });
      }
    });

    // Calcula métricas para cada veículo
    vehicleMap.forEach((metrics, veiculo) => {
      benchmarksByVehicle.set(veiculo, {
        ctr: metrics.impressoes > 0 ? (metrics.cliques / metrics.impressoes) * 100 : 0,
        vtr: metrics.impressoes > 0 ? (metrics.videoCompletions / metrics.impressoes) * 100 : 0,
        taxaEngajamento: metrics.impressoes > 0 ? (metrics.engajamento / metrics.impressoes) * 100 : 0
      });
    });

    return benchmarksByVehicle;
  }, [data]);

  const displayData = useMemo(() => {
    let filteredDataCopy = filteredData;

    // Sempre exclui o dia atual (considera apenas até D-1)
    const yesterday = subDays(new Date(), 1);
    filteredDataCopy = filteredDataCopy.filter(item => item.date <= yesterday);

    // Filter by period
    if (periodFilter === '7days') {
      const sevenDaysAgo = subDays(yesterday, 7);
      filteredDataCopy = filteredDataCopy.filter(item => item.date >= sevenDaysAgo);
    }

    // Filter by selected campaign
    if (selectedCampaign) {
      filteredDataCopy = filteredDataCopy.filter(d => d.campanha === selectedCampaign);
    }

    return filteredDataCopy;
  }, [filteredData, selectedCampaign, periodFilter]);

  // Calcula as métricas do período anterior (para comparação)
  const previousPeriodMetrics = useMemo(() => {
    if (periodFilter !== '7days') return null;

    const yesterday = subDays(new Date(), 1);
    const sevenDaysAgo = subDays(yesterday, 7);
    const fourteenDaysAgo = subDays(yesterday, 14);

    let previousData = filteredData.filter(item =>
      item.date >= fourteenDaysAgo && item.date < sevenDaysAgo
    );

    if (selectedCampaign) {
      previousData = previousData.filter(d => d.campanha === selectedCampaign);
    }

    const totalInvestimento = previousData.reduce((sum, item) => sum + item.cost, 0);
    const totalImpressoes = previousData.reduce((sum, item) => sum + item.impressions, 0);
    const totalCliques = previousData.reduce((sum, item) => sum + item.clicks, 0);
    const totalViews = previousData.reduce((sum, item) => sum + item.videoViews, 0);
    const totalEngajamento = previousData.reduce((sum, item) => sum + item.totalEngagements, 0);
    const totalVideoCompletions = previousData.reduce((sum, item) => sum + item.videoCompletions, 0);

    return {
      investimento: totalInvestimento,
      impressoes: totalImpressoes,
      cliques: totalCliques,
      views: totalViews,
      engajamento: totalEngajamento,
      cpm: totalImpressoes > 0 ? (totalInvestimento / totalImpressoes) * 1000 : 0,
      cpc: totalCliques > 0 ? totalInvestimento / totalCliques : 0,
      cpv: totalViews > 0 ? totalInvestimento / totalViews : 0,
      cpe: totalEngajamento > 0 ? totalInvestimento / totalEngajamento : 0,
      ctr: totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0,
      vtr: totalImpressoes > 0 ? (totalVideoCompletions / totalImpressoes) * 100 : 0,
      taxaEngajamento: totalImpressoes > 0 ? (totalEngajamento / totalImpressoes) * 100 : 0
    };
  }, [filteredData, selectedCampaign, periodFilter]);

  const displayMetrics = useMemo(() => {
    // Calculate metrics based on displayData (which includes period filter)
    const totalInvestimento = displayData.reduce((sum, item) => sum + item.cost, 0);
    const totalInvestimentoReal = displayData.reduce((sum, item) => sum + (item.realInvestment || 0), 0);
    const totalImpressoes = displayData.reduce((sum, item) => sum + item.impressions, 0);
    const totalCliques = displayData.reduce((sum, item) => sum + item.clicks, 0);
    const totalViews = displayData.reduce((sum, item) => sum + item.videoViews, 0);
    const totalEngajamento = displayData.reduce((sum, item) => sum + item.totalEngagements, 0);
    const totalVideoCompletions = displayData.reduce((sum, item) => sum + item.videoCompletions, 0);

    const ctr = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
    const vtr = totalImpressoes > 0 ? (totalVideoCompletions / totalImpressoes) * 100 : 0;
    const taxaEngajamento = totalImpressoes > 0 ? (totalEngajamento / totalImpressoes) * 100 : 0;

    return {
      investimento: totalInvestimento,
      investimentoReal: totalInvestimentoReal,
      impressoes: totalImpressoes,
      cliques: totalCliques,
      views: totalViews,
      engajamento: totalEngajamento,
      cpm: totalImpressoes > 0 ? (totalInvestimento / totalImpressoes) * 1000 : 0,
      cpc: totalCliques > 0 ? totalInvestimento / totalCliques : 0,
      cpv: totalViews > 0 ? totalInvestimento / totalViews : 0,
      cpe: totalEngajamento > 0 ? totalInvestimento / totalEngajamento : 0,
      ctr,
      vtr,
      taxaEngajamento
    };
  }, [displayData]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.veiculo.length > 0) count += filters.veiculo.length;
    if (filters.tipoDeCompra.length > 0) count += filters.tipoDeCompra.length;
    if (filters.campanha.length > 0) count += filters.campanha.length;
    return count;
  }, [filters]);

  const handleSelectCampaign = (campaignName: string) => {
    setSelectedCampaign(campaignName === selectedCampaign ? null : (campaignName || null));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onOpenFilters={() => setIsFiltersOpen(true)} activeFiltersCount={activeFiltersCount} />
      <Filters isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-600">Resultados</h2>

              <div className="flex items-center gap-4">
                {/* Botões de Período */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPeriodFilter('7days')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      periodFilter === '7days'
                        ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                        : 'bg-white/60 backdrop-blur-md text-gray-700 border border-gray-200/50 hover:bg-white/80'
                    }`}
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    onClick={() => setPeriodFilter('all')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      periodFilter === 'all'
                        ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                        : 'bg-white/60 backdrop-blur-md text-gray-700 border border-gray-200/50 hover:bg-white/80'
                    }`}
                  >
                    Todo o período
                  </button>
                </div>

                {/* Divisória */}
                {periodFilter === '7days' && (
                  <>
                    <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

                    {/* Botões de Comparação */}
                    <ComparisonToggle
                      comparisonMode={comparisonMode}
                      onModeChange={setComparisonMode}
                    />
                  </>
                )}
              </div>
            </div>
            <BigNumbers
              metrics={displayMetrics}
              filters={filters}
              periodFilter={periodFilter}
              generalBenchmarks={generalBenchmarks}
              comparisonMode={comparisonMode}
              previousPeriodMetrics={previousPeriodMetrics}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-stretch">
            <div className="lg:col-span-4 flex">
              <div className="w-full">
                <CampaignList
                  campaigns={campaigns}
                  selectedCampaign={selectedCampaign}
                  onSelectCampaign={handleSelectCampaign}
                />
              </div>
            </div>

            <div className="lg:col-span-8 flex">
              <div className="w-full">
                <ImpressionsChart
                  data={displayData}
                  allData={filteredData}
                  periodFilter={periodFilter}
                  comparisonMode={comparisonMode}
                  showComparison={periodFilter === '7days'}
                />
              </div>
            </div>
          </div>

          <div>
            <VehicleMetrics
              data={filteredData}
              selectedCampaign={selectedCampaign}
              periodFilter={periodFilter}
              filters={filters}
              vehicleBenchmarks={vehicleBenchmarks}
            />
          </div>

          <div>
            <AIAnalysis
              data={displayData}
              allData={filteredData}
              periodFilter={periodFilter}
              selectedCampaign={selectedCampaign}
            />
          </div>

          <div>
            <CreativePerformance
              data={filteredData}
              selectedCampaign={selectedCampaign}
              periodFilter={periodFilter}
            />
          </div>

          {!loadingSearchTerms && searchTermsData.length > 0 && (
            <div>
              <SearchTermsAnalysis
                data={searchTermsData}
                selectedCampaign={selectedCampaign}
                periodFilter={periodFilter}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <CampaignProvider>
      <DashboardContent />
    </CampaignProvider>
  );
}

export default App;
