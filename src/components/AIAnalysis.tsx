import { useState, useEffect, useRef, useMemo } from 'react';
import { ProcessedCampaignData } from '../types/campaign';
import { generateWeeklyAnalysis } from '../services/gemini';

interface AIAnalysisProps {
  data: ProcessedCampaignData[];
  allData: ProcessedCampaignData[];
  periodFilter: '7days' | 'all';
  selectedCampaign: string | null;
}

const AIAnalysis = ({ data, allData, periodFilter, selectedCampaign }: AIAnalysisProps) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState('');
  const [saving, setSaving] = useState(false);

  // Referência para evitar chamadas duplicadas
  const isGeneratingRef = useRef(false);

  // Cria uma chave única baseada nos dados para detectar mudanças reais
  const dataKey = useMemo(() => {
    if (periodFilter !== '7days' || data.length === 0) return null;

    // Cria hash simples dos dados: campanha + total de registros + soma de impressões
    const totalRecords = data.length;
    const totalImpressions = data.reduce((sum, item) => sum + item.impressions, 0);
    return `${selectedCampaign || 'all'}-${totalRecords}-${totalImpressions}`;
  }, [data, periodFilter, selectedCampaign]);

  // Armazena a última chave processada
  const lastProcessedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Só gera análise quando o filtro "Últimos 7 dias" está ativo
    if (periodFilter === '7days' && data.length > 0 && dataKey) {
      // Verifica se já processou esses dados
      if (dataKey === lastProcessedKeyRef.current) {
        console.log('📊 Análise já gerada para esses dados, pulando...');
        return;
      }

      // Verifica se já está gerando
      if (isGeneratingRef.current) {
        console.log('⏳ Análise já em andamento, pulando nova chamada...');
        return;
      }

      // Gera análise
      lastProcessedKeyRef.current = dataKey;
      generateAnalysis();
    } else {
      setAnalysis('');
      setError(null);
      lastProcessedKeyRef.current = null;
    }
  }, [dataKey, periodFilter]);

  const generateAnalysis = async () => {
    // Previne chamadas duplicadas
    if (isGeneratingRef.current) {
      console.log('⏳ Bloqueando chamada duplicada à API');
      return;
    }

    if (!dataKey) {
      console.error('❌ DataKey não disponível');
      return;
    }

    isGeneratingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Iniciando busca/geração de análise...');
      const { analysis: result, cached, timestamp } = await generateWeeklyAnalysis(
        data,
        allData,
        dataKey
      );

      setAnalysis(result);

      if (cached) {
        console.log('📦 Análise carregada do cache (gerada em:', timestamp, ')');
      } else {
        console.log('✅ Nova análise gerada e salva no cache');
      }
    } catch (err: any) {
      console.error('❌ Erro ao gerar análise:', err);
      setError(err.message || 'Erro ao gerar análise. Tente novamente.');
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setEditedAnalysis(analysis);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!dataKey || !editedAnalysis.trim()) return;

    setSaving(true);
    try {
      // Salvar diretamente no cache via API
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataKey,
          analysis: editedAnalysis,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar análise editada');
      }

      setAnalysis(editedAnalysis);
      setShowEditModal(false);
      console.log('✅ Análise editada salva com sucesso');
    } catch (err: any) {
      console.error('❌ Erro ao salvar:', err);
      alert('Erro ao salvar a análise editada. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Só renderiza quando "Últimos 7 dias" está ativo
  if (periodFilter !== '7days') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800">
            Análise Semanal por IA
          </h2>
        </div>

        {!loading && analysis && (
          <button
            onClick={generateAnalysis}
            onContextMenu={handleRightClick}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5"
            title="Gerar nova análise | Clique direito para editar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Atualizar
          </button>
        )}
      </div>

      <div className="mt-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0"></div>
              </div>
              <p className="text-sm text-gray-600 font-medium">
                Analisando dados da semana...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Erro ao gerar análise
                </h3>
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && analysis && (
          <div className="prose prose-sm max-w-none">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-100">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {analysis}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !analysis && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-gray-600">
                Selecione "Últimos 7 dias" para visualizar a análise semanal gerada por IA.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>
            Análise gerada por IA com base nos dados da semana e benchmarks
          </span>
        </div>
      </div>

      {/* Modal de Edição */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Editar Análise
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Fechar"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Editor */}
            <div className="flex-1 p-6 overflow-y-auto">
              <textarea
                value={editedAnalysis}
                onChange={(e) => setEditedAnalysis(e.target.value)}
                className="w-full h-full min-h-[300px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans text-sm leading-relaxed"
                placeholder="Digite sua análise aqui..."
                disabled={saving}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                A análise editada será salva no cache
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editedAnalysis.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
