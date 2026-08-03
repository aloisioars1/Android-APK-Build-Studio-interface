import { GoogleGenAI } from "@google/genai";
import { GeneratedCode } from "../types";

export interface ChangelogOptions {
  appName: string;
  versionName: string;
  versionCode: number;
  platform: 'android' | 'ios';
  track: string;
  appDescription?: string;
  generatedCode?: GeneratedCode | null;
  customPrompt?: string;
  tone?: 'professional' | 'marketing' | 'technical' | 'fun';
  language?: 'pt-BR' | 'en-US' | 'es-ES';
}

export interface GeneratedChangelogResult {
  shortReleaseNotes: string; // Até 500 caracteres, para a Play Store whatsnew-pt-BR.txt
  markdownChangelog: string; // Formato completo Markdown para GitHub/Documentação
  fastlaneFormatted: string; // Formato sem marcações complexas para Fastlane/Play Console API
  highlights: string[]; // Tópicos principais
  rawText: string;
}

/**
 * Fallback inteligente para gerar Release Notes quando a API Key não está presente ou offline
 */
function generateFallbackChangelog(options: ChangelogOptions): GeneratedChangelogResult {
  const { appName, versionName, versionCode, track, tone = 'professional', customPrompt } = options;

  let emoji = '🚀';
  if (tone === 'marketing') emoji = '✨';
  if (tone === 'technical') emoji = '⚡';
  if (tone === 'fun') emoji = '🎉';

  const userNotes = customPrompt ? `• ${customPrompt.replace(/\n/g, '\n• ')}` : '';

  const shortReleaseNotes = [
    `${emoji} O que há de novo na versão ${versionName} (Build ${versionCode}):`,
    userNotes || `• Otimizações de desempenho e melhorias de estabilidade no ${appName}.`,
    `• Correções de bugs e aprimoramentos no suporte Android/Play Store.`,
    `• Atualização de segurança e suporte para a faixa [${track.toUpperCase()}].`
  ].filter(Boolean).join('\n').slice(0, 500);

  const markdownChangelog = `## ${emoji} Release Notes - v${versionName} (${versionCode}) - ${appName}

**Data:** ${new Date().toLocaleDateString('pt-BR')}  
**Faixa de Distribuição:** \`${track.toUpperCase()}\`  
**Plataforma:** ${options.platform === 'android' ? 'Android (AAB/APK)' : 'iOS (IPA)'}  

### 🚀 Destaques da Atualização
${userNotes || `- **Desempenho:** Melhorias no tempo de inicialização e responsividade da interface.`}
- **Estabilidade:** Resolução de eventuais problemas e aumento na taxa de sessões sem crash.
- **Compilação:** Atualização e alinhamento de dependências no Gradle/Android Publisher API.

### 📝 Notas do Desenvolvedor
Compilação gerada via **Heavy Studio Pro**. Pronta para distribuição no Google Play Console.
`;

  const fastlaneFormatted = `${emoji} Novidades v${versionName}:\n${userNotes || '• Otimizações e melhorias de desempenho.'}\n• Correções gerais de bugs.`;

  return {
    shortReleaseNotes,
    markdownChangelog,
    fastlaneFormatted,
    highlights: [
      `Melhorias de desempenho no ${appName}`,
      `Otimização para Android / Play Store`,
      `Estabilidade aprimorada na versão v${versionName}`
    ],
    rawText: shortReleaseNotes
  };
}

/**
 * Gera automaticamente notas de versão (Changelog) usando a API do Gemini
 */
export async function generateAiChangelog(
  options: ChangelogOptions,
  onLog?: (msg: string, type?: string) => void
): Promise<GeneratedChangelogResult> {
  
const apiKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') 
: null) || (process as any).env?.API_KEY || (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || (options as any).apiKey || '';

  onLog?.(`🤖 [IA Changelog] Analisando metadados e histórico da versão v${options.versionName}...`, "info");

  if (!apiKey) {
    onLog?.(`⚠️ Chave Gemini API não detectada no ambiente. Utilizando gerador estruturado inteligente.`, "warning");
    return generateFallbackChangelog(options);
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

    const langName = options.language === 'en-US' ? 'Inglês' : options.language === 'es-ES' ? 'Espanhol' : 'Português do Brasil (pt-BR)';

    const contextParts = [
      `Nome do App: ${options.AppName || options.appName}`,
      `Versão: ${options.versionName} (versionCode: ${options.versionCode})`,
      `Faixa da Play Store: ${options.track}`,
      `Plataforma: ${options.platform}`,
      options.appDescription ? `Descrição do App: ${options.appDescription}` : '',
      options.customPrompt ? `Observações/Instruções do Desenvolvedor: ${options.customPrompt}` : '',
      options.generatedCode?.buildGradle ? `Arquivo build.gradle detectado com dependências atualizadas.` : '',
      options.generatedCode?.manifestXml ? `AndroidManifest.xml validado com permissões de aplicativo.` : ''
    ].filter(Boolean).join('\n');

    const prompt = `Você é um especialista em publicação de aplicativos no Google Play Console.
Gere notas de versão (Release Notes / Changelog) profissionais para o aplicativo com os seguintes detalhes:

${contextParts}

Tom desejado: ${options.tone || 'professional'}.
Idioma principal: ${langName}.

IMPORTANTE: Forneça a resposta em formato JSON VÁLIDO com as seguintes chaves exatas:
1. "shortReleaseNotes": Texto conciso para o campo 'O que há de novo' no Google Play Console (MÁXIMO 480 caracteres, use pontores com emojis ou hífens).
2. "markdownChangelog": Changelog detalhado em Markdown formatado com títulos, categorias (Novidades, Correções, Desempenho) e bullets.
3. "fastlaneFormatted": Texto limpo para arquivo whatsnew-pt-BR.txt do Fastlane/Play Store (sem markdown pesado, máximo 400 caracteres).
4. "highlights": Um array de 3 a 5 strings com os principais tópicos da versão.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawText = response.text || '';
    onLog?.(`✨ [IA Changelog] Notas da versão geradas com sucesso via Gemini 3.6 Flash!`, "success");

    try {
      const parsed = JSON.parse(rawText);
      return {
        shortReleaseNotes: (parsed.shortReleaseNotes || '').slice(0, 500),
        markdownChangelog: parsed.markdownChangelog || parsed.shortReleaseNotes,
        fastlaneFormatted: (parsed.fastlaneFormatted || parsed.shortReleaseNotes).slice(0, 500),
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [`Lançamento v${options.versionName}`],
        rawText
      };
    } catch {
      // Se a resposta JSON não puder ser parseada diretamente
      return {
        shortReleaseNotes: rawText.slice(0, 500),
        markdownChangelog: rawText,
        fastlaneFormatted: rawText.slice(0, 500),
        highlights: [`Atualização v${options.versionName}`],
        rawText
      };
    }
  } catch (err: any) {
    onLog?.(`⚠️ Falha ao chamar a API do Gemini (${err.message}). Utilizando gerador de contingência.`, "warning");
    return generateFallbackChangelog(options);
  }
}
