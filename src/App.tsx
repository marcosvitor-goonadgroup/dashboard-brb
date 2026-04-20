import { useState, useMemo, useEffect } from 'react';
import { CampaignProvider, useCampaign } from './contexts/CampaignContext';
import CampaignDashboard from './pages/CampaignDashboard';
import PIDashboard from './pages/PIDashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import BigNumbers from './components/BigNumbers';
import ImpressionsChart from './components/ImpressionsChart';
import Filters from './components/Filters';
import VehicleMetrics from './components/VehicleMetrics';
import CreativePerformance from './components/CreativePerformance';
import SearchTermsAnalysis from './components/SearchTermsAnalysis';
import ComparisonToggle from './components/ComparisonToggle';
import AIAnalysis from './components/AIAnalysis';
import OnDemandAnalysis from './components/OnDemandAnalysis';
import CreativeAnalysis from './components/CreativeAnalysis';
import ParticlesBackground from './components/ParticlesBackground';
import PIInfoCard from './components/PIInfoCard';
import ClientCampaignList from './components/ClientCampaignList';
import { fetchSearchTermsData } from './services/api';
import { ProcessedSearchData } from './types/campaign';
import { subDays, format } from 'date-fns';

const DashboardContent = () => {
  const { loading, error, filteredData, filters, setFilters, data } = useCampaign();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'7days' | 'all'>('7days');
  const [comparisonMode, setComparisonMode] = useState<'benchmark' | 'previous'>('benchmark');
  const [searchTermsData, setSearchTermsData] = useState<ProcessedSearchData[]>([]);
  const [loadingSearchTerms, setLoadingSearchTerms] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedPI, setSelectedPI] = useState<string | null>(null);

  useEffect(() => {
    const loadSearchTerms = async () => {
      try {
        setLoadingSearchTerms(true);
        const result = await fetchSearchTermsData();
        setSearchTermsData(result);
      } catch (err) {
        console.error('Erro ao carregar termos de busca:', err);
      } finally {
        setLoadingSearchTerms(false);
      }
    };
    loadSearchTerms();
  }, []);

  useEffect(() => {
    if (filters.dateRange.start || filters.dateRange.end) {
      setPeriodFilter('all');
    }
  }, [filters.dateRange.start, filters.dateRange.end]);

  const maxAvailableDate = useMemo(() => {
    const yesterday = subDays(new Date(), 1);
    const datesInData = data.map(item => item.date).filter(date => date <= yesterday);
    if (datesInData.length === 0) return yesterday;
    return new Date(Math.max(...datesInData.map(d => d.getTime())));
  }, [data]);

  const sevenDaysAgoFromMaxDate = useMemo(() => subDays(maxAvailableDate, 7), [maxAvailableDate]);

  const minAvailableDate = useMemo(() => {
    if (data.length === 0) return new Date();
    return new Date(Math.min(...data.map(d => d.date.getTime())));
  }, [data]);

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

  const vehicleBenchmarks = useMemo(() => {
    const benchmarksByVehicle = new Map<string, { ctr: number; vtr: number; taxaEngajamento: number }>();
    const vehicleMap = new Map<string, { impressoes: number; cliques: number; videoCompletions: number; engajamento: number }>();

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

    const yesterday = subDays(new Date(), 1);
    filteredDataCopy = filteredDataCopy.filter(item => item.date <= yesterday);

    if (periodFilter === '7days') {
      filteredDataCopy = filteredDataCopy.filter(item => item.date >= sevenDaysAgoFromMaxDate);
    }

    if (selectedVehicle) {
      filteredDataCopy = filteredDataCopy.filter(d => d.veiculo === selectedVehicle);
    }

    if (selectedPI) {
      filteredDataCopy = filteredDataCopy.filter(d => d.numeroPi === selectedPI);
    }

    return filteredDataCopy;
  }, [filteredData, periodFilter, selectedVehicle, selectedPI, sevenDaysAgoFromMaxDate]);

  const previousPeriodMetrics = useMemo(() => {
    if (periodFilter !== '7days') return null;
    const fourteenDaysAgoFromMaxDate = subDays(maxAvailableDate, 14);

    let previousData = filteredData.filter(item =>
      item.date >= fourteenDaysAgoFromMaxDate && item.date < sevenDaysAgoFromMaxDate
    );

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
  }, [filteredData, periodFilter, maxAvailableDate, sevenDaysAgoFromMaxDate]);

  const displayMetrics = useMemo(() => {
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
    if (filters.numeroPi) count++;
    if (selectedVehicle) count++;
    if (selectedPI) count++;
    return count;
  }, [filters, selectedVehicle, selectedPI]);

  const handleClearFilters = () => {
    setSelectedVehicle(null);
    setSelectedPI(null);
    setFilters({
      dateRange: { start: null, end: null },
      veiculo: [],
      tipoDeCompra: [],
      campanha: [],
      numeroPi: null
    });
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
    <div className="min-h-screen bg-[#f1f1f1] relative">
      <ParticlesBackground />
      <div className="relative z-10 max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-3 sm:pb-6">
        <Header
          onOpenFilters={() => setIsFiltersOpen(true)}
          onClearFilters={handleClearFilters}
          activeFiltersCount={activeFiltersCount}
        />
        <Filters isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} />

        <main>
          <div className="space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600">
                  Resultados{' '}
                  <span className="text-gray-400 font-normal">
                    {format(periodFilter === '7days' ? sevenDaysAgoFromMaxDate : minAvailableDate, 'dd/MM/yyyy')} à {format(maxAvailableDate, 'dd/MM/yyyy')}
                  </span>
                </h2>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => setPeriodFilter('7days')}
                      className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                        periodFilter === '7days'
                          ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                          : 'bg-white/60 backdrop-blur-md text-gray-700 border border-gray-200/50 hover:bg-white/80'
                      }`}
                    >
                      <span className="hidden sm:inline">Últimos 7 dias</span>
                      <span className="sm:hidden">7 dias</span>
                    </button>
                    <button
                      onClick={() => setPeriodFilter('all')}
                      className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                        periodFilter === 'all'
                          ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                          : 'bg-white/60 backdrop-blur-md text-gray-700 border border-gray-200/50 hover:bg-white/80'
                      }`}
                    >
                      <span className="hidden sm:inline">Todo o período</span>
                      <span className="sm:hidden">Tudo</span>
                    </button>
                  </div>

                  {periodFilter === '7days' && (
                    <>
                      <div className="hidden sm:block h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
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
                selectedPI={selectedPI}
              />
            </div>

            {selectedPI && (
              <div>
                <PIInfoCard numeroPi={selectedPI} campaignData={displayData} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-6 items-stretch">
              <ClientCampaignList
                data={filteredData.filter(item => {
                  const yesterday = subDays(new Date(), 1);
                  return item.date <= yesterday;
                })}
                selectedPI={selectedPI}
                onSelectPI={setSelectedPI}
              />
              <ImpressionsChart
                data={displayData}
                allData={filteredData}
                periodFilter={periodFilter}
                comparisonMode={comparisonMode}
                showComparison={periodFilter === '7days'}
                maxAvailableDate={maxAvailableDate}
                sevenDaysAgoFromMaxDate={sevenDaysAgoFromMaxDate}
              />
            </div>

            <div>
              <VehicleMetrics
                data={displayData}
                selectedCampaign={null}
                periodFilter={periodFilter}
                filters={filters}
                vehicleBenchmarks={vehicleBenchmarks}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={setSelectedVehicle}
                selectedPI={selectedPI}
              />
            </div>

            <div>
              <AIAnalysis
                data={displayData}
                allData={filteredData}
                periodFilter={periodFilter}
                selectedCampaign={null}
              />
            </div>

            <div>
              <OnDemandAnalysis
                data={displayData}
                allData={data}
                periodFilter={periodFilter}
              />
            </div>

            <div>
              <CreativePerformance
                data={displayData}
              />
            </div>

            <div>
              <CreativeAnalysis
                data={displayData}
                periodFilter={periodFilter}
                selectedCampaign={null}
              />
            </div>

            {!loadingSearchTerms && searchTermsData.length > 0 && (
              <div>
                <SearchTermsAnalysis
                  data={searchTermsData}
                  selectedCampaign={null}
                  periodFilter={periodFilter}
                />
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

function App() {
  const pathname = window.location.pathname;
  const parts = pathname.replace(/^\//, '').split('/').filter(Boolean).map(decodeURIComponent);
  const campaignSlug = parts[0] || '';
  const piSlug = parts[1] || '';

  if (campaignSlug && piSlug) {
    return <PIDashboard campaignSlug={campaignSlug} piSlug={piSlug} />;
  }

  if (campaignSlug) {
    return <CampaignDashboard campaignSlug={campaignSlug} />;
  }

  return (
    <CampaignProvider>
      <DashboardContent />
    </CampaignProvider>
  );
}

export default App;
