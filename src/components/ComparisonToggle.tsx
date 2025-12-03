interface ComparisonToggleProps {
  comparisonMode: 'benchmark' | 'previous';
  onModeChange: (mode: 'benchmark' | 'previous') => void;
}

const ComparisonToggle = ({ comparisonMode, onModeChange }: ComparisonToggleProps) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onModeChange('benchmark')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          comparisonMode === 'benchmark'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        Comparação com o Benchmark
      </button>
      <button
        onClick={() => onModeChange('previous')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          comparisonMode === 'previous'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        Comparação com o Período Anterior
      </button>
    </div>
  );
};

export default ComparisonToggle;
