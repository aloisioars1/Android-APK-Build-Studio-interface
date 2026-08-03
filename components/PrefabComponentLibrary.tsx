// components/PrefabComponentLibrary.tsx
import React, { useState, useMemo } from 'react';
import { AppConfig, GeneratedCode } from '../types';
import {
  PREFAB_COMPONENTS,
  PrefabComponent,
  injectComponentIntoProject
} from '../services/androidComponentLibrary';

interface PrefabComponentLibraryProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  generated: GeneratedCode | null;
  setGenerated: React.Dispatch<React.SetStateAction<GeneratedCode | null>>;
  addLog: (msg: string, type?: string) => void;
}

export const PrefabComponentLibrary: React.FC<PrefabComponentLibraryProps> = ({
  config,
  setConfig,
  generated,
  setGenerated,
  addLog
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeComponentId, setActiveComponentId] = useState<string>('login_screen');
  const [activeCodeTab, setActiveCodeTab] = useState<'xml' | 'kotlin'>('xml');
  const [replaceMode, setReplaceMode] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Filter components
  const filteredComponents = useMemo(() => {
    return PREFAB_COMPONENTS.filter(comp => {
      const matchesCategory = selectedCategory === 'Todos' || comp.category === selectedCategory;
      const matchesSearch =
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.previewTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const activeComponent = useMemo(() => {
    return PREFAB_COMPONENTS.find(c => c.id === activeComponentId) || PREFAB_COMPONENTS[0];
  }, [activeComponentId]);

  const categories = ['Todos', 'Autenticação', 'Mídia Social', 'Sistema & Configs', 'E-Commerce', 'Painéis & Dashboards'];

  // Inject component handler
  const handleInject = (component: PrefabComponent) => {
    if (!generated) {
      addLog("Gere o código inicial do aplicativo antes de injetar componentes.", "warning");
      return;
    }

    try {
      const { updatedConfig, updatedGenerated } = injectComponentIntoProject(
        config,
        generated,
        component,
        replaceMode
      );

      setConfig(updatedConfig);
      setGenerated(updatedGenerated);

      const actionText = replaceMode ? "Substituída a tela principal por" : "Injetado no layout existente";
      addLog(`🧩 [Biblioteca de Componentes] ${actionText} "${component.name}"! Código XML e lógica Kotlin sincronizados.`, "success");
    } catch (err: any) {
      addLog(`Erro ao injetar componente: ${err.message}`, "error");
    }
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-indigo-500/30 p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl text-xl">🧩</span>
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300">
                Biblioteca de Componentes Pré-Fabricados (XML & Kotlin)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Selecione telas ou elementos de UI pré-construídos para injetar o layout XML e a lógica Kotlin correspondente diretamente no projeto gerado.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72 shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar Login, Feed, Configs..."
              className="w-full bg-black/50 p-2.5 pl-8 rounded-xl border border-white/10 text-xs text-white outline-none focus:border-indigo-500 font-medium"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-lg border border-indigo-400/40'
                  : 'bg-black/40 text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Component Cards List vs Live Code Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Component List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
            <span className="uppercase tracking-wider">Componentes Disponíveis ({filteredComponents.length})</span>
            <span className="text-[10px] text-slate-500 font-mono">Pronto para Injeção</span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredComponents.map(comp => {
              const isSelected = comp.id === activeComponentId;
              return (
                <div
                  key={comp.id}
                  onClick={() => setActiveComponentId(comp.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border-indigo-500 shadow-2xl scale-[1.01]'
                      : 'bg-slate-900/80 border-white/10 hover:border-white/20 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 bg-black/40 rounded-xl border border-white/5">{comp.icon}</span>
                      <div>
                        <h4 className="text-xs font-black text-white">{comp.name}</h4>
                        <span className="text-[9px] text-indigo-400 font-bold uppercase font-mono">{comp.category}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {comp.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {comp.previewTags.map((tag, i) => (
                      <span key={i} className="text-[8.5px] bg-black/50 text-slate-300 font-mono px-2 py-0.5 rounded-md border border-white/5">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Inject Quick Button */}
                  <div className="pt-2 flex items-center justify-end border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveComponentId(comp.id);
                        handleInject(comp);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      <span>⚡ Injetar Código</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Component Details & Code Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-white/10 space-y-4 shadow-xl">
            {/* Title & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">{activeComponent.icon}</span>
                <div>
                  <h3 className="text-sm font-black text-white">{activeComponent.name}</h3>
                  <span className="text-[10px] text-indigo-300 font-mono font-bold uppercase">{activeComponent.category}</span>
                </div>
              </div>

              {/* Injection Mode Toggle */}
              <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/10 text-[10px]">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Modo de Injeção:</span>
                <button
                  onClick={() => setReplaceMode(false)}
                  className={`px-2.5 py-1 rounded-lg font-black transition-all ${
                    !replaceMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Anexa o componente ao layout e activity existentes"
                >
                  Mesclar
                </button>
                <button
                  onClick={() => setReplaceMode(true)}
                  className={`px-2.5 py-1 rounded-lg font-black transition-all ${
                    replaceMode ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Substitui completamente o layout da tela principal"
                >
                  Substituir Tela
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {activeComponent.description}
            </p>

            {/* Main Action Button */}
            <button
              onClick={() => handleInject(activeComponent)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>⚡ Injetar "{activeComponent.name}" no Projeto</span>
            </button>

            {/* Code Tabs */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveCodeTab('xml')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      activeCodeTab === 'xml'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📄 Layout XML (activity_main.xml)
                  </button>

                  <button
                    onClick={() => setActiveCodeTab('kotlin')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      activeCodeTab === 'kotlin'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🚀 Lógica Kotlin (MainActivity.kt)
                  </button>
                </div>

                <button
                  onClick={() =>
                    handleCopySnippet(
                      activeCodeTab === 'xml' ? activeComponent.xmlLayout : activeComponent.kotlinLogic
                    )
                  }
                  className="px-2.5 py-1 bg-black/50 hover:bg-white/10 text-slate-300 rounded-lg text-[9px] font-mono border border-white/10 transition-colors"
                >
                  {copiedCode ? '✓ Copiado!' : '📋 Copiar Código'}
                </button>
              </div>

              {/* Code Snippet Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-white/10 font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto text-slate-200 scrollbar-thin">
                <pre className="whitespace-pre-wrap select-text">
                  {activeCodeTab === 'xml' ? activeComponent.xmlLayout : activeComponent.kotlinLogic}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
