import { GoogleGenAI } from "@google/genai";
import { AppConfig, GeneratedCode } from "../types";

export interface XmlDetectedElement {
  type: string;
  id?: string;
  text?: string;
  hint?: string;
  icon?: string;
  isHeader?: boolean;
  isButton?: boolean;
  isInput?: boolean;
  isList?: boolean;
}

export interface XmlLayoutAnalysis {
  hasHeader: boolean;
  hasList: boolean;
  hasInput: boolean;
  hasFab: boolean;
  hasButtons: boolean;
  primaryColor: string;
  themeMode: 'dark' | 'light';
  detectedElements: XmlDetectedElement[];
  detectedCategory: string;
}

export interface PlayStoreMockupItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  layoutPreset: 'home' | 'dark' | 'list' | 'search' | 'feature_banner';
  deviceFrame: 'pixel_dark' | 'pixel_light' | 'clay_minimal' | 'tablet';
  gradientBg: string;
  accentColor: string;
  screenBgColor: string;
  textColor: string;
}

export const MOCKUP_GRADIENTS = [
  { id: 'midnight', name: 'Midnight Violet', css: 'from-slate-950 via-indigo-950 to-purple-950', textHex: '#ffffff', accentHex: '#818cf8' },
  { id: 'emerald', name: 'Emerald Cyber', css: 'from-slate-950 via-emerald-950 to-teal-950', textHex: '#ffffff', accentHex: '#34d399' },
  { id: 'ocean', name: 'Deep Ocean', css: 'from-slate-950 via-blue-950 to-sky-950', textHex: '#ffffff', accentHex: '#38bdf8' },
  { id: 'sunset', name: 'Sunset Premium', css: 'from-slate-950 via-rose-950 to-amber-950', textHex: '#ffffff', accentHex: '#fb7185' },
  { id: 'clean_light', name: 'Clean Minimalist', css: 'from-slate-100 via-indigo-50 to-slate-200', textHex: '#0f172a', accentHex: '#4f46e5' },
];

/**
 * Analisa o arquivo XML de layout (ex: activity_main.xml) e detecta a estrutura visual
 */
export function analyzeXmlLayout(xmlString: string, config: AppConfig): XmlLayoutAnalysis {
  const elements: XmlDetectedElement[] = [];

  const hasHeader = xmlString.includes('headerBg') || xmlString.includes('Toolbar') || xmlString.includes('txtAppName');
  const hasList = xmlString.includes('RecyclerView') || xmlString.includes('ListView') || xmlString.includes('ScrollView');
  const hasInput = xmlString.includes('EditText') || xmlString.includes('TextInputLayout');
  const hasFab = xmlString.includes('FloatingActionButton') || xmlString.includes('Fab');
  const hasButtons = xmlString.includes('MaterialButton') || xmlString.includes('Button');

  const isDark = config.theme === 'dark' || xmlString.includes('dark_bg');

  if (hasHeader) {
    elements.push({ type: 'Header', text: config.appName, isHeader: true });
  }

  if (hasList) {
    elements.push({ type: 'RecyclerView', isList: true });
  }

  if (hasInput) {
    elements.push({ type: 'EditText', hint: 'Sua mensagem ou pesquisa...', isInput: true });
  }

  if (hasFab) {
    elements.push({ type: 'FloatingActionButton', icon: 'send', isButton: true });
  }

  // Categoria estimada
  let category = 'Geral / Produtividade';
  const nameLower = (config.appName + ' ' + (config.appDescription || '')).toLowerCase();
  if (nameLower.includes('chat') || nameLower.includes('mensagem') || nameLower.includes('social')) {
    category = 'Comunicação & Chat';
  } else if (nameLower.includes('finan') || nameLower.includes('banco') || nameLower.includes('money')) {
    category = 'Finanças & Gestão';
  } else if (nameLower.includes('fit') || nameLower.includes('saude') || nameLower.includes('treino')) {
    category = 'Saúde & Fitness';
  } else if (nameLower.includes('loja') || nameLower.includes('shop') || nameLower.includes('e-commerce')) {
    category = 'Compras & E-Commerce';
  }

  return {
    hasHeader,
    hasList,
    hasInput,
    hasFab,
    hasButtons,
    primaryColor: isDark ? '#6366f1' : '#4f46e5',
    themeMode: isDark ? 'dark' : 'light',
    detectedElements: elements,
    detectedCategory: category
  };
}

/**
 * Gera os mockups iniciais baseados no config e layout XML
 */
export function generateInitialMockups(config: AppConfig, xmlAnalysis: XmlLayoutAnalysis): PlayStoreMockupItem[] {
  return [
    {
      id: 'mockup-1',
      title: `Conheça o ${config.appName}`,
      subtitle: config.appDescription || 'A melhor experiência mobile direto na Play Store.',
      badge: 'DESTAQUE PLAY STORE',
      layoutPreset: 'home',
      deviceFrame: 'pixel_dark',
      gradientBg: 'from-slate-950 via-indigo-950 to-slate-900',
      accentColor: '#6366f1',
      screenBgColor: xmlAnalysis.themeMode === 'dark' ? '#0f172a' : '#f8fafc',
      textColor: '#ffffff'
    },
    {
      id: 'mockup-2',
      title: 'Interface Moderna & Responsiva',
      subtitle: 'Design anatômico otimizado para navegação fluida em qualquer tela.',
      badge: 'MODO ESCURO',
      layoutPreset: 'dark',
      deviceFrame: 'pixel_dark',
      gradientBg: 'from-slate-950 via-slate-900 to-indigo-950',
      accentColor: '#38bdf8',
      screenBgColor: '#090d16',
      textColor: '#ffffff'
    },
    {
      id: 'mockup-3',
      title: 'Fluxo Inteligente de Tarefas',
      subtitle: 'Organização em tempo real com respostas instantâneas e seguras.',
      badge: 'ALTA PERFORMANCE',
      layoutPreset: 'list',
      deviceFrame: 'clay_minimal',
      gradientBg: 'from-slate-950 via-purple-950 to-slate-950',
      accentColor: '#c084fc',
      screenBgColor: xmlAnalysis.themeMode === 'dark' ? '#0f172a' : '#ffffff',
      textColor: '#ffffff'
    },
    {
      id: 'mockup-4',
      title: 'Recursos Avançados & Busca',
      subtitle: 'Acesse menus e dados em milissegundos com máxima proteção.',
      badge: 'TELA COMPLETA',
      layoutPreset: 'search',
      deviceFrame: 'pixel_light',
      gradientBg: 'from-slate-950 via-emerald-950 to-slate-950',
      accentColor: '#34d399',
      screenBgColor: '#022c22',
      textColor: '#ffffff'
    },
    {
      id: 'mockup-5',
      title: `${config.appName} • Banner Promocional`,
      subtitle: 'Disponível gratuitamente para Android na Google Play Store.',
      badge: 'BANNER 1024x500',
      layoutPreset: 'feature_banner',
      deviceFrame: 'tablet',
      gradientBg: 'from-indigo-950 via-slate-900 to-purple-950',
      accentColor: '#a855f7',
      screenBgColor: '#0f172a',
      textColor: '#ffffff'
    }
  ];
}

/**
 * Utiliza IA Gemini para gerar Headlines e Copys de Marketing inteligentes para os Screenshots da Play Store
 */
export async function generateAiMarketingMockups(
  config: AppConfig,
  xmlAnalysis: XmlLayoutAnalysis,
  modelName: string = 'gemini-3.6-flash'
): Promise<PlayStoreMockupItem[]> {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return generateInitialMockups(config, xmlAnalysis);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `Você é um especialista em Marketing da Google Play Store (ASO - App Store Optimization).
Crie 5 títulos chamativos e subtítulos de alta conversão para os Screenshots e Banner Feature da Play Store do aplicativo abaixo.

Informações do App:
- Nome do App: "${config.appName}"
- Descrição/Proposta: "${config.appDescription || 'Aplicativo Android de alta qualidade'}"
- Categoria do Layout XML Detectada: "${xmlAnalysis.detectedCategory}"
- Componentes XML Detectados: ${xmlAnalysis.hasHeader ? 'Header/Toolbar, ' : ''}${xmlAnalysis.hasList ? 'Lista/Recycler, ' : ''}${xmlAnalysis.hasInput ? 'Entrada/Chat, ' : ''}${xmlAnalysis.hasFab ? 'Botão Flutuante' : ''}

Forneça um JSON VÁLIDO com um array com exatamente 5 itens na seguinte estrutura:
[
  {
    "id": "mockup-1",
    "title": "Título Principal Chamativo (max 35 caracteres)",
    "subtitle": "Subtítulo explicando o benefício para o usuário (max 65 caracteres)",
    "badge": "TAG DE Destaque (ex: NOVIDADE, MODO ESCURO, IA INTEGRADA)",
    "layoutPreset": "home" | "dark" | "list" | "search" | "feature_banner",
    "deviceFrame": "pixel_dark" | "pixel_light" | "clay_minimal" | "tablet",
    "gradientBg": "from-slate-950 via-indigo-950 to-slate-900",
    "accentColor": "#6366f1",
    "screenBgColor": "#0f172a",
    "textColor": "#ffffff"
  }
]`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text || '';
    const parsed = JSON.parse(jsonText);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        id: `mockup-${index + 1}`,
        title: item.title || `Mockup ${index + 1}`,
        subtitle: item.subtitle || 'Recurso incrível do aplicativo.',
        badge: item.badge || 'GOOGLE PLAY',
        layoutPreset: item.layoutPreset || 'home',
        deviceFrame: item.deviceFrame || 'pixel_dark',
        gradientBg: item.gradientBg || 'from-slate-950 via-indigo-950 to-slate-900',
        accentColor: item.accentColor || '#6366f1',
        screenBgColor: item.screenBgColor || '#0f172a',
        textColor: item.textColor || '#ffffff'
      }));
    }

    return generateInitialMockups(config, xmlAnalysis);
  } catch (err) {
    console.warn("Falha na geração de copys com IA, utilizando mockups padrão:", err);
    return generateInitialMockups(config, xmlAnalysis);
  }
}
