import { AppConfig } from '../types';
import { GoogleGenAI } from '@google/genai';

/**
 * Gera um arquivo README.md profissional extraindo nome do app, descrição e recursos configurados na IDE
 */
export function generateReadme(config: AppConfig): string {
  const platformName = config.platform === 'ios' ? 'iOS' : config.platform === 'both' ? 'Android & iOS' : 'Android';
  const packageName = config.packageName || 'com.example.app';
  const appName = config.appName || 'Meu Aplicativo Mobile';
  const description = config.appDescription || `Aplicativo nativo ${platformName} de alto desempenho desenvolvido no Heavy Studio Pro IDE com suporte a CI/CD e compilação automatizada.`;

  // Mapear componentes da interface gráfica configurados pelo usuário na IDE
  const componentsList = config.components && config.components.length > 0
    ? config.components.map(comp => {
        let typeLabel = comp.type.toUpperCase();
        if (comp.type === 'chat_message_display') typeLabel = 'Chat Output Box';
        if (comp.type === 'button') typeLabel = 'Botão Interativo';
        if (comp.type === 'input') typeLabel = 'Campo de Entrada';
        if (comp.type === 'switch') typeLabel = 'Interruptor (Switch)';
        if (comp.type === 'progress') typeLabel = 'Barra de Progresso';
        return `- **${typeLabel}**: "${comp.label}" ${comp.action ? `*(Ação: \`${comp.action}\`)*` : ''}`;
      }).join('\n')
    : '- **Interface Dinâmica**: Layout responsivo configurado via IDE Material Design.';

  // Mapear recursos de IA Gemini
  const aiFeatures = config.modelName
    ? `- **Modelo Gemini AI**: Integração com \`${config.modelName}\`
- **Pesquisa em Tempo Real**: ${config.useSearch ? '✅ Habilitada (Google Search Grounding)' : '❌ Desabilitada'}
- **Thinking Budget**: ${config.thinkingBudget ? `${config.thinkingBudget} tokens` : 'Automático'}
- **Instruções do Sistema**: Personalizadas na IDE`
    : '- **Módulo AI Core**: Suporte a chamadas assíncronas e processamento nativo.';

  // Mapear recursos de Assinatura & Keystore
  const keystoreFeatures = config.autoSignRelease
    ? `- **Assinatura Automática**: Keystore de Release configurada na IDE
- **Alias**: \`${config.keystoreAlias || 'releaseKey'}\`
- **Organização**: \`${config.keystoreOrg || 'Desenvolvimento'}\``
    : '- **Assinatura Manual**: Suporte a Keystore customizada no Gradle';

  // Mapear recursos do Firebase App Distribution
  const firebaseFeatures = config.enableFirebaseDistribution
    ? `- **Firebase App Distribution**: ✅ Habilitado no CI/CD
- **App ID**: \`${config.firebaseAppId || '1:123456789:android:app'}\`
- **Testadores Cadastrados**: \`${config.firebaseTesters || 'dev-team@example.com'}\``
    : '- **Distribuição**: Artefatos AAB/APK disponíveis via GitHub Artifacts';

  // Mapear Assets
  const assetsInfo = config.assets && config.assets.length > 0
    ? `- **Assets Gráficos**: ${config.assets.length} recurso(s) (ícones e imagens de marca) incorporado(s) em \`res/drawable/\`.`
    : `- **Ícone do App**: Ícone vetorial gerado com a etiqueta "${config.iconLabel || appName}".`;

  return `# ${appName}

![Platform](https://img.shields.io/badge/Platform-${encodeURIComponent(platformName)}-3DDC84?style=for-the-badge&logo=${config.platform === 'ios' ? 'apple' : 'android'}&logoColor=white)
![Build Status](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)
![Package](https://img.shields.io/badge/Package-${encodeURIComponent(packageName)}-informational?style=for-the-badge)

> ${description}

---

## 📌 Visão Geral e Recursos Configurados

Este repositório contém o código-fonte completo do **${appName}**, configurado e exportado via **Heavy Studio Pro IDE**. O projeto foi estruturado seguindo as melhores práticas de arquitetura Android/iOS, prontos para compilação automatizada via **GitHub Actions** e distribuição para testadores no **Firebase Console**.

### 🎨 Componentes da Interface de Usuário (Configurados na IDE)
${componentsList}

### 🧠 Recursos de Inteligência Artificial & API
${aiFeatures}

### 🔐 Segurança, Keystore & Release Signing
${keystoreFeatures}

### 🔥 Integração & Entrega Contínua (CI/CD)
${firebaseFeatures}
${assetsInfo}

---

## 📁 Estrutura de Diretórios do Projeto

\`\`\`
├── .github/
│   └── workflows/
│       └── android.yml            # Pipeline de Build, Testes e Deploy no GitHub Actions
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/${packageName.replace(/\./g, '/')}/
│   │       │   └── MainActivity.kt # Código Principal da Aplicação
│   │       ├── res/
│   │       │   ├── layout/         # Telas XML (activity_main.xml, item_message.xml)
│   │       │   ├── values/         # Temas, Cores e Dimensões
│   │       │   └── drawable/       # Ícones e Backgrounds Vetoriais
│   │       └── AndroidManifest.xml # Manifesto Auditado de Segurança
│   └── build.gradle                # Dependências do Módulo App
├── build.gradle                    # Configurações do Projeto
├── settings.gradle                 # Repositórios e Módulos
└── README.md                       # Documentação do Repositório
\`\`\`

---

## 🚀 Como Compilar e Executar Localmente

### Pré-requisitos
- **Android Studio Jellyfish / Koala** ou versão mais recente
- **JDK 17** (Java Development Kit) instalado e configurado
- **Gradle 8.x+**

### Passo a Passo
1. **Clonar o Repositório**:
   \`\`\`bash
   git clone https://github.com/${config.githubUser || 'usuario'}/${config.githubRepo || 'repositorio'}.git
   cd ${config.githubRepo || 'repositorio'}
   \`\`\`

2. **Abrir no Android Studio**:
   - Abra o Android Studio, selecione **Open** e escolha a pasta raiz do projeto.
   - Aguarde a sincronização inicial do Gradle.

3. **Executar a Compilação de Teste (Debug APK)**:
   \`\`\`bash
   ./gradlew assembleDebug
   \`\`\`
   O APK de teste será gerado em: \`app/build/outputs/apk/debug/app-debug.apk\`

4. **Gerar o App Bundle assinado (Release AAB)**:
   \`\`\`bash
   ./gradlew bundleRelease
   \`\`\`
   O pacote AAB será gerado em: \`app/build/outputs/bundle/release/app-release.aab\`

---

## 🔑 Configuração de Segredos no GitHub Actions (Secrets)

Para habilitar a compilação de Release e o envio automático para o Firebase App Distribution no GitHub Actions, adicione as seguintes variáveis na guia **Settings > Secrets and variables > Actions** do seu repositório:

| Nome do Secret | Descrição |
| :--- | :--- |
| \`KEYSTORE_BASE64\` | Chave de assinatura JKS codificada em Base64 |
| \`KEYSTORE_PASSWORD\` | Senha mestre do arquivo de Keystore |
| \`KEYSTORE_ALIAS\` | Nome do Alias da chave de release |
| \`KEYSTORE_KEY_PASSWORD\` | Senha específica da chave do Alias |
| \`FIREBASE_APP_ID\` | ID do aplicativo cadastrado no Firebase Console |
| \`FIREBASE_TOKEN\` | Token CI gerado via \`firebase login:ci\` |

---

## 🛡️ Auditoria de Segurança do AndroidManifest.xml
O manifesto deste aplicativo passa por verificações de conformidade com as diretrizes de privacidade e segurança da **Google Play Store**:
- ❌ Permissões sensíveis não justificadas (SMS, Call Log) são bloqueadas ou sinalizadas.
- 🔒 Tráfego não criptografado (\`usesCleartextTraffic\`) é desabilitado por padrão.
- 🛡️ Proteção de backup de dados (\`allowBackup="false"\`) configurada para prevenir extração de dados.

---

## 📄 Licença e Créditos
Este projeto foi gerado com **Heavy Studio Pro IDE** & **Google Gemini AI**.
Distribuído sob a licença **MIT**. Veja \`LICENSE\` para mais detalhes.
`;
}

/**
 * Gera ou aprimora o README.md utilizando o modelo Gemini AI
 */
export async function generateReadmeWithAi(
  config: AppConfig,
  customInstructions?: string
): Promise<string> {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateReadme(config);
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const prompt = `Você é um Engenheiro de Software Lead especializado em documentação técnica e repositórios GitHub de alto impacto.
Gere um arquivo README.md profissional e completo em Markdown para o aplicativo Android/iOS a seguir:

Configurações extraídas da IDE:
- Nome do Aplicativo: "${config.appName}"
- Pacote (Package Name): "${config.packageName}"
- Plataforma Target: "${config.platform}"
- Descrição Personalizada: "${config.appDescription || ''}"
- Componentes da UI na IDE: ${JSON.stringify(config.components || [])}
- Modelo de IA Configurado: "${config.modelName || 'Não especificado'}"
- Assinatura Release Habilitada: ${config.autoSignRelease ? 'Sim (Keystore pronta)' : 'Não'}
- Firebase App Distribution: ${config.enableFirebaseDistribution ? 'Habilitado' : 'Desabilitado'}
- Testadores Firebase: "${config.firebaseTesters || ''}"
- Repositório GitHub: "${config.githubUser}/${config.githubRepo}"

Instruções adicionais do usuário: "${customInstructions || 'Forneça um README completo com badges, guias de build Gradle, tabela de secrets do GitHub Actions e arquitetura de pastas.'}"

Retorne APENAS o conteúdo em Markdown limpo do README.md, sem explicações externas.`;

  try {
    const response = await ai.models.generateContent({
      model: config.modelName?.includes('gemini') ? config.modelName : 'gemini-3.6-flash',
      contents: {
        parts: [{ text: prompt }]
      }
    });

    const text = response.text || '';
    return text.replace(/```markdown\n?|\n?```/g, '').trim();
  } catch (e) {
    console.warn("Erro ao gerar README via Gemini AI. Usando gerador estruturado padronizado:", e);
    return generateReadme(config);
  }
}
