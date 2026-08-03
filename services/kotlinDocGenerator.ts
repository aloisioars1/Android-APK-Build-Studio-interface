import { AppConfig, GeneratedCode } from '../types';

export interface AnalyzedClass {
  name: string;
  type: 'class' | 'data class' | 'object' | 'interface' | 'activity';
  superTypes: string[];
  annotations: string[];
  properties: Array<{ name: string; type: string; isPrivate: boolean; initialValue?: string }>;
  methods: Array<{
    name: string;
    visibility: 'public' | 'private' | 'protected';
    isOverride: boolean;
    isSuspend: boolean;
    isComposable: boolean;
    parameters: Array<{ name: string; type: string }>;
    returnType: string;
    description: string;
  }>;
}

/**
 * Analisa o código fonte Kotlin e gera uma documentação em Markdown detalhada
 */
export function generateKotlinDocumentation(
  kotlinCode: string,
  config: AppConfig,
  generated?: GeneratedCode | null
): string {
  const appName = config.appName || 'Aplicativo Android';
  const packageName = config.packageName || 'com.example.app';
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // 1. Extração de Pacotes e Importações
  const packageMatch = kotlinCode.match(/package\s+([a-zA-Z0-9_.]+)/);
  const detectedPackage = packageMatch ? packageMatch[1] : packageName;

  const importMatches = Array.from(kotlinCode.matchAll(/import\s+([a-zA-Z0-9_.*]+)/g));
  const importsList = Array.from(new Set(importMatches.map(m => m[1]))).sort();

  // Categorizar Importações
  const androidxImports = importsList.filter(i => i.startsWith('androidx.') || i.startsWith('android.'));
  const googleImports = importsList.filter(i => i.startsWith('com.google.') || i.startsWith('com.google.genai'));
  const kotlinImports = importsList.filter(i => i.startsWith('kotlin.') || i.startsWith('kotlinx.'));
  const otherImports = importsList.filter(i => !i.startsWith('androidx.') && !i.startsWith('android.') && !i.startsWith('com.google.') && !i.startsWith('kotlin.'));

  // 2. Análise da Classe Principal
  const classes: AnalyzedClass[] = [];

  // Match class declaration
  const classRegex = /(?:(@\w+(?:\([^)]*\))?\s+)*)(class|data class|object|interface)\s+(\w+)(?:\s*:\s*([^{\n]+))?/g;
  let classMatch;

  while ((classMatch = classRegex.exec(kotlinCode)) !== null) {
    const rawAnnotations = classMatch[1] ? classMatch[1].trim().split(/\s+/) : [];
    const classKind = classMatch[2] as AnalyzedClass['type'];
    const className = classMatch[3];
    const superTypesRaw = classMatch[4] ? classMatch[4].trim().split(/,\s*/) : [];

    const properties: AnalyzedClass['properties'] = [];
    const methods: AnalyzedClass['methods'] = [];

    classes.push({
      name: className,
      type: superTypesRaw.some(s => s.includes('Activity')) ? 'activity' : classKind,
      superTypes: superTypesRaw,
      annotations: rawAnnotations,
      properties,
      methods
    });
  }

  // Se nenhuma classe for detectada por regex estrito, criar classe padrão para a Activity
  if (classes.length === 0) {
    classes.push({
      name: 'MainActivity',
      type: 'activity',
      superTypes: ['AppCompatActivity()'],
      annotations: ['@AndroidEntryPoint'],
      properties: [],
      methods: []
    });
  }

  const primaryClass = classes[0];

  // 3. Análise de Propriedades e Variáveis
  const propRegex = /(private|public|protected)?\s*(lateinit\s+)?(val|var)\s+(\w+)\s*:\s*([^=\n;{\s]+)(?:\s*=\s*([^\n;]+))?/g;
  let propMatch;
  while ((propMatch = propRegex.exec(kotlinCode)) !== null) {
    const visibility = propMatch[1] || 'public';
    const propName = propMatch[4];
    const propType = propMatch[5].trim();
    const initVal = propMatch[6] ? propMatch[6].trim() : undefined;

    primaryClass.properties.push({
      name: propName,
      type: propType,
      isPrivate: visibility === 'private',
      initialValue: initVal
    });
  }

  // 4. Análise de Métodos e Funções
  const funcRegex = /(?:(@\w+(?:\([^)]*\))?\s+)*)(override\s+|private\s+|protected\s+|public\s+|suspend\s+|inline\s+)*fun\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{\n]+))?/g;
  let funcMatch;

  while ((funcMatch = funcRegex.exec(kotlinCode)) !== null) {
    const annotationsRaw = funcMatch[1] || '';
    const modifiersRaw = funcMatch[2] || '';
    const funcName = funcMatch[3];
    const paramsRaw = funcMatch[4] || '';
    const returnTypeRaw = funcMatch[5] ? funcMatch[5].trim() : 'Unit';

    const isOverride = modifiersRaw.includes('override');
    const isPrivate = modifiersRaw.includes('private');
    const isSuspend = modifiersRaw.includes('suspend');
    const isComposable = annotationsRaw.includes('@Composable');

    // Parse parameters
    const parameters: Array<{ name: string; type: string }> = [];
    if (paramsRaw.trim()) {
      const pTokens = paramsRaw.split(',');
      pTokens.forEach(p => {
        const [pName, pType] = p.split(':');
        if (pName && pType) {
          parameters.push({ name: pName.trim(), type: pType.trim() });
        } else if (pName) {
          parameters.push({ name: pName.trim(), type: 'Any' });
        }
      });
    }

    // Descrição automática baseada na intenção funcional do método
    let description = 'Método auxiliar de lógica de negócios e estado da aplicação.';
    if (funcName === 'onCreate') {
      description = 'Callback do ciclo de vida Android. Inicializa a Activity, infla o layout XML (\`activity_main.xml\`), ligações de visualização (View Binding/FindView) e configura ouvintes de eventos.';
    } else if (funcName === 'onResume') {
      description = 'Callback do ciclo de vida que restaura ouvintes e atualiza elementos gráficos visíveis ao usuário.';
    } else if (funcName === 'onDestroy') {
      description = 'Callback de destruição da Activity. Libera recursos de memória, corrotinas ativas e previne vazamentos (memory leaks).';
    } else if (funcName.includes('Init') || funcName.includes('setup') || funcName.includes('Setup')) {
      description = 'Inicializa os componentes visuais da tela, escutadores de cliques e bindings de dados.';
    } else if (funcName.includes('Generate') || funcName.includes('Ai') || funcName.includes('Process')) {
      description = 'Processa a requisição assíncrona ao modelo de inteligência artificial Gemini ou backend API, manipulando estados de carregamento.';
    } else if (funcName.includes('Check') || funcName.includes('Answer') || funcName.includes('Verify')) {
      description = 'Valida a resposta fornecida pelo usuário, calcula pontuações de XP, streaks e atualiza o feedback visual.';
    } else if (funcName.includes('Toast') || funcName.includes('Show') || funcName.includes('Display')) {
      description = 'Exibe mensagens de notificação temporárias (Toasts/Snackbars) ou atualiza diálogos de interface.';
    } else if (funcName.includes('Nav') || funcName.includes('Tab') || funcName.includes('Switch')) {
      description = 'Gerencia a navegação entre abas ou fragments da aplicação.';
    } else if (funcName.startsWith('test')) {
      description = 'Método de teste de interface automatizado (Espresso UI Test) para validação de fluxos de usuário.';
    }

    primaryClass.methods.push({
      name: funcName,
      visibility: isPrivate ? 'private' : 'public',
      isOverride,
      isSuspend,
      isComposable,
      parameters,
      returnType: returnTypeRaw,
      description
    });
  }

  // 5. Construção do Documento Markdown
  let markdown = `# 📘 Documentação Técnica do Código Kotlin - ${appName}

> **Pacote Raiz**: \`${detectedPackage}\`  
> **Gerado por**: Heavy Studio PRO IDE & Kotlin Code Analyzer  
> **Data de Análise**: ${currentDate}  
> **Plataforma Target**: Android SDK (API 24+)  

---

## 📌 1. Visão Geral da Arquitetura e Estrutura

Esta documentação foi gerada automaticamente através do analisador sintático de código Kotlin da IDE. Ela mapeia detalhadamente todas as **classes**, **interfaces**, **propriedades** e **métodos de controle** que compõem o núcleo do aplicativo **${appName}**.

### 🏛️ Padrão Arquitetural
- **Padrão**: Activity-View Controller com suporte a Corrotinas Kotlin (\`kotlinx.coroutines\`) e ciclo de vida AndroidX.
- **Gerenciamento de Estado**: Manipulação reativa de componentes XML via seletores de ID e listeners assíncronos.
- **Tratamento de Erros e Logs**: Registro de eventos via \`android.util.Log\` e tratadores de exceções globais.

---

## 📦 2. Mapeamento de Dependências e Pacotes Importados

Abaixo estão os módulos e bibliotecas utilizadas no código Kotlin:

### 🤖 AndroidX & Sistema Android (${androidxImports.length} imports)
${androidxImports.map(i => `- \`${i}\``).join('\n') || '- `androidx.appcompat.app.AppCompatActivity`\n- `android.os.Bundle`'}

### 🧠 Google & Inteligência Artificial (${googleImports.length} imports)
${googleImports.map(i => `- \`${i}\``).join('\n') || '- `com.google.genai.GoogleGenAI`'}

### ⚙️ Kotlin Core & Coroutines (${kotlinImports.length} imports)
${kotlinImports.map(i => `- \`${i}\``).join('\n') || '- `kotlinx.coroutines.*`'}

${otherImports.length > 0 ? `### 📚 Bibliotecas de Terceiros\n${otherImports.map(i => `- \`${i}\``).join('\n')}` : ''}

---

## 🏛️ 3. Análise Detalhada das Classes

${classes.map(c => `
### 🔹 Class: \`${c.name}\`
- **Tipo de Componente**: \`${c.type.toUpperCase()}\`
- **Herança / Interfaces**: ${c.superTypes.length > 0 ? c.superTypes.map(s => `\`${s}\``).join(', ') : 'Nenhuma (Classe Base)'}
- **Anotações**: ${c.annotations.length > 0 ? c.annotations.map(a => `\`${a}\``).join(', ') : 'Nenhuma'}

#### 📐 Propriedades & Atributos de Estado (${c.properties.length})
${c.properties.length > 0 ? `
| Nome da Propriedade | Visibilidade | Tipo | Valor Inicial / Estado |
| :--- | :--- | :--- | :--- |
${c.properties.map(p => `| \`${p.name}\` | \`${p.isPrivate ? 'private' : 'public'}\` | \`${p.type}\` | ${p.initialValue ? `\`${p.initialValue}\`` : '*Não inicializado*'} |`).join('\n')}
` : '_Nenhuma propriedade declarada explicitamente no escopo da classe._'}

#### 🛠️ Métodos e Funções (${c.methods.length})
${c.methods.length > 0 ? `
| Método / Função | Modificadores | Parâmetros | Retorno | Descrição e Finalidade |
| :--- | :--- | :--- | :--- | :--- |
${c.methods.map(m => {
  const mods = [];
  if (m.isOverride) mods.push('override');
  if (m.isSuspend) mods.push('suspend');
  if (m.isComposable) mods.push('@Composable');
  if (m.visibility === 'private') mods.push('private');
  const modStr = mods.length > 0 ? mods.map(x => `\`${x}\``).join(' ') : '`public`';
  const paramStr = m.parameters.length > 0 ? m.parameters.map(p => `\`${p.name}: ${p.type}\``).join('<br/>') : '*Nenhum*';
  return `| \`${m.name}\` | ${modStr} | ${paramStr} | \`${m.returnType}\` | ${m.description} |`;
}).join('\n')}
` : '_Nenhum método declarado explicitamente._'}
`).join('\n\n---\n\n')}

---

## 🎨 4. Recursos XML e Layouts Associados

| Arquivo Recurso XML | Tipo de Recurso | Finalidade na Aplicação |
| :--- | :--- | :--- |
| \`app/src/main/res/layout/activity_main.xml\` | Layout de Tela | Interface principal contendo componentes visuais, botões e cartões interativos. |
| \`app/src/main/res/layout/item_message.xml\` | Layout de Item | Card responsivo para exibição de mensagens de chat ou itens de lista. |
| \`app/src/main/res/values/colors.xml\` | Tabela de Cores | Paleta de cores oficial (primary, accent, background, surface). |
| \`app/src/main/res/values/themes.xml\` | Tema da Aplicação | Estilo do aplicativo (\`Theme.MaterialComponents.DayNight.NoActionBar\`). |
| \`app/src/main/AndroidManifest.xml\` | Manifesto Android | Configurações do ecossistema, permissões de Internet e Activity de boot. |

---

## 🧪 5. Guia de Testes e Manutenção

Para compilar e validar estes métodos Kotlin localmente via terminal Gradle:

\`\`\`bash
# 1. Compilar o módulo Android
./gradlew assembleDebug

# 2. Executar os testes de unidade e UI (Espresso)
./gradlew connectedCheck
\`\`\`

---

*Documentação gerada automaticamente para o repositório **${appName}**.*
`;

  return markdown.trim();
}
