import { GoogleGenAI } from "@google/genai";

export interface PermissionAnalysis {
  permission: string;
  category: 'Dangerous' | 'Normal' | 'Signature' | 'Special' | 'Deprecated';
  status: 'recommended_removal' | 'needs_declaration' | 'valid' | 'security_risk';
  riskScore: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  playStorePolicy: string;
  recommendation: string;
  alternativeApi?: string;
}

export interface SecurityIssue {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
  fixCode: string;
}

export interface ManifestValidationResult {
  score: number; // 0 to 100
  riskLevel: 'critical' | 'warning' | 'safe';
  summary: string;
  permissions: PermissionAnalysis[];
  securityIssues: SecurityIssue[];
  optimizedManifestXml: string;
}

export const SAMPLE_RISKY_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.exemplo.meuapp">

    <!-- Permissões com restrições severas na Google Play -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Meu App Comercial"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.MeuApp">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".PaymentActivity"
            android:exported="true" />

        <service
            android:name=".BackgroundSyncService"
            android:exported="true" />
    </application>
</manifest>`;

export const SAMPLE_SAFE_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.exemplo.meuapp">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="Meu App Seguro"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:usesCleartextTraffic="false"
        android:theme="@style/Theme.MeuApp">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".PaymentActivity"
            android:exported="false" />
    </application>
</manifest>`;

/**
 * Análise heurística rápida / Fallback local para AndroidManifest.xml
 */
export function analyzeManifestLocally(manifestXml: string): ManifestValidationResult {
  const permissions: PermissionAnalysis[] = [];
  const securityIssues: SecurityIssue[] = [];

  // Match all uses-permission lines
  const permRegex = /<uses-permission\s+android:name=["']([^"']+)["']/g;
  let match;
  const foundPermissions = new Set<string>();

  while ((match = permRegex.exec(manifestXml)) !== null) {
    foundPermissions.add(match[1]);
  }

  // Analyze each found permission against Google Play Policies
  foundPermissions.forEach(perm => {
    if (perm === 'android.permission.READ_SMS' || perm === 'android.permission.SEND_SMS' || perm === 'android.permission.RECEIVE_SMS') {
      permissions.push({
        permission: perm,
        category: 'Special',
        status: 'recommended_removal',
        riskScore: 'critical',
        description: 'Acesso e leitura direta de mensagens de texto (SMS).',
        playStorePolicy: 'Restrição Estrita do Google Play: Proibido a menos que o app seja o manipulador padrão de SMS.',
        recommendation: 'Remover permissão e migrar para a API SMS Retriever do Google Play Services para verificação de código por SMS.',
        alternativeApi: 'com.google.android.gms.auth.api.phone.SmsRetriever'
      });
    } else if (perm === 'android.permission.READ_CALL_LOG' || perm === 'android.permission.WRITE_CALL_LOG') {
      permissions.push({
        permission: perm,
        category: 'Dangerous',
        status: 'recommended_removal',
        riskScore: 'critical',
        description: 'Leitura e gravação do histórico de chamadas do usuário.',
        playStorePolicy: 'Restrição Estrita do Google Play: Rejeição imediata se não for discador padrão.',
        recommendation: 'Remova se o app não for um discador primário substituto da operadora.',
        alternativeApi: 'TelecomManager / CallRedirectionService'
      });
    } else if (perm === 'android.permission.ACCESS_BACKGROUND_LOCATION') {
      permissions.push({
        permission: perm,
        category: 'Dangerous',
        status: 'needs_declaration',
        riskScore: 'high',
        description: 'Acesso à localização do dispositivo continuamente em segundo plano.',
        playStorePolicy: 'Exige formulário de declaração, justificativa de valor para o usuário e vídeo de demonstração no Play Console.',
        recommendation: 'Verifique se é indispensável. Prefira utilizar localização apenas em primeiro plano com serviço em primeiro plano (Foreground Service).',
        alternativeApi: 'FusedLocationProviderClient com Foreground Service'
      });
    } else if (perm === 'android.permission.ACCESS_FINE_LOCATION') {
      permissions.push({
        permission: perm,
        category: 'Dangerous',
        status: 'needs_declaration',
        riskScore: 'medium',
        description: 'Localização precisa via GPS do usuário.',
        playStorePolicy: 'Requer justificativa e solicitação transparente de permissão em tempo de execução (Runtime Permission).',
        recommendation: 'Pergunte no momento de uso da funcionalidade de mapa/geolocalização e utilize ACCESS_COARSE_LOCATION se precisão exata não for necessária.',
        alternativeApi: 'ACCESS_COARSE_LOCATION'
      });
    } else if (perm === 'android.permission.READ_EXTERNAL_STORAGE' || perm === 'android.permission.WRITE_EXTERNAL_STORAGE') {
      permissions.push({
        permission: perm,
        category: 'Deprecated',
        status: 'recommended_removal',
        riskScore: 'medium',
        description: 'Acesso global ao armazenamento externo do dispositivo.',
        playStorePolicy: 'Obsoleto no Android 11+ (API 30). O Google Play rejeita apps com permissão global sem Scoped Storage.',
        recommendation: 'Substitua pelo seletor de mídia moderno Photo Picker ou pela Storage Access Framework (SAF).',
        alternativeApi: 'ActivityResultContracts.PickVisualMedia()'
      });
    } else if (perm === 'android.permission.SYSTEM_ALERT_WINDOW') {
      permissions.push({
        permission: perm,
        category: 'Special',
        status: 'needs_declaration',
        riskScore: 'high',
        description: 'Sobreposição de tela (desenhar sobre outros aplicativos).',
        playStorePolicy: 'Exige revisão especial e pode requerer justificativa na lista de aplicativos com permissão especial.',
        recommendation: 'Evite a menos que seja um app de acessibilidade ou comunicação em janela flutuante legítimo.',
        alternativeApi: 'Bubbles API no Android 11+'
      });
    } else if (perm === 'android.permission.QUERY_ALL_PACKAGES') {
      permissions.push({
        permission: perm,
        category: 'Special',
        status: 'recommended_removal',
        riskScore: 'high',
        description: 'Visibilidade de todos os pacotes e aplicativos instalados no dispositivo.',
        playStorePolicy: 'Muitíssimo restrita. Permitido apenas para antivírus e navegadores web reconhecidos.',
        recommendation: 'Substitua por declarações de elementos <queries> específicos para o pacote que deseja consultar no AndroidManifest.',
        alternativeApi: 'Elemento <queries> especificando o pacote alvo'
      });
    } else if (perm === 'android.permission.CAMERA') {
      permissions.push({
        permission: perm,
        category: 'Dangerous',
        status: 'valid',
        riskScore: 'medium',
        description: 'Acesso à câmera do dispositivo.',
        playStorePolicy: 'Permissão perigosa padrão. Exige runtime permission antes da chamada.',
        recommendation: 'Solicite dinamicamente ao abrir a câmera. Se usar apenas para tirar foto simples, use a Intent de captura.',
        alternativeApi: 'MediaStore.ACTION_IMAGE_CAPTURE'
      });
    } else if (perm === 'android.permission.POST_NOTIFICATIONS') {
      permissions.push({
        permission: perm,
        category: 'Dangerous',
        status: 'valid',
        riskScore: 'low',
        description: 'Envio de notificações no Android 13+ (API 33).',
        playStorePolicy: 'Compatível com as diretrizes do Android 13.',
        recommendation: 'Mantenha e peça ao usuário no momento correto com contexto explicativo.',
        alternativeApi: 'NotificationManagerCompat'
      });
    } else {
      permissions.push({
        permission: perm,
        category: perm.includes('INTERNET') || perm.includes('NETWORK') ? 'Normal' : 'Dangerous',
        status: 'valid',
        riskScore: 'low',
        description: `Permissão para ${perm.split('.').pop()}.`,
        playStorePolicy: 'Conforme com as diretrizes normais do Android.',
        recommendation: 'Mantenha apenas se for estritamente utilizada no código-fonte do aplicativo.'
      });
    }
  });

  // Check Security Attributes in Manifest
  if (manifestXml.includes('android:allowBackup="true"')) {
    securityIssues.push({
      id: 'allow_backup_true',
      title: 'Backup de Aplicativo Habilitado (allowBackup="true")',
      severity: 'high',
      explanation: 'Permite que ferramentas ADB e backups na nuvem extraiam o banco de dados interno e SharedPreferences do app sem criptografia de chave privada.',
      fixCode: 'android:allowBackup="false"'
    });
  }

  if (manifestXml.includes('android:usesCleartextTraffic="true"')) {
    securityIssues.push({
      id: 'cleartext_traffic',
      title: 'Tráfego HTTP sem Criptografia TLS Habilitado (usesCleartextTraffic="true")',
      severity: 'critical',
      explanation: 'Permite requisições HTTP em texto plano, exposto a ataques Man-in-the-Middle (MitM) de interceptação de dados sensíveis na rede.',
      fixCode: 'android:usesCleartextTraffic="false"'
    });
  }

  // Check exported Activities / Services without permission
  const exportedRegex = /<(activity|service|receiver|provider)[^>]*android:exported=["']true["'][^>]*>/g;
  let expMatch;
  let countExportedUnprotected = 0;
  while ((expMatch = exportedRegex.exec(manifestXml)) !== null) {
    if (!expMatch[0].includes('android.intent.action.MAIN') && !expMatch[0].includes('android:permission')) {
      countExportedUnprotected++;
    }
  }

  if (countExportedUnprotected > 0) {
    securityIssues.push({
      id: 'exported_components_unprotected',
      title: `${countExportedUnprotected} Componente(s) Exposto(s) sem Proteção (exported="true")`,
      severity: 'high',
      explanation: 'Atividades ou serviços secundários expostos externamente podem ser invocados por malwares instalados no mesmo dispositivo.',
      fixCode: 'Mudar android:exported="true" para android:exported="false" em atividades/serviços internos'
    });
  }

  // Calculate score based on risks
  let penalty = 0;
  permissions.forEach(p => {
    if (p.riskScore === 'critical') penalty += 25;
    else if (p.riskScore === 'high') penalty += 15;
    else if (p.riskScore === 'medium') penalty += 8;
  });

  securityIssues.forEach(s => {
    if (s.severity === 'critical') penalty += 20;
    else if (s.severity === 'high') penalty += 12;
    else if (s.severity === 'medium') penalty += 6;
  });

  const score = Math.max(10, Math.min(100, 100 - penalty));
  const riskLevel = score < 60 ? 'critical' : score < 85 ? 'warning' : 'safe';

  // Construct optimized Manifest XML
  let optimizedManifestXml = manifestXml
    // Replace allowBackup="true" -> "false"
    .replace(/android:allowBackup=["']true["']/g, 'android:allowBackup="false"')
    // Replace usesCleartextTraffic="true" -> "false"
    .replace(/android:usesCleartextTraffic=["']true["']/g, 'android:usesCleartextTraffic="false"');

  // Comment out prohibited permissions
  ['android.permission.READ_SMS', 'android.permission.SEND_SMS', 'android.permission.READ_CALL_LOG', 'android.permission.QUERY_ALL_PACKAGES'].forEach(badPerm => {
    const reg = new RegExp(`<uses-permission\\s+android:name=["']${badPerm}["']\\s*\\/?>`, 'g');
    optimizedManifestXml = optimizedManifestXml.replace(reg, `<!-- REMOVIDO PELA IA PLAY STORE POLICY: ${badPerm} -->`);
  });

  // Fix exported on secondary components
  optimizedManifestXml = optimizedManifestXml.replace(/(<activity\s+[^>]*android:name=["']\.(?!MainActivity)[^"']+["'][^>]*android:exported=["'])true(["'])/g, '$1false$2');
  optimizedManifestXml = optimizedManifestXml.replace(/(<service\s+[^>]*android:exported=["'])true(["'])/g, '$1false$2');

  const criticalCount = permissions.filter(p => p.riskScore === 'critical').length;
  const highCount = permissions.filter(p => p.riskScore === 'high').length;

  let summary = `Análise concluída: ${permissions.length} permissão(ões) examinada(s). `;
  if (criticalCount > 0 || securityIssues.some(s => s.severity === 'critical')) {
    summary += `Atenção: Foram identificadas ${criticalCount} permissões de risco crítico e ${securityIssues.length} vulnerabilidade(s) de segurança que podem causar a REJEIÇÃO do app no Google Play Console.`;
  } else if (highCount > 0) {
    summary += `Encontradas ${highCount} permissão(ões) com requisitos especiais de declaração para aprovação na Play Store.`;
  } else {
    summary += `O arquivo AndroidManifest.xml segue as melhores práticas de privacidade e segurança da Google Play Store.`;
  }

  return {
    score,
    riskLevel,
    summary,
    permissions,
    securityIssues,
    optimizedManifestXml
  };
}

/**
 * Análise avançada via Gemini AI
 */
export async function analyzeManifestWithAi(
  manifestXml: string,
  modelName: string = 'gemini-3.6-flash'
): Promise<ManifestValidationResult> {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Chave de API Gemini não encontrada. Utilizando analisador local de políticas Play Store.");
    return analyzeManifestLocally(manifestXml);
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const prompt = `Você é um Especialista Sênior em Segurança Android e Auditor de Conformidade com as Políticas do Google Play Console.
Analise o arquivo AndroidManifest.xml a seguir:

\`\`\`xml
${manifestXml}
\`\`\`

Realize uma auditoria completa de segurança, privacidade e conformidade com as regras de aprovação da Google Play Store.
Examine:
1. Permissões de Risco Sensível/Especial (ex: READ_SMS, SEND_SMS, READ_CALL_LOG, ACCESS_BACKGROUND_LOCATION, QUERY_ALL_PACKAGES, SYSTEM_ALERT_WINDOW).
2. Permissões Obsoletas ou Desnecessárias (ex: READ_EXTERNAL_STORAGE no Android 11+).
3. Atributos de Segurança do Elemento <application> (ex: allowBackup, usesCleartextTraffic, requestLegacyExternalStorage).
4. Componentes Expostos (Activity/Service/Receiver com exported="true" sem permissões associadas).

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "score": 75,
  "riskLevel": "warning",
  "summary": "Resumo em português sobre a elegibilidade e riscos de publicação na Google Play Store.",
  "permissions": [
    {
      "permission": "android.permission.READ_SMS",
      "category": "Special",
      "status": "recommended_removal",
      "riskScore": "critical",
      "description": "Leitura de mensagens SMS privadas.",
      "playStorePolicy": "Diretriz estrita: Rejeitado na Play Store se o app não for o SMS Handler primário do sistema.",
      "recommendation": "Remover e migrar para a API SMS Retriever.",
      "alternativeApi": "SmsRetrieverClient"
    }
  ],
  "securityIssues": [
    {
      "id": "cleartext_traffic",
      "title": "Tráfego HTTP em texto claro (usesCleartextTraffic=true)",
      "severity": "critical",
      "explanation": "Permite ataques Man-in-the-Middle ao expor dados sensíveis em redes Wi-Fi públicas.",
      "fixCode": "android:usesCleartextTraffic=\\"false\\""
    }
  ],
  "optimizedManifestXml": "CONTEUDO_COMPLETO_DO_ANDROID_MANIFEST_XML_CORRIGIDO_E_SEGURO"
}`;

  try {
    const response = await ai.models.generateContent({
      model: modelName.includes('gemini') ? modelName : 'gemini-3.6-flash',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();

    const parsed: ManifestValidationResult = JSON.parse(cleanJson);
    return parsed;
  } catch (err: any) {
    console.warn("Erro na chamada Gemini AI para Manifest, utilizando analisador local de regras...", err);
    return analyzeManifestLocally(manifestXml);
  }
}
