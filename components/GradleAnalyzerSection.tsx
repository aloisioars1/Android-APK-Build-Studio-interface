import React, { useState } from 'react';
import { analyzeGradleWithAi, GradleOptimizationResult } from '../services/gradleAnalyzer';
import { Icons } from '../constants';

interface GradleAnalyzerSectionProps {
  buildGradleApp: string;
  projectBuildGradle?: string;
  modelName?: string;
  addLog: (msg: string, type?: string) => void;
  onApplyOptimizations: (optimizedCode: string) => void;
}

export const GradleAnalyzerSection: React.FC<GradleAnalyzerSectionProps> = ({
  buildGradleApp,
  projectBuildGradle = '',
  modelName = 'gemini-3-flash-preview',
  addLog,
  onApplyOptimizations
}) => {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<GradleOptimizationResult | null>(null);
  const [applied, setApplied] = useState<boolean>(false);
  const [showCodePreview, setShowCodePreview] = useState<boolean>(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setApplied(false);
    addLog("Iniciando Análise Preditiva de build.gradle com IA Neural...", "info");
    try {
      const res = await analyzeGradleWithAi(buildGradleApp, projectBuildGradle, modelName);
      setResult(res);
      addLog(`Análise preditiva concluída! Potencial de economia: ${res.estimatedTimeSavings}`, "success");
    } catch (e: any) {
      addLog(`Erro na análise preditiva do Gradle: ${e.message}`, "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!result || !result.optimizedBuildGradle) return;
    onApplyOptimizations(result.optimizedBuildGradle);
    setApplied(true);
    addLog("Otimizações e dependências sugeridas pela IA foram aplicadas ao app/build.gradle!", "success");
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">Alta Prioridade</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Média</span>;
      default:
        return <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Sugestão</span>;
    }
  };

  return (
    <div className="bg-[#0f172a]/90 rounded-2xl border border-purple-500/30 p-5 shadow-2xl space-y-5 my-4 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
              <Icons.Sparkles />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Análise Preditiva de CI/CD por IA</span>
          </div>
          <h3 className="text-base font-extrabold text-white tracking-tight">Otimizador de Gradle & Dependências</h3>
          <p className="text-xs text-slate-400">
            Examine o <code>build.gradle</code> para identificar gargalos de compilação, versões obsoletas e otimizar tempo no GitHub Actions.
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 ${
            analyzing
              ? 'bg-purple-800 text-purple-300 animate-pulse cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
          }`}
        >
          <Icons.Sparkles />
          <span>{analyzing ? 'Analisando Gradle...' : '🔍 Analisar build.gradle com IA'}</span>
        </button>
      </div>

      {/* Analysis Results Display */}
      {result && (
        <div className="space-y-5 animate-fadeIn">
          {/* Metrics summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-purple-500 flex items-center justify-center text-base font-black text-white shrink-0 bg-purple-600/20">
                {result.score}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score de Eficiência</p>
                <p className="text-sm font-extrabold text-white">
                  {result.score >= 80 ? 'Otimizado' : result.score >= 60 ? 'Ajustes Recomendados' : 'Gargalo de Build'}
                </p>
              </div>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center gap-3 md:col-span-2">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-lg">
                ⚡
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimativa de Ganho no CI/CD</p>
                <p className="text-sm font-extrabold text-emerald-400">{result.estimatedTimeSavings}</p>
              </div>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>💡 Recomendações de Dependências & CI/CD ({result.recommendations.length})</span>
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">{rec.category}</span>
                    {getSeverityBadge(rec.severity)}
                  </div>
                  <h5 className="text-xs font-bold text-white">{rec.title}</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{rec.description}</p>
                  <div className="p-2 bg-slate-900 rounded-lg border border-white/5 font-mono text-[10px] text-emerald-300 overflow-x-auto">
                    <code>{rec.suggestion}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
            <button
              onClick={() => setShowCodePreview(!showCodePreview)}
              className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>{showCodePreview ? 'Ocultar Código Otimizado' : 'Ver build.gradle Otimizado'}</span>
            </button>

            <button
              onClick={handleApply}
              disabled={applied}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                applied
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              <span>{applied ? '✓ Otimizações Aplicadas ao Projeto!' : '✨ Aplicar Otimizações ao build.gradle'}</span>
            </button>
          </div>

          {/* Optimized Code Snippet */}
          {showCodePreview && (
            <div className="bg-slate-950 p-4 rounded-xl border border-white/10 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[300px] scrollbar-hide">
              <pre>{result.optimizedBuildGradle}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GradleAnalyzerSection;
