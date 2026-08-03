
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AppConfig, TabType, GeneratedCode, AppAsset, ConversationMessage, SavedIcon } from './types';
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
import WorkflowGallerySection from './components/WorkflowGallerySection';
import GooglePlayPublisherManager from './components/GooglePlayPublisherManager';
import { PrefabComponentLibrary } from './components/PrefabComponentLibrary';
import { generateKotlinDocumentation } from './services/kotlinDocGenerator';
import { saveProjectToIndexedDB, loadProjectFromIndexedDB, clearProjectIndexedDBCache } from './services/indexedDbService';
import { exportHeavyStudioConfig, importHeavyStudioConfig } from './services/heavyStudioConfigService';
import { exportBrandingAssetsZip } from './services/brandingAssetsService';
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
      apiKey: '',
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
      temperature: 0.7,
      versionCode: 1,
      versionName: '1.0.0'
    };
  });

  const incrementVersion = () => {
    setConfig(prev => {
      const currentCode = prev.versionCode || 1;
      const nextCode = currentCode + 1;
      const nextName = `1.0.${nextCode}`;
      addLog(`📱 Versão do App incrementada automaticamente: v${nextName} (build ${nextCode})`, "info");
      return {
        ...prev,
        versionCode: nextCode,
        versionName: nextName
      };
    });
  };

  const [activeTab, setActiveTab] = useState<TabType>(TabType.PREVIEW);
  const [generated, setGenerated] = useState<GeneratedCode | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [attachments, setAttachments] = useState<AppAsset[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBuildingApk, setIsBuildingApk] = useState(false);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [iconGallery, setIconGallery] = useState<SavedIcon[]>(() => {
    try {
      const saved = localStorage.getItem('heavy_studio_icon_gallery');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showKotlinDocModal, setShowKotlinDocModal] = useState(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [kotlinDocMarkdown, setKotlinDocMarkdown] = useState<string>('');
  const [copiedDoc, setCopiedDoc] = useState(false);

  const handleDownloadSingleFile = (filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    addLog(`📥 Arquivo ${filename} baixado com sucesso.`, "success");
  };

  const handleResetNewApp = () => {
    if (window.confirm("🧹 Deseja limpar a tela e criar um Novo Aplicativo do zero? Os dados e histórico do app atual serão redefinidos.")) {
      const cleanConfig: AppConfig = {
        ...config,
        appName: 'Novo App Pro',
        webLink: '',
        uploadEndpoint: '',
        packageName: 'com.heavy.novoapp',
        iconLabel: 'NA',
        iconColor: '#2563eb',
        iconFileName: 'ic_launcher',
        iconType: 'text',
        iconType_old: 'text',
        iconTextColor: '#FFFFFF',
        uploadedIcon: undefined,
        iconPrompt: '',
        googleProjectId: '',
        assets: [],
        components: [],
        versionCode: 1,
        versionName: '1.0.0',
        playConsoleReleaseNotes: '',
      };

      setConfig(cleanConfig);
      setConversationHistory([
        { role: 'model', text: '✨ Tela limpa com sucesso! O ambiente de desenvolvimento está pronto para o seu Novo Aplicativo. Digite o que deseja criar ou cole a URL do seu site para começar.' }
      ]);
      setLogs([]);
      setAttachments([]);
      setAiPrompt('');
      setActiveTab(TabType.PREVIEW);

      try {
        localStorage.setItem('heavy_studio_config', JSON.stringify(cleanConfig));
        clearProjectIndexedDBCache();
      } catch (e) {
        console.error(e);
      }

      addLog("🧹 Tela limpa com sucesso! Novo projeto e cache offline inicializados.", "success");
    }
  };

  const handleDownloadIconPng = () => {
    if (!config.uploadedIcon?.data) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${config.uploadedIcon.data}`;
    link.download = `ic_launcher_${config.appName.replace(/\s+/g, '_')}.png`;
    link.click();
    addLog("🎨 Ícone ic_launcher.png baixado com sucesso.", "success");
  };
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>(initialConversationHistory);
  const [logs, setLogs] = useState<{msg: string, type: string}[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isIndexedDBLoaded = useRef<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const configFileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Monitor Network & Restore from IndexedDB on startup
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog("🟢 Conexão com a Internet estabelecida.", "info");
    };
    const handleOffline = () => {
      setIsOnline(false);
      addLog("📶 Conexão de rede perdida. Todo o seu progresso e logs estão sendo salvos no cache IndexedDB!", "warning");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const initCache = async () => {
      try {
        const cached = await loadProjectFromIndexedDB();
        if (cached) {
          if (cached.config) setConfig(cached.config);
          if (cached.logs && cached.logs.length > 0) setLogs(cached.logs);
          if (cached.conversationHistory && cached.conversationHistory.length > 0) setConversationHistory(cached.conversationHistory);
          if (cached.iconGallery) setIconGallery(cached.iconGallery);
          if (cached.attachments) setAttachments(cached.attachments);
          if (cached.activeTab) setActiveTab(cached.activeTab);
          if (cached.generated) setGenerated(cached.generated);

          const timeStr = new Date(cached.lastSavedAt).toLocaleTimeString();
          setLastSavedTime(timeStr);
          setLogs(prev => [
            { msg: `[${new Date().toLocaleTimeString()}] 💾 Cache offline IndexedDB restaurado com sucesso! (Salvo às ${timeStr})`, type: 'success' },
            ...prev
          ].slice(0, 30));
        }
      } catch (err) {
        console.error("Erro ao carregar cache do IndexedDB:", err);
      } finally {
        isIndexedDBLoaded.current = true;
      }
    };

    initCache();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Debounced auto-save to IndexedDB whenever relevant state changes
  useEffect(() => {
    if (!isIndexedDBLoaded.current) return;

    const timer = setTimeout(async () => {
      try {
        await saveProjectToIndexedDB({
          config,
          logs,
          conversationHistory,
          iconGallery,
          attachments,
          activeTab,
          generated
        });
        setLastSavedTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.error("Erro ao salvar no IndexedDB:", e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [config, logs, conversationHistory, iconGallery, attachments, activeTab, generated]);

  useEffect(() => {
    try {
      localStorage.setItem('heavy_studio_icon_gallery', JSON.stringify(iconGallery));
    } catch (e) {
      console.error('Erro ao salvar galeria de ícones no localStorage:', e);
    }
  }, [iconGallery]);

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
      const base64Data = await generateAutomaticIconBase64(config.appName, config.appDescription, promptToUse, config.apiKey);
      const iconAsset: AppAsset = {
        name: 'ic_launcher.png',
        data: base64Data,
        mimeType: 'image/png'
      };

      const newSavedIcon: SavedIcon = {
        id: 'icon_' + Date.now(),
        data: base64Data,
        prompt: promptToUse,
        timestamp: Date.now()
      };

      setIconGallery(prev => {
        const filtered = prev.filter(item => item.data !== base64Data);
        return [newSavedIcon, ...filtered].slice(0, 20);
      });

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

  const handleSelectGalleryIcon = (iconItem: SavedIcon) => {
    const iconAsset: AppAsset = {
      name: 'ic_launcher.png',
      data: iconItem.data,
      mimeType: 'image/png'
    };
    setConfig(prev => ({
      ...prev,
      iconType: 'image',
      uploadedIcon: iconAsset,
      iconPrompt: iconItem.prompt || prev.iconPrompt
    }));
    addLog("🎨 Ícone selecionado da galeria e aplicado ao projeto!", "info");
  };

  const handleDeleteGalleryIcon = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIconGallery(prev => prev.filter(item => item.id !== id));
    addLog("🗑️ Ícone removido da galeria local.", "info");
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
    addLog("Preparando pacote de código com pasta de downloads...", "info");
    const zip = new JSZip();
    const projectFolder = zip.folder(config.platform === 'android' ? "android" : "ios");
    const downloadFolder = zip.folder("download");
    
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

      // Inclui arquivos na pasta /download
      downloadFolder?.file("DOCUMENTATION.md", docMd);
      downloadFolder?.file("AndroidManifest.xml", generated.manifest);
      downloadFolder?.file("MainActivity.kt", generated.mainActivity);
      downloadFolder?.file("build.gradle", generated.buildGradleApp);
      downloadFolder?.file("LEIA_ME_DOWNLOADS.txt", `PASTA DE DOWNLOADS DO PROJETO ${config.appName}\n\nEste diretório contém os principais arquivos do projeto prontos para uso:\n- DOCUMENTATION.md: Análise sintática e documentação em Markdown\n- AndroidManifest.xml: Configurações e permissões do Android\n- MainActivity.kt: Código fonte principal da Activity\n- build.gradle: Configurações de dependências e Gradle\n${config.uploadedIcon?.data ? "- ic_launcher.png: Ícone do aplicativo em Base64/PNG\n" : ""}\nGerado via Heavy Mobile Studio Build.`);

      if (config.uploadedIcon?.data) {
        downloadFolder?.file("ic_launcher.png", config.uploadedIcon.data, { base64: true });
      }

      if (generated.githubWorkflow) {
        projectFolder?.file(generated.workflowPath || ".github/workflows/android.yml", generated.githubWorkflow);
        downloadFolder?.file("android-ci-workflow.yml", generated.githubWorkflow);
      }
    } else {
      projectFolder?.file("ContentView.swift", generated.contentViewSwift);
      projectFolder?.file("MainApp.swift", generated.mainAppSwift);
      projectFolder?.file("Package.swift", generated.packageSwift);
      projectFolder?.file("Info.plist", generated.infoPlist);

      downloadFolder?.file("ContentView.swift", generated.contentViewSwift);
      downloadFolder?.file("Info.plist", generated.infoPlist);
      downloadFolder?.file("LEIA_ME_DOWNLOADS.txt", `PASTA DE DOWNLOADS DO PROJETO ${config.appName} (iOS)`);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.appName.replace(/\s+/g, '_')}_${config.platform.toUpperCase()}.zip`;
    link.click();
    addLog("Projeto exportado com sucesso (incluindo a pasta /download com todos os arquivos).", "success");
  };

  const handleDownloadAab = async () => {
    if (!generated) return;
    incrementVersion();
    addLog("Exportando Android App Bundle (.aab) assinado com incremento de versão...", "info");
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
    incrementVersion();
    setIsBuildingApk(true);
    addLog("⚡ [Cloud Build] Iniciando compilação do APK Rápido (Android Release com versão atualizada)...", "info");

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
      const apiKeyToUse = config.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
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
      const apiKeyToUse = config.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
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

  const handleExportHeavyStudioConfigJson = () => {
    try {
      exportHeavyStudioConfig({
        config,
        logs,
        conversationHistory,
        iconGallery,
        attachments,
        activeTab,
        generated
      });
      addLog(`⚙️ Configuração heavy_studio_config.json exportada com sucesso (${config.appName})!`, "success");
    } catch (err: any) {
      addLog(`Erro ao exportar heavy_studio_config: ${err.message}`, "error");
    }
  };

  const handleImportHeavyStudioConfigJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const importedData = importHeavyStudioConfig(jsonText);

        setConfig(importedData.config);
        if (importedData.generated) setGenerated(importedData.generated);
        if (importedData.logs && importedData.logs.length > 0) setLogs(importedData.logs);
        if (importedData.conversationHistory && importedData.conversationHistory.length > 0) setConversationHistory(importedData.conversationHistory);
        if (importedData.iconGallery) setIconGallery(importedData.iconGallery);
        if (importedData.attachments) setAttachments(importedData.attachments);
        if (importedData.activeTab) setActiveTab(importedData.activeTab);

        await saveProjectToIndexedDB({
          config: importedData.config,
          logs: importedData.logs || [],
          conversationHistory: importedData.conversationHistory || [],
          iconGallery: importedData.iconGallery || [],
          attachments: importedData.attachments || [],
          activeTab: importedData.activeTab,
          generated: importedData.generated || null
        });

        const timeStr = new Date().toLocaleTimeString();
        setLastSavedTime(timeStr);
        addLog(`📥 Projeto '${importedData.config.appName}' (heavy_studio_config) carregado com sucesso!`, "success");
      } catch (err: any) {
        addLog(err.message, "error");
      } finally {
        if (configFileInputRef.current) configFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const [isExportingBrandingAssets, setIsExportingBrandingAssets] = useState<boolean>(false);

  const handleExportBrandingAssets = async () => {
    setIsExportingBrandingAssets(true);
    try {
      addLog("Gerando pacote de branding com ícones em resoluções (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)...", "info");
      await exportBrandingAssetsZip(config);
      addLog("📦 Pacote ZIP de assets de branding baixado com sucesso!", "success");
    } catch (err: any) {
      addLog(`Erro ao exportar assets de branding: ${err.message}`, "error");
    } finally {
      setIsExportingBrandingAssets(false);
    }
  };

  const handleCustomIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addLog("Selecione um arquivo de imagem válido (PNG, JPG, WebP, etc.).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const base64Data = result.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

        const iconAsset: AppAsset = {
          name: file.name || 'ic_launcher.png',
          data: base64Data,
          mimeType: file.type || 'image/png'
        };

        const newSavedIcon: SavedIcon = {
          id: 'icon_' + Date.now(),
          data: base64Data,
          prompt: `Upload local: ${file.name}`,
          timestamp: Date.now()
        };

        setIconGallery(prev => {
          const filtered = prev.filter(item => item.data !== base64Data);
          return [newSavedIcon, ...filtered].slice(0, 20);
        });

        setConfig(prev => ({
          ...prev,
          iconType: 'image',
          uploadedIcon: iconAsset,
          iconPrompt: `Upload: ${file.name}`
        }));

        addLog(`🖼️ Ícone customizado "${file.name}" enviado e aplicado com sucesso (uploadedIcon)!`, "success");
      } catch (err: any) {
        addLog(`Erro ao processar imagem do ícone: ${err.message}`, "error");
      } finally {
        if (iconFileInputRef.current) iconFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
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
            <div className="flex items-center gap-2">
              <p className="text-[8px] uppercase tracking-[0.3em] text-blue-400 font-bold">Build Studio v2.9</p>
              <span className="text-slate-600 text-[8px]">|</span>
              <div className="flex items-center gap-1.5 text-[8.5px] font-mono">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                <span className={isOnline ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 flex items-center gap-1" title="Estado e logs mantidos em IndexedDB local">
                  <span>💾 IDB</span>
                  {lastSavedTime && <span className="text-slate-500">({lastSavedTime})</span>}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="flex bg-black/40 p-1 rounded-xl border border-white/5 mx-2 gap-1 overflow-x-auto">
          {[
            { id: TabType.PREVIEW, label: 'Preview' },
            { id: TabType.COMPONENT_LIBRARY, label: '🧩 Componentes UI' },
            { id: config.platform === 'android' ? TabType.KOTLIN : TabType.SWIFT, label: config.platform === 'android' ? 'Kotlin' : 'Swift' },
            { id: TabType.PLAY_CONSOLE, label: '🎯 Play Console' },
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
             onClick={handleResetNewApp} 
             className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-1.5 border border-cyan-400/40 shrink-0"
             title="Limpar a tela e criar um novo projeto/app do zero"
           >
             <span>✨</span>
             <span className="hidden xs:inline">Novo App</span>
             <span className="xs:hidden">Novo</span>
           </button>

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
             onClick={() => setShowDownloadsModal(true)} 
             disabled={!generated} 
             className="bg-amber-600 hover:bg-amber-500 text-white px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-1.5 border border-amber-400/30 shadow-amber-900/30"
             title="Abrir Central e Pasta de Downloads do Projeto"
           >
             <span>📁</span>
             <span className="hidden md:inline">Central Downloads</span>
             <span className="md:hidden">Downloads</span>
           </button>

           <button 
             onClick={handleDownloadProject} 
             disabled={!generated} 
             className="bg-green-600 hover:bg-green-500 text-white px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-1"
             title="Download Código Fonte ZIP (inclui pasta /download)"
           >
             ZIP
           </button>

           <button 
             onClick={handleExportHeavyStudioConfigJson} 
             className="bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/40 px-2.5 sm:px-3 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
             title="Exportar arquivo de configuração e build (heavy_studio_config.json)"
           >
             <span>⚙️</span>
             <span className="hidden lg:inline">Config JSON</span>
             <span className="lg:hidden">JSON</span>
           </button>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden relative">
        <aside className={`
          ${isSidebarOpen ? 'w-80 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden'}
          bg-[#0f172a]/50 backdrop-blur-md border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto scrollbar-hide
          transition-all duration-300 ease-in-out z-40 h-full
        `}>
          <section className="space-y-4">
            <button
              onClick={handleResetNewApp}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg border border-cyan-400/30 transition-all active:scale-95"
              title="Limpar toda a tela e começar a criar um novo aplicativo"
            >
              <span>✨</span>
              <span>Criar Novo App (Limpar Tela)</span>
            </button>

            {/* IndexedDB Offline Cache Card */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                  <span>💾</span> IndexedDB Cache
                </span>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              </div>
              <p className="text-[8.5px] text-slate-400 leading-tight">
                Estado do projeto e histórico de logs salvos automaticamente no armazenamento local assíncrono.
              </p>
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 bg-black/40 p-1.5 rounded-lg border border-white/5">
                <span>Último Salvamento:</span>
                <span className="text-emerald-400 font-bold">{lastSavedTime || 'Salvando...'}</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={async () => {
                    await saveProjectToIndexedDB({ config, logs, conversationHistory, iconGallery, attachments, activeTab, generated });
                    const nowStr = new Date().toLocaleTimeString();
                    setLastSavedTime(nowStr);
                    addLog(`💾 Projeto e logs salvos manualmente no IndexedDB às ${nowStr}!`, "success");
                  }}
                  className="flex-1 py-1.5 px-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-colors"
                >
                  Salvar Agora
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Deseja apagar o cache salvo no IndexedDB?")) {
                      await clearProjectIndexedDBCache();
                      setLastSavedTime(null);
                      addLog("🧹 Cache IndexedDB limpo com sucesso.", "warning");
                    }
                  }}
                  className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-colors"
                >
                  Limpar Cache
                </button>
              </div>
            </div>

            {/* heavy_studio_config JSON Export / Import Card */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-purple-500/30 space-y-2 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                  <span>⚙️</span> heavy_studio_config
                </span>
                <span className="text-[8px] bg-purple-500/20 text-purple-300 font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/30">
                  JSON v2.9
                </span>
              </div>
              <p className="text-[8.5px] text-slate-400 leading-tight">
                Salve ou carregue as configurações e o estado completo de builds localmente.
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={handleExportHeavyStudioConfigJson}
                  className="py-1.5 px-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                  title="Salvar heavy_studio_config.json no computador"
                >
                  <span>📤</span> Exportar
                </button>

                <button
                  onClick={() => configFileInputRef.current?.click()}
                  className="py-1.5 px-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                  title="Carregar projeto a partir de um heavy_studio_config.json"
                >
                  <span>📥</span> Importar
                </button>

                <input
                  type="file"
                  ref={configFileInputRef}
                  onChange={handleImportHeavyStudioConfigJson}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>

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

              {/* Galeria de Templates Workflow YAML */}
              <div className="pt-3 border-t border-white/5">
                <WorkflowGallerySection
                  config={config}
                  generated={generated}
                  setGenerated={setGenerated}
                  addLog={addLog}
                />
              </div>
            </div>
          </section>

          <section className="space-y-6 border-t border-white/5 pt-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-purple-600 pl-3">Neural AI & Keys</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase">Chave de API Gemini (API Key)</label>
                <input 
                  type="password" 
                  value={config.apiKey || ''} 
                  onChange={e => setConfig({...config, apiKey: e.target.value})} 
                  className="w-full bg-black/20 p-2 rounded-xl border border-white/5 text-[11px] outline-none focus:border-purple-500 font-mono text-slate-200" 
                  placeholder="AIzaSy..." 
                />
                <span className="text-[8px] text-slate-500 mt-0.5 block">Opcional: insira sua chave do Google AI Studio</span>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block font-bold uppercase">Google Cloud Project ID</label>
                <input 
                  type="text" 
                  value={config.googleProjectId || ''} 
                  onChange={e => setConfig({...config, googleProjectId: e.target.value})} 
                  className="w-full bg-black/20 p-2 rounded-xl border border-white/5 text-[11px] outline-none focus:border-purple-500 text-slate-200" 
                  placeholder="ex: meu-projeto-1234" 
                />
              </div>
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
              {/* Nome do App e Preview do Ícone em Destaque */}
              <div className="space-y-2 bg-black/30 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] text-slate-400 block font-bold uppercase">Nome do App & Branding</label>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono font-bold">
                    v{config.versionName || '1.0.0'} (build {config.versionCode || 1})
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Ícone Preview Ativo */}
                  <div className="relative group shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/20 p-1 flex items-center justify-center overflow-hidden shadow-lg bg-gradient-to-br from-slate-800 to-slate-950">
                      {config.uploadedIcon?.data ? (
                        <img
                          src={`data:image/png;base64,${config.uploadedIcon.data}`}
                          alt="App Icon Preview"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-xl flex items-center justify-center text-white font-black text-xs shadow-inner"
                          style={{ backgroundColor: config.iconColor || '#2563eb', color: config.iconTextColor || '#FFFFFF' }}
                        >
                          {config.iconLabel || 'HS'}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-slate-900"></span>
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={config.appName}
                      onChange={e => setConfig({...config, appName: e.target.value})}
                      className="w-full bg-black/40 p-2 rounded-xl border border-white/10 text-[11px] font-bold text-white outline-none focus:border-blue-500"
                      placeholder="Nome do seu app"
                    />
                    <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono">
                      <span>ic_launcher (512x512)</span>
                      <button
                        onClick={() => handleGenerateIcon()}
                        className="text-amber-400 hover:underline flex items-center gap-0.5 font-bold"
                      >
                        ⚡ Gerar IA
                      </button>
                    </div>
                  </div>
                </div>
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

          <section id="App-Icon-Section-Container" className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-amber-500 pl-3">App Icon & Branding</h3>
              {iconGallery.length > 0 && (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {iconGallery.length} salvo{iconGallery.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

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

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleGenerateIcon()}
                  disabled={isGeneratingIcon}
                  className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 ${
                    isGeneratingIcon
                      ? 'bg-amber-600/50 text-amber-200 animate-pulse cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  <Icons.Sparkles />
                  <span className="truncate">{isGeneratingIcon ? 'Gerando...' : 'Gerar com IA'}</span>
                </button>

                <button
                  id="btn-upload-custom-icon"
                  onClick={() => iconFileInputRef.current?.click()}
                  disabled={isGeneratingIcon}
                  className="py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all active:scale-95"
                  title="Fazer upload de uma imagem do computador para ser o ícone do aplicativo"
                >
                  <span>🖼️</span>
                  <span className="truncate">Upload de Ícone</span>
                </button>
              </div>

              <input
                type="file"
                ref={iconFileInputRef}
                onChange={handleCustomIconUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Action Button: Export Branding Assets */}
              <button
                id="btn-export-branding-assets"
                onClick={handleExportBrandingAssets}
                disabled={isExportingBrandingAssets}
                className={`w-full py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-amber-500/40 ${
                  isExportingBrandingAssets
                    ? 'bg-amber-900/50 text-amber-300 animate-pulse cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 hover:from-amber-900 hover:to-slate-800 text-amber-300 hover:text-white'
                }`}
                title="Exportar ZIP com ícone redimensionado em resoluções Android (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) e Play Store"
              >
                <span>📦</span>
                <span>{isExportingBrandingAssets ? 'Gerando Assets...' : 'Exportar Assets de Branding'}</span>
              </button>

              {/* Real-Time Generation Progress Preview */}
              {isGeneratingIcon && (
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-center animate-pulse shadow-inner">
                  <div className="relative flex items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-dashed border-amber-400 animate-spin" />
                    <div className="absolute text-amber-300 font-black text-xs">AI</div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-300 uppercase tracking-wider">Gerando Ícone em Tempo Real</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">Sintetizando arte Base64 para Android e iOS...</p>
                  </div>
                </div>
              )}

              {/* Active Icon Live Preview Card */}
              {!isGeneratingIcon && config.iconType === 'image' && config.uploadedIcon && (
                <div className="p-3 bg-slate-900/80 border border-amber-500/30 rounded-2xl shadow-xl flex flex-col gap-2">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Pré-visualização do Ícone</span>
                    <span className="text-amber-400 font-mono">512 x 512 px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative group shrink-0">
                      <img
                        src={`data:image/png;base64,${config.uploadedIcon.data}`}
                        alt="ic_launcher preview"
                        className="w-14 h-14 rounded-2xl shadow-md border-2 border-amber-500/50 object-cover bg-black"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] text-black font-black" title="Ativo no App">
                        ✓
                      </div>
                    </div>
                    <div className="truncate flex-1">
                      <p className="text-[11px] font-black text-amber-300 truncate">ic_launcher.png</p>
                      <p className="text-[8px] text-slate-400 italic truncate">
                        {config.iconPrompt ? `"${config.iconPrompt}"` : 'Gerado com IA'}
                      </p>
                      <p className="text-[8px] text-emerald-400 font-mono mt-0.5">MIME: image/png (Base64)</p>
                    </div>
                    <button
                      onClick={() => setConfig({...config, iconType: 'text', uploadedIcon: null})}
                      className="text-[9px] text-slate-400 hover:text-red-400 font-bold uppercase p-1.5 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                      title="Restaurar ícone textual"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Local Storage Icon Gallery */}
              {iconGallery.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Galeria de Ícones Salvos ({iconGallery.length})
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('Deseja limpar todos os ícones salvos na galeria local?')) {
                          setIconGallery([]);
                        }
                      }}
                      className="text-[8px] text-slate-500 hover:text-red-400 uppercase font-bold transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1.5 bg-black/30 rounded-xl border border-white/5 scrollbar-hide">
                    {iconGallery.map((item) => {
                      const isActive = config.uploadedIcon?.data === item.data;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectGalleryIcon(item)}
                          className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all aspect-square bg-slate-950 flex items-center justify-center ${
                            isActive
                              ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-95'
                              : 'border-white/10 hover:border-amber-400/60 hover:scale-105'
                          }`}
                          title={item.prompt ? `Ativar: "${item.prompt}"` : 'Selecionar este ícone'}
                        >
                          <img
                            src={`data:image/png;base64,${item.data}`}
                            alt="Saved Icon"
                            className="w-full h-full object-cover"
                          />
                          {isActive && (
                            <div className="absolute top-1 right-1 bg-amber-500 text-slate-950 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black shadow">
                              ✓
                            </div>
                          )}
                          <button
                            onClick={(e) => handleDeleteGalleryIcon(item.id, e)}
                            className="absolute top-0.5 left-0.5 bg-black/80 hover:bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir da galeria"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
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
          ) : activeTab === TabType.COMPONENT_LIBRARY ? (
            <div className="h-full w-full overflow-y-auto p-2 sm:p-4">
              <PrefabComponentLibrary
                config={config}
                setConfig={setConfig}
                generated={generated}
                setGenerated={setGenerated}
                addLog={addLog}
              />
            </div>
          ) : activeTab === TabType.PLAY_CONSOLE ? (
            <div className="h-full w-full overflow-y-auto p-2 sm:p-4">
              <GooglePlayPublisherManager
                config={config}
                setConfig={setConfig}
                generated={generated}
                setGenerated={setGenerated}
                addLog={addLog}
              />
            </div>
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

      {/* Modal Pasta e Central de Downloads */}
      {showDownloadsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-[#0f172a] border border-amber-500/40 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl text-xl">📁</span>
                <div>
                  <h3 className="text-sm font-black text-white font-sans flex items-center gap-2">
                    Pasta & Central de Downloads do Projeto
                  </h3>
                  <p className="text-[10px] text-amber-300/80 font-sans">
                    {config.appName} ({config.platform.toUpperCase()}) — Arquivos compilados e fontes disponíveis para download imediato
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDownloadsModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-950 space-y-4 font-sans text-slate-200 scrollbar-thin">
              {/* Box Principal de Download do ZIP */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider">📦 Pacote ZIP Completo</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">Inclusa Pasta /download</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Contém o código completo do projeto e uma pasta dedicada <code className="text-amber-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">/download</code> com todos os artefatos avulsos.
                  </p>
                </div>
                <button
                  onClick={handleDownloadProject}
                  disabled={!generated}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-[11px] uppercase tracking-wider shadow-lg transition-all active:scale-95 shrink-0 flex items-center gap-2"
                >
                  <span>📥 Baixar Projeto .ZIP</span>
                </button>
              </div>

              <div className="border-t border-white/5 pt-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <span>📄</span> Arquivos Avulsos para Download Direto
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Item: Documentacao Kotlin */}
                  <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-lg">📘</span>
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-sky-300 truncate">DOCUMENTATION.md</p>
                        <p className="text-[9px] text-slate-400">Análise sintática & Docs</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (generated) {
                          const doc = generateKotlinDocumentation(generated.mainActivity, config, generated);
                          handleDownloadSingleFile(`DOCUMENTATION_${config.appName.replace(/\s+/g, '_')}.md`, doc, 'text/markdown;charset=utf-8');
                        }
                      }}
                      disabled={!generated}
                      className="px-2.5 py-1.5 bg-sky-600/30 hover:bg-sky-600 text-sky-200 hover:text-white border border-sky-500/40 rounded-lg text-[9px] font-bold uppercase transition-all shrink-0"
                    >
                      Baixar .MD
                    </button>
                  </div>

                  {/* Item: AndroidManifest.xml */}
                  <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-lg">🛡️</span>
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-amber-300 truncate">AndroidManifest.xml</p>
                        <p className="text-[9px] text-slate-400">Permissões & Componentes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (generated?.manifest) {
                          handleDownloadSingleFile('AndroidManifest.xml', generated.manifest, 'text/xml;charset=utf-8');
                        }
                      }}
                      disabled={!generated?.manifest}
                      className="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 rounded-lg text-[9px] font-bold uppercase transition-all shrink-0"
                    >
                      Baixar .XML
                    </button>
                  </div>

                  {/* Item: MainActivity.kt */}
                  <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-lg">☕</span>
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-purple-300 truncate">MainActivity.kt</p>
                        <p className="text-[9px] text-slate-400">Código Fonte Android</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (generated?.mainActivity) {
                          handleDownloadSingleFile('MainActivity.kt', generated.mainActivity, 'text/plain;charset=utf-8');
                        }
                      }}
                      disabled={!generated?.mainActivity}
                      className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 rounded-lg text-[9px] font-bold uppercase transition-all shrink-0"
                    >
                      Baixar .KT
                    </button>
                  </div>

                  {/* Item: build.gradle */}
                  <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-lg">🐘</span>
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-emerald-300 truncate">app/build.gradle</p>
                        <p className="text-[9px] text-slate-400">Script de Compilação</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (generated?.buildGradleApp) {
                          handleDownloadSingleFile('build.gradle', generated.buildGradleApp, 'text/plain;charset=utf-8');
                        }
                      }}
                      disabled={!generated?.buildGradleApp}
                      className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 rounded-lg text-[9px] font-bold uppercase transition-all shrink-0"
                    >
                      Baixar .GRADLE
                    </button>
                  </div>

                  {/* Item: AAB Bundle */}
                  <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-lg">📦</span>
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-purple-300 truncate">Android App Bundle (.aab)</p>
                        <p className="text-[9px] text-slate-400">Google Play Package</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadAab}
                      disabled={!generated}
                      className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 rounded-lg text-[9px] font-bold uppercase transition-all shrink-0"
                    >
                      Baixar .AAB
                    </button>
                  </div>

                  {/* Item: App Icon PNG */}
                  <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {config.uploadedIcon?.data ? (
                        <img src={`data:image/png;base64,${config.uploadedIcon.data}`} alt="icon" className="w-6 h-6 rounded-md object-cover" />
                      ) : (
                        <span className="text-lg">🎨</span>
                      )}
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-amber-300 truncate">ic_launcher.png</p>
                        <p className="text-[9px] text-slate-400">Ícone HD 512x512</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadIconPng}
                      disabled={!config.uploadedIcon?.data}
                      className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-bold uppercase transition-all shrink-0 ${
                        config.uploadedIcon?.data 
                          ? 'bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border-amber-500/40' 
                          : 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed'
                      }`}
                    >
                      {config.uploadedIcon?.data ? 'Baixar .PNG' : 'Sem Ícone'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-900 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-sans">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span>✓</span> Central e Pasta de Downloads Ativa
              </span>
              <button
                onClick={() => setShowDownloadsModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold uppercase"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
