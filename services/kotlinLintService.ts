import { GoogleGenAI } from "@google/genai";
import { AppConfig, GeneratedCode } from "../types";

export interface KotlinLintIssue {
  id: string;
  ruleId: string; // E.g., 'AndroidLintMemoryLeak', 'HardcodedString', 'NullSafetyViolation'
  title: string;
  category: 'performance' | 'security' | 'best_practice' | 'memory' | 'coroutines';
  severity: 'error' | 'warning' | 'info';
  lineNumber?: number;
  originalSnippet: string;
  fixedSnippet: string;
  explanation: string;
  androidStudioTip: string;
}

export interface KotlinLintResult {
  score: number; // 0 a 100
  summary: string;
  issues: KotlinLintIssue[];
  refactoredCode: string;
  metrics: {
    errorsCount: number;
    warningsCount: number;
    performanceCount: number;
    securityCount: number;
  };
}

/**
 * Análise estática local (heurística) para código Kotlin
 */
export function analyzeKotlinLocally(kotlinCode: string, config: AppConfig): KotlinLintResult {
  const issues: KotlinLintIssue[] = [];

  // 1. Checagem de operador de asserção nula `!!`
  if (kotlinCode.includes('!!')) {
    issues.push({
      id: 'null_safety_bangbang',
      ruleId: 'KotlinNullSafetyViolation',
      title: 'Uso arriscado do operador Null-Safety (!!)',
      category: 'best_practice',
      severity: 'warning',
      originalSnippet: 'var.method()!!',
      fixedSnippet: 'var?.method() ?: default',
      explanation: 'O operador `!!` força o acesso a um objeto nulo, podendo causar NullPointerException em tempo de execução no Android.',
      androidStudioTip: 'Substitua por safe calls (`?.`), smart-casts ou operador Elvis (`?:`).'
    });
  }

  // 2. Checagem de findViewById em vez de ViewBinding ou Jetpack Compose
  if (kotlinCode.includes('findViewById')) {
    issues.push({
      id: 'view_binding_recommendation',
      ruleId: 'AndroidLintUseViewBinding',
      title: 'Uso de findViewById() em vez de ViewBinding',
      category: 'performance',
      severity: 'info',
      originalSnippet: 'val button = findViewById<Button>(R.id.btnSend)',
      fixedSnippet: 'binding.btnSend.setOnClickListener { ... }',
      explanation: 'Chamadas diretas a `findViewById` realizam travessia na árvore de views repetidamente, reduzindo a performance e sem segurança de tipos.',
      androidStudioTip: 'Habilite `viewBinding { enabled = true }` no build.gradle para acoplamento direto de layouts.'
    });
  }

  // 3. Checagem de CoroutineScope global sem cancelamento ou sem handler
  if (kotlinCode.includes('GlobalScope.launch') || (kotlinCode.includes('CoroutineScope') && !kotlinCode.includes('lifecycleScope'))) {
    issues.push({
      id: 'coroutine_scope_leak',
      ruleId: 'AndroidLintCoroutineScopeLeak',
      title: 'Possível vazamento de escopo em Corrotina (GlobalScope)',
      category: 'coroutines',
      severity: 'error',
      originalSnippet: 'GlobalScope.launch { ... }',
      fixedSnippet: 'lifecycleScope.launch { ... }',
      explanation: 'O uso de `GlobalScope` pode sobreviver à destruição da Activity/Fragment, consumindo CPU e memória em segundo plano.',
      androidStudioTip: 'Utilize `lifecycleScope` ou `viewModelScope` acoplados ao ciclo de vida AndroidX.'
    });
  }

  // 4. Checagem de Log.d sem verificação de BuildConfig.DEBUG
  if (kotlinCode.includes('Log.d(') || kotlinCode.includes('println(')) {
    issues.push({
      id: 'logging_production_risk',
      ruleId: 'AndroidLintProductionLogging',
      title: 'Logs de depuração ativos em produção',
      category: 'security',
      severity: 'info',
      originalSnippet: 'Log.d("DEBUG", "message")',
      fixedSnippet: 'if (BuildConfig.DEBUG) Log.d("DEBUG", "message")',
      explanation: 'Logs expostos em compilações Release podem vazar informações de depuração e chaves de API no Logcat do dispositivo.',
      androidStudioTip: 'Envolva logs em `if (BuildConfig.DEBUG)` ou utilize o Timber para remoção automática em release.'
    });
  }

  // 5. Checagem de Context em propriedade estática ou Companion Object
  if (kotlinCode.includes('companion object') && (kotlinCode.includes('var context:') || kotlinCode.includes('var activity:'))) {
    issues.push({
      id: 'static_context_leak',
      ruleId: 'AndroidLintStaticFieldLeak',
      title: 'Risco de Memory Leak em Companion Object',
      category: 'memory',
      severity: 'error',
      originalSnippet: 'companion object { var context: Context? = null }',
      fixedSnippet: 'Use ApplicationContext via Injeção de Dependência (Hilt/Koin)',
      explanation: 'Manter referências estáticas a `Context` de Activity impede o Garbage Collector de liberar a tela, causando vazamento massivo de memória.',
      androidStudioTip: 'Nunca armazene instâncias de Activity ou Context em objetos estáticos/companion.'
    });
  }

  // Calculate score
  let errorCount = issues.filter(i => i.severity === 'error').length;
  let warnCount = issues.filter(i => i.severity === 'warning').length;
  let score = Math.max(20, 100 - (errorCount * 25) - (warnCount * 10));

  return {
    score,
    summary: `Análise estática concluída: ${issues.length} observações de código Kotlin identificadas.`,
    issues,
    refactoredCode: kotlinCode,
    metrics: {
      errorsCount: errorCount,
      warningsCount: warnCount,
      performanceCount: issues.filter(i => i.category === 'performance').length,
      securityCount: issues.filter(i => i.category === 'security').length
    }
  };
}

/**
 * Roda o Lint Kotlin Estático completo via IA Gemini 3.6 Flash
 */
export async function runAiKotlinLint(
  kotlinCode: string,
  config: AppConfig,
  modelName: string = 'gemini-3.6-flash'
): Promise<KotlinLintResult> {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return analyzeKotlinLocally(kotlinCode, config);
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

    const prompt = `Você é um especialista em Android Studio, Kotlin estrito, Jetpack Compose e otimização de performance Android.
Execute um 'Lint Estático' detalhado no seguinte código Kotlin e forneça sugestões de correções de boas práticas do Android Studio.

Código Kotlin a analisar:
\`\`\`kotlin
${kotlinCode}
\`\`\`

Configurações do App:
- Nome: ${config.appName}
- Pacote: ${config.packageName}
- Versão: ${config.versionName}

Retorne um JSON VÁLIDO com a seguinte estrutura exata:
{
  "score": 85, // Pontuação de 0 a 100 baseada em qualidade de código
  "summary": "Resumo executivo do estado do código Kotlin e principais pontos de melhoria.",
  "issues": [
    {
      "id": "identificador_unico",
      "ruleId": "NomeDaRegraDoAndroidStudio",
      "title": "Título conciso da observação",
      "category": "performance" | "security" | "best_practice" | "memory" | "coroutines",
      "severity": "error" | "warning" | "info",
      "lineNumber": 24,
      "originalSnippet": "trecho do código original",
      "fixedSnippet": "trecho corrigido",
      "explanation": "Explicação técnica detalhada",
      "androidStudioTip": "Dica de boas práticas do Android Studio/Jetpack"
    }
  ],
  "refactoredCode": "Código Kotlin totalmente refatorado e limpo contendo todas as correções aplicadas."
}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text || '';
    const parsed = JSON.parse(jsonText);

    const issues: KotlinLintIssue[] = Array.isArray(parsed.issues) ? parsed.issues : [];
    const errorsCount = issues.filter(i => i.severity === 'error').length;
    const warningsCount = issues.filter(i => i.severity === 'warning').length;

    return {
      score: typeof parsed.score === 'number' ? parsed.score : 85,
      summary: parsed.summary || 'Análise de código Kotlin concluída.',
      issues,
      refactoredCode: parsed.refactoredCode || kotlinCode,
      metrics: {
        errorsCount,
        warningsCount,
        performanceCount: issues.filter(i => i.category === 'performance').length,
        securityCount: issues.filter(i => i.category === 'security').length
      }
    };
  } catch (err: any) {
    console.warn("Falha no Kotlin Lint com IA, usando análise local:", err);
    return analyzeKotlinLocally(kotlinCode, config);
  }
}
