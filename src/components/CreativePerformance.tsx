import { useMemo, useState } from 'react';
import { ProcessedCampaignData } from '../types/campaign';
import { getBenchmarkByVehicleAndType } from '../config/benchmarks';
import BenchmarkIndicator from './BenchmarkIndicator';

interface CreativePerformanceProps {
  data: ProcessedCampaignData[];
  selectedCampaign: string | null;
}

interface CreativeData {
  name: string;
  campanha: string;
  veiculo: string;
  tipoDeCompra: string;
  impressoes: number;
  cliques: number;
  views: number;
  engajamento: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)} mi`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} mil`;
  }
  return num.toFixed(0);
};

const CreativePerformance = ({ data, selectedCampaign }: CreativePerformanceProps) => {
  const [selectedVeiculo, setSelectedVeiculo] = useState<string>('all');
  const [selectedTipoCompra, setSelectedTipoCompra] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Extract unique values for filters
  const { veiculos, tiposCompra } = useMemo(() => {
    const campanhasSet = new Set<string>();
    const veiculosSet = new Set<string>();
    const tiposCompraSet = new Set<string>();

    data.forEach(item => {
      if (item.campanha) campanhasSet.add(item.campanha);
      if (item.veiculo) veiculosSet.add(item.veiculo);
      if (item.tipoDeCompra) tiposCompraSet.add(item.tipoDeCompra);
    });

    return {
      campanhas: Array.from(campanhasSet).sort(),
      veiculos: Array.from(veiculosSet).sort(),
      tiposCompra: Array.from(tiposCompraSet).sort()
    };
  }, [data]);

  // Filter and aggregate data by creative (adName)
  const creativeData = useMemo(() => {
    let filteredData = data;

    // Apply filter from parent component (CampaignList selection)
    if (selectedCampaign) {
      filteredData = filteredData.filter(d => d.campanha === selectedCampaign);
    }
    if (selectedVeiculo !== 'all') {
      filteredData = filteredData.filter(d => d.veiculo === selectedVeiculo);
    }
    if (selectedTipoCompra !== 'all') {
      filteredData = filteredData.filter(d => d.tipoDeCompra === selectedTipoCompra);
    }

    // Aggregate by creative (adName)
    const aggregated = filteredData.reduce((acc, item) => {
      const key = item.adName || 'Sem nome';

      if (!acc[key]) {
        acc[key] = {
          name: key,
          campanha: item.campanha,
          veiculo: item.veiculo,
          tipoDeCompra: item.tipoDeCompra,
          impressoes: 0,
          cliques: 0,
          views: 0,
          engajamento: 0,
          videoCompletions: 0
        };
      }

      acc[key].impressoes += item.impressions;
      acc[key].cliques += item.clicks;
      acc[key].views += item.videoViews;
      acc[key].engajamento += item.totalEngagements;
      acc[key].videoCompletions += item.videoCompletions;

      return acc;
    }, {} as Record<string, any>);

    // Calculate metrics and convert to array
    let creativesArray = Object.values(aggregated)
      .map((item: any) => {
        const ctr = item.impressoes > 0 ? (item.cliques / item.impressoes) * 100 : 0;
        const vtr = item.impressoes > 0 ? (item.videoCompletions / item.impressoes) * 100 : 0;
        const taxaEngajamento = item.impressoes > 0 ? (item.engajamento / item.impressoes) * 100 : 0;
       
        return {
          name: item.name,
          campanha: item.campanha,
          veiculo: item.veiculo,
          tipoDeCompra: item.tipoDeCompra,
          impressoes: item.impressoes,
          cliques: item.cliques,
          views: item.views,
          engajamento: item.engajamento,
          ctr,
          vtr,
          taxaEngajamento
        };
      })
      .sort((a, b) => b.impressoes - a.impressoes) as CreativeData[];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      creativesArray = creativesArray.filter(creative =>
        creative.name.toLowerCase().includes(query) ||
        creative.veiculo.toLowerCase().includes(query) ||
        creative.tipoDeCompra.toLowerCase().includes(query)
      );
    }

    return creativesArray;
  }, [data, selectedCampaign, selectedVeiculo, selectedTipoCompra, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(creativeData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return creativeData.slice(startIndex, startIndex + itemsPerPage);
  }, [creativeData, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [selectedVeiculo, selectedTipoCompra, searchQuery, selectedCampaign]);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Performance de Criativos
        </h2>

        {/* Filters - New Layout */}
        <div className="flex gap-4 items-end">
          {/* Search Bar - 40% */}
          <div className="flex-[0.4]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Pesquisar
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, veículo ou tipo de compra..."
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Veículo - 30% */}
          <div className="flex-[0.3]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Veículo
            </label>
            <select
              value={selectedVeiculo}
              onChange={(e) => setSelectedVeiculo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os veículos</option>
              {veiculos.map(veiculo => (
                <option key={veiculo} value={veiculo}>
                  {veiculo}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Compra - 30% */}
          <div className="flex-[0.3]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipo de Compra
            </label>
            <select
              value={selectedTipoCompra}
              onChange={(e) => setSelectedTipoCompra(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os tipos</option>
              {tiposCompra.map(tipo => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {creativeData.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          Nenhum criativo encontrado com os filtros selecionados
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                      Criativo
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                      Impressões
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                      Views
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                      Engajamento
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                      Cliques
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                      VTR
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                      Tx. Eng.
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      CTR
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedData.map((creative, index) => (
                    <tr
                      key={`${creative.name}-${index}`}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="py-3 px-4 max-w-xs border-r border-gray-200">
                        <div className="font-medium text-gray-900 truncate text-center">
                          {creative.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate text-center">
                          {creative.veiculo} • {creative.tipoDeCompra}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-200">
                        {formatNumber(creative.impressoes)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-200">
                        {formatNumber(creative.views)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-200">
                        {formatNumber(creative.engajamento)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-200">
                        {formatNumber(creative.cliques)}
                      </td>
                      <td className="py-3 px-4 border-r border-gray-200">
                        <div className="flex items-center justify-center">
                          {(() => {
                            const benchmark = getBenchmarkByVehicleAndType(creative.veiculo, creative.tipoDeCompra);
                            return benchmark ? (
                              <BenchmarkIndicator
                                value={creative.vtr}
                                benchmark={benchmark.vtr}
                                format="percentage"
                                hidePercentageDiff={true}
                              />
                            ) : (
                              <span className="font-medium text-gray-700">
                                {creative.vtr.toFixed(2)}%
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-gray-200">
                        <div className="flex items-center justify-center">
                          {(() => {
                            const benchmark = getBenchmarkByVehicleAndType(creative.veiculo, creative.tipoDeCompra);
                            return benchmark ? (
                              <BenchmarkIndicator
                                value={creative.taxaEngajamento}
                                benchmark={benchmark.taxaEngajamento}
                                format="percentage"
                                hidePercentageDiff={true}
                              />
                            ) : (
                              <span className="font-medium text-gray-700">
                                {creative.taxaEngajamento.toFixed(2)}%
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center">
                          {(() => {
                            const benchmark = getBenchmarkByVehicleAndType(creative.veiculo, creative.tipoDeCompra);
                            return benchmark ? (
                              <BenchmarkIndicator
                                value={creative.ctr}
                                benchmark={benchmark.ctr}
                                format="percentage"
                                hidePercentageDiff={true}
                              />
                            ) : (
                              <span className="font-medium text-gray-700">
                                {creative.ctr.toFixed(2)}%
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, creativeData.length)} de {creativeData.length} {creativeData.length === 1 ? 'criativo' : 'criativos'}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === 1
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Anterior
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === totalPages
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CreativePerformance;
