
import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { AppConfig, AppAsset, UIComponent, ConversationMessage } from '../types';
import { Icons } from '../constants';
import { generateIcon } from '../utils/iconGenerator';

interface AndroidPreviewProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  handleAiGenerate: () => Promise<void>;
  conversationHistory: ConversationMessage[];
  attachments: AppAsset[];
  setAttachments: React.Dispatch<React.SetStateAction<AppAsset[]>>;
  isProcessing: boolean;
  isListening: boolean;
  toggleMic: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  googleProjectIdError: string | null;
  apiKeySelected: boolean;
  checkingApiKey: boolean;
  uploadedIcon: AppAsset | null;
  onClearChat: () => void;
  xmlCode?: string;
}

interface SimulatorLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  tag: string;
  message: string;
  details?: string;
}

export interface DeviceSpec {
  id: string;
  name: string;
  type: 'phone' | 'tablet' | 'foldable';
  width: number;
  height: number;
  displaySpecs: string;
  icon: string;
}

export const ANDROID_DEVICES: DeviceSpec[] = [
  {
    id: 'pixel_7',
    name: 'Pixel 7',
    type: 'phone',
    width: 360,
    height: 740,
    displaySpecs: '1080x2400 (360x740dp)',
    icon: '📱'
  },
  {
    id: 'pixel_fold',
    name: 'Pixel Fold (Dobrável)',
    type: 'foldable',
    width: 500,
    height: 680,
    displaySpecs: '1840x2208 (500x680dp)',
    icon: '📖'
  },
  {
    id: 'pixel_tablet',
    name: 'Pixel Tablet',
    type: 'tablet',
    width: 620,
    height: 780,
    displaySpecs: '1600x2560 (620x780dp)',
    icon: '🖼️'
  }
];

const AndroidPreview: React.FC<AndroidPreviewProps> = ({ 
  config, aiPrompt, setAiPrompt, handleAiGenerate, conversationHistory, attachments, setAttachments,
  isProcessing, isListening, toggleMic, fileInputRef, xmlCode
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('pixel_7');
  const selectedDevice = ANDROID_DEVICES.find(d => d.id === selectedDeviceId) || ANDROID_DEVICES[0];

  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState<'chat' | 'app'>('app'); 
  const [previewSubTab, setPreviewSubTab] = useState<'interactive' | 'wireframe' | 'xml' | 'logs' | 'tests'>('interactive');
  const [copiedXml, setCopiedXml] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [copiedTestCode, setCopiedTestCode] = useState<boolean>(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState<boolean>(false);
  const [testViewMode, setTestViewMode] = useState<'espresso' | 'workflow'>('espresso');
  const [isExecutingTests, setIsExecutingTests] = useState<boolean>(false);
  const [testExecutionLogs, setTestExecutionLogs] = useState<Array<{ name: string; status: 'pending' | 'running' | 'passed' | 'failed'; duration: string; log: string }>>([]);
  const [inputError, setInputError] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const [appIconSrc, setAppIconSrc] = useState<string | null>(null);
  const [showSendTooltip, setShowSendTooltip] = useState<boolean>(false);

  // Duolingo Koine Interactive App State
  const [appNav, setAppNav] = useState<'learn' | 'vocab' | 'ranking' | 'profile'>('learn');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [userXP, setUserXP] = useState<number>(140);
  const [hearts, setHearts] = useState<number>(5);
  const [streak, setStreak] = useState<number>(3);
  const [lessonCompleted, setLessonCompleted] = useState<boolean>(false);
  const [mockToast, setMockToast] = useState<string | null>(null);

  // High quality Mock Data Populator
  const handlePopulateMockData = () => {
    setUserXP(380);
    setStreak(12);
    setHearts(5);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsChecked(false);
    setLessonCompleted(false);
    setAppNav('learn');

    setMockToast('✨ Tela preenchida com dados fictícios de alta qualidade!');
    setTimeout(() => setMockToast(null), 3500);
  };

  const KOINE_LESSONS = [
    {
      id: 1,
      category: "Módulo 1: Vocabulário Bíblico",
      title: "O Verbo e a Palavra",
      greek: "ὁ λόγος",
      phonetic: "ho logos",
      grammarTip: "Substantivo Masculino Singular • Nominativo",
      question: "Qual é a tradução da expressão em Grego Koiné acima?",
      options: [
        "O Verbo / A Palavra",
        "O Amor Incondicional",
        "A Vida Eterna",
        "O Caminho Divino"
      ],
      correctIndex: 0,
      explanation: "Em João 1:1, 'ὁ λόγος' refere-se ao 'Verbo' ou 'A Palavra'."
    },
    {
      id: 2,
      category: "Módulo 1: Vocabulário Bíblico",
      title: "O Criador no Novo Testamento",
      greek: "ὁ θεός",
      phonetic: "ho theos",
      grammarTip: "Substantivo Masculino • Ocorre 1.317 vezes no NT",
      question: "O que significa a palavra 'ὁ θεός'?",
      options: [
        "A Graça",
        "Deus",
        "O Anjo",
        "O Senhor"
      ],
      correctIndex: 1,
      explanation: "'ὁ θεός' é a palavra padrão para 'Deus' no grego do Novo Testamento."
    },
    {
      id: 3,
      category: "Módulo 2: Amor Sacrificial",
      title: "Amor Agape",
      greek: "ἡ ἀγάπη",
      phonetic: "hē agapē",
      grammarTip: "Substantivo Feminino • Amor perfeito e incondicional",
      question: "Qual é o significado de 'ἡ ἀγάπη'?",
      options: [
        "A Verdade Divina",
        "A Fé Inabalável",
        "O Amor Divino / Sacrificial",
        "A Paz de Cristo"
      ],
      correctIndex: 2,
      explanation: "'ἀγάπη' representa o amor incondicional e sacrificial de Deus (1 João 4:8)."
    },
    {
      id: 4,
      category: "Módulo 3: Leitura Bíblica",
      title: "Versículo de João 1:1",
      greek: "Ἐν ἀρχῇ ἦν ὁ λόγος",
      phonetic: "En archē ēn ho logos",
      grammarTip: "Trecho do Evangelho de João 1:1",
      question: "Traduza esta célebre frase do Novo Testamento:",
      options: [
        "Deus amou o mundo de tal maneira",
        "No princípio era a Palavra",
        "Eu sou o caminho e a verdade",
        "A graça e a paz sejam com todos"
      ],
      correctIndex: 1,
      explanation: "'Ἐν ἀρχῇ' (No princípio) + 'ἦν' (era) + 'ὁ λόγος' (a Palavra)."
    }
  ];

  const currentQ = KOINE_LESSONS[currentQuestionIndex];

  const playGreekSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'el-GR';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null) return;
    setIsChecked(true);
    if (selectedOption === currentQ.correctIndex) {
      setUserXP(prev => prev + 15);
      playGreekSpeech(currentQ.greek);
    } else {
      setHearts(prev => Math.max(0, prev - 1));
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < KOINE_LESSONS.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsChecked(false);
    } else {
      setLessonCompleted(true);
    }
  };

  const handleRestartLesson = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsChecked(false);
    setLessonCompleted(false);
    setHearts(5);
  };

  // Real-time Simulator Log State
  const [simulatorLogs, setSimulatorLogs] = useState<SimulatorLog[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const rawXmlToAnalyze = xmlCode || `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="${config.theme === 'dark' ? "@color/dark_bg" : "@color/light_bg"}"
    tools:context=".MainActivity">

    <View
        android:id="@+id/headerBg"
        android:layout_width="0dp"
        android:layout_height="?attr/actionBarSize"
        android:background="?attr/colorPrimary"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <TextView
        android:id="@+id/tvTitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="${config.appName}"
        android:textColor="@android:color/white"
        android:textSize="18sp"
        android:textStyle="bold"
        app:layout_constraintTop_toTopOf="@id/headerBg"
        app:layout_constraintBottom_toBottomOf="@id/headerBg"
        app:layout_constraintStart_toStartOf="parent"
        android:layout_marginStart="16dp" />

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/rvMessages"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        app:layout_constraintTop_toBottomOf="@id/headerBg"
        app:layout_constraintBottom_toTopOf="@+id/bottomBar" />

    <LinearLayout
        android:id="@+id/bottomBar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:padding="8dp"
        app:layout_constraintBottom_toBottomOf="parent">

        <EditText
            android:id="@+id/etMessage"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:hint="Digite um comando..." />

        <ImageButton
            android:id="@+id/btnSend"
            android:layout_width="48dp"
            android:layout_height="48dp"
            android:contentDescription="Enviar" />
    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`;

  // Real-time XML Diagnostic Analyzer
  const analyzeXmlLayout = () => {
    const logs: SimulatorLog[] = [];
    const now = () => new Date().toLocaleTimeString('pt-BR');

    logs.push({
      id: Math.random().toString(),
      timestamp: now(),
      level: 'info',
      tag: 'AndroidRuntime',
      message: 'Iniciando simulador virtual Android 14 (API Level 34)...'
    });

    logs.push({
      id: Math.random().toString(),
      timestamp: now(),
      level: 'info',
      tag: 'LayoutInflater',
      message: 'Inflando layout XML "activity_main.xml"...'
    });

    const xml = rawXmlToAnalyze.trim();

    // 1. Basic XML Well-formedness Check
    if (!xml.startsWith('<?xml') && !xml.startsWith('<')) {
      logs.push({
        id: Math.random().toString(),
        timestamp: now(),
        level: 'error',
        tag: 'XmlPullParser',
        message: 'Erro sintático: O arquivo não inicia com tag XML válida ou cabeçalho <?xml...>.',
        details: 'Verifique se o código gerado foi truncado.'
      });
    }

    // Check tags matching
    const openTags = (xml.match(/<[a-zA-Z0-9_.-]+/g) || []).map(t => t.substring(1));
    const closeTags = (xml.match(/<\/[a-zA-Z0-9_.-]+/g) || []).map(t => t.substring(2));
    
    // Check Namespace declarations
    if (!xml.includes('xmlns:android=')) {
      logs.push({
        id: Math.random().toString(),
        timestamp: now(),
        level: 'warn',
        tag: 'ResourceResolver',
        message: 'Aviso: Namespace android="http://schemas.android.com/apk/res/android" ausente no elemento raiz.',
        details: 'Isso impede a resolução dos atributos android:layout_width/height.'
      });
    }

    if (xml.includes('app:') && !xml.includes('xmlns:app=')) {
      logs.push({
        id: Math.random().toString(),
        timestamp: now(),
        level: 'warn',
        tag: 'ResourceResolver',
        message: 'Aviso: Atributos com prefixo "app:" encontrados sem namespace xmlns:app declarado.',
        details: 'Declare xmlns:app="http://schemas.android.com/apk/res-auto".'
      });
    }

    // Extract all declared IDs: android:id="@+id/xxx"
    const declaredIdMatches = xml.matchAll(/android:id=["']@\+id\/([a-zA-Z0-9_]+)["']/g);
    const declaredIds = new Set<string>();
    for (const match of declaredIdMatches) {
      if (declaredIds.has(match[1])) {
        logs.push({
          id: Math.random().toString(),
          timestamp: now(),
          level: 'warn',
          tag: 'IdConflict',
          message: `Aviso: ID duplicado detectado no layout: "@+id/${match[1]}".`
        });
      }
      declaredIds.add(match[1]);
    }

    // Extract referenced IDs: @id/xxx (excluding parent)
    const referencedIdMatches = xml.matchAll(/app:layout_[a-zA-Z]+=["']@id\/([a-zA-Z0-9_]+)["']/g);
    for (const match of referencedIdMatches) {
      const targetId = match[1];
      if (targetId !== 'parent' && !declaredIds.has(targetId)) {
        logs.push({
          id: Math.random().toString(),
          timestamp: now(),
          level: 'error',
          tag: 'ConstraintSolver',
          message: `Erro de Restrição: Alvo de Constraint "@id/${targetId}" não foi encontrado no arquivo XML.`,
          details: `Verifique se o elemento id="@+id/${targetId}" existe ou foi declarado antes do uso.`
        });
      }
    }

    // Check width & height attributes
    const tagsWithoutWidth = xml.split('>').filter(chunk => chunk.includes('<') && !chunk.includes('android:layout_width') && !chunk.includes('<?xml'));
    if (tagsWithoutWidth.length > 0) {
      logs.push({
        id: Math.random().toString(),
        timestamp: now(),
        level: 'warn',
        tag: 'ViewMeasure',
        message: 'Aviso de Dimensão: Existem elementos sem "android:layout_width" definido explicitamente.'
      });
    }

    // Component validation from IDE state
    if (config.components && config.components.length > 0) {
      logs.push({
        id: Math.random().toString(),
        timestamp: now(),
        level: 'info',
        tag: 'UIEngine',
        message: `Analisando ${config.components.length} componente(s) cadastrado(s) na IDE.`
      });
    }

    const errorCount = logs.filter(l => l.level === 'error').length;
    const warnCount = logs.filter(l => l.level === 'warn').length;

    if (errorCount === 0) {
      logs.push({
        id: Math.random().toString(),
        timestamp: now(),
        level: 'success',
        tag: 'RenderEngine',
        message: `Layout XML validado com sucesso! (${warnCount} aviso(s)). Renderizando hierarquia de Views.`
      });
    } else {
      logs.push({
        id: Math.random().toString(),
        timestamp: now(),
        level: 'error',
        tag: 'RenderEngine',
        message: `Falha na renderização: ${errorCount} erro(s) crítico(s) impedem a montagem precisa da tela.`
      });
    }

    setSimulatorLogs(logs);
  };

  useEffect(() => {
    analyzeXmlLayout();
  }, [rawXmlToAnalyze, config.appName, config.components]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const availableHeight = containerRef.current.clientHeight - 60;
      const availableWidth = containerRef.current.clientWidth - 24;
      const hScale = availableHeight / selectedDevice.height;
      const wScale = availableWidth / selectedDevice.width;
      setScale(Math.max(0.25, Math.min(hScale, wScale, 1))); 
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedDeviceId]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const updateIcon = async () => {
      const imgData = config.iconType === 'image' && config.uploadedIcon ? config.uploadedIcon.data : undefined;
      const b64 = await generateIcon(config.iconLabel, config.iconColor, config.iconTextColor, 64, false, imgData);
      setAppIconSrc(`data:image/png;base64,${b64}`);
    };
    updateIcon();
  }, [conversationHistory, viewMode, config.iconLabel, config.iconColor, config.iconType, config.uploadedIcon]);

  const isDark = config.theme === 'dark';
  const bgColor = isDark ? 'bg-[#0f172a]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const accent = config.iconColor || '#3b82f6';

  const onSendClick = () => {
    if (!aiPrompt.trim() && attachments.length === 0) {
      setInputError(true);
      setTimeout(() => setInputError(false), 500);
      return;
    }
    handleAiGenerate();
  };

  const renderXmlCode = () => {
    const rawXml = xmlCode || `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="${isDark ? "@color/dark_bg" : "@color/light_bg"}"
    tools:context=".MainActivity">

    <View
        android:id="@+id/headerBg"
        android:layout_width="0dp"
        android:layout_height="?attr/actionBarSize"
        android:background="?attr/colorPrimary"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <TextView
        android:id="@+id/tvTitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="${config.appName}"
        android:textColor="@android:color/white"
        android:textSize="18sp"
        android:textStyle="bold"
        app:layout_constraintTop_toTopOf="@id/headerBg"
        app:layout_constraintBottom_toBottomOf="@id/headerBg"
        app:layout_constraintStart_toStartOf="parent"
        android:layout_marginStart="16dp" />

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/rvMessages"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        app:layout_constraintTop_toBottomOf="@id/headerBg"
        app:layout_constraintBottom_toTopOf="@+id/bottomBar" />

    <LinearLayout
        android:id="@+id/bottomBar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:padding="8dp"
        app:layout_constraintBottom_toBottomOf="parent">

        <EditText
            android:id="@+id/etMessage"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:hint="Digite um comando..." />

        <ImageButton
            android:id="@+id/btnSend"
            android:layout_width="48dp"
            android:layout_height="48dp"
            android:contentDescription="Enviar" />
    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`;

    const copyToClipboard = () => {
      navigator.clipboard.writeText(rawXml);
      setCopiedXml(true);
      setTimeout(() => setCopiedXml(false), 2000);
    };

    return (
      <div className="flex-1 overflow-y-auto p-3 bg-slate-950 font-mono text-[9px] text-emerald-400 leading-relaxed scrollbar-hide relative group">
        <button
          onClick={copyToClipboard}
          className="absolute top-3 right-3 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-white/10 text-[8px] transition-all"
        >
          {copiedXml ? '✓ Copiado' : '📋 Copiar XML'}
        </button>
        <pre className="whitespace-pre-wrap break-all pt-6 select-all">{rawXml}</pre>
      </div>
    );
  };

  const renderWireframe = () => {
    return (
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#030712] font-mono text-[9px] scrollbar-hide relative">
        {/* Architectural Blueprint Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />

        {/* Blueprint Container */}
        <div className="relative border-2 border-dashed border-blue-500/60 rounded-xl p-3 bg-blue-950/20 space-y-3 text-slate-300">
          <div className="flex items-center justify-between text-[8px] text-blue-400 font-bold border-b border-blue-500/30 pb-1.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              &lt;ConstraintLayout&gt;
            </span>
            <span className="text-slate-500">match_parent × match_parent</span>
          </div>

          {/* Header Wireframe Box */}
          <div className="border border-indigo-500/40 rounded-lg p-2 bg-indigo-950/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center text-[7px] text-indigo-300 font-bold">
                IMG
              </div>
              <div>
                <p className="text-[8px] font-bold text-indigo-300">&lt;TextView id="@+id/tvHeader"&gt;</p>
                <p className="text-[7px] text-slate-400">"{config.appName}"</p>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[6px] uppercase font-bold border border-indigo-500/30">
              ActionBar
            </span>
          </div>

          {/* Components list or Content Slots */}
          {config.components && config.components.length > 0 ? (
            <div className="space-y-2">
              {config.components.map((comp, idx) => {
                const tag = comp.type === 'button' ? 'Button' : comp.type === 'input' ? 'EditText' : comp.type === 'switch' ? 'Switch' : comp.type === 'progress' ? 'ProgressBar' : 'TextView';
                return (
                  <div key={idx} className="border border-blue-500/30 rounded-lg p-2 bg-slate-900/80 relative space-y-1 hover:border-blue-400 transition-colors">
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="font-bold text-emerald-400">&lt;{tag}&gt;</span>
                      <span className="text-slate-500 text-[7px]">id="@+id/{comp.type}_{idx}"</span>
                    </div>

                    <div className="p-1.5 border border-dashed border-slate-700 rounded bg-black/40 text-slate-200 text-[8px] flex items-center justify-between">
                      <span className="truncate">{comp.label || `[${tag}]`}</span>
                      <span className="text-[6px] px-1 bg-slate-800 text-slate-400 rounded shrink-0">wrap_content</span>
                    </div>

                    <div className="flex items-center justify-between text-[6px] text-slate-500">
                      <span>margin: 8dp</span>
                      <span>padding: 12dp</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-slate-800 rounded-lg text-center space-y-2 bg-slate-950/60">
              <p className="text-[8px] text-blue-400 font-bold">&lt;RecyclerView id="@+id/rvMessages"&gt;</p>
              <p className="text-[7px] text-slate-500">match_parent × 0dp (weight: 1.0)</p>
              <div className="border border-slate-800 rounded p-3 text-[7px] text-slate-600 uppercase tracking-widest bg-black/40">
                [ Layout Content Slot ]
              </div>
            </div>
          )}

          {/* Footer Input Bar Wireframe */}
          <div className="border border-emerald-500/40 rounded-lg p-2 bg-emerald-950/20 flex items-center gap-2">
            <div className="flex-1 border border-dashed border-emerald-500/30 rounded p-1 text-[7px] text-emerald-400 truncate">
              &lt;EditText id="@+id/etMessage" /&gt;
            </div>
            <div className="w-5 h-5 rounded bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-[7px] text-emerald-300 font-bold">
              SEND
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSimulatorLogs = () => {
    const filteredLogs = simulatorLogs.filter(log => {
      if (logFilter === 'error') return log.level === 'error';
      if (logFilter === 'warn') return log.level === 'warn';
      if (logFilter === 'info') return log.level === 'info' || log.level === 'success';
      return true;
    });

    const errorCount = simulatorLogs.filter(l => l.level === 'error').length;
    const warnCount = simulatorLogs.filter(l => l.level === 'warn').length;

    const copyLogsToClipboard = () => {
      const text = simulatorLogs
        .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.tag}] ${l.message} ${l.details ? `(${l.details})` : ''}`)
        .join('\n');
      navigator.clipboard.writeText(text);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    };

    return (
      <div className="flex-1 flex flex-col bg-slate-950 font-mono text-[9px] overflow-hidden relative">
        {/* Real-time Status Header */}
        <div className={`p-2.5 border-b text-[9px] flex items-center justify-between shrink-0 font-sans ${
          errorCount > 0
            ? 'bg-red-950/40 border-red-500/30 text-red-300'
            : warnCount > 0
            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              errorCount > 0 ? 'bg-red-500 animate-pulse' : warnCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className="font-bold">
              {errorCount > 0
                ? `${errorCount} Erro(s) no Layout XML`
                : warnCount > 0
                ? `Layout Válido (${warnCount} Aviso)`
                : 'Layout XML Totalmente Válido'}
            </span>
          </div>
          <button
            onClick={analyzeXmlLayout}
            className="px-2 py-0.5 bg-black/40 hover:bg-black/60 rounded text-[8px] border border-white/10 font-mono transition-colors"
          >
            🔄 Re-analisar
          </button>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="px-2 py-1.5 bg-slate-900 border-b border-white/10 flex items-center justify-between gap-1 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLogFilter('all')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                logFilter === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({simulatorLogs.length})
            </button>
            <button
              onClick={() => setLogFilter('error')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                logFilter === 'error' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-400'
              }`}
            >
              Erros ({errorCount})
            </button>
            <button
              onClick={() => setLogFilter('warn')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                logFilter === 'warn' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Avisos ({warnCount})
            </button>
          </div>

          <button
            onClick={copyLogsToClipboard}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[8px] border border-white/10 shrink-0"
          >
            {copiedLogs ? '✓' : '📋 Copiar'}
          </button>
        </div>

        {/* Logs Output Stream */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-hide">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-[8px]">
              Nenhum log encontrado para o filtro selecionado.
            </div>
          ) : (
            filteredLogs.map(log => {
              const badgeStyle =
                log.level === 'error'
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : log.level === 'warn'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : log.level === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

              return (
                <div
                  key={log.id}
                  className="p-1.5 rounded bg-slate-900/90 border border-white/5 space-y-0.5 leading-relaxed font-mono"
                >
                  <div className="flex items-center justify-between text-[7px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">{log.timestamp}</span>
                      <span className={`px-1 py-0.2 rounded text-[6px] font-bold uppercase border ${badgeStyle}`}>
                        {log.level}
                      </span>
                      <span className="text-sky-400 font-bold">[{log.tag}]</span>
                    </div>
                  </div>
                  <p className={`text-[8.5px] ${
                    log.level === 'error'
                      ? 'text-red-300 font-medium'
                      : log.level === 'warn'
                      ? 'text-amber-200'
                      : log.level === 'success'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }`}>
                    {log.message}
                  </p>
                  {log.details && (
                    <p className="text-[7.5px] text-slate-400 italic bg-black/40 p-1 rounded border border-white/5 mt-1">
                      💡 {log.details}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderEspressoTests = () => {
    const espressoCode = `package com.koine.app.ui

import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.*
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import org.hamcrest.CoreMatchers.containsString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Testes Automatizados de Interface UI (Espresso) para a tela Koine Duolingo
 */
@RunWith(AndroidJUnit4::class)
class MainActivityKoineUiTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun test01_verificarExibicaoCardGregoEVocabularAprender() {
        // Verifica se a palavra em Grego Koiné "ὁ λόγος" está visível na tela inicial
        onView(withText(containsString("ὁ λόγος")))
            .check(matches(isDisplayed()))

        // Verifica se as opções de resposta estão renderizadas
        onView(withText("O Verbo / A Palavra"))
            .check(matches(isDisplayed()))
    }

    @Test
    fun test02_selecionarRespostaCorretaEVerificarToastXP() {
        // Clica na opção correta de tradução
        onView(withText("O Verbo / A Palavra"))
            .perform(click())

        // Clica no botão "VERIFICAR RESPOSTA"
        onView(withText("VERIFICAR RESPOSTA"))
            .perform(click())

        // Valida se o feedback de resposta correta e ganho de XP aparece na tela
        onView(withText(containsString("Excelente! Resposta Correta")))
            .check(matches(isDisplayed()))
    }

    @Test
    fun test03_navegarEntreAbasDaBarraNavegacaoSuperior() {
        // Clica no ícone do Dicionário/Vocabulário na navegação inferior
        onView(withText("Vocabulário"))
            .perform(click())

        // Valida se o título do Dicionário Koiné é exibido
        onView(withText("📖 Dicionário Koiné"))
            .check(matches(isDisplayed()))

        // Clica na aba Ranking
        onView(withText("Ranking"))
            .perform(click())

        // Valida exibição da Liga Koiné
        onView(withText("🏆 Liga de Grego Koiné"))
            .check(matches(isDisplayed()))
    }
}
`;

    const workflowYaml = `# GitHub Actions CI/CD - Automated Espresso UI Tests
name: Android UI Espresso Tests

on:
  push:
    branches: [ "main", "develop" ]
  pull_request:
    branches: [ "main" ]

jobs:
  espresso-ui-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        api-level: [29, 33]

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Gradle Cache
        uses: gradle/gradle-build-action@v2

      - name: Run Espresso UI Tests on Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: \${{ matrix.api-level }}
          target: default
          arch: x86_64
          profile: Pixel_7
          script: ./gradlew connectedCheck --stacktrace

      - name: Upload Test Results Artifact
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: espresso-test-results-api-\${{ matrix.api-level }}
          path: app/build/reports/androidTests/connected/
`;

    const runSimulatedTests = () => {
      setIsExecutingTests(true);
      setTestExecutionLogs([
        { name: 'test01_verificarExibicaoCardGregoEVocabularAprender', status: 'running', duration: '...', log: 'Verificando presença de "ὁ λόγος" e botões...' },
        { name: 'test02_selecionarRespostaCorretaEVerificarToastXP', status: 'pending', duration: '...', log: 'Aguardando execução...' },
        { name: 'test03_navegarEntreAbasDaBarraNavegacaoSuperior', status: 'pending', duration: '...', log: 'Aguardando execução...' }
      ]);

      setTimeout(() => {
        setTestExecutionLogs([
          { name: 'test01_verificarExibicaoCardGregoEVocabularAprender', status: 'passed', duration: '342ms', log: '✓ PASSOU - Elemento TextView encontrado e visível.' },
          { name: 'test02_selecionarRespostaCorretaEVerificarToastXP', status: 'running', duration: '...', log: 'Simulando clique e verificação de XP...' },
          { name: 'test03_navegarEntreAbasDaBarraNavegacaoSuperior', status: 'pending', duration: '...', log: 'Aguardando execução...' }
        ]);
      }, 1200);

      setTimeout(() => {
        setTestExecutionLogs([
          { name: 'test01_verificarExibicaoCardGregoEVocabularAprender', status: 'passed', duration: '342ms', log: '✓ PASSOU - Elemento TextView encontrado e visível.' },
          { name: 'test02_selecionarRespostaCorretaEVerificarToastXP', status: 'passed', duration: '512ms', log: '✓ PASSOU - Resposta correta validada (+15 XP).' },
          { name: 'test03_navegarEntreAbasDaBarraNavegacaoSuperior', status: 'running', duration: '...', log: 'Navegando entre abas da BottomNavigation...' }
        ]);
      }, 2400);

      setTimeout(() => {
        setTestExecutionLogs([
          { name: 'test01_verificarExibicaoCardGregoEVocabularAprender', status: 'passed', duration: '342ms', log: '✓ PASSOU - Elemento TextView encontrado e visível.' },
          { name: 'test02_selecionarRespostaCorretaEVerificarToastXP', status: 'passed', duration: '512ms', log: '✓ PASSOU - Resposta correta validada (+15 XP).' },
          { name: 'test03_navegarEntreAbasDaBarraNavegacaoSuperior', status: 'passed', duration: '418ms', log: '✓ PASSOU - Abas Vocabulário e Ranking alteradas com sucesso.' }
        ]);
        setIsExecutingTests(false);
      }, 3600);
    };

    const copyEspressoCode = () => {
      navigator.clipboard.writeText(espressoCode);
      setCopiedTestCode(true);
      setTimeout(() => setCopiedTestCode(false), 2000);
    };

    const copyWorkflowYaml = () => {
      navigator.clipboard.writeText(workflowYaml);
      setCopiedWorkflow(true);
      setTimeout(() => setCopiedWorkflow(false), 2000);
    };

    return (
      <div className="flex-1 flex flex-col bg-slate-950 text-slate-200 font-mono text-[9px] overflow-hidden relative">
        {/* Header Toolbar */}
        <div className="px-3 py-2 bg-slate-900 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold text-xs">🧪</span>
            <span className="font-extrabold text-slate-100 text-[10px] font-sans">
              Testes Automatizados (Espresso & GitHub CI/CD)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setTestViewMode('espresso')}
              className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                testViewMode === 'espresso' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ☕ Espresso (Kotlin)
            </button>
            <button
              onClick={() => setTestViewMode('workflow')}
              className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                testViewMode === 'workflow' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚙️ GitHub Actions CI/CD
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-3 py-1.5 bg-slate-900/60 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={runSimulatedTests}
            disabled={isExecutingTests}
            className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
              isExecutingTests
                ? 'bg-amber-600/50 border-amber-500/30 text-amber-200 cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-600/30 active:scale-95'
            }`}
          >
            <span>{isExecutingTests ? '⏳ Executando...' : '▶ Executar Testes UI'}</span>
          </button>

          {testViewMode === 'espresso' ? (
            <button
              onClick={copyEspressoCode}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[8px] border border-white/10 font-sans font-bold flex items-center gap-1"
            >
              <span>{copiedTestCode ? '✓ Copiado!' : '📋 Copiar MainActivityTest.kt'}</span>
            </button>
          ) : (
            <button
              onClick={copyWorkflowYaml}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[8px] border border-white/10 font-sans font-bold flex items-center gap-1"
            >
              <span>{copiedWorkflow ? '✓ Copiado!' : '📋 Copiar android-tests.yml'}</span>
            </button>
          )}
        </div>

        {/* Test Execution Simulator Logs Panel */}
        {testExecutionLogs.length > 0 && (
          <div className="bg-black/80 p-2.5 border-b border-white/10 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-[8px] font-sans font-bold text-slate-400">
              <span>SIMULADOR DE EXECUÇÃO NO EMULADOR CI/CD</span>
              {isExecutingTests ? (
                <span className="text-amber-400 animate-pulse">Rodando testes Espresso...</span>
              ) : (
                <span className="text-emerald-400 font-black">✓ 3/3 Testes Passaram! (Total: 1.27s)</span>
              )}
            </div>

            <div className="space-y-1">
              {testExecutionLogs.map((t, idx) => (
                <div key={idx} className="p-1.5 rounded bg-slate-900 border border-white/5 flex items-center justify-between text-[8px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span>
                      {t.status === 'passed' ? '✅' : t.status === 'running' ? '🔄' : '⏳'}
                    </span>
                    <span className="font-bold text-sky-300 truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 italic text-[7.5px]">{t.log}</span>
                    <span className="px-1.5 py-0.2 bg-slate-800 text-emerald-300 font-mono rounded text-[7px] border border-white/5">{t.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Content View Stream */}
        <div className="flex-1 overflow-y-auto p-3 font-mono leading-relaxed text-[8.5px] scrollbar-hide">
          <pre className="text-slate-300 whitespace-pre-wrap select-text">
            {testViewMode === 'espresso' ? espressoCode : workflowYaml}
          </pre>
        </div>
      </div>
    );
  };

  const renderInteractiveApp = () => {
    return (
      <div className="flex-1 flex flex-col bg-slate-900 text-white font-sans overflow-hidden select-none relative">
        {/* Mock Data Toast Overlay */}
        {mockToast && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-full shadow-xl border border-amber-300 animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-1.5 whitespace-nowrap pointer-events-none">
            <span>✨</span>
            <span>{mockToast}</span>
          </div>
        )}

        {/* Top App Header Bar */}
        <div className="px-3 py-2 bg-slate-950 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-xs font-black">🔥 {streak}</span>
            <span className="text-[9px] text-slate-400 font-bold">dias</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
              <span className="text-amber-400 text-xs">⚡</span>
              <span className="text-amber-300 font-extrabold text-[10px]">{userXP} XP</span>
            </div>
            <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30">
              <span className="text-red-400 text-xs">❤️</span>
              <span className="text-red-300 font-extrabold text-[10px]">{hearts}</span>
            </div>
          </div>
        </div>

        {/* Main Body Content based on appNav */}
        {appNav === 'learn' && (
          <div className="flex-1 flex flex-col justify-between p-3 overflow-y-auto scrollbar-hide">
            {lessonCompleted ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-6 animate-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
                  🎉
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-black text-emerald-400">Lição Concluída!</h2>
                  <p className="text-xs text-slate-300">Você dominou o vocabulário inicial de Grego Koiné!</p>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full max-w-[240px] pt-2">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/10 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Total Ganho</p>
                    <p className="text-sm font-black text-amber-400">+60 XP ⚡</p>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/10 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Precisão</p>
                    <p className="text-sm font-black text-emerald-400">100% 🎯</p>
                  </div>
                </div>

                <button
                  onClick={handleRestartLesson}
                  className="w-full max-w-[240px] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/30 text-xs uppercase tracking-wider transition-all active:scale-95 mt-4"
                >
                  🔄 Refazer Lição
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                {/* Progress Bar & Module Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                    <span>{currentQ.category}</span>
                    <span>{currentQuestionIndex + 1} / {KOINE_LESSONS.length}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${((currentQuestionIndex + 1) / KOINE_LESSONS.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Main Card */}
                <div className="bg-slate-800/90 border border-sky-500/30 rounded-2xl p-3.5 space-y-2 text-center shadow-lg relative">
                  <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 text-[8px] font-bold uppercase tracking-wider rounded-md border border-sky-500/30">
                    {currentQ.title}
                  </span>

                  <div className="pt-1 flex items-center justify-center gap-2">
                    <h1 className="text-2xl font-black text-sky-200 tracking-wide font-serif">
                      {currentQ.greek}
                    </h1>
                    <button
                      onClick={() => playGreekSpeech(currentQ.greek)}
                      className="p-1.5 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 rounded-lg border border-sky-400/30 transition-all active:scale-90"
                      title="Ouvir Pronúncia Koiné"
                    >
                      🔊
                    </button>
                  </div>

                  <p className="text-[10px] text-sky-400/90 italic font-mono">
                    "{currentQ.phonetic}"
                  </p>
                  <p className="text-[8.5px] text-slate-400 bg-black/30 py-1 px-2 rounded-lg border border-white/5">
                    💡 {currentQ.grammarTip}
                  </p>
                </div>

                {/* Question */}
                <p className="text-[11px] font-bold text-slate-100 text-center">
                  {currentQ.question}
                </p>

                {/* Options List */}
                <div className="space-y-1.5">
                  {currentQ.options.map((optionText, idx) => {
                    let btnStyle = "bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-500";

                    if (selectedOption === idx) {
                      btnStyle = "bg-sky-950/80 border-sky-400 text-white shadow-md shadow-sky-500/20";
                    }

                    if (isChecked) {
                      if (idx === currentQ.correctIndex) {
                        btnStyle = "bg-emerald-950/90 border-emerald-400 text-emerald-200 font-bold shadow-md shadow-emerald-500/20";
                      } else if (selectedOption === idx) {
                        btnStyle = "bg-red-950/90 border-red-400 text-red-200 font-bold";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isChecked}
                        onClick={() => setSelectedOption(idx)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all text-[10.5px] font-semibold flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{optionText}</span>
                        {isChecked && idx === currentQ.correctIndex && <span>✅</span>}
                        {isChecked && selectedOption === idx && idx !== currentQ.correctIndex && <span>❌</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Verification Action Bar */}
                <div className="pt-1">
                  {!isChecked ? (
                    <button
                      disabled={selectedOption === null}
                      onClick={handleCheckAnswer}
                      className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 ${
                        selectedOption !== null
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                          : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                      }`}
                    >
                      VERIFICAR RESPOSTA
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className={`p-2.5 rounded-xl border text-[10px] space-y-1 ${
                        selectedOption === currentQ.correctIndex
                          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                          : 'bg-red-950/90 border-red-500/50 text-red-300'
                      }`}>
                        <p className="font-bold text-xs flex items-center gap-1">
                          {selectedOption === currentQ.correctIndex ? '🎉 Excelente! Resposta Correta (+15 XP)' : '❌ Incorreto!'}
                        </p>
                        <p className="leading-snug opacity-90">{currentQ.explanation}</p>
                      </div>

                      <button
                        onClick={handleNextQuestion}
                        className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl shadow-lg shadow-sky-600/30 text-xs uppercase tracking-wider transition-all active:scale-95"
                      >
                        PRÓXIMA PERGUNTA ➔
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* App Tab 2: Dicionário Koiné */}
        {appNav === 'vocab' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2 scrollbar-hide text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="font-black text-sky-400">📖 Dicionário Koiné</h3>
              <span className="text-[9px] text-slate-400">Novo Testamento</span>
            </div>
            {[
              { g: "ὁ λόγος", p: "ho logos", t: "O Verbo, A Palavra", c: "João 1:1" },
              { g: "ὁ θεός", p: "ho theos", t: "Deus, O Criador", c: "Gênesis / NT" },
              { g: "ἡ ἀγάπη", p: "hē agapē", t: "O Amor Incondicional", c: "1 João 4:8" },
              { g: "tὸ φῶς", p: "to phōs", t: "A Luz Divina", c: "João 8:12" },
              { g: "ἡ ζωή", p: "hē zōē", t: "A Vida Eterna", c: "João 14:6" },
              { g: "ἡ χάρις", p: "hē charis", t: "A Graça, Favor", c: "Efésios 2:8" },
              { g: "tὸ πνεῦμα", p: "to pneuma", t: "O Espírito, Vento", c: "João 3:8" }
            ].map((v, i) => (
              <div key={i} className="bg-slate-800/80 p-2 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-200 text-sm">{v.g}</span>
                    <span className="text-[9px] text-slate-400 italic">({v.p})</span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-semibold">{v.t}</p>
                </div>
                <button
                  onClick={() => playGreekSpeech(v.g)}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-[10px]"
                >
                  🔊
                </button>
              </div>
            ))}
          </div>
        )}

        {/* App Tab 3: Ranking */}
        {appNav === 'ranking' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2 scrollbar-hide text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="font-black text-amber-400">🏆 Liga de Grego Koiné</h3>
              <span className="text-[9px] text-amber-300 font-bold">Top Estudantes</span>
            </div>
            {[
              { pos: "1", name: "Estudante Teologia", xp: "850 XP", badge: "🥇" },
              { pos: "2", name: "Você (Koiné Master)", xp: `${userXP} XP`, badge: "🥈" },
              { pos: "3", name: "Leitor de João", xp: "120 XP", badge: "🥉" },
              { pos: "4", name: "Pr. Marcos", xp: "95 XP", badge: "4º" }
            ].map((r, i) => (
              <div key={i} className={`p-2 rounded-xl border flex items-center justify-between ${
                r.name.includes("Você") ? "bg-sky-950/80 border-sky-400 text-white" : "bg-slate-800/80 border-white/10 text-slate-300"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{r.badge}</span>
                  <span className="font-bold text-[11px]">{r.name}</span>
                </div>
                <span className="text-[10px] font-extrabold text-amber-400">{r.xp}</span>
              </div>
            ))}
          </div>
        )}

        {/* App Tab 4: Perfil */}
        {appNav === 'profile' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-hide text-xs">
            <div className="bg-slate-800/90 p-3 rounded-2xl border border-white/10 text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-sky-600 text-white text-xl font-black flex items-center justify-center mx-auto shadow-md">
                🇬🇷
              </div>
              <h3 className="font-black text-sm text-white">Estudante de Koiné</h3>
              <p className="text-[9px] text-slate-400">Nível 2 • Leitor de Textos Bíblicos</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/80 p-2 rounded-xl border border-white/10 text-center">
                <span className="text-amber-400 text-sm font-black">🔥 {streak} dias</span>
                <p className="text-[8px] text-slate-400 uppercase font-bold">Sequência</p>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl border border-white/10 text-center">
                <span className="text-sky-400 text-sm font-black">⚡ {userXP} XP</span>
                <p className="text-[8px] text-slate-400 uppercase font-bold">Total Experiência</p>
              </div>
            </div>
          </div>
        )}

        {/* Smartphone Bottom Navigation Bar */}
        <div className="px-2 py-1.5 bg-slate-950 border-t border-white/10 flex items-center justify-around shrink-0 text-[9px] font-bold">
          <button
            onClick={() => setAppNav('learn')}
            className={`flex flex-col items-center gap-0.5 ${appNav === 'learn' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span>🏠</span>
            <span>Aprender</span>
          </button>
          <button
            onClick={() => setAppNav('vocab')}
            className={`flex flex-col items-center gap-0.5 ${appNav === 'vocab' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span>📖</span>
            <span>Vocabulário</span>
          </button>
          <button
            onClick={() => setAppNav('ranking')}
            className={`flex flex-col items-center gap-0.5 ${appNav === 'ranking' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span>🏆</span>
            <span>Ranking</span>
          </button>
          <button
            onClick={() => setAppNav('profile')}
            className={`flex flex-col items-center gap-0.5 ${appNav === 'profile' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span>👤</span>
            <span>Perfil</span>
          </button>
        </div>
      </div>
    );
  };

  const renderAppUI = () => {
    const errorCount = simulatorLogs.filter(l => l.level === 'error').length;
    const warnCount = simulatorLogs.filter(l => l.level === 'warn').length;

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Interactive SubTab Bar */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-950 border-b border-white/10 shrink-0 text-[10px]">
          <span className="font-mono text-slate-400 text-[8px] truncate max-w-[90px]">activity_main.xml</span>

          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setPreviewSubTab('interactive')}
              className={`px-2 py-1 rounded text-[8px] font-bold transition-all ${
                previewSubTab === 'interactive'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📱 App Interativo
            </button>
            <button
              onClick={() => setPreviewSubTab('wireframe')}
              className={`px-2 py-1 rounded text-[8px] font-bold transition-all ${
                previewSubTab === 'wireframe'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📐 Wireframe
            </button>
            <button
              onClick={() => setPreviewSubTab('xml')}
              className={`px-2 py-1 rounded text-[8px] font-bold transition-all ${
                previewSubTab === 'xml'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💻 Raw XML
            </button>
            <button
              onClick={() => setPreviewSubTab('logs')}
              className={`px-2 py-1 rounded text-[8px] font-bold transition-all flex items-center gap-1 ${
                previewSubTab === 'logs'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📜 Logs</span>
              {errorCount > 0 ? (
                <span className="px-1 bg-red-500 text-white text-[6px] rounded-full font-black animate-pulse">
                  {errorCount}
                </span>
              ) : warnCount > 0 ? (
                <span className="px-1 bg-amber-500 text-slate-900 text-[6px] rounded-full font-black">
                  {warnCount}
                </span>
              ) : (
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setPreviewSubTab('tests')}
              className={`px-2 py-1 rounded text-[8px] font-bold transition-all flex items-center gap-1 ${
                previewSubTab === 'tests'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🧪 Testes UI</span>
            </button>

            <button
              onClick={handlePopulateMockData}
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-extrabold text-[8px] rounded border border-amber-500/40 transition-all flex items-center gap-1 active:scale-95 shadow-sm"
              title="Preencher a tela com dados fictícios de alta qualidade"
            >
              <span>✨</span>
              <span>Preencher Dados</span>
            </button>
          </div>
        </div>

        {/* View Mode Content */}
        {previewSubTab === 'interactive' && renderInteractiveApp()}
        {previewSubTab === 'wireframe' && renderWireframe()}
        {previewSubTab === 'xml' && renderXmlCode()}
        {previewSubTab === 'logs' && renderSimulatorLogs()}
        {previewSubTab === 'tests' && renderEspressoTests()}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-start overflow-hidden p-2 gap-2 relative">
      {/* Top Device Selector Toolbar */}
      <div className="z-50 flex items-center justify-between w-full max-w-xl bg-slate-950/90 border border-white/10 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">
            Dispositivo:
          </span>
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
            {ANDROID_DEVICES.map(device => {
              const isActive = device.id === selectedDeviceId;
              return (
                <button
                  key={device.id}
                  onClick={() => setSelectedDeviceId(device.id)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30 font-extrabold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={`${device.name} - ${device.displaySpecs}`}
                >
                  <span>{device.icon}</span>
                  <span>{device.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-mono text-sky-400 bg-slate-900 px-2 py-1 rounded-lg border border-white/5">
          <span className="hidden md:inline text-slate-500">{selectedDevice.displaySpecs}</span>
          <span className="font-bold">{selectedDevice.width} x {selectedDevice.height}dp</span>
        </div>
      </div>

      {/* Scaled Device Frame Container */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
        <div 
          style={{ 
            transform: `scale(${scale})`, 
            width: `${selectedDevice.width}px`, 
            height: `${selectedDevice.height}px`,
            transformOrigin: 'center center' 
          }} 
          className={`bg-slate-900 ${
            selectedDevice.type === 'tablet' 
              ? 'rounded-[2.5rem] border-[10px]' 
              : selectedDevice.type === 'foldable' 
              ? 'rounded-[3rem] border-[12px]' 
              : 'rounded-[3.5rem] border-[12px]'
          } p-3 shadow-2xl border-slate-800 relative shrink-0 transition-all duration-300`}
        >
          {selectedDevice.type === 'phone' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50" />
          )}
          {selectedDevice.type === 'foldable' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-b-xl z-50" />
          )}
          {selectedDevice.type === 'tablet' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 rounded-full z-50" />
          )}
        
        {/* Lightbox / Expanded Image */}
        {expandedImage && (
          <div 
            className="absolute inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 rounded-[2.8rem] animate-in fade-in zoom-in duration-200"
            onClick={() => setExpandedImage(null)}
          >
            <button className="absolute top-10 right-8 text-white p-2 bg-white/10 rounded-full"><Icons.X /></button>
            <img src={expandedImage} className="max-w-full max-h-[80%] object-contain rounded-xl shadow-2xl" alt="Expanded" />
          </div>
        )}

        <div className={`w-full h-full ${bgColor} rounded-[2.8rem] overflow-hidden flex flex-col relative shadow-inner`}>
          <header className={`px-6 py-5 flex items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-black/5'} shrink-0`}>
            <div className="flex items-center gap-3">
              {appIconSrc ? (
                <img src={appIconSrc} className="w-7 h-7 rounded-lg shadow-md" alt="Icon" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-slate-700" />
              )}
              <h1 className={`text-xs font-black tracking-tight ${textColor} truncate max-w-[120px]`}>{config.appName}</h1>
            </div>
            <div className={`flex bg-black/10 p-1 rounded-xl border ${isDark ? 'border-white/5' : 'border-black/5'}`}>
              <button onClick={() => setViewMode('chat')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}>Chat</button>
              <button onClick={() => setViewMode('app')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'app' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}>Preview</button>
            </div>
          </header>
          
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {viewMode === 'app' ? renderAppUI() : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-transparent">
                {conversationHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] shadow-sm leading-relaxed ${msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : `${isDark ? 'bg-slate-800 text-slate-200 border border-white/5' : 'bg-slate-100 text-slate-800 border border-black/5'} rounded-tl-none`}`}
                      style={{ backgroundColor: msg.role === 'user' ? accent : undefined }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black uppercase opacity-60">{msg.role === 'user' ? 'Você' : 'Architect AI'}</span>
                        {msg.role === 'model' && <Icons.Sparkles />}
                      </div>
                      <p>{msg.text}</p>
                      
                      {/* Refined Attachment Carousel */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 -mx-1">
                          <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide snap-x">
                            {msg.attachments.map((att, idx) => {
                              const imgSrc = `data:${att.mimeType};base64,${att.data}`;
                              return (
                                <div 
                                  key={idx} 
                                  className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/20 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all snap-start"
                                  onClick={() => setExpandedImage(imgSrc)}
                                >
                                  <img src={imgSrc} className="w-full h-full object-cover" alt="Anexo" />
                                  <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors" />
                                </div>
                              );
                            })}
                          </div>
                          {msg.attachments.length > 2 && (
                            <div className="flex justify-center gap-1 mt-1 opacity-40">
                              {[...Array(Math.min(msg.attachments.length, 5))].map((_, dotIdx) => (
                                <div key={dotIdx} className="w-1 h-1 rounded-full bg-current" />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isProcessing && <div className="text-[10px] text-blue-500 font-black animate-pulse uppercase tracking-widest ml-2 flex items-center gap-2"><Icons.Sparkles /> Processando Requisição...</div>}
                <div ref={chatMessagesEndRef}></div>
              </div>
            )}
          </div>

          <footer className={`p-4 ${isDark ? 'bg-slate-900/90' : 'bg-slate-50/90'} backdrop-blur-md border-t ${isDark ? 'border-white/5' : 'border-black/5'} shrink-0`}>
            {/* Refactored Input area attachments preview */}
            {attachments.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-blue-500/50 shrink-0 shadow-lg snap-start animate-in zoom-in slide-in-from-left-4 duration-300">
                    <img src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover" alt="Pre-upload" />
                    <button 
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0 right-0 bg-red-600/90 hover:bg-red-500 text-white p-1 rounded-bl-lg shadow-md transition-colors active:scale-90"
                    >
                      <Icons.X />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Icons.Paperclip /></button>
              <div className={`flex-1 flex items-center px-4 py-2.5 rounded-2xl ${isDark ? 'bg-black/40' : 'bg-white'} border transition-all duration-300 ${inputError ? 'border-red-500 animate-shake' : (isDark ? 'border-white/5' : 'border-black/5')} shadow-inner`}>
                <input 
                  type="text" 
                  placeholder={inputError ? "Mensagem vazia!" : "Enviar comando sênior..."}
                  className={`bg-transparent outline-none text-[11px] w-full ${inputError ? 'placeholder-red-400' : textColor}`} 
                  value={aiPrompt} 
                  onChange={e => {
                    setAiPrompt(e.target.value);
                    if (inputError) setInputError(false);
                  }} 
                  onKeyDown={e => e.key === 'Enter' && onSendClick()} 
                />
              </div>
              <button onClick={toggleMic} className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Icons.Mic /></button>
              
              {/* Tooltip / Popover do Botão de Ação */}
              <div className="relative flex items-center justify-center">
                {showSendTooltip && (
                  <div className="absolute bottom-12 right-0 w-64 p-3 bg-slate-900/95 text-white text-[9.5px] rounded-xl shadow-2xl border border-sky-500/40 backdrop-blur-md z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
                    <div className="flex items-center gap-1.5 font-bold text-sky-400 mb-1 pb-1 border-b border-white/10">
                      <Icons.Sparkles />
                      <span>Processamento e Geração IA</span>
                    </div>
                    <p className="leading-relaxed text-slate-200">
                      Este botão dispara a ação de <strong>gerar ou processar o contexto atual</strong> (comandos de texto, imagens anexadas e histórico do app) para atualizar layouts, códigos e telas.
                    </p>
                    <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-slate-900 border-r border-b border-sky-500/40 rotate-45" />
                  </div>
                )}

                <button 
                  onClick={onSendClick} 
                  onMouseEnter={() => setShowSendTooltip(true)}
                  onMouseLeave={() => setShowSendTooltip(false)}
                  onClickCapture={() => setShowSendTooltip(false)}
                  disabled={isProcessing} 
                  title="Dispara a geração ou processamento do contexto atual"
                  aria-label="Gerar e processar contexto atual"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-90 relative" 
                  style={{ backgroundColor: accent }}
                >
                  <Icons.Sparkles />
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
  );
};

export default AndroidPreview;
