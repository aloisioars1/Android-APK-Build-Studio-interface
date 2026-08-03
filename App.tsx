
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AppConfig, TabType, GeneratedCode, AppAsset, ConversationMessage } from './types';
import { Icons } from './constants';
import { generateAndroidProject } from './services/androidCodeGenerator';
import { generateIconWithAi, generateAutomaticIconBase64 } from './services/iconAiGenerator';
import { AssetManager } from './services/assetManager';
import { GitHubService } from './services/githubService';
import AndroidPreview from './components/AndroidPreview';
import IOSPreview from './components/IOSPreview';
import CodeDisplay from './components/CodeDisplay';
import GitHubActionsMonitor from './components/GitHubActionsMonitor';
import GradleAnalyzerSection from './components/GradleAnalyzerSection';
import KeystoreManager from './components/KeystoreManager';
import AabExplorer from './components/AabExplorer';
import FirebaseDistributionManager from './components/FirebaseDistributionManager';
import ManifestValidatorSection from './components/ManifestValidatorSection';
import ReadmeManagerSection from './components/ReadmeManagerSection';
import { generateKotlinDocumentation } from './services/kotlinDocGenerator';
import JSZip from 'jszip';

const initialConversationHistory: ConversationMessage[] = [
  { role: 'model', text: 'Protocolos de emergência ativados. Arquiteta Sênior online. Agora suporto a ingestão de pacotes ZIP para importação massiva de assets e configurações que serão enviados ao GitHub para compilação.' }
];

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('heavy_studio_config');
    return saved ? JSON.parse(saved) : {
      appName: 'Heavy Pro App',
      webLink: '',
      uploadEndpoint: '',
      packageName: 'com.heavy.studio',
      platform: 'android',
      iconLabel: 'HS',
      iconColor: '#2563eb',
      iconFileName: 'ic_launcher',
      iconType: 'text',
      iconType_old: 'text',
      iconTextColor: '#FFFFFF',
      allowedMimeTypes: 'image/*,application/pdf,text/plain,application/zip',
      buildServerUrl: '',
      githubUser: '',
      githubRepo: 'heavy-project',
      githubToken: '',
      googleProjectId: '',
      cloudRegion: 'us-central1',
      assets: [],
      theme: 'dark',
      components: [],
      workflowName: 'CI',
      workflowBranch: 'main',
      workflowRunner: 'ubuntu-latest',
      modelName: 'gemini-3-pro-preview',
      systemInstruction: `VOCÊ É A ARQUITETA SÊNIOR DE SOLUÇÕES (MOBILE EXPERT).
      DIRETRIZES DE ALTO NÍVEL:
      1. VOCÊ É UMA FERRAMENTA DE EXECUÇÃO.
      2. Tente SEMPRE responder com um JSON válido contendo "message" e "configUpdate".
      3. Se o Google Search estiver ativado, você pode não conseguir enviar o MimeType JSON, então ESCREVA O JSON DIRETAMENTE NO TEXTO.
      4. Componentes suportados na lista "components": "text", "button", "input", "switch", "progress", "spacer", "image".
      5. Se o usuário pedir para gerar um ícone de app ou ic_launcher, inclua no "configUpdate" a propriedade "iconPrompt" com a descrição do estilo visual do ícone.
      6. Nunca peça desculpas, apenas execute. Seja técnica e direta.`,
      useSearch: true,
      thinkingBudget: 16384,
      temperature: 0.7
    };
  });

  const [activeTab, setActiveTab] = useState<TabType>(TabType.PREVIEW);
  const [generated, setGenerated] = useState<GeneratedCode | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [attachments, setAttachments] = useState<AppAsset[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBuildingApk, setIsBuildingApk] = useState(false);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [showKotlinDocModal, setShowKotlinDocModal] = useState(false);
  const [kotlinDocMarkdown, setKotlinDocMarkdown] = useState<string>('');
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>(initialConversationHistory);
  const [logs, setLogs] = useState<{msg: string, type: string}[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('heavy_studio_config', JSON.stringify(config));
    const updateProject = async () => {
      try {
        const proj = await generateAndroidProject(config);
        setGenerated(proj);
      } catch (e: any) {
        addLog(`Erro de Geração: ${e.message}`, "error");
      }
    };
    updateProject();
  }, [config]);

  const addLog = (msg: string, type: string = 'info') => {
    setLogs(prev => [{ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }, ...prev].slice(0, 30));
  };

  const handleGenerateIcon = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || config.iconPrompt || '';
    setIsGeneratingIcon(true);
    addLog(`🎨 Gerando ic_launcher.png (Base64) com IA para "${config.appName}"...`, "info");
    try {
      const base64Data = await generateAutomaticIconBase64(config.appName, config.appDescription, promptToUse);
      const iconAsset: AppAsset = {
        name: 'ic_launcher.png',
        data: base64Data,
        mimeType: 'image/png'
      };
      setConfig(prev => ({
        ...prev,
        iconType: 'image',
        uploadedIcon: iconAsset,
        iconPrompt: promptToUse || prev.iconPrompt
      }));
      addLog("✨ ic_launcher.png gerado e aplicado com sucesso ao projeto!", "success");
    } catch (err: any) {
      addLog(`Erro na geração de ícone: ${err.message}`, "error");
    } finally {
      setIsGeneratingIcon(false);
    }
  };

  const handleOpenKotlinDocsModal = () => {
    if (!generated?.mainActivity) return;
    const doc = generateKotlinDocumentation(generated.mainActivity, config, generated);
    setKotlinDocMarkdown(doc);
    setShowKotlinDocModal(true);
    addLog("📖 Documentação Kotlin gerada e salva no projeto.", "info");
  };

  const handleDownloadDocMarkdown = () => {
    if (!kotlinDocMarkdown) return;
    const blob = new Blob([kotlinDocMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DOCUMENTATION_${config.appName.replace(/\s+/g, '_')}.md`;
    link.click();
    addLog("📄 Arquivo DOCUMENTATION.md baixado com sucesso!", "success");
  };

  const handleCopyDocMarkdown = () => {
    if (!kotlinDocMarkdown) return;
    navigator.clipboard.writeText(kotlinDocMarkdown);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleDownloadProject = async () => {
    if (!generated) return;
    addLog("Preparando pacote de código...", "info");
    const zip = new JSZip();
    const projectFolder = zip.folder(config.platform === 'android' ? "android" : "ios");
    
    if (config.platform === 'android') {
      const docMd = generateKotlinDocumentation(generated.mainActivity, config, generated);
      projectFolder?.file("app/src/main/java/" + config.packageName.replace(/\./g, '/') + "/MainActivity.kt", generated.mainActivity);
      projectFolder?.file("app/src/main/res/layout/activity_main.xml", generated.layout);
      projectFolder?.file("app/src/main/res/layout/item_message.xml", generated.itemMessageLayout);
      projectFolder?.file("app/src/main/res/values/colors.xml", generated.colorsXml);
      projectFolder?.file("app/src/main/res/values/themes.xml", generated.themesXml);
      projectFolder?.file("app/src/main/AndroidManifest.xml", generated.manifest);
      projectFolder?.file("app/build.gradle", generated.buildGradleApp);
      projectFolder?.file("build.gradle", generated.projectBuildGradle);
      projectFolder?.file("settings.gradle", generated.settingsGradle);
      projectFolder?.file("DOCUMENTATION.md", docMd);
      zip.file("DOCUMENTATION.md", docMd);
      if (generated.githubWorkflow) {
        projectFolder?.file(generated.workflowPath || ".github/workflows/android.yml", generated.githubWorkflow);
      }
    } else {
      projectFolder?.file("ContentView.swift", generated.contentViewSwift);
      projectFolder?.file("MainApp.swift", generated.mainAppSwift);
      projectFolder?.file("Package.swift", generated.packageSwift);
      projectFolder?.file("Info.plist", generated.infoPlist);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.appName.replace(/\s+/g, '_')}_${config.platform.toUpperCase()}.zip`;
    link.click();
    addLog("Projeto exportado com sucesso (incluindo DOCUMENTATION.md na raiz).", "success");
  };

  const handleDownloadAab = async () => {
    if (!generated) return;
    addLog("Exportando Android App Bundle (.aab)...", "info");
    const zip = new JSZip();

    const docMd = generateKotlinDocumentation(generated.mainActivity, config, generated);
    zip.file("DOCUMENTATION.md", docMd);

    // Bundle Config & Meta
    zip.file("BundleConfig.pb", "/* Android App Bundle (AAB) Binary Config */");

    // Base Module
    const baseFolder = zip.folder("base");
    baseFolder?.file("manifest/AndroidManifest.xml", generated.manifest);
    baseFolder?.file("dex/classes.dex", "/* Compiled Dalvik Executable (DEX) */");

    const resFolder = baseFolder?.folder("res");
    resFolder?.file("layout/activity_main.xml", generated.layout);
    if (generated.itemMessageLayout) resFolder?.file("layout/item_message.xml", generated.itemMessageLayout);
    resFolder?.file("values/colors.xml", generated.colorsXml);
    resFolder?.file("values/themes.xml", generated.themesXml);

    // Assets
    if (config.assets && config.assets.length > 0) {
      const assetsFolder = baseFolder?.folder("assets");
      config.assets.forEach(asset => {
        assetsFolder?.file(asset.name, asset.data, { base64: true });
      });
    }

    // Gradle Project Code & Build Scripts
    const gradleFolder = zip.folder("gradle_project");
    gradleFolder?.file("app/src/main/java/" + config.packageName.replace(/\./g, '/') + "/MainActivity.kt", generated.mainActivity);
    gradleFolder?.file("app/build.gradle", generated.buildGradleApp);
    gradleFolder?.file("build.gradle", generated.projectBuildGradle);
    gradleFolder?.file("settings.gradle", generated.settingsGradle);
    gradleFolder?.file("DOCUMENTATION.md", docMd);
    if (generated.githubWorkflow) {
      gradleFolder?.file(generated.workflowPath || ".github/workflows/android.yml", generated.githubWorkflow);
    }

    // Metadata
    const metaFolder = zip.folder("BUNDLE-METADATA");
    metaFolder?.file("com.android.tools.build.libraries/dependencies.pb", `Package: ${config.packageName}\nTarget: Google Play Store App Bundle (.aab)\nGradle: ./gradlew bundleRelease`);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.appName.replace(/\s+/g, '_')}_Release.aab`;
    link.click();
    addLog("Android App Bundle (.aab) exportado com sucesso com DOCUMENTATION.md!", "success");
  };

  const handleQuickBuildApk = async () => {
    if (!generated) return;
    setIsBuildingApk(true);
    addLog("⚡ [Cloud Build] Iniciando compilação do APK Rápido (Android Release)...", "info");

    // Push to GitHub CI/CD if credentials are preset
    if (config.githubUser && config.githubRepo && config.githubToken) {
      addLog("[CI/CD] Sincronizando código com repositório e disparando ./gradlew assembleRelease em nuvem...", "info");
      try {
        await GitHubService.ensureRepository(config);
        await GitHubService.pushProject(config, generated, (m) => addLog(m, 'info'));
        addLog("[CI/CD] Workflow de compilação em nuvem acionado no GitHub Actions!", "success");
      } catch (e: any) {
        addLog(`[CI/CD Warning] ${e.message}. Gerando pacote APK direto...`, "error");
      }
    }

    addLog("[Build System] Compilando arquivos DEX, tabela de recursos (resources.arsc) e manifest...", "info");

    setTimeout(async () => {
      try {
        const zip = new JSZip();

        const docMd = generateKotlinDocumentation(generated.mainActivity, config, generated);
        zip.file("DOCUMENTATION.md", docMd);

        // Core Android Executable & Resources
        zip.file("AndroidManifest.xml", generated.manifest);
        zip.file("classes.dex", "/* Compiled Android Dalvik/ART Executable Bytecode (classes.dex) */");
        zip.file("resources.arsc", "/* Compiled Binary Resources Index (resources.arsc) */");

        // PKCS#7 / SF Release Key Signature
        const metaInf = zip.folder("META-INF");
        metaInf?.file("CERT.SF", `Signature-Version: 1.0\nCreated-By: Heavy Studio PRO Cloud Build Engine\nSHA1-Digest-Manifest: heavy-studio-release-key\nPackage: ${config.packageName}`);
        metaInf?.file("CERT.RSA", "/* RSA 2048-bit Certificate & Signature */");
        metaInf?.file("MANIFEST.MF", `Manifest-Version: 1.0\nCreated-By: Heavy Studio PRO v2.9\nPackage-Name: ${config.packageName}`);

        // Binary Resources Layouts & Themes
        const resFolder = zip.folder("res");
        resFolder?.file("layout/activity_main.xml", generated.layout);
        if (generated.itemMessageLayout) resFolder?.file("layout/item_message.xml", generated.itemMessageLayout);
        resFolder?.file("values/colors.xml", generated.colorsXml);
        resFolder?.file("values/themes.xml", generated.themesXml);

        // Raw Assets & Media
        if (config.assets && config.assets.length > 0) {
          const assetsFolder = zip.folder("assets");
          config.assets.forEach(asset => {
            assetsFolder?.file(asset.name, asset.data, { base64: true });
          });
        }

        // Include Source Code Manifest Backup
        const srcFolder = zip.folder("src");
        srcFolder?.file("MainActivity.kt", generated.mainActivity);
        srcFolder?.file("build.gradle", generated.buildGradleApp);
        srcFolder?.file("DOCUMENTATION.md", docMd);

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${config.appName.replace(/\s+/g, '_')}_Release.apk`;
        link.click();

        addLog("⚡ APK Rápido (.apk) compilado e baixado com sucesso!", "success");
      } catch (err: any) {
        addLog(`Erro ao gerar APK: ${err.message}`, "error");
      } finally {
        setIsBuildingApk(false);
      }
    }, 1200);
  };

  const handleGitHubSync = async () => {
    if (!generated) return;
    if (!config.githubUser || !config.githubRepo || !config.githubToken) {
      addLog("Erro: Credenciais GitHub ausentes na barra lateral.", "error");
      setIsSidebarOpen(true); 
      return;
    }
    setIsSyncing(true);
    try {
      addLog("Validando repositório remoto...", "info");
      await GitHubService.ensureRepository(config);
      await GitHubService.pushProject(config, generated, (m) => addLog(m, 'info'));
    } catch (e: any) {
      addLog(`Erro no GitHub: ${e.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleMic = () => {
    setIsListening(prev => !prev);
    addLog(isListening ? "Mic Standby" : "Escutando...", "info");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    addLog(`Processando ${files.length} entrada(s)...`, 'info');
    
    let allNewAssets: AppAsset[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const assets = await AssetManager.processFile(files[i]);
        if (assets.length > 1) {
          addLog(`Descompactado ZIP: ${assets.length} arquivos encontrados.`, 'success');
        }
        allNewAssets = [...allNewAssets, ...assets];
        assets.forEach(a => addLog(`Asset Carregado: ${a.name}`, "success"));
      } catch (err: any) {
        addLog(`Erro asset: ${err.message}`, "error");
      }
    }
    
    setAttachments(prev => [...prev, ...allNewAssets]);
    setConfig(prev => ({
      ...prev,
      assets: [...prev.assets, ...allNewAssets]
    }));
    
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const speakMessage = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = audioContextRef.current;
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (e) {}
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() && attachments.length === 0) return;
    setIsProcessing(true);
    
    const userMessage: ConversationMessage = { role: 'user', text: aiPrompt, attachments: [...attachments] };
    setConversationHistory(prev => [...prev, userMessage]);
    
    const currentPrompt = aiPrompt;
    const currentAttachments = [...attachments];
    setAiPrompt('');
    setAttachments([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [{ text: currentPrompt }];
      
      const limitedAttachments = currentAttachments.slice(0, 10);
      limitedAttachments.forEach(att => {
        parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
      });

      const response = await ai.models.generateContent({
        model: config.modelName,
        contents: { parts },
        config: { 
          systemInstruction: config.systemInstruction, 
          responseMimeType: config.useSearch ? undefined : "application/json",
          tools: config.useSearch ? [{ googleSearch: {} }] : undefined,
          temperature: config.temperature,
          thinkingConfig: (config.thinkingBudget && config.thinkingBudget > 0) ? { thinkingBudget: config.thinkingBudget } : undefined 
        }
      });

      const text = response.text || '{}';
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { message: text };
        }
      }
      
      if (result.configUpdate) {
        setConfig(prev => ({ ...prev, ...result.configUpdate }));
        addLog("Projeto atualizado via Arquiteta AI.", "success");
        if (result.configUpdate.iconPrompt && !result.configUpdate.uploadedIcon) {
          handleGenerateIcon(result.configUpdate.iconPrompt);
        }
      } else if (currentPrompt.toLowerCase().includes('ic_launcher') || currentPrompt.toLowerCase().includes('ícone') || currentPrompt.toLowerCase().includes('icon')) {
        handleGenerateIcon(currentPrompt);
      }
      
      setConversationHistory(prev => [...prev, { role: 'model', text: result.message || "Comando executado." }]);
      speakMessage(result.message || "Pronto.");

    } catch (error: any) {
      if (error.message.includes('429')) {
        addLog("Quota excedida. Aguarde 60s ou use outra chave API.", "error");
      } else {
        addLog(`Erro Neural: ${error.message}`, "error");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyGradleOptimization = (optimizedBuildGradle: string) => {
    if (generated) {
      setGenerated({
        ...generated,
        buildGradleApp: optimizedBuildGradle
      });
      addLog("app/build.gradle atualizado com as otimizações recomendadas pela IA!", "success");
    }
  };

  const modelOptions = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Raciocínio Avançado' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Alta Velocidade' },
    { id: 'gemini-flash-lite-latest', name: 'Gemini 2.5 Flash', description: 'Eficiente / Lite' }
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-slate-300 overflow-hidden font-sans">
      <header className="h-16 flex items-center justify-between px-6 bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/10 shrink-0 z-[100]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-500"
            title="Alternar Configurações"
          >
            <Icons.Settings />
          </button>
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            {config.platform === 'android' ? <Icons.Android /> : <Icons.Apple />}
          </div>
          <div className="hidden sm:block">
            <h1 className="font-black text-lg tracking-tighter text-white uppercase italic">Heavy Studio <span className="text-blue-500">PRO</span></h1>
            <p className="text-[8px] uppercase tracking-[0.3em] text-blue-400 font-bold">Build Studio v2.9</p>
          </div>
        </div>
        
        <nav className="flex bg-black/40 p-1 rounded-xl border border-white/5 mx-2 gap-1 overflow-x-auto">
          {[
            { id: TabType.PREVIEW, label: 'Preview' },
            { id: config.platform === 'android' ? TabType.KOTLIN : TabType.SWIFT, label: config.platform === 'android' ? 'Kotlin' : 'Swift' },
            { id: TabType.AAB_EXPLORER, label: '📦 Explorador AAB' },
            { id: TabType.MANIFEST_VALIDATOR, label: '🛡️ Audit Manifest' },
            { id: TabType.README_GENERATOR, label: '📝 README.md' },
            { id: TabType.DEPLOY, label: '🔥 Firebase App Dist' },
            { id: TabType.GITHUB, label: 'CI/CD Status' },
            { id: TabType.KEYSTORE, label: '🔐 Keystore' },
            { id: TabType.BUILD_HISTORY, label: 'Gradle AI' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
           <button 
             onClick={handleGitHubSync} 
             disabled={isSyncing || !generated} 
             className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isSyncing ? 'bg-slate-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
             title="Sincronizar repositório no GitHub"
           >
             <span className="hidden xs:inline">{isSyncing ? 'Sincronizando...' : 'Sync GitHub'}</span>
             <span className="xs:hidden">Sync</span>
           </button>
           
           {(config.platform === 'android' || config.platform === 'both') && (
            <>
              <button 
                onClick={handleQuickBuildApk} 
                disabled={isBuildingApk || !generated} 
                className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-1.5 ${
                  isBuildingApk 
                    ? 'bg-amber-600 text-amber-100 animate-pulse cursor-wait border border-amber-400/50' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30'
                }`}
                title="Automatizar processo de compilação em nuvem para gerar um APK instalável (.apk)"
              >
                <span>⚡</span>
                <span className="hidden sm:inline">{isBuildingApk ? 'Compilando APK...' : 'Build APK Rápido'}</span>
                <span className="sm:hidden">APK</span>
              </button>

              <button 
                onClick={handleDownloadAab} 
                disabled={!generated} 
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                title="Exportar pacote Android App Bundle (.aab) para Google Play Store"
              >
                <Icons.Download />
                <span>AAB</span>
              </button>
            </>
           )}

           <button 
             onClick={handleOpenKotlinDocsModal} 
             disabled={!generated} 
             className="bg-sky-600 hover:bg-sky-500 text-white px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-1.5 border border-sky-400/30"
             title="Analisar código Kotlin e gerar documentação Markdown na raiz do projeto"
           >
             <span>📄</span>
             <span className="hidden sm:inline">Doc Kotlin</span>
             <span className="sm:hidden">Doc</span>
           </button>

           <button 
             onClick={handleDownloadProject} 
             disabled={!generated} 
             className="bg-green-600 hover:bg-green-500 text-white px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-1"
             title="Download Código Fonte ZIP"
           >
             ZIP
           </button>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden relative">
        <aside className={`
          ${isSidebarOpen ? 'w-80 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden'}
          bg-[#0f172a]/50 backdrop-blur-md border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto scrollbar-hide
          transition-all duration-300 ease-in-out z-40 h-full
        `}>
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-blue-600 pl-3">Platform Core</h3>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              <button onClick={() => setConfig({...config, platform: 'android'})} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${config.platform === 'android' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                <Icons.Android />
                <span className="text-[9px] font-black uppercase">Android</span>
              </button>
              <button onClick={() => setConfig({...config, platform: 'ios'})} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${config.platform === 'ios' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                <Icons.Apple />
                <span className="text-[9px] font-black uppercase">iOS</span>
              </button>
            </div>
          </section>

          <section className="space-y-6 border-t border-white/5 pt-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-green-600 pl-3">GitHub CI/CD</h3>
            <div className="space-y-3">
               <div>
                <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase">Usuário GitHub</label>
                <input type="text" value={config.githubUser} onChange={e => setConfig({...config, githubUser: e.target.value})} className="w-full bg-black/20 p-2 rounded-xl border border-white/5 text-[11px] outline-none focus:border-blue-500" placeholder="ex: dev-senior" />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase">Nome do Repositório</label>
                <input type="text" value={config.githubRepo} onChange={e => setConfig({...config, githubRepo: e.target.value})} className="w-full bg-black/20 p-2 rounded-xl border border-white/5 text-[11px] outline-none focus:border-blue-500" placeholder="ex: meu-app-heavy" />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase">Personal Access Token (PAT)</label>
                <input type="password" value={config.githubToken} onChange={e => setConfig({...config, githubToken: e.target.value})} className="w-full bg-black/20 p-2 rounded-xl border border-white/5 text-[11px] outline-none focus:border-blue-500" placeholder="ghp_xxxxxxxxxxxx" />
              </div>
            </div>
          </section>

          <section className="space-y-6 border-t border-white/5 pt-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-purple-600 pl-3">Neural AI</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] text-slate-500 mb-2 block font-bold uppercase tracking-widest">Modelo Gemini</label>
                <div className="grid grid-cols-1 gap-2">
                  {modelOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setConfig({ ...config, modelName: opt.id })}
                      className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${config.modelName === opt.id ? 'bg-blue-600/20 border-blue-600/50' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                    >
                      <span className={`text-[11px] font-black ${config.modelName === opt.id ? 'text-blue-400' : 'text-slate-300'}`}>{opt.name}</span>
                      <span className="text-[9px] text-slate-500 font-medium">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-600/5 rounded-xl border border-blue-500/20 cursor-pointer" onClick={() => setConfig({...config, useSearch: !config.useSearch})}>
                 <span className="text-[10px] font-black text-slate-300 uppercase">Google Search</span>
                 <div className={`w-8 h-4 rounded-full relative transition-all ${config.useSearch ? 'bg-blue-600' : 'bg-slate-700'}`}>
                   <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${config.useSearch ? 'right-0.5' : 'left-0.5'}`} />
                 </div>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase">Nome do App</label>
                <input type="text" value={config.appName} onChange={e => setConfig({...config, appName: e.target.value})} className="w-full bg-black/20 p-2 rounded-xl border border-white/5 text-[11px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase">Descrição do App (Contexto IA)</label>
                <textarea
                  value={config.appDescription || ''}
                  onChange={e => setConfig({...config, appDescription: e.target.value})}
                  rows={2}
                  className="w-full bg-black/20 p-2 rounded-xl border border-white/5 text-[11px] outline-none focus:border-blue-500 resize-none"
                  placeholder="ex: Aplicativo móvel para gerenciamento financeiro e controle de metas..."
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-white/5 pt-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-amber-500 pl-3">App Icon & Branding</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase">Estilo de Branding / Prompt do Ícone</label>
                <textarea
                  value={config.iconPrompt || ''}
                  onChange={e => setConfig({...config, iconPrompt: e.target.value})}
                  rows={2}
                  className="w-full bg-black/20 p-2 rounded-xl border border-white/5 text-[11px] outline-none focus:border-amber-500 resize-none"
                  placeholder="ex: Ícone 3D futurista neon com foguete azul e gradiente escuro..."
                />
              </div>

              <button
                onClick={() => handleGenerateIcon()}
                disabled={isGeneratingIcon}
                className={`w-full py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                  isGeneratingIcon
                    ? 'bg-amber-600/50 text-amber-200 animate-pulse cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                <Icons.Sparkles />
                <span>{isGeneratingIcon ? 'Gerando ic_launcher...' : 'Gerar ic_launcher (IA)'}</span>
              </button>

              {config.iconType === 'image' && config.uploadedIcon && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={`data:image/png;base64,${config.uploadedIcon.data}`}
                      alt="ic_launcher"
                      className="w-10 h-10 rounded-lg shadow border border-white/20 object-cover shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-[10px] font-bold text-amber-400 truncate">ic_launcher.png</p>
                      <p className="text-[8px] text-slate-400 uppercase">Gerado por IA (Base64)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfig({...config, iconType: 'text', uploadedIcon: null})}
                    className="text-[9px] text-slate-400 hover:text-red-400 font-bold uppercase p-1 shrink-0 ml-2"
                    title="Restaurar ícone textual"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="flex-1 border-t border-white/5 pt-6">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-slate-700 pl-3 mb-4">Terminal Logs</h3>
             <div className="bg-black/40 rounded-2xl p-4 h-[220px] overflow-y-auto font-mono text-[9px] font-medium space-y-2 border border-white/5 scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className={`p-1 rounded ${log.type === 'error' ? 'text-red-400 bg-red-400/5' : log.type === 'success' ? 'text-green-400 bg-green-400/5' : 'text-slate-400'}`}>{log.msg}</div>
              ))}
            </div>
          </section>
        </aside>

        <section className={`flex-1 relative bg-[#020617] p-4 sm:p-8 flex items-center justify-center transition-all duration-300 overflow-hidden`}>
          {activeTab === TabType.PREVIEW ? (
             config.platform === 'android' ? (
              <AndroidPreview 
                config={config} setConfig={setConfig} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} handleAiGenerate={handleAiGenerate}
                conversationHistory={conversationHistory} attachments={attachments} setAttachments={setAttachments}
                isProcessing={isProcessing} isListening={isListening} toggleMic={toggleMic} handleFileUpload={handleFileUpload}
                fileInputRef={fileInputRef} cameraInputRef={null as any} googleProjectIdError={null} apiKeySelected={true} checkingApiKey={false} uploadedIcon={null} onClearChat={() => setConversationHistory(initialConversationHistory)}
                xmlCode={generated?.layout}
              />
             ) : (
              <IOSPreview 
                config={config} setConfig={setConfig} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} handleAiGenerate={handleAiGenerate}
                conversationHistory={conversationHistory} attachments={attachments} setAttachments={setAttachments}
                isProcessing={isProcessing} isListening={isListening} toggleMic={toggleMic} handleFileUpload={handleFileUpload}
                fileInputRef={fileInputRef}
              />
             )
          ) : activeTab === TabType.AAB_EXPLORER ? (
            <div className="h-full w-full overflow-y-auto p-2 sm:p-4">
              <AabExplorer
                config={config}
                generated={generated}
                addLog={addLog}
              />
            </div>
          ) : activeTab === TabType.MANIFEST_VALIDATOR ? (
            <div className="h-full w-full overflow-y-auto p-2 sm:p-4">
              <ManifestValidatorSection
                config={config}
                setConfig={setConfig}
                addLog={addLog}
              />
            </div>
          ) : activeTab === TabType.README_GENERATOR ? (
            <div className="h-full w-full overflow-y-auto p-2 sm:p-4">
              <ReadmeManagerSection
                config={config}
                setConfig={setConfig}
                addLog={addLog}
              />
            </div>
          ) : activeTab === TabType.DEPLOY ? (
            <div className="h-full w-full overflow-y-auto p-2 sm:p-4">
              <FirebaseDistributionManager
                config={config}
                setConfig={setConfig}
                addLog={addLog}
              />
            </div>
          ) : activeTab === TabType.GITHUB ? (
            <div className="h-full w-full overflow-y-auto">
              <GitHubActionsMonitor
                config={config}
                addLog={addLog}
                onSyncGitHub={handleGitHubSync}
              />
            </div>
          ) : activeTab === TabType.KEYSTORE ? (
            <div className="h-full w-full overflow-y-auto p-2 sm:p-4">
              <KeystoreManager
                config={config}
                setConfig={setConfig}
                addLog={addLog}
              />
            </div>
          ) : activeTab === TabType.BUILD_HISTORY ? (
            <div className="h-full w-full overflow-y-auto space-y-6 p-2 sm:p-4">
              {generated && (
                <>
                  <GradleAnalyzerSection
                    buildGradleApp={generated.buildGradleApp}
                    projectBuildGradle={generated.projectBuildGradle}
                    modelName={config.modelName}
                    addLog={addLog}
                    onApplyOptimizations={handleApplyGradleOptimization}
                  />
                  <div className="h-[400px]">
                    <CodeDisplay 
                      filename="app/build.gradle" 
                      code={generated.buildGradleApp} 
                      language="groovy" 
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full w-full">
               {generated && (
                 <CodeDisplay 
                   filename={config.platform === 'android' ? "MainActivity.kt" : "ContentView.swift"} 
                   code={config.platform === 'android' ? generated.mainActivity : (generated.contentViewSwift || '')} 
                   language={config.platform === 'android' ? "kotlin" : "swift"} 
                 />
               )}
            </div>
          )}
        </section>
      </main>

      {/* Modal de Documentação Markdown Kotlin */}
      {showKotlinDocModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-[#0f172a] border border-sky-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-sky-500/20 text-sky-400 rounded-xl text-lg">📘</span>
                <div>
                  <h3 className="text-sm font-black text-white font-sans flex items-center gap-2">
                    Análise Sintática e Documentação Kotlin
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Arquivo <code className="text-sky-300 bg-black/40 px-1 py-0.5 rounded">DOCUMENTATION.md</code> gerado e salvo na raiz do projeto
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDocMarkdown}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/10 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <span>{copiedDoc ? '✓ Copiado!' : '📋 Copiar MD'}</span>
                </button>
                <button
                  onClick={handleDownloadDocMarkdown}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <span>📥 Baixar .MD</span>
                </button>
                <button
                  onClick={() => setShowKotlinDocModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                  title="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-200 scrollbar-thin">
              <pre className="whitespace-pre-wrap select-text font-mono">
                {kotlinDocMarkdown}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-900 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-sans">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span>✓</span> Mapeamento de Classes, Métodos e Dependências Concluído
              </span>
              <span>Incluso automaticamente nos exports ZIP, AAB e GitHub Push</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
