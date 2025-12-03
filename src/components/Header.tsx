import logobrb from '../images/logo-brb.png';

interface HeaderProps {
  onOpenFilters: () => void;
  activeFiltersCount: number;
}

const Header = ({ onOpenFilters, activeFiltersCount }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={logobrb}
              alt="Banco BRB"
              className="h-12 w-auto"
            />
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard de Campanhas
              </h1>
              <p className="text-sm text-gray-500">
                Gestão de Mídia Online
              </p>
            </div>
          </div>

          <button
            onClick={onOpenFilters}
            className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
