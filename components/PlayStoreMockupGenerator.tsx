import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppConfig, GeneratedCode } from '../types';
import {
  XmlLayoutAnalysis,
  PlayStoreMockupItem,
  MOCKUP_GRADIENTS,
  analyzeXmlLayout,
  generateInitialMockups,
  generateAiMarketingMockups
} from '../services/playStoreMockupService';

interface PlayStoreMockupGeneratorProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  generated: GeneratedCode | null;
  addLog: (msg: string, type?: string) => void;
}

export const PlayStoreMockupGenerator: React.FC<PlayStoreMockupGeneratorProps> = ({
  config,
  setConfig,
  generated,
  addLog
}) => {
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [selectedMockupId, setSelectedMockupId] = useState<string>('mockup-1');
  const [activeFrameStyle, setActiveFrameStyle] = useState<'pixel_dark' | 'pixel_light' | 'clay_minimal' | 'tablet'>('pixel_dark');
  const [activeGradient, setActiveGradient] = useState<string>(MOCKUP_GRADIENTS[0].css);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Analysis of layout XML
  const xmlAnalysis = useMemo<XmlLayoutAnalysis>(() => {
    const rawXml = generated?.layout || '';
    return analyzeXmlLayout(rawXml, config);
  }, [generated, config]);

  // List of mockups
  const [mockups, setMockups] = useState<PlayStoreMockupItem[]>(() =>
    generateInitialMockups(config, xmlAnalysis)
  );

  // Sync if config or XML analysis changes
  useEffect(() => {
    if (mockups.length === 0) {
      setMockups(generateInitialMockups(config, xmlAnalysis));
    }
  }, [config, xmlAnalysis]);

  const currentMockup = useMemo(() => {
    return mockups.find(m => m.id === selectedMockupId) || mockups[0];
  }, [mockups, selectedMockupId]);

  // Update current mockup field
  const updateCurrentMockup = (field: keyof PlayStoreMockupItem, value: any) => {
    setMockups(prev =>
      prev.map(m => (m.id === selectedMockupId ? { ...m, [field]: value } : m))
    );
  };

  // Run AI Gemini Generator
  const handleGenerateAiMockups = async () => {
    setIsGeneratingAi(true);
    addLog("🤖 Gerando headlines e layouts de screenshots com IA Gemini...", "info");

    try {
      const aiItems = await generateAiMarketingMockups(
        config,
        xmlAnalysis,
        config.modelName || 'gemini-3.6-flash'
      );
      setMockups(aiItems);
      addLog("✨ Mockups e Banners da Play Store gerados com sucesso!", "success");
    } catch (err) {
      addLog("Erro ao gerar mockups com IA. Mantendo mockups locais.", "warning");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // HTML5 Canvas Export PNG Function
  const handleExportMockupPng = (mockupItem: PlayStoreMockupItem) => {
    try {
      const width = mockupItem.layoutPreset === 'feature_banner' ? 1024 : 1080;
      const height = mockupItem.layoutPreset === 'feature_banner' ? 500 : 1920;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill Gradient Background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw Badge Tag
      ctx.fillStyle = mockupItem.accentColor || '#6366f1';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`• ${mockupItem.badge || 'GOOGLE PLAY'}`, 60, 100);

      // Draw Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'black 54px sans-serif';
      ctx.fillText(mockupItem.title, 60, 170);

      // Draw Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '28px sans-serif';
      ctx.fillText(mockupItem.subtitle, 60, 220);

      // Draw Mockup Screen Box
      const deviceX = width * 0.15;
      const deviceY = 280;
      const deviceW = width * 0.70;
      const deviceH = height - 320;

      // Phone Bezel Frame
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(deviceX - 12, deviceY - 12, deviceW + 24, deviceH + 24, 32);
      ctx.fill();

      // Screen Inner
      ctx.fillStyle = config.theme === 'dark' ? '#0f172a' : '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(deviceX, deviceY, deviceW, deviceH, 24);
      ctx.fill();

      // Header Bar
      ctx.fillStyle = config.theme === 'dark' ? '#1e293b' : '#4f46e5';
      ctx.fillRect(deviceX, deviceY, deviceW, 90);

      // Header Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(config.appName, deviceX + 30, deviceY + 55);

      // Dummy Content Items
      const isDark = config.theme === 'dark';
      for (let i = 0; i < 4; i++) {
        const itemY = deviceY + 120 + i * 110;
        ctx.fillStyle = isDark ? '#334155' : '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(deviceX + 30, itemY, deviceW - 60, 90, 16);
        ctx.fill();
      }

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${config.appName.toLowerCase().replace(/\s+/g, '_')}_mockup_${mockupItem.id}.png`;
      link.href = dataUrl;
      link.click();

      addLog(`📷 Download concluído: ${link.download}`, "success");
    } catch (e) {
      addLog("Erro ao exportar mockup para imagem PNG.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: XML Detection & AI Mockup Trigger */}
      <div className="bg-slate-900/90 rounded-2xl border border-indigo-500/30 p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300">
                Gerador de Mockups e Screenshots da Google Play Store (IA)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Crie capturas de tela e banners promocionais otimizados para ASO baseados na detecção do layout XML e tema do seu aplicativo.
            </p>
          </div>

          <button
            onClick={handleGenerateAiMockups}
            disabled={isGeneratingAi}
            className={`px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shrink-0 ${
              isGeneratingAi ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            <span>{isGeneratingAi ? '⏳ Processando com IA...' : '⚡ Criar Mockups com IA Gemini'}</span>
          </button>
        </div>

        {/* XML Detection Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
          <div className="bg-black/50 p-2 rounded-xl border border-white/10 flex flex-col items-center text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase">Categoria Detectada</span>
            <span className="text-indigo-300 font-bold text-[11px] font-sans truncate w-full">{xmlAnalysis.detectedCategory}</span>
          </div>

          <div className="bg-black/50 p-2 rounded-xl border border-white/10 flex flex-col items-center text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase">Componentes XML</span>
            <span className="text-emerald-400 font-bold text-[11px]">
              {xmlAnalysis.detectedElements.length} itens detectados
            </span>
          </div>

          <div className="bg-black/50 p-2 rounded-xl border border-white/10 flex flex-col items-center text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase">Modo de Exibição</span>
            <span className="text-amber-300 font-bold text-[11px] font-sans">
              {config.theme === 'dark' ? '🌙 Dark Mode Native' : '☀️ Light Theme'}
            </span>
          </div>

          <div className="bg-black/50 p-2 rounded-xl border border-white/10 flex flex-col items-center text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase">Header / Toolbar</span>
            <span className={`font-bold text-[11px] ${xmlAnalysis.hasHeader ? 'text-emerald-400' : 'text-slate-500'}`}>
              {xmlAnalysis.hasHeader ? '✓ Detectado' : '– Ausente'}
            </span>
          </div>

          <div className="bg-black/50 p-2 rounded-xl border border-white/10 flex flex-col items-center text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase">Recycler / Lista</span>
            <span className={`font-bold text-[11px] ${xmlAnalysis.hasList ? 'text-emerald-400' : 'text-slate-500'}`}>
              {xmlAnalysis.hasList ? '✓ Detectado' : '– Ausente'}
            </span>
          </div>

          <div className="bg-black/50 p-2 rounded-xl border border-white/10 flex flex-col items-center text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase">Input & FAB</span>
            <span className={`font-bold text-[11px] ${xmlAnalysis.hasInput ? 'text-emerald-400' : 'text-slate-500'}`}>
              {xmlAnalysis.hasInput ? '✓ Detectado' : '– Ausente'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Mockup List vs Visual Canvas Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of 5 Mockups */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
            <span className="uppercase tracking-wider">Screenshots Gerados ({mockups.length})</span>
            <button
              onClick={() => handleExportMockupPng(currentMockup)}
              className="text-emerald-400 hover:text-emerald-300 text-[10px] bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"
            >
              📷 Download Atual
            </button>
          </div>

          <div className="space-y-2">
            {mockups.map((mockup, index) => {
              const isSelected = mockup.id === selectedMockupId;
              return (
                <div
                  key={mockup.id}
                  onClick={() => setSelectedMockupId(mockup.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-indigo-500 shadow-xl scale-[1.02]'
                      : 'bg-slate-900/80 border-white/10 hover:border-white/20 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/50 text-indigo-300 border border-white/10 font-mono">
                      #{index + 1} • {mockup.badge}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {mockup.layoutPreset === 'feature_banner' ? '1024x500 (Banner)' : '1080x1920 (Tela)'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1">{mockup.title}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2">{mockup.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Device Frame & Mockup Customizer */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Personalização de Estilo & Headline
              </span>

              <div className="flex items-center gap-2">
                {/* Frame Style Picker */}
                <div className="flex bg-black/50 p-1 rounded-xl border border-white/10 text-[10px]">
                  <button
                    onClick={() => setActiveFrameStyle('pixel_dark')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      activeFrameStyle === 'pixel_dark' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pixel Dark
                  </button>
                  <button
                    onClick={() => setActiveFrameStyle('pixel_light')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      activeFrameStyle === 'pixel_light' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pixel Light
                  </button>
                  <button
                    onClick={() => setActiveFrameStyle('clay_minimal')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      activeFrameStyle === 'clay_minimal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3D Minimal
                  </button>
                </div>

                <button
                  onClick={() => handleExportMockupPng(currentMockup)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <span>📷 Exportar PNG</span>
                </button>
              </div>
            </div>

            {/* Title & Subtitle Edit Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[9.5px] font-bold uppercase text-slate-400 block mb-1">Badge Tag</label>
                <input
                  type="text"
                  value={currentMockup.badge || ''}
                  onChange={e => updateCurrentMockup('badge', e.target.value)}
                  className="w-full bg-black/50 p-2 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[9.5px] font-bold uppercase text-slate-400 block mb-1">Título de Marketing</label>
                <input
                  type="text"
                  value={currentMockup.title}
                  onChange={e => updateCurrentMockup('title', e.target.value)}
                  className="w-full bg-black/50 p-2 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[9.5px] font-bold uppercase text-slate-400 block mb-1">Subtítulo Explicativo (Benefício)</label>
                <input
                  type="text"
                  value={currentMockup.subtitle}
                  onChange={e => updateCurrentMockup('subtitle', e.target.value)}
                  className="w-full bg-black/50 p-2 rounded-xl border border-white/10 text-slate-200 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Visual Device Frame Canvas Render Container */}
          <div
            className={`relative rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl transition-all duration-500 overflow-hidden bg-gradient-to-b ${currentMockup.gradientBg}`}
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Marketing Text Overlay */}
            <div className="relative z-10 space-y-2 mb-6 text-center sm:text-left">
              <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] rounded-full border border-indigo-500/30 uppercase tracking-widest shadow-lg">
                • {currentMockup.badge || 'GOOGLE PLAY STORE'}
              </span>

              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                {currentMockup.title}
              </h2>

              <p className="text-xs md:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
                {currentMockup.subtitle}
              </p>
            </div>

            {/* Device Mockup Canvas */}
            <div className="relative z-10 flex justify-center items-center pt-2 pb-4">
              {currentMockup.layoutPreset === 'feature_banner' ? (
                /* Feature Graphic Banner Mode (1024x500 style) */
                <div className="w-full max-w-2xl bg-slate-900/90 rounded-2xl border-2 border-indigo-500/40 p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                        {config.appName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white">{config.appName}</h3>
                        <span className="text-[10px] text-emerald-400 font-mono">VERIFICADO NA PLAY STORE</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {config.appDescription || 'Aplicativo completo desenvolvido e otimizado para a plataforma Android.'}
                    </p>

                    <div className="flex items-center gap-2 pt-2">
                      <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-black text-[10px] rounded-lg uppercase tracking-wider">
                        DISPONÍVEL NA PLAY STORE
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">v{config.versionName}</span>
                    </div>
                  </div>

                  {/* Device Mini Phone Frame */}
                  <div className="w-44 shrink-0 bg-slate-950 p-2.5 rounded-3xl border-4 border-slate-800 shadow-2xl space-y-2">
                    <div className="h-2 w-12 bg-slate-800 rounded-full mx-auto" />
                    <div className="bg-slate-900 p-2 rounded-2xl border border-white/10 space-y-2 text-[8px]">
                      <div className="h-5 bg-indigo-600/80 rounded flex items-center px-1 text-white font-bold">
                        {config.appName}
                      </div>
                      <div className="space-y-1">
                        <div className="h-4 bg-slate-800 rounded" />
                        <div className="h-4 bg-slate-800 rounded" />
                        <div className="h-4 bg-slate-800 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Smartphone Device Frame */
                <div
                  className={`w-full max-w-[320px] rounded-[40px] p-3 shadow-2xl relative transition-all ${
                    activeFrameStyle === 'pixel_light'
                      ? 'bg-slate-200 border-4 border-slate-300 text-slate-900'
                      : activeFrameStyle === 'clay_minimal'
                      ? 'bg-indigo-950/80 border-4 border-indigo-500/50 shadow-indigo-500/20'
                      : 'bg-slate-950 border-4 border-slate-800 text-white'
                  }`}
                >
                  {/* Speaker Punch Hole & Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-black rounded-full z-30 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
                  </div>

                  {/* Device Display Screen */}
                  <div
                    className={`w-full h-[520px] rounded-[32px] overflow-hidden flex flex-col justify-between border relative ${
                      config.theme === 'dark'
                        ? 'bg-slate-950 border-white/10 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {/* Status Bar */}
                    <div className="pt-3 px-5 flex items-center justify-between text-[9px] font-mono text-slate-400 z-20">
                      <span className="font-bold">09:41</span>
                      <div className="flex items-center gap-1.5">
                        <span>5G</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* App Header / Toolbar */}
                    <div className="p-3 bg-indigo-600 text-white flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-xs font-bold">
                          {config.appName.charAt(0)}
                        </div>
                        <span className="font-bold text-xs">{config.appName}</span>
                      </div>

                      <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-mono">
                        v{config.versionName}
                      </span>
                    </div>

                    {/* Main Screen Body simulated from XML */}
                    <div className="flex-1 p-3 space-y-2.5 overflow-y-auto font-sans">
                      {/* Sub-Header Banner */}
                      <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 space-y-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                          {xmlAnalysis.detectedCategory}
                        </span>
                        <p className="text-[11px] text-slate-300 font-medium">
                          Bem-vindo ao {config.appName}. Interface pronta para produção Android.
                        </p>
                      </div>

                      {/* Simulated List Items from RecyclerView */}
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map(idx => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              config.theme === 'dark'
                                ? 'bg-slate-900 border-white/5 text-slate-200'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                                #{idx}
                              </div>
                              <div className="space-y-0.5 text-left">
                                <p className="text-[10px] font-bold">Item de Registro #{idx}</p>
                                <p className="text-[9px] text-slate-400">Processado com sucesso • 100% seguro</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-indigo-400 font-mono font-bold">OK</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action Area / Input Bar */}
                    <div className="p-2.5 bg-slate-900 border-t border-white/10 flex items-center gap-2">
                      <div className="flex-1 bg-black/60 px-3 py-2 rounded-xl text-[10px] text-slate-400 border border-white/10 font-mono">
                        Sua mensagem ou pesquisa...
                      </div>
                      <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow">
                        ➔
                      </div>
                    </div>

                    {/* Home Indicator Bar */}
                    <div className="pb-1.5 pt-0.5 flex justify-center">
                      <div className="w-24 h-1 bg-slate-500/40 rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
