import React, { useState } from 'react';
import { AppConfig, GeneratedCode } from '../types';
import { generateAiChangelog, GeneratedChangelogResult } from '../services/aiChangelogGenerator';

interface PlayStoreChangelogGeneratorProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  generated: GeneratedCode | null;
  addLog: (msg: string, type?: string) => void;
}

interface SavedReleaseNoteEntry {
  id: string;
  timestamp: string;
  versionName: string;
  versionCode: number;
  track: string;
  notes: string;
  markdown: string;
}

export const PlayStoreChangelogGenerator: React.FC<PlayStoreChangelogGeneratorProps> = ({
  config,
  setConfig,
  generated,
  addLog
}) => {
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [tone, setTone] = useState<'professional' | 'marketing' | 'technical' | 'fun'>('professional');
  const [language, setLanguage] = useState<'pt-BR' | 'en-US' | 'es-ES'>('pt-BR');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [result, setResult] = useState<GeneratedChangelogResult | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<'play' | 'markdown' | 'fastlane'>('play');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedReleaseNoteEntry[]>(() => {
    try {
      const saved = localStorage.getItem('heavy_studio_release_notes_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const track = config.playConsoleTrack || 'internal';
  const currentNotes = config.playConsoleReleaseNotes || '';

  const saveHistoryEntry = (res: GeneratedChangelogResult) => {
    const newEntry: SavedReleaseNoteEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('pt-BR'),
      versionName: config.versionName || '1.0.0',
      versionCode: config.versionCode || 1,
      track,
      notes: res.shortReleaseNotes,
      markdown: res.markdownChangelog
    };
    const updated = [newEntry, ...history.slice(0, 9)];
    setHistory(updated);
    try {
      localStorage.setItem('heavy_studio_release_notes_history', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    addLog(`🤖 Iniciando gerador de Release Notes com IA para ${config.appName || 'o app'} (v${config.versionName})...`, "info");

    try {
      const res = await generateAiChangelog({
        appName: config.appName || 'Meu App',
        versionName: config.versionName || '1.0.0',
        versionCode: config.versionCode || 1,
        platform: config.platform || 'android',
        track,
        appDescription: config.appDescription,
        generatedCode: generated,
        customPrompt,
        tone,
        language
      }, addLog);

      setResult(res);
      saveHistoryEntry(res);

      // Auto-apply to config if configured or empty
      if (!config.playConsoleReleaseNotes || window.confirm("Deseja aplicar automaticamente as notas geradas ao campo do Play Console?")) {
        setConfig(prev => ({ ...prev, playConsoleReleaseNotes: res.shortReleaseNotes }));
        addLog("✅ Release notes aplicadas ao Play Console com sucesso!", "success");
      }
    } catch (err: any) {
      addLog(`❌ Erro ao gerar release notes: ${err.message}`, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addLog("📋 Texto copiado para a área de transferência!", "info");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadTextFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog(`📥 Arquivo ${filename} baixado com sucesso!`, "success");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 p-5 rounded-2xl border border-blue-500/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖📝</span>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                IA Release Notes & Changelog Generator
              </h3>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                Play Console Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Gere automaticamente notas de lançamento otimizadas e no limite exato do Google Play Console (500 caracteres), Fastlane <code className="text-blue-300 font-mono">whatsnew-pt-BR.txt</code> e changelog em Markdown para o GitHub.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/10 text-xs font-mono">
            <span className="text-slate-400">Versão Alvo:</span>
            <span className="text-emerald-400 font-bold">v{config.versionName || '1.0.0'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Code:</span>
            <span className="text-blue-400 font-bold">{config.versionCode || 1}</span>
            <span className="text-slate-600">|</span>
            <span className="text-purple-400 uppercase font-bold">{track}</span>
          </div>
        </div>
      </div>

      {/* Generator Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900/90 p-5 rounded-2xl border border-white/10 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
            <span>⚙️</span> Parâmetros da Geração
          </h4>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 block">
              O que mudou nesta versão? (Opcional):
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Adicionado suporte a login biométrico, corrigido bug de áudio na tela de lições, otimizado tamanho do AAB..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
            <p className="text-[10px] text-slate-400">
              Se deixar em branco, a IA utilizará os dados do projeto, código gerado e histórico para inferir as melhorias.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">Tom de Voz:</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="professional">👔 Profissional</option>
                <option value="marketing">✨ Entusiasta / Marketing</option>
                <option value="technical">⚡ Técnico / Direto</option>
                <option value="fun">🎉 Divertido / Amigável</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">Idioma:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="pt-BR">🇧🇷 Português (pt-BR)</option>
                <option value="en-US">🇺🇸 Inglês (en-US)</option>
                <option value="es-ES">🇪🇸 Espanhol (es-ES)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
              isGenerating
                ? 'bg-blue-600/50 text-white/70 cursor-not-allowed animate-pulse'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-500/20'
            }`}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin text-base">🔄</span>
                <span>Analisando & Gerando com IA...</span>
              </>
            ) : (
              <>
                <span className="text-base">✨</span>
                <span>Gerar Release Notes (IA)</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Result View */}
        <div className="lg:col-span-2 bg-slate-900/90 p-5 rounded-2xl border border-white/10 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveOutputTab('play')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeOutputTab === 'play'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  📱 Google Play Console (whatsnew)
                </button>
                <button
                  onClick={() => setActiveOutputTab('markdown')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeOutputTab === 'markdown'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  📝 Markdown (GitHub Release)
                </button>
                <button
                  onClick={() => setActiveOutputTab('fastlane')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeOutputTab === 'fastlane'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🚀 Fastlane Format
                </button>
              </div>

              {result && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setConfig(prev => ({ ...prev, playConsoleReleaseNotes: result.shortReleaseNotes }));
                      addLog("✅ Release notes salvas na configuração do Play Console!", "success");
                    }}
                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold uppercase transition-colors"
                  >
                    Aplicar no Config
                  </button>
                </div>
              )}
            </div>

            {/* Output Display */}
            <div className="mt-4 space-y-3">
              {activeOutputTab === 'play' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Texto para a caixa "O que há de novo":</span>
                    <span className={`font-mono text-[11px] ${
                      (result ? result.shortReleaseNotes.length : currentNotes.length) > 480
                        ? 'text-amber-400 font-bold'
                        : 'text-emerald-400'
                    }`}>
                      {result ? result.shortReleaseNotes.length : currentNotes.length} / 500 caracteres
                    </span>
                  </div>

                  <textarea
                    value={result ? result.shortReleaseNotes : currentNotes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (result) {
                        setResult({ ...result, shortReleaseNotes: val });
                      } else {
                        setConfig(prev => ({ ...prev, playConsoleReleaseNotes: val }));
                      }
                    }}
                    rows={6}
                    placeholder="Gere ou digite as notas de lançamento para a Play Store..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      💡 O Play Console limita este texto a 500 caracteres por idioma.
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(result ? result.shortReleaseNotes : currentNotes, 'play')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        {copiedKey === 'play' ? '✅ Copiado!' : '📋 Copiar Notas'}
                      </button>
                      <button
                        onClick={() => downloadTextFile(
                          result ? result.shortReleaseNotes : currentNotes,
                          `whatsnew-${language}.txt`
                        )}
                        className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        📥 Baixar whatsnew.txt
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeOutputTab === 'markdown' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Changelog Completo (Markdown):</span>
                    <span className="text-slate-400 font-mono text-[10px]">release_notes.md</span>
                  </div>

                  <pre className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-emerald-300 font-mono leading-relaxed overflow-x-auto max-h-[220px] whitespace-pre-wrap">
                    {result ? result.markdownChangelog : '# Release Notes\nClique em "Gerar Release Notes (IA)" para criar o changelog em Markdown.'}
                  </pre>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => copyToClipboard(result?.markdownChangelog || '', 'md')}
                      disabled={!result}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-white/10 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      {copiedKey === 'md' ? '✅ Copiado!' : '📋 Copiar Markdown'}
                    </button>
                    <button
                      onClick={() => downloadTextFile(result?.markdownChangelog || '', `CHANGELOG-v${config.versionName || '1.0.0'}.md`)}
                      disabled={!result}
                      className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-50 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      📥 Baixar CHANGELOG.md
                    </button>
                  </div>
                </div>
              )}

              {activeOutputTab === 'fastlane' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Formato Estruturado para Fastlane Supply:</span>
                    <span className="text-slate-400 font-mono text-[10px]">metadata/android/{language}/changelogs/{config.versionCode || 1}.txt</span>
                  </div>

                  <textarea
                    readOnly
                    value={result ? result.fastlaneFormatted : 'Clique em Gerar para criar o arquivo Fastlane.'}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-amber-300 font-mono leading-relaxed focus:outline-none"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => copyToClipboard(result?.fastlaneFormatted || '', 'fastlane')}
                      disabled={!result}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-white/10 rounded-lg text-xs font-bold transition-colors"
                    >
                      {copiedKey === 'fastlane' ? '✅ Copiado!' : '📋 Copiar Fastlane'}
                    </button>
                    <button
                      onClick={() => downloadTextFile(
                        result?.fastlaneFormatted || '',
                        `${config.versionCode || 1}.txt`
                      )}
                      disabled={!result}
                      className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 disabled:opacity-50 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors"
                    >
                      📥 Baixar {config.versionCode || 1}.txt
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Highlights summary */}
          {result?.highlights && result.highlights.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-xl border border-white/10 mt-2">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block mb-1">
                ⭐ Tópicos de Destaque Gerados pela IA:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                {result.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-emerald-400 text-xs">•</span>
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <span>📜</span> Histórico de Release Notes Geradas
            </h4>
            <button
              onClick={() => {
                if (window.confirm("Limpar histórico de release notes?")) {
                  setHistory([]);
                  localStorage.removeItem('heavy_studio_release_notes_history');
                  addLog("🧹 Histórico de release notes limpo.", "info");
                }
              }}
              className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
            >
              Limpar Histórico
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((item) => (
              <div key={item.id} className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-2 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-blue-400 font-mono">v{item.versionName} ({item.versionCode})</span>
                  <span className="text-slate-500">{item.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-3 font-mono leading-snug">
                  {item.notes}
                </p>
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => {
                      setConfig(prev => ({ ...prev, playConsoleReleaseNotes: item.notes }));
                      addLog(`✅ Aplicada versão v${item.versionName} do histórico!`, "success");
                    }}
                    className="flex-1 py-1 text-[9px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded font-bold transition-colors"
                  >
                    Usar Esta
                  </button>
                  <button
                    onClick={() => copyToClipboard(item.notes, `hist-${item.id}`)}
                    className="px-2 py-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition-colors"
                  >
                    {copiedKey === `hist-${item.id}` ? '✓' : 'Copiar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
