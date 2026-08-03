import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { generateReadme, generateReadmeWithAi } from '../services/readmeGenerator';

interface ReadmeManagerSectionProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  addLog: (msg: string, type?: string) => void;
}

export const ReadmeManagerSection: React.FC<ReadmeManagerSectionProps> = ({
  config,
  setConfig,
  addLog
}) => {
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'features'>('preview');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<boolean>(false);

  // Generate initial README based on current IDE state
  useEffect(() => {
    const generated = generateReadme(config);
    setReadmeContent(generated);
  }, [
    config.appName,
    config.packageName,
    config.platform,
    config.appDescription,
    config.components,
    config.modelName,
    config.useSearch,
    config.autoSignRelease,
    config.enableFirebaseDistribution,
    config.githubUser,
    config.githubRepo
  ]);

  // Description input handler
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDesc = e.target.value;
    setConfig(prev => ({ ...prev, appDescription: newDesc }));
  };

  // Re-generate using structured default algorithm
  const handleRegenerateDefault = () => {
    const newReadme = generateReadme(config);
    setReadmeContent(newReadme);
    addLog("📄 README.md atualizado com os dados atuais da IDE.", "info");
  };

  // AI-powered generation handler
  const handleGenerateWithAi = async () => {
    setAiGenerating(true);
    addLog("🤖 Solicitando ao Gemini AI a geração de um README.md profissional...", "info");

    try {
      const aiReadme = await generateReadmeWithAi(config, customInstructions);
      setReadmeContent(aiReadme);
      addLog("✨ README.md profissional gerado com sucesso via Gemini AI!", "success");
    } catch (e: any) {
      addLog("Erro ao gerar README via IA: " + e.message, "error");
    } finally {
      setAiGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(readmeContent);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
    addLog("📋 README.md copiado para a área de transferência.", "info");
  };

  // Download README.md file
  const handleDownload = () => {
    const blob = new Blob([readmeContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'README.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog("📥 Arquivo README.md baixado com sucesso.", "success");
  };

  return (
    <div className="bg-[#0f172a]/95 rounded-2xl border border-sky-500/30 p-5 shadow-2xl space-y-6 text-slate-100 my-2">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30 text-xs font-bold uppercase tracking-wider">
              📝 GitHub Documentation Auto-Generator
            </span>
            <span className="text-[10px] text-slate-400 font-mono">IDE State Extractor</span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>Gerador Automático de README.md</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            Extrai dinamicamente nome, descrição, componentes de UI, modelos de IA, credenciais de assinatura Keystore e pipelines CI/CD da IDE para gerar um README.md profissional para seu repositório GitHub.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5"
          >
            <span>{copyStatus ? '✓ Copiado!' : '📋 Copiar XML / MD'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold border border-sky-400/30 shadow transition-all flex items-center gap-1.5"
          >
            <span>📥 Baixar README.md</span>
          </button>
        </div>
      </div>

      {/* App Description & IDE Extractor Bar */}
      <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <span>✏️ Descrição do Aplicativo (Utilizada na Documentação)</span>
          </label>
          <span className="text-[10px] text-slate-400">
            Sincroniza automaticamente com a documentação
          </span>
        </div>
        <textarea
          value={config.appDescription || ''}
          onChange={handleDescriptionChange}
          rows={2}
          placeholder="Digite uma breve descrição funcional do seu aplicativo... Ex: Aplicativo de controle financeiro pessoal com relatórios visuais e inteligência artificial para previsão de orçamentos."
          className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 leading-relaxed"
        />
      </div>

      {/* Navigation SubTabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'preview' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📄 Visualizar Renderizado
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'editor' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📝 Editor Markdown Raw
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'features' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Recursos Extraídos da IDE ({config.components?.length || 0})
          </button>
        </div>

        {/* AI Generator Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerateDefault}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors"
            title="Sincronizar com as últimas configurações da IDE"
          >
            🔄 Recarregar IDE
          </button>
        </div>
      </div>

      {/* AI Prompt Tuning Section */}
      <div className="p-3 bg-gradient-to-r from-sky-950/40 via-blue-950/30 to-slate-900/60 rounded-xl border border-sky-500/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
            🤖 Personalizar README via Gemini AI
          </span>
          <input
            type="text"
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            placeholder="Ex: Traduzir para inglês, adicionar seção de arquitetura MVVM e licença Apache 2.0..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <button
          onClick={handleGenerateWithAi}
          disabled={aiGenerating}
          className={`px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-600/20 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2 ${
            aiGenerating ? 'opacity-50 cursor-wait' : ''
          }`}
        >
          <span>{aiGenerating ? '⏳ Gerando...' : '✨ Gerar via IA'}</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: RENDERED PREVIEW */}
      {activeTab === 'preview' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-white/10 space-y-4 font-sans text-slate-200 text-xs leading-relaxed max-h-[600px] overflow-y-auto">
          {/* Formatted Markdown Display Simulation */}
          <div className="prose prose-invert max-w-none space-y-4">
            <div className="border-b border-white/10 pb-4 space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {config.appName || 'Meu Aplicativo'}
              </h1>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded text-[10px] font-mono font-bold">
                  Platform: {config.platform.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded text-[10px] font-mono font-bold">
                  CI/CD: GitHub Actions
                </span>
                <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-mono">
                  Package: {config.packageName}
                </span>
              </div>
              <p className="text-slate-300 italic pt-2">
                {config.appDescription || 'Aplicativo nativo desenvolvido com Heavy Studio Pro IDE e compilação automatizada.'}
              </p>
            </div>

            {/* Display raw markdown formatted nicely in container */}
            <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
              {readmeContent}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: RAW MARKDOWN EDITOR */}
      {activeTab === 'editor' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[10px]">Edição Livre do arquivo README.md</span>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] border border-white/10"
            >
              📋 Copiar Conteúdo
            </button>
          </div>
          <textarea
            value={readmeContent}
            onChange={e => setReadmeContent(e.target.value)}
            rows={18}
            className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-xs text-emerald-300 focus:outline-none focus:border-sky-500 leading-relaxed"
            placeholder="Conteúdo do README.md..."
          />
        </div>
      )}

      {/* TAB 3: EXTRACTED IDE FEATURES SUMMARY */}
      {activeTab === 'features' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Informações Gerais */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
            <h4 className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
              <span>📱 Metadados do App</span>
            </h4>
            <div className="text-xs space-y-1 text-slate-300 font-mono">
              <p><strong className="text-slate-400 font-sans">Nome:</strong> {config.appName}</p>
              <p><strong className="text-slate-400 font-sans">Pacote:</strong> {config.packageName}</p>
              <p><strong className="text-slate-400 font-sans">Plataforma:</strong> {config.platform}</p>
              <p><strong className="text-slate-400 font-sans">Tema:</strong> {config.theme}</p>
            </div>
          </div>

          {/* Card 2: Componentes de UI */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
            <h4 className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
              <span>🎨 Interface ({config.components?.length || 0} Componentes)</span>
            </h4>
            <div className="text-xs space-y-1 text-slate-300 max-h-32 overflow-y-auto">
              {config.components && config.components.length > 0 ? (
                config.components.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] bg-black/30 p-1.5 rounded border border-white/5">
                    <span className="font-semibold text-white">{c.label}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 bg-sky-500/20 text-sky-300 rounded font-mono">
                      {c.type}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic text-[11px]">Nenhum componente cadastrado.</p>
              )}
            </div>
          </div>

          {/* Card 3: Configurações de IA */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
            <h4 className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
              <span>🧠 Gemini AI</span>
            </h4>
            <div className="text-xs space-y-1 text-slate-300 font-mono">
              <p><strong className="text-slate-400 font-sans">Modelo:</strong> {config.modelName || 'Não ativo'}</p>
              <p><strong className="text-slate-400 font-sans">Busca Web:</strong> {config.useSearch ? 'Habilitada' : 'Desabilitada'}</p>
              <p><strong className="text-slate-400 font-sans">Thinking Budget:</strong> {config.thinkingBudget || 'Auto'}</p>
            </div>
          </div>

          {/* Card 4: GitHub CI/CD */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
            <h4 className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
              <span>🚀 Pipeline GitHub</span>
            </h4>
            <div className="text-xs space-y-1 text-slate-300 font-mono">
              <p><strong className="text-slate-400 font-sans">Repositório:</strong> {config.githubUser}/{config.githubRepo}</p>
              <p><strong className="text-slate-400 font-sans">Branch:</strong> {config.workflowBranch || 'main'}</p>
              <p><strong className="text-slate-400 font-sans">Runner:</strong> {config.workflowRunner || 'ubuntu-latest'}</p>
            </div>
          </div>

          {/* Card 5: Keystore & Sign */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
            <h4 className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
              <span>🔐 Assinatura Keystore</span>
            </h4>
            <div className="text-xs space-y-1 text-slate-300 font-mono">
              <p><strong className="text-slate-400 font-sans">Auto-Sign:</strong> {config.autoSignRelease ? 'Sim' : 'Não'}</p>
              <p><strong className="text-slate-400 font-sans">Alias:</strong> {config.keystoreAlias || 'None'}</p>
              <p><strong className="text-slate-400 font-sans">Org:</strong> {config.keystoreOrg || 'None'}</p>
            </div>
          </div>

          {/* Card 6: Firebase App Distribution */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
            <h4 className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
              <span>🔥 Firebase Distribution</span>
            </h4>
            <div className="text-xs space-y-1 text-slate-300 font-mono">
              <p><strong className="text-slate-400 font-sans">Status:</strong> {config.enableFirebaseDistribution ? 'Habilitado' : 'Desabilitado'}</p>
              <p><strong className="text-slate-400 font-sans">Testers:</strong> {config.firebaseTesters || 'Nenhum'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadmeManagerSection;
