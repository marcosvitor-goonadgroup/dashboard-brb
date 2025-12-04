import { useState, useMemo } from 'react';
import { useCampaign } from '../contexts/CampaignContext';
import { format, subDays } from 'date-fns';

interface FiltersProps {
  isOpen: boolean;
  onClose: () => void;
}

const Filters = ({ isOpen, onClose }: FiltersProps) => {
  const { filters, setFilters, availableFilters } = useCampaign();

  const [localFilters, setLocalFilters] = useState(filters);

  // Data máxima permitida é D-1 (ontem)
  const maxDate = useMemo(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'), []);

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = {
      dateRange: { start: null, end: null },
      veiculo: [],
      tipoDeCompra: [],
      campanha: []
    };
    setLocalFilters(clearedFilters);
    setFilters(clearedFilters);
  };

  const toggleArrayFilter = (key: 'veiculo' | 'tipoDeCompra' | 'campanha', value: string) => {
    setLocalFilters(prev => {
      const currentArray = prev[key];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-all duration-300 ease-in-out">
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Filtros</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                max={maxDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={localFilters.dateRange.start ? format(localFilters.dateRange.start, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    // Cria a data corretamente no fuso horário local
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const selectedDate = new Date(year, month - 1, day);
                    setLocalFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: selectedDate }
                    }));
                  } else {
                    setLocalFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: null }
                    }));
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                max={maxDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={localFilters.dateRange.end ? format(localFilters.dateRange.end, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    // Cria a data corretamente no fuso horário local
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const selectedDate = new Date(year, month - 1, day);
                    setLocalFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: selectedDate }
                    }));
                  } else {
                    setLocalFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: null }
                    }));
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Veículo
              </label>
              <div className="space-y-2">
                {availableFilters.veiculos.map(veiculo => (
                  <label key={veiculo} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localFilters.veiculo.includes(veiculo)}
                      onChange={() => toggleArrayFilter('veiculo', veiculo)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{veiculo}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Compra
              </label>
              <div className="space-y-2">
                {availableFilters.tiposDeCompra.map(tipo => (
                  <label key={tipo} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localFilters.tipoDeCompra.includes(tipo)}
                      onChange={() => toggleArrayFilter('tipoDeCompra', tipo)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{tipo}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Campanha
              </label>
              <div className="space-y-2">
                {availableFilters.campanhas.map(campanha => (
                  <label key={campanha} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localFilters.campanha.includes(campanha)}
                      onChange={() => toggleArrayFilter('campanha', campanha)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{campanha}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Limpar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Filters;
