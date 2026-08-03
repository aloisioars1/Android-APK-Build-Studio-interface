import React, { useState, useMemo } from 'react';
import { AppConfig, GeneratedCode, AppAsset } from '../types';
import { Icons } from '../constants';

interface AabExplorerProps {
  config: AppConfig;
  generated?: GeneratedCode;
  addLog: (msg: string, type?: string) => void;
}

interface AabFileItem {
  path: string;
  module: 'base' | 'BUNDLE-METADATA';
  category: 'dex' | 'lib' | 'res' | 'assets' | 'manifest' | 'metadata';
  rawSizeBytes: number;
  compressedSizeBytes: number;
  isLarge?: boolean;
  recommendation?: string;
  contentPreview?: string;
}

export const AabExplorer: React.FC<AabExplorerProps> = ({ config, generated, addLog }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<AabFileItem | null>(null);
  const [minSizeFilter, setMinSizeFilter] = useState<number>(0); // in KB

  // Build simulated / analyzed AAB file tree from current code & assets
  const aabFiles = useMemo<AabFileItem[]>(() => {
    const items: AabFileItem[] = [];

    // 1. AndroidManifest
    const manifestContent = generated?.manifest || `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${config.packageName}">`;
    const manifestSize = new TextEncoder().encode(manifestContent).length;
    items.push({
      path: 'base/manifest/AndroidManifest.xml',
      module: 'base',
      category: 'manifest',
      rawSizeBytes: manifestSize + 3200, // binary XML overhead
      compressedSizeBytes: Math.round((manifestSize + 3200) * 0.4),
      contentPreview: manifestContent
    });

    // 2. DEX Bytecode (calculated from mainActivity + components)
    const codeLength = (generated?.mainActivity || '').length + (generated?.mainActivityTest || '').length;
    const dex1Size = Math.max(1200000, codeLength * 8 + 950000); // ~1.2MB+
    const dex2Size = 850000; // AndroidX & Material components DEX

    items.push({
      path: 'base/dex/classes.dex',
      module: 'base',
      category: 'dex',
      rawSizeBytes: dex1Size,
      compressedSizeBytes: Math.round(dex1Size * 0.42),
      recommendation: config.useSearch ? 'Habilitar R8 Shrinking no build.gradle para remover código não utilizado.' : undefined
    });

    items.push({
      path: 'base/dex/classes2.dex',
      module: 'base',
      category: 'dex',
      rawSizeBytes: dex2Size,
      compressedSizeBytes: Math.round(dex2Size * 0.38)
    });

    // 3. Layout Resources
    const layoutContent = generated?.layout || '<ConstraintLayout />';
    const layoutSize = new TextEncoder().encode(layoutContent).length;
    items.push({
      path: 'base/res/layout/activity_main.xml',
      module: 'base',
      category: 'res',
      rawSizeBytes: layoutSize + 1200,
      compressedSizeBytes: Math.round((layoutSize + 1200) * 0.35),
      contentPreview: layoutContent
    });

    // Values resources
    const stringsContent = generated?.strings || '<resources><string name="app_name">App</string></resources>';
    items.push({
      path: 'base/res/values/strings.xml',
      module: 'base',
      category: 'res',
      rawSizeBytes: new TextEncoder().encode(stringsContent).length + 400,
      compressedSizeBytes: Math.round((new TextEncoder().encode(stringsContent).length + 400) * 0.4),
      contentPreview: stringsContent
    });

    items.push({
      path: 'base/res/values/colors.xml',
      module: 'base',
      category: 'res',
      rawSizeBytes: 1850,
      compressedSizeBytes: 620
    });

    items.push({
      path: 'base/res/mipmap-xxhdpi/ic_launcher.png',
      module: 'base',
      category: 'res',
      rawSizeBytes: 24500,
      compressedSizeBytes: 22100
    });

    items.push({
      path: 'base/res/drawable/ic_launcher_foreground.xml',
      module: 'base',
      category: 'res',
      rawSizeBytes: 3200,
      compressedSizeBytes: 1100
    });

    // 4. Custom Uploaded Assets
    if (config.assets && config.assets.length > 0) {
      config.assets.forEach((asset, idx) => {
        // Base64 length calculation
        const base64Len = asset.data ? asset.data.length : 0;
        const sizeInBytes = Math.round((base64Len * 3) / 4);
        const sizeInKb = sizeInBytes / 1024;
        const isLarge = sizeInKb > 200;

        items.push({
          path: `base/assets/${asset.name}`,
          module: 'base',
          category: 'assets',
          rawSizeBytes: Math.max(15000, sizeInBytes),
          compressedSizeBytes: Math.round(Math.max(15000, sizeInBytes) * 0.85), // Images compress less
          isLarge,
          recommendation: isLarge
            ? 'Asset superior a 200KB. Recomendado converter para formato WebP ou entregar via Play Feature Delivery on-demand.'
            : undefined
        });
      });
    } else {
      // Default placeholder assets
      items.push({
        path: 'base/assets/fonts/inter_medium.ttf',
        module: 'base',
        category: 'assets',
        rawSizeBytes: 142000,
        compressedSizeBytes: 98000
      });
    }

    // 5. Native Libraries (.so)
    items.push({
      path: 'base/lib/arm64-v8a/libnative-core.so',
      module: 'base',
      category: 'lib',
      rawSizeBytes: 1840000,
      compressedSizeBytes: 720000,
      isLarge: true,
      recommendation: 'AAB separará automaticamente este binário de 64-bit para ser baixado apenas por dispositivos compatíveis (reduzindo download em ~60%).'
    });

    items.push({
      path: 'base/lib/armeabi-v7a/libnative-core.so',
      module: 'base',
      category: 'lib',
      rawSizeBytes: 1620000,
      compressedSizeBytes: 650000
    });

    // 6. BUNDLE-METADATA
    items.push({
      path: 'BUNDLE-METADATA/com.android.tools.build.libraries/dependencies.pb',
      module: 'BUNDLE-METADATA',
      category: 'metadata',
      rawSizeBytes: 14200,
      compressedSizeBytes: 4100
    });

    items.push({
      path: 'BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties',
      module: 'BUNDLE-METADATA',
      category: 'metadata',
      rawSizeBytes: 850,
      compressedSizeBytes: 320
    });

    return items;
  }, [config, generated]);

  // Aggregate stats
  const totalRawBytes = useMemo(() => aabFiles.reduce((acc, f) => acc + f.rawSizeBytes, 0), [aabFiles]);
  const totalCompressedBytes = useMemo(() => aabFiles.reduce((acc, f) => acc + f.compressedSizeBytes, 0), [aabFiles]);
  
  // Play Store Split APK Estimated Download Size (Device-specific split: 1 arch + base res)
  const estimatedDeviceDownloadBytes = useMemo(() => {
    const nonLibBytes = aabFiles
      .filter(f => f.category !== 'lib' || f.path.includes('arm64-v8a'))
      .reduce((acc, f) => acc + f.compressedSizeBytes, 0);
    return nonLibBytes;
  }, [aabFiles]);

  const largeFiles = useMemo(() => aabFiles.filter(f => f.isLarge || f.rawSizeBytes > 250000), [aabFiles]);

  // Filtered file list
  const filteredFiles = useMemo(() => {
    return aabFiles.filter(file => {
      const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
      const matchesSearch = file.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSize = (file.rawSizeBytes / 1024) >= minSizeFilter;
      return matchesCategory && matchesSearch && matchesSize;
    });
  }, [aabFiles, selectedCategory, searchQuery, minSizeFilter]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleExportReport = () => {
    const reportLines = [
      `==================================================`,
      `REPORTE DE ESTRUTURA DO ANDROID APP BUNDLE (.AAB)`,
      `App: ${config.appName} (${config.packageName})`,
      `Data: ${new Date().toLocaleString()}`,
      `==================================================`,
      ``,
      `Tamanho Bruto Total (Descompactado): ${formatSize(totalRawBytes)}`,
      `Tamanho do AAB Compactado: ${formatSize(totalCompressedBytes)}`,
      `Estimativa de Download no Dispositivo (Split APK): ${formatSize(estimatedDeviceDownloadBytes)}`,
      ``,
      `--- DETALHAMENTO DE ARQUIVOS (${aabFiles.length} itens) ---`,
      ...aabFiles.map(f => `[${f.module}] ${f.path.padEnd(50)} | Tamanho: ${formatSize(f.rawSizeBytes)} | Comp: ${formatSize(f.compressedSizeBytes)}`),
      ``,
      `--- ALERTAS E OTIMIZAÇÕES RECOMENDADAS ---`,
      ...largeFiles.map(f => `⚠️ ${f.path}: ${f.recommendation || 'Tamanho elevado de arquivo'}`)
    ];

    const blob = new Blob([reportLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_aab_report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog("Relatório detalhado do App Bundle exportado com sucesso!", "success");
  };

  return (
    <div className="bg-[#0f172a]/90 rounded-2xl border border-indigo-500/30 p-5 shadow-2xl space-y-6 my-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30 text-xs">
              📦
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Inspeção de Pacotes Android</span>
          </div>
          <h3 className="text-base font-extrabold text-white tracking-tight">Explorador de Android App Bundle (.aab)</h3>
          <p className="text-xs text-slate-400">
            Inspecione a árvore de arquivos do bundle, preveja o tamanho de download na Google Play e identifique gargalos de armazenamento.
          </p>
        </div>

        <button
          onClick={handleExportReport}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 shrink-0"
        >
          <span>📥 Exportar Relatório .AAB</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
            <span>Tamanho do AAB</span>
            <span className="text-indigo-400">Compactado</span>
          </div>
          <p className="text-xl font-extrabold text-white">{formatSize(totalCompressedBytes)}</p>
          <p className="text-[10px] text-slate-500">Tamanho bruto: {formatSize(totalRawBytes)}</p>
        </div>

        <div className="bg-black/40 p-4 rounded-xl border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
            <span>Download no Usuário</span>
            <span className="text-emerald-400">⚡ Play Split APK</span>
          </div>
          <p className="text-xl font-extrabold text-emerald-400">{formatSize(estimatedDeviceDownloadBytes)}</p>
          <p className="text-[10px] text-emerald-500/80">Economia de {Math.round((1 - estimatedDeviceDownloadBytes / totalCompressedBytes) * 100)}% via AAB splits</p>
        </div>

        <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
            <span>Total de Arquivos</span>
            <span className="text-blue-400">{aabFiles.length} itens</span>
          </div>
          <p className="text-xl font-extrabold text-white">{aabFiles.length}</p>
          <p className="text-[10px] text-slate-500">2 módulos (base, metadata)</p>
        </div>

        <div className="bg-black/40 p-4 rounded-xl border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
            <span>Alertas de Tamanho</span>
            <span className="text-amber-400">⚠️ {largeFiles.length} grandes</span>
          </div>
          <p className="text-xl font-extrabold text-amber-400">{largeFiles.length} arquivos</p>
          <p className="text-[10px] text-amber-500/80">&gt;200KB requerem atenção</p>
        </div>
      </div>

      {/* Large File Warnings Section */}
      {largeFiles.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <span>💡 Diagnóstico de Otimização de Instalação ({largeFiles.length})</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {largeFiles.map((file, i) => (
              <div key={i} className="bg-black/50 p-2.5 rounded-lg border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-slate-200 truncate">{file.path}</span>
                  <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                    {formatSize(file.rawSizeBytes)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {file.recommendation || 'Arquivo de tamanho considerável. Considere aplicar otimizações de compressão.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'dex', label: 'DEX Bytecode' },
            { id: 'res', label: 'Resources' },
            { id: 'assets', label: 'Assets' },
            { id: 'lib', label: 'Native Libs (.so)' },
            { id: 'manifest', label: 'Manifest' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-900/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input & Size Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar no AAB..."
            className="flex-1 md:w-48 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />

          <select
            value={minSizeFilter}
            onChange={e => setMinSizeFilter(Number(e.target.value))}
            className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value={0}>Tamanho: Todos</option>
            <option value={50}>&gt; 50 KB</option>
            <option value={200}>&gt; 200 KB</option>
            <option value={1000}>&gt; 1 MB</option>
          </select>
        </div>
      </div>

      {/* File List & Inspector Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[350px]">
        {/* File Tree List */}
        <div className="lg:col-span-2 bg-slate-950/80 rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Caminho do Arquivo (.aab)</span>
            <div className="flex items-center gap-6">
              <span>Bruto</span>
              <span>Compactado</span>
            </div>
          </div>

          <div className="divide-y divide-white/5 overflow-y-auto max-h-[380px] scrollbar-hide">
            {filteredFiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum arquivo encontrado com os filtros selecionados.
              </div>
            ) : (
              filteredFiles.map((file, idx) => {
                const isSelected = selectedFile?.path === file.path;
                const sizePct = Math.min(100, Math.round((file.rawSizeBytes / totalRawBytes) * 100));

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedFile(file)}
                    className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 border-l-2 border-indigo-400'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate max-w-[65%]">
                      <span className="text-sm">
                        {file.category === 'dex' ? '⚡' : file.category === 'res' ? '🎨' : file.category === 'assets' ? '📁' : file.category === 'lib' ? '⚙️' : '📄'}
                      </span>
                      <div className="truncate">
                        <p className={`font-mono text-[11px] font-bold truncate ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {file.path}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                          <span className="uppercase font-bold text-indigo-400">{file.category}</span>
                          <span>•</span>
                          <span>{sizePct}% do total</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-[10px]">
                      <span className="text-slate-400">{formatSize(file.rawSizeBytes)}</span>
                      <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {formatSize(file.compressedSizeBytes)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected File Inspector */}
        <div className="bg-slate-950/80 rounded-xl border border-white/10 p-4 space-y-4 flex flex-col justify-between">
          {selectedFile ? (
            <div className="space-y-4">
              <div className="border-b border-white/10 pb-3 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Inspeção de Arquivo</span>
                <h4 className="text-xs font-mono font-bold text-white break-all">{selectedFile.path}</h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5 text-[11px]">
                  <span className="text-slate-400">Módulo</span>
                  <span className="font-mono text-slate-200 font-bold">{selectedFile.module}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-[11px]">
                  <span className="text-slate-400">Categoria</span>
                  <span className="font-mono text-indigo-400 uppercase font-bold">{selectedFile.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-[11px]">
                  <span className="text-slate-400">Tamanho Descompactado</span>
                  <span className="font-mono text-slate-200 font-bold">{formatSize(selectedFile.rawSizeBytes)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-[11px]">
                  <span className="text-slate-400">Tamanho no AAB (Zip)</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatSize(selectedFile.compressedSizeBytes)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-[11px]">
                  <span className="text-slate-400">Taxa de Compressão</span>
                  <span className="font-mono text-slate-300 font-bold">
                    {Math.round((1 - selectedFile.compressedSizeBytes / selectedFile.rawSizeBytes) * 100)}%
                  </span>
                </div>
              </div>

              {selectedFile.recommendation && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 space-y-1">
                  <span className="font-bold uppercase tracking-wider block">💡 Dica de Otimização:</span>
                  <p className="leading-relaxed">{selectedFile.recommendation}</p>
                </div>
              )}

              {selectedFile.contentPreview && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pré-visualização</span>
                  <div className="bg-black/60 p-2.5 rounded-lg border border-white/5 font-mono text-[9px] text-emerald-400 max-h-36 overflow-y-auto scrollbar-hide">
                    <pre className="whitespace-pre-wrap">{selectedFile.contentPreview}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-2 my-auto">
              <span className="text-2xl">🔍</span>
              <p className="text-xs font-bold text-slate-400">Selecione um arquivo no painel ao lado</p>
              <p className="text-[10px] max-w-[200px] mx-auto">
                Examine o impacto do tamanho e sugestões de otimização detalhadas.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 text-[10px] text-slate-500 text-center">
            Android App Bundle v1.1.0 • Formato oficial Play Store
          </div>
        </div>
      </div>
    </div>
  );
};

export default AabExplorer;
