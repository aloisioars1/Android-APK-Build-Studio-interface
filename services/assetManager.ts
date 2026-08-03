
import { AppAsset } from '../types';
import JSZip from 'jszip';

export const AssetManager = {
  /**
   * Converte um arquivo do navegador para o formato AppAsset do Studio
   */
  async processFile(file: File): Promise<AppAsset[]> {
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
      return this.processZip(file);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve([{
          name: file.name,
          data: base64Data,
          mimeType: file.type
        }]);
      };
      reader.onerror = () => reject(new Error(`Falha ao ler arquivo: ${file.name}`));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Processa um arquivo ZIP e extrai assets compatíveis
   */
  async processZip(file: File): Promise<AppAsset[]> {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    const extractedAssets: AppAsset[] = [];

    // Fix: Explicitly cast Object.entries result to [string, any][] to resolve 'unknown' type errors for 'dir' (line 38) and 'async' (line 47)
    for (const [path, zipEntry] of Object.entries(content.files) as [string, any][]) {
      if (zipEntry.dir || path.includes('__MACOSX')) continue;

      const fileName = path.split('/').pop() || path;
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      // Filtro de tipos suportados
      const supportedExtensions = ['png', 'jpg', 'jpeg', 'svg', 'json', 'xml', 'txt', 'pdf'];
      if (!extension || !supportedExtensions.includes(extension)) continue;

      const data = await zipEntry.async('base64');
      const mimeType = this.getMimeTypeByExtension(extension);

      extractedAssets.push({
        name: fileName,
        data: data,
        mimeType: mimeType
      });
    }

    return extractedAssets;
  },

  getMimeTypeByExtension(ext: string): string {
    const map: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'svg': 'image/svg+xml',
      'json': 'application/json',
      'xml': 'text/xml',
      'pdf': 'application/pdf',
      'txt': 'text/plain'
    };
    return map[ext] || 'application/octet-stream';
  },

  /**
   * Valida se o asset cumpre os requisitos do projeto
   */
  validateAsset(asset: AppAsset, allowedTypes: string): boolean {
    if (!asset.data || asset.data.length === 0) return false;
    if (allowedTypes === '*/*') return true;
    
    const types = allowedTypes.split(',').map(t => t.trim());
    return types.some(t => {
      if (t.endsWith('/*')) {
        return asset.mimeType.startsWith(t.replace('/*', ''));
      }
      return asset.mimeType === t;
    });
  },

  /**
   * Formata o nome do arquivo para ser compatível com recursos Android (snake_case)
   */
  sanitizeResourceName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^[^a-z]/, 'res_$') // Android requer que comece com letra
      .substring(0, 30);
  }
};
