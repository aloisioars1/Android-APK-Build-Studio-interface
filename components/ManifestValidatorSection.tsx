import React, { useState, useEffect, useMemo } from 'react';
import { AppConfig, GeneratedCode } from '../types';
import {
  ManifestValidationResult,
  PermissionAnalysis,
  SecurityIssue,
  SAMPLE_RISKY_MANIFEST,
  SAMPLE_SAFE_MANIFEST,
  analyzeManifestLocally,
  analyzeManifestWithAi
} from '../services/manifestValidatorService';
import { generateAndroidProject } from '../services/androidCodeGenerator';

interface ManifestValidatorSectionProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  addLog: (msg: string, type?: string) => void;
}

export const ManifestValidatorSection: React.FC<ManifestValidatorSectionProps> = ({
  config,
  setConfig,
  addLog
}) => {
  const [manifestXml, setManifestXml] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ManifestValidationResult | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'permissions' | 'security' | 'optimized' | 'editor'>('permissions');
  const [permissionFilter, setPermissionFilter] = useState<'all' | 'risk' | 'declaration' | 'safe'>('all');
  const [appliedToProject, setAppliedToProject] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Initialize with current project's generated Manifest XML
  useEffect(() => {
    try {
      const generated: GeneratedCode = generateAndroidProject(config);
      if (generated && generated.manifest) {
        setManifestXml(generated.manifest);
        // Automatically perform initial fast local audit
        const initialAudit = analyzeManifestLocally(generated.manifest);
        setAnalysisResult(initialAudit);
      } else {
        setManifestXml(SAMPLE_RISKY_MANIFEST);
        setAnalysisResult(analyzeManifestLocally(SAMPLE_RISKY_MANIFEST));
      }
    } catch (e) {
      setManifestXml(SAMPLE_RISKY_MANIFEST);
      setAnalysisResult(analyzeManifestLocally(SAMPLE_RISKY_MANIFEST));
    }
  }, [config.packageName, config.appName]);

  // Load preset options
  const handleLoadCurrentProject = () => {
    try {
      const generated = generateAndroidProject(config);
      setManifestXml(generated.manifest);
      const res = analyzeManifestLocally(generated.manifest);
      setAnalysisResult(res);
      setAppliedToProject(false);
      addLog("Carregado AndroidManifest.xml do projeto ativo.", "info");
    } catch (e) {
      addLog("Erro ao carregar o manifesto do projeto.", "error");
    }
  };

  const handleLoadRiskyPreset = () => {
    setManifestXml(SAMPLE_RISKY_MANIFEST);
    const res = analyzeManifestLocally(SAMPLE_RISKY_MANIFEST);
    setAnalysisResult(res);
    setAppliedToProject(false);
    addLog("Carregado modelo de teste com permissões de alto risco.", "info");
  };

  const handleLoadSafePreset = () => {
    setManifestXml(SAMPLE_SAFE_MANIFEST);
    const res = analyzeManifestLocally(SAMPLE_SAFE_MANIFEST);
    setAnalysisResult(res);
    setAppliedToProject(false);
    addLog("Carregado modelo de teste seguro em conformidade com o Google Play.", "success");
  };

  // Run AI Analysis
  const handleRunAiAnalysis = async () => {
    if (!manifestXml.trim()) {
      addLog("Erro: insira o conteúdo do AndroidManifest.xml para analisar.", "error");
      return;
    }

    setAnalyzing(true);
    addLog("🔍 Enviando AndroidManifest.xml para auditoria de segurança com a IA Gemini...", "info");

    try {
      const result = await analyzeManifestWithAi(manifestXml, config.modelName || 'gemini-3.6-flash');
      setAnalysisResult(result);
      addLog(`✅ Análise de manifesto concluída! Score de Segurança: ${result.score}/100`, "success");
    } catch (err: any) {
      addLog("Falha na análise com IA. Executando auditoria heurística local de segurança...", "warning");
      const fallbackResult = analyzeManifestLocally(manifestXml);
      setAnalysisResult(fallbackResult);
    } finally {
      setAnalyzing(false);
    }
  };

  // Quick Action: Remove single permission from current XML
  const handleRemovePermission = (permName: string) => {
    const reg = new RegExp(`<uses-permission\\s+android:name=["']${permName}["']\\s*\\/?>\\n?`, 'g');
    const updatedXml = manifestXml.replace(reg, '');
    setManifestXml(updatedXml);

    // Re-run fast local check
    const updatedResult = analyzeManifestLocally(updatedXml);
    setAnalysisResult(updatedResult);
    addLog(`Permissão '${permName}' removida do manifesto. Novo Score: ${updatedResult.score}/100`, "info");
  };

  // Quick Action: Fix security issue (e.g. allowBackup="false" or usesCleartextTraffic="false")
  const handleFixSecurityIssue = (issueId: string) => {
    let updated = manifestXml;
    if (issueId === 'allow_backup_true') {
      updated = updated.replace(/android:allowBackup=["']true["']/g, 'android:allowBackup="false"');
    } else if (issueId === 'cleartext_traffic') {
      updated = updated.replace(/android:usesCleartextTraffic=["']true["']/g, 'android:usesCleartextTraffic="false"');
    } else if (issueId === 'exported_components_unprotected') {
      updated = updated.replace(/(<activity\s+[^>]*android:name=["']\.(?!MainActivity)[^"']+["'][^>]*android:exported=["'])true(["'])/g, '$1false$2');
      updated = updated.replace(/(<service\s+[^>]*android:exported=["'])true(["'])/g, '$1false$2');
    }

    setManifestXml(updated);
    const updatedResult = analyzeManifestLocally(updated);
    setAnalysisResult(updatedResult);
    addLog(`Vulnerabilidade '${issueId}' corrigida no manifesto.`, "success");
  };

  // Apply Optimized Manifest to whole XML
  const handleApplyOptimizedManifest = () => {
    if (!analysisResult?.optimizedManifestXml) return;
    setManifestXml(analysisResult.optimizedManifestXml);
    const updatedResult = analyzeManifestLocally(analysisResult.optimizedManifestXml);
    setAnalysisResult(updatedResult);
    setAppliedToProject(true);
    addLog("Manifesto otimizado pela IA aplicado no editor com sucesso!", "success");
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 2000);
    addLog(`Copiado para a área de transferência: ${label}`, "info");
  };

  // Filtered permissions list
  const filteredPermissions = useMemo(() => {
    if (!analysisResult?.permissions) return [];
    if (permissionFilter === 'risk') {
      return analysisResult.permissions.filter(p => p.riskScore === 'critical' || p.status === 'recommended_removal');
    }
    if (permissionFilter === 'declaration') {
      return analysisResult.permissions.filter(p => p.status === 'needs_declaration');
    }
    if (permissionFilter === 'safe') {
      return analysisResult.permissions.filter(p => p.status === 'valid' && p.riskScore === 'low');
    }
    return analysisResult.permissions;
  }, [analysisResult, permissionFilter]);

  const criticalPermsCount = analysisResult?.permissions.filter(p => p.riskScore === 'critical' || p.status === 'recommended_removal').length || 0;
  const declarationPermsCount = analysisResult?.permissions.filter(p => p.status === 'needs_declaration').length || 0;
  const securityIssuesCount = analysisResult?.securityIssues.length || 0;

  return (
    <div className="bg-[#0f172a]/95 rounded-2xl border border-sky-500/30 p-5 shadow-2xl space-y-6 text-slate-100 my-2">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30 text-xs font-bold uppercase tracking-wider">
              🛡️ IA Security Auditor
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Google Play Console Policies 2026</span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>Validador de AndroidManifest.xml</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            Análise automatizada de permissões solicitadas, identificação de regras estritas da Google Play Store (SMS, Registros de Chamada, Localização), detecção de falhas de segurança e sugestões de remoção.
          </p>
        </div>

        {/* Quick Actions & Presets Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleLoadCurrentProject}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition-all flex items-center gap-1.5"
            title="Recarregar manifesto gerado pelas configurações do app"
          >
            <span>📱 Manifest Atual</span>
          </button>
          <button
            onClick={handleLoadRiskyPreset}
            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/30 transition-all"
            title="Carregar manifesto de teste com permissões de alto risco"
          >
            <span>⚠️ Testar Riscos</span>
          </button>
          <button
            onClick={handleLoadSafePreset}
            className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-all"
            title="Carregar manifesto seguro em conformidade com a Play Store"
          >
            <span>✅ Testar Seguro</span>
          </button>
        </div>
      </div>

      {/* Main Score Dashboard */}
      {analysisResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-black/40 p-5 rounded-2xl border border-white/10">
          {/* Gauge Score Box */}
          <div className="md:col-span-1 flex flex-col items-center justify-center p-4 bg-slate-900/80 rounded-xl border border-white/10 text-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score de Segurança</span>
            <div
              className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 shadow-xl ${
                analysisResult.score >= 85
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10'
                  : analysisResult.score >= 60
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-amber-500/10'
                  : 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-rose-500/10'
              }`}
            >
              <span className="text-3xl font-black">{analysisResult.score}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">/ 100</span>
            </div>

            <div
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                analysisResult.riskLevel === 'safe'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : analysisResult.riskLevel === 'warning'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {analysisResult.riskLevel === 'safe'
                ? '✅ Conforme com Play Store'
                : analysisResult.riskLevel === 'warning'
                ? '⚠️ Requer Declaração'
                : '⛔ Risco de Rejeição'}
            </div>
          </div>

          {/* Detailed Summary Box */}
          <div className="md:col-span-3 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <span>📋 Resumo da Auditoria da IA</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-white/5 font-sans">
                {analysisResult.summary}
              </p>
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Permissões Total</p>
                <p className="text-base font-black text-white">{analysisResult.permissions.length}</p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Risco Crítico/Remoção</p>
                <p className={`text-base font-black ${criticalPermsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {criticalPermsCount}
                </p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Requer Declaração</p>
                <p className={`text-base font-black ${declarationPermsCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {declarationPermsCount}
                </p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Falhas de Segurança</p>
                <p className={`text-base font-black ${securityIssuesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {securityIssuesCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Trigger & SubTabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveSubTab('permissions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'permissions' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔑 Permissões ({analysisResult?.permissions.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('security')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
              activeSubTab === 'security' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🔐 Segurança (&lt;application&gt;)</span>
            {securityIssuesCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px]">
                {securityIssuesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('optimized')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'optimized' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            ✨ Manifest Otimizado
          </button>
          <button
            onClick={() => setActiveSubTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'editor' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📝 Editar XML
          </button>
        </div>

        {/* AI Trigger Button */}
        <button
          onClick={handleRunAiAnalysis}
          disabled={analyzing}
          className={`px-5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 ${
            analyzing ? 'opacity-50 cursor-wait' : ''
          }`}
        >
          <span>{analyzing ? '⏳ Auditando com IA...' : '🔍 Auditoria IA Gemini'}</span>
        </button>
      </div>

      {/* SubTab Content View */}

      {/* SUBTAB 1: PERMISSIONS AUDIT */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-4">
          {/* Permission Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Filtrar Permissões:</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setPermissionFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  permissionFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas ({analysisResult?.permissions.length || 0})
              </button>
              <button
                onClick={() => setPermissionFilter('risk')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  permissionFilter === 'risk' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                ⚠️ Risco / Sugestão Remoção ({criticalPermsCount})
              </button>
              <button
                onClick={() => setPermissionFilter('declaration')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  permissionFilter === 'declaration' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                📋 Requer Declaração ({declarationPermsCount})
              </button>
              <button
                onClick={() => setPermissionFilter('safe')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  permissionFilter === 'safe' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                ✅ Normais e Válidas
              </button>
            </div>
          </div>

          {/* Permission Cards Grid */}
          {filteredPermissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic bg-black/20 rounded-xl border border-dashed border-slate-800">
              Nenhuma permissão encontrada para este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPermissions.map((perm, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    perm.riskScore === 'critical' || perm.status === 'recommended_removal'
                      ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                      : perm.status === 'needs_declaration'
                      ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                      : 'bg-slate-900/80 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-white bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                        {perm.permission}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Risk Score Pill */}
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          perm.riskScore === 'critical'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : perm.riskScore === 'high'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        Risco: {perm.riskScore}
                      </span>

                      {/* Status Pill */}
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          perm.status === 'recommended_removal'
                            ? 'bg-rose-600 text-white border-rose-400'
                            : perm.status === 'needs_declaration'
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-slate-800 text-slate-300 border-slate-600'
                        }`}
                      >
                        {perm.status === 'recommended_removal'
                          ? '❌ Remover Recom'
                          : perm.status === 'needs_declaration'
                          ? '📋 Declaração Requerida'
                          : '✅ Válida'}
                      </span>

                      {/* Quick Removal Button */}
                      {(perm.status === 'recommended_removal' || perm.riskScore === 'critical' || perm.riskScore === 'high') && (
                        <button
                          onClick={() => handleRemovePermission(perm.permission)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg shadow transition-transform active:scale-95"
                          title="Remover esta permissão do arquivo AndroidManifest.xml"
                        >
                          ❌ Remover do Manifest
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Description & Play Store Policy */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Descrição & Função</p>
                      <p className="text-slate-300 text-[11px]">{perm.description}</p>

                      <p className="text-[10px] font-bold text-amber-400 uppercase pt-1">Política Google Play Store</p>
                      <p className="text-slate-300 text-[11px] bg-black/40 p-2 rounded-lg border border-white/5">
                        {perm.playStorePolicy}
                      </p>
                    </div>

                    {/* Recommendation & Alternative API */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-sky-400 uppercase">Recomendação de Correção</p>
                      <p className="text-slate-300 text-[11px]">{perm.recommendation}</p>

                      {perm.alternativeApi && (
                        <div className="pt-1">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase">API Alternativa Recomendada</p>
                          <code className="block text-[10px] font-mono text-emerald-300 bg-emerald-950/40 p-1.5 rounded border border-emerald-500/20 mt-0.5">
                            {perm.alternativeApi}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SECURITY VULNERABILITIES */}
      {activeSubTab === 'security' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-xs text-slate-300">
            Abaixo estão as vulnerabilidades detectadas nas tags de configuração global do aplicativo (<code className="text-sky-400">&lt;application&gt;</code>) e exportação inadvertida de componentes Android.
          </div>

          {analysisResult?.securityIssues.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-400 bg-emerald-950/20 rounded-xl border border-emerald-500/30 font-bold">
              🎉 Nenhuma vulnerabilidade crítica de configuração encontrada no &lt;application&gt;!
            </div>
          ) : (
            <div className="space-y-3">
              {analysisResult?.securityIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/90 rounded-xl border border-rose-500/40 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                        🚨 {issue.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded border border-rose-500/40">
                        Gravidade: {issue.severity}
                      </span>
                      <button
                        onClick={() => handleFixSecurityIssue(issue.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg shadow transition-transform active:scale-95"
                      >
                        🔧 Corrigir Automaticamente
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-300">{issue.explanation}</p>

                    <div className="bg-black/60 p-2.5 rounded-lg font-mono text-[10px] text-emerald-400 border border-white/5">
                      <span className="text-slate-500 uppercase text-[9px] block mb-1 font-sans">Ajuste sugerido no XML:</span>
                      <code>{issue.fixCode}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: OPTIMIZED MANIFEST DIFF */}
      {activeSubTab === 'optimized' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/5">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">✨ Versão Otimizada pela IA</h4>
              <p className="text-[11px] text-slate-400">
                Manifesto limpo sem permissões restritas não autorizadas e com configurações de segurança padrão ajustadas.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopyText(analysisResult?.optimizedManifestXml || manifestXml, 'Manifest Otimizado')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-white/10"
              >
                {copyStatus === 'Manifest Otimizado' ? '✓ Copiado' : '📋 Copiar XML'}
              </button>

              <button
                onClick={handleApplyOptimizedManifest}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-transform active:scale-95"
              >
                🚀 Aplicar no Editor
              </button>
            </div>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto max-h-96 leading-relaxed border border-white/10 select-all">
            {analysisResult?.optimizedManifestXml || manifestXml}
          </pre>
        </div>
      )}

      {/* SUBTAB 4: RAW XML EDITOR */}
      {activeSubTab === 'editor' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[10px]">Edição Direta do Arquivo AndroidManifest.xml</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyText(manifestXml, 'AndroidManifest.xml')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] border border-white/10"
              >
                {copyStatus === 'AndroidManifest.xml' ? '✓ Copiado' : '📋 Copiar'}
              </button>
              <button
                onClick={() => {
                  const res = analyzeManifestLocally(manifestXml);
                  setAnalysisResult(res);
                  addLog("Análise atualizada com o conteúdo editado no manifesto.", "info");
                }}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-[10px]"
              >
                🔄 Reanalisar XML
              </button>
            </div>
          </div>

          <textarea
            value={manifestXml}
            onChange={e => setManifestXml(e.target.value)}
            rows={16}
            className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-xs text-slate-100 focus:outline-none focus:border-sky-500 leading-relaxed"
            placeholder="Cole ou edite seu AndroidManifest.xml aqui..."
          />
        </div>
      )}
    </div>
  );
};

export default ManifestValidatorSection;
