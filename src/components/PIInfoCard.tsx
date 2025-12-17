import { useEffect, useState } from 'react';
import { PIInfo } from '../types/campaign';
import { fetchPIInfo } from '../services/api';

interface PIInfoCardProps {
  numeroPi: string | null;
}

const PIInfoCard = ({ numeroPi }: PIInfoCardProps) => {
  const [piInfo, setPiInfo] = useState<PIInfo[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPIInfo = async () => {
      if (!numeroPi) {
        setPiInfo(null);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchPIInfo(numeroPi);
        setPiInfo(data);
      } catch (error) {
        console.error('Erro ao carregar informações do PI:', error);
        setPiInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadPIInfo();
  }, [numeroPi]);

  if (!numeroPi) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Carregando informações do PI...</span>
        </div>
      </div>
    );
  }

  if (!piInfo || piInfo.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Informações do PI {numeroPi}
        </h3>
        <p className="text-gray-500">Nenhuma informação encontrada para este PI.</p>
      </div>
    );
  }

  // Pega informações gerais do primeiro registro (são comuns a todos os veículos)
  const firstInfo = piInfo[0];

  // Calcula investimento total previsto
  const totalInvestimento = piInfo.reduce((sum, info) => {
    const valor = parseFloat(info.totalBruto.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    return sum + valor;
  }, 0);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg border border-blue-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          PI {numeroPi}
        </h3>
        <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
          {firstInfo.status}
        </span>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Período</p>
          <p className="text-sm font-semibold text-gray-800">
            {firstInfo.inicio} a {firstInfo.fim}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Investimento Previsto</p>
          <p className="text-sm font-semibold text-gray-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvestimento)}
          </p>
        </div>
      </div>

      {/* Objetivo */}
      {firstInfo.objetivo && (
        <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Objetivo</p>
          <p className="text-sm text-gray-700 leading-relaxed">{firstInfo.objetivo}</p>
        </div>
      )}

      {/* Detalhes por Veículo */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <p className="text-xs font-medium text-gray-500 mb-3">Detalhamento por Veículo</p>
        <div className="space-y-3">
          {piInfo.map((info, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{info.veiculo}</p>
                  <p className="text-xs text-gray-600">
                    {info.canal} • {info.formato} • {info.modeloCompra}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{info.totalBruto}</p>
                  <p className="text-xs text-gray-600">{info.quantidade} {info.modeloCompra}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segmentação e Público */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {firstInfo.publico && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-2">Público</p>
            <p className="text-sm text-gray-700">{firstInfo.publico}</p>
          </div>
        )}

        {firstInfo.praca && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-2">Praça</p>
            <p className="text-sm text-gray-700">{firstInfo.praca}</p>
          </div>
        )}
      </div>

      {firstInfo.segmentacao && (
        <div className="bg-white rounded-lg p-4 shadow-sm mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Segmentação</p>
          <p className="text-sm text-gray-700">{firstInfo.segmentacao}</p>
        </div>
      )}
    </div>
  );
};

export default PIInfoCard;
