import { GoogleGenAI } from "@google/genai";
import { AppAsset } from "../types";

export interface PlaceholderSpec {
  fileName: string;
  category: 'lesson_icon' | 'course_bg' | 'user_avatar' | 'banner' | 'category_thumb';
  title: string;
  prompt: string;
  width: number;
  height: number;
  gradientColors: [string, string];
  symbol: string;
}

/**
 * Gera um conjunto de especificações de placeholders baseadas na finalidade e contexto do app.
 */
export function buildPlaceholderSpecsForApp(appName: string, appDescription?: string): PlaceholderSpec[] {
  const nameLower = appName.toLowerCase();
  const descLower = (appDescription || '').toLowerCase();

  const isEduOrLang = nameLower.includes('koine') || nameLower.includes('duolingo') || nameLower.includes('grego') || nameLower.includes('lingua') || descLower.includes('curso') || descLower.includes('aula') || descLower.includes('grego') || descLower.includes('aprender');
  const isFinance = nameLower.includes('bank') || nameLower.includes('finance') || nameLower.includes('pay') || nameLower.includes('conta') || descLower.includes('dinheiro') || descLower.includes('carteira');

  if (isEduOrLang) {
    return [
      {
        fileName: 'lesson_icon_alphabet.png',
        category: 'lesson_icon',
        title: 'Lição Alfabeto Koiné',
        prompt: `App lesson icon for learning Ancient Greek Koine alphabet, vibrant 3D medal style badge with Greek letters 'A Ω', clean modern vector layout, 1:1 ratio.`,
        width: 512,
        height: 512,
        gradientColors: ['#2563EB', '#1D4ED8'],
        symbol: 'α β γ'
      },
      {
        fileName: 'course_header_athens.png',
        category: 'course_bg',
        title: 'Capa do Curso Grego Bíblico',
        prompt: `Panoramic course background banner illustration for Greek language learning app, ancient Parthenon ruins at sunset with soft glowing golden light, minimalist modern flat art style, 16:9 ratio.`,
        width: 1024,
        height: 576,
        gradientColors: ['#0F172A', '#1E3A8A'],
        symbol: '🏛️'
      },
      {
        fileName: 'user_avatar_greek_scholar.png',
        category: 'user_avatar',
        title: 'Avatar Estudante Koiné',
        prompt: `Friendly 3D avatar icon of a young student wearing a laurel wreath and holding an ancient scroll, cute stylized game character profile picture, 1:1 ratio.`,
        width: 512,
        height: 512,
        gradientColors: ['#7C3AED', '#5B21B6'],
        symbol: '🎓'
      },
      {
        fileName: 'banner_streak_flame.png',
        category: 'banner',
        title: 'Banner Ofensiva (Streak)',
        prompt: `App reward banner badge for 7-day study streak, glowing golden flame fire icon with stars and shiny shield, dark futuristic UI widget graphic, 16:9 ratio.`,
        width: 1024,
        height: 576,
        gradientColors: ['#D97706', '#B45309'],
        symbol: '🔥'
      },
      {
        fileName: 'category_vocab_flashcards.png',
        category: 'category_thumb',
        title: 'Categoria Vocabulário NT',
        prompt: `UI thumbnail card graphic for vocabulary dictionary flashcards, open ancient book with glowing floating Greek words, elegant dark blue gradient background.`,
        width: 512,
        height: 512,
        gradientColors: ['#059669', '#047857'],
        symbol: '📖'
      }
    ];
  }

  if (isFinance) {
    return [
      {
        fileName: 'card_visa_platinum_bg.png',
        category: 'course_bg',
        title: 'Cartão de Crédito Digital',
        prompt: `Futuristic dark metallic credit card texture graphic with glowing neon blue geometric mesh circuits and hologram logo, premium financial background, 16:9 ratio.`,
        width: 1024,
        height: 576,
        gradientColors: ['#1E293B', '#0F172A'],
        symbol: '💳'
      },
      {
        fileName: 'chart_investment_thumb.png',
        category: 'banner',
        title: 'Banner Gráfico de Investimentos',
        prompt: `Financial analytics dashboard banner showing upward green stock market growth trendline with glowing 3D bars and coin icons, dark background, 16:9 ratio.`,
        width: 1024,
        height: 576,
        gradientColors: ['#065F46', '#047857'],
        symbol: '📈'
      },
      {
        fileName: 'avatar_vip_client.png',
        category: 'user_avatar',
        title: 'Avatar do Usuário VIP',
        prompt: `Minimalist 3D avatar profile portrait of a confident professional with gold badge accent, sleek luxury app style, 1:1 ratio.`,
        width: 512,
        height: 512,
        gradientColors: ['#3B82F6', '#1D4ED8'],
        symbol: '👤'
      },
      {
        fileName: 'category_wallet_savings.png',
        category: 'category_thumb',
        title: 'Ícone Categoria Economia',
        prompt: `App category icon for savings piggy bank with golden coins and green target shield, 3D glossy render icon, 1:1 ratio.`,
        width: 512,
        height: 512,
        gradientColors: ['#10B981', '#059669'],
        symbol: '💰'
      }
    ];
  }

  // Generico para qualquer app
  return [
    {
      fileName: 'hero_banner_welcome.png',
      category: 'banner',
      title: 'Banner de Boas-Vindas',
      prompt: `App welcome hero banner background for mobile app "${appName}", modern abstract fluid gradient shapes with soft light mesh glow, high resolution 16:9 wallpaper design.`,
      width: 1024,
      height: 576,
      gradientColors: ['#3B82F6', '#8B5CF6'],
      symbol: '✨'
    },
    {
      fileName: 'feature_card_analytics.png',
      category: 'category_thumb',
      title: 'Thumbnail Recurso Principal',
      prompt: `Mobile UI feature card thumbnail image showing sleek 3D dashboard widgets and glassmorphism elements, vibrant gradient background, 1:1 square.`,
      width: 512,
      height: 512,
      gradientColors: ['#0EA5E9', '#0284C7'],
      symbol: '🚀'
    },
    {
      fileName: 'user_avatar_default.png',
      category: 'user_avatar',
      title: 'Avatar Padrão do Usuário',
      prompt: `3D stylized character profile picture avatar, modern app icon design with colorful soft lighting, 1:1 ratio.`,
      width: 512,
      height: 512,
      gradientColors: ['#6366F1', '#4F46E5'],
      symbol: '👤'
    },
    {
      fileName: 'badge_achievement.png',
      category: 'lesson_icon',
      title: 'Badge de Conquista',
      prompt: `App achievement trophy badge icon with shiny gold star, glossy 3D render game style reward icon, 1:1 ratio.`,
      width: 512,
      height: 512,
      gradientColors: ['#F59E0B', '#D97706'],
      symbol: '🏆'
    }
  ];
}

/**
 * Gera um placeholder visual estilizado em Canvas caso a API de imagem não esteja disponível
 */
function renderCanvasPlaceholder(spec: PlaceholderSpec, appName: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, spec.width, spec.height);
  grad.addColorStop(0, spec.gradientColors[0]);
  grad.addColorStop(1, spec.gradientColors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, spec.width, spec.height);

  // Grid / Mesh Pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  const step = 40;
  for (let x = 0; x < spec.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, spec.height);
    ctx.stroke();
  }
  for (let y = 0; y < spec.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(spec.width, y);
    ctx.stroke();
  }

  // Symbol / Icon Center
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const symbolSize = Math.min(spec.width, spec.height) * 0.35;
  ctx.font = `${symbolSize}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 20;
  ctx.fillText(spec.symbol, spec.width / 2, spec.height / 2 - 20);

  // Label Title
  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.min(spec.width, spec.height) * 0.06}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(spec.title.toUpperCase(), spec.width / 2, spec.height - 40);

  // App Name Tag
  ctx.font = `500 ${Math.min(spec.width, spec.height) * 0.04}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(appName, spec.width / 2, spec.height - 18);

  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.split(',')[1];
}

/**
 * Função principal que gera automaticamente as imagens de placeholder de tela com IA (ou fallback)
 * e retorna como array de AppAsset.
 */
export async function generateScreenPlaceholderImages(
  appName: string,
  appDescription?: string,
  onProgress?: (message: string) => void
): Promise<AppAsset[]> {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const specs = buildPlaceholderSpecsForApp(appName, appDescription);
  const generatedAssets: AppAsset[] = [];

  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    onProgress?.(`🖼️ Gerando asset ${i + 1}/${specs.length}: "${spec.title}"...`);

    let base64Data = '';

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: spec.prompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: spec.width > spec.height ? "16:9" : "1:1"
            }
          }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              base64Data = part.inlineData.data;
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`Erro ao gerar ${spec.fileName} via Gemini, usando fallback de renderização...`, err);
      }
    }

    // Fallback Canvas se não obteve da IA
    if (!base64Data) {
      base64Data = renderCanvasPlaceholder(spec, appName);
    }

    if (base64Data) {
      generatedAssets.push({
        name: spec.fileName,
        data: base64Data,
        mimeType: 'image/png'
      });
    }
  }

  return generatedAssets;
}
