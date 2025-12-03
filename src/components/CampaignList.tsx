import { CampaignSummary } from '../types/campaign';

interface CampaignListProps {
  campaigns: CampaignSummary[];
  selectedCampaign: string | null;
  onSelectCampaign: (campaignName: string) => void;
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(num);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('pt-BR').format(num);
};

const CampaignList = ({ campaigns, selectedCampaign, onSelectCampaign }: CampaignListProps) => {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Campanhas Ativas ({campaigns.length})
        </h2>
        {selectedCampaign && (
          <button
            onClick={() => onSelectCampaign('')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpar filtro
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma campanha encontrada
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <div
                key={campaign.nome}
                onClick={() => onSelectCampaign(campaign.nome)}
                className={`px-6 py-4 hover:bg-blue-50 transition-colors cursor-pointer ${
                  selectedCampaign === campaign.nome ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        campaign.status === 'active'
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                      }`}
                      title={
                        campaign.status === 'active'
                          ? 'Ativa nos últimos 7 dias'
                          : 'Inativa'
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {campaign.nome}
                    </p>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Investimento:</span>{' '}
                        {formatCurrency(campaign.metrics.investimento)}
                      </div>
                      <div>
                        <span className="font-medium">Impressões:</span>{' '}
                        {formatNumber(campaign.metrics.impressoes)}
                      </div>
                      <div>
                        <span className="font-medium">Cliques:</span>{' '}
                        {formatNumber(campaign.metrics.cliques)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignList;
