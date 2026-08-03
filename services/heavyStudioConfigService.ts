// services/heavyStudioConfigService.ts
import { AppConfig, ConversationMessage, SavedIcon, AppAsset, TabType, GeneratedCode } from '../types';
import { CachedProjectState } from './indexedDbService';

export interface HeavyStudioConfigExport {
  fileType: 'heavy_studio_config';
  version: string;
  exportedAt: string;
  config: AppConfig;
  generated?: GeneratedCode | null;
  logs?: Array<{ msg: string; type: string }>;
  conversationHistory?: ConversationMessage[];
  iconGallery?: SavedIcon[];
  attachments?: AppAsset[];
  activeTab?: TabType;
}

/**
 * Exporta o estado e as configurações do projeto Heavy Studio para um arquivo JSON baixável (heavy_studio_config.json)
 */
export function exportHeavyStudioConfig(data: Omit<CachedProjectState, 'lastSavedAt'>): void {
  const exportPayload: HeavyStudioConfigExport = {
    fileType: 'heavy_studio_config',
    version: '2.9',
    exportedAt: new Date().toISOString(),
    config: data.config,
    generated: data.generated || null,
    logs: data.logs || [],
    conversationHistory: data.conversationHistory || [],
    iconGallery: data.iconGallery || [],
    attachments: data.attachments || [],
    activeTab: data.activeTab || TabType.PREVIEW
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanAppName = (data.config.appName || 'app')
    .toLowerCase()
    .replace(/[^a-z0-0]/g, '_')
    .replace(/_+/g, '_');

  const fileName = `heavy_studio_config_${cleanAppName}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Valida e importa as configurações de um arquivo JSON heavy_studio_config
 */
export function importHeavyStudioConfig(jsonString: string): HeavyStudioConfigExport {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('O arquivo selecionado não contém um JSON válido.');
    }

    // Aceita tanto arquivos marcados explicitamente com fileType quanto arquivos genéricos de config contendo o campo config
    if (!parsed.config || typeof parsed.config !== 'object' || !parsed.config.appName) {
      throw new Error('Estrutura de heavy_studio_config.json inválida. O objeto deve conter as configurações do app (config.appName).');
    }

    return {
      fileType: 'heavy_studio_config',
      version: parsed.version || '2.9',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      config: parsed.config,
      generated: parsed.generated || null,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      conversationHistory: Array.isArray(parsed.conversationHistory) ? parsed.conversationHistory : [],
      iconGallery: Array.isArray(parsed.iconGallery) ? parsed.iconGallery : [],
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      activeTab: parsed.activeTab || TabType.PREVIEW
    };
  } catch (err: any) {
    throw new Error(`Falha ao importar heavy_studio_config.json: ${err.message}`);
  }
}
