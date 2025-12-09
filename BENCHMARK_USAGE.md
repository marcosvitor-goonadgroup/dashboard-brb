# Como Usar o Hook de Benchmarks

O hook `useBenchmarkData` foi criado para buscar dados de benchmark de duas APIs externas e permitir comparações específicas por veículo, tipo de compra e tipo de criativo (estático/vídeo).

## Localização

- **Hook**: `src/hooks/useBenchmarkData.ts`
- **Uso principal**: Componente de Creative Performance

## APIs de Origem

Os dados de benchmark são buscados de duas fontes Google Sheets:

1. `1abcar-ESRB_f8ytKGQ_ru_slZ67cXhjxKt8gL7TrEVw` (range: Bench)
2. `1HykUxjCGGdveDS_5vlLOOkAq7Wkl058453xkYGTAzNM` (range: Bench)

**Importante**: A última linha de cada planilha (totais) é automaticamente removida para evitar duplicação.

## Estrutura dos Dados

### BenchmarkRow
```typescript
{
  veiculo: string;           // Ex: "LinkedIn", "Facebook", "Instagram"
  tipoDeCompra: string;      // Ex: "CPM", "CPC", "CPE"
  tipo: string;              // "estatico" ou "video"
  impressoes: number;
  cliques: number;
  views: number;
  views100: number;          // Usado para calcular VTR
  engajamentos: number;
  ctr: number;               // Percentual
  vtr: number;               // Percentual
  taxaEngajamento: number;   // Percentual
}
```

### BenchmarkData
```typescript
{
  ctr: number;              // Calculado: (cliques / impressões) * 100
  vtr: number;              // Calculado: (views100 / impressões) * 100
  taxaEngajamento: number;  // Calculado: (engajamentos / impressões) * 100
}
```

## Como Usar

### Uso Básico (Benchmarks Totais)

```typescript
import { useBenchmarkData } from '../hooks/useBenchmarkData';

const MyComponent = () => {
  const { benchmarks, loading, error } = useBenchmarkData();

  if (loading) return <div>Carregando benchmarks...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <p>CTR Benchmark: {benchmarks.ctr.toFixed(2)}%</p>
      <p>VTR Benchmark: {benchmarks.vtr.toFixed(2)}%</p>
      <p>Taxa Engajamento: {benchmarks.taxaEngajamento.toFixed(2)}%</p>
    </div>
  );
};
```

### Uso com Filtros (Recomendado para Criativos)

```typescript
import { useBenchmarkData } from '../hooks/useBenchmarkData';

const CreativePerformance = ({ data }) => {
  const { getBenchmarksByFilters, loading, error } = useBenchmarkData();

  // Exemplo: Obter benchmark para criativo do LinkedIn, CPM, Estático
  const linkedinCpmEstaticoBench = getBenchmarksByFilters({
    veiculo: 'LinkedIn',
    tipoDeCompra: 'CPM',
    tipo: 'estatico'
  });

  // Exemplo: Obter benchmark apenas por veículo
  const instagramBench = getBenchmarksByFilters({
    veiculo: 'Instagram'
  });

  // Exemplo: Obter benchmark por tipo de criativo
  const videoBench = getBenchmarksByFilters({
    tipo: 'video'
  });

  return (
    <div>
      <p>LinkedIn CPM Estático - CTR: {linkedinCpmEstaticoBench.ctr.toFixed(2)}%</p>
      <p>Instagram - VTR: {instagramBench.vtr.toFixed(2)}%</p>
      <p>Vídeos - Engajamento: {videoBench.taxaEngajamento.toFixed(2)}%</p>
    </div>
  );
};
```

### Acesso aos Dados Brutos

```typescript
const { allRows, loading } = useBenchmarkData();

// Obter lista de veículos disponíveis
const veiculos = [...new Set(allRows.map(r => r.veiculo))];

// Obter lista de tipos de compra
const tiposDeCompra = [...new Set(allRows.map(r => r.tipoDeCompra))];

// Filtrar manualmente
const linkedinRows = allRows.filter(r => r.veiculo === 'LinkedIn');
```

## Exemplo Completo para Creative Performance

```typescript
import { useBenchmarkData, BenchmarkFilters } from '../hooks/useBenchmarkData';
import BenchmarkIndicator from './BenchmarkIndicator';

const CreativePerformance = ({ data }) => {
  const { getBenchmarksByFilters, loading, error } = useBenchmarkData();

  const creatives = data.map(creative => {
    // Determina o tipo do criativo (estatico/video)
    const tipo = creative.videoViews > 0 ? 'video' : 'estatico';

    // Cria filtros específicos para este criativo
    const filters: BenchmarkFilters = {
      veiculo: creative.veiculo,
      tipoDeCompra: creative.tipoDeCompra,
      tipo: tipo
    };

    // Obtém benchmarks específicos
    const bench = getBenchmarksByFilters(filters);

    return (
      <div key={creative.id}>
        <h3>{creative.name}</h3>
        <p>Veículo: {creative.veiculo} | Tipo: {tipo} | Compra: {creative.tipoDeCompra}</p>

        {/* CTR com comparação ao benchmark */}
        <BenchmarkIndicator
          value={creative.ctr}
          benchmark={bench.ctr}
          format="percentage"
          showComparison={true}
        />

        {/* VTR com comparação ao benchmark */}
        {tipo === 'video' && (
          <BenchmarkIndicator
            value={creative.vtr}
            benchmark={bench.vtr}
            format="percentage"
            showComparison={true}
          />
        )}

        {/* Taxa de Engajamento com comparação ao benchmark */}
        <BenchmarkIndicator
          value={creative.taxaEngajamento}
          benchmark={bench.taxaEngajamento}
          format="percentage"
          showComparison={true}
        />
      </div>
    );
  });

  return <div>{creatives}</div>;
};
```

## Valores Retornados pelo Hook

```typescript
{
  benchmarks: BenchmarkData;              // Benchmarks totais (sem filtros)
  allRows: BenchmarkRow[];                // Dados brutos de todas as linhas
  loading: boolean;                        // Status de carregamento
  error: string | null;                    // Mensagem de erro (se houver)
  getBenchmarksByFilters: (filters: BenchmarkFilters) => BenchmarkData;  // Função para obter benchmarks filtrados
}
```

## Filtros Disponíveis

```typescript
interface BenchmarkFilters {
  veiculo?: string;           // Ex: "LinkedIn", "Facebook", "Instagram"
  tipoDeCompra?: string;      // Ex: "CPM", "CPC", "CPE"
  tipo?: 'estatico' | 'video'; // "estatico" ou "video"
}
```

**Nota**: Todos os filtros são opcionais. Você pode usar apenas um, uma combinação ou todos.

## Diferença entre Cards Superiores e Criativos

### Cards Superiores (BigNumbers)
- **Usa**: Cálculo local baseado nos dados da campanha
- **Fonte**: `data` do CampaignContext
- **Razão**: Benchmarks gerais mais adequados ao contexto da campanha atual

### Creative Performance
- **Usa**: Hook `useBenchmarkData` com filtros
- **Fonte**: APIs externas (Google Sheets)
- **Razão**: Permite comparação granular por veículo, tipo de compra e tipo de criativo

## Debug e Logs

O hook automaticamente imprime logs no console:

```
📊 Dados de benchmark processados: {
  totalLinhas: 18,
  amostra: [...],
  veiculos: ['LinkedIn', 'Facebook', 'Instagram', ...],
  tiposDeCompra: ['CPM', 'CPC', 'CPE'],
  tipos: ['estatico', 'video']
}
```

Isso ajuda a verificar quais valores estão disponíveis para filtros.
