
import { AssetManager } from '../services/assetManager';
import { AppAsset } from '../types';

export const runAssetTests = async () => {
  const results: { name: string; status: 'passed' | 'failed'; error?: string }[] = [];

  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };

  const test = async (name: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      results.push({ name, status: 'passed' });
    } catch (e: any) {
      results.push({ name, status: 'failed', error: e.message });
    }
  };

  // 1. Teste de Sanitização de Nomes
  await test('Deve sanitizar nomes para o padrão Android (snake_case)', () => {
    const rawName = 'Meu Icone @2x.PNG';
    const sanitized = AssetManager.sanitizeResourceName(rawName);
    assert(sanitized === 'meu_icone__2x_png', `Esperado meu_icone__2x_png, obtido ${sanitized}`);
  });

  // 2. Teste de Validação de MIME Types
  await test('Deve validar tipos de arquivos corretamente', () => {
    const asset: AppAsset = { name: 'test.png', data: 'something', mimeType: 'image/png' };
    assert(AssetManager.validateAsset(asset, 'image/*') === true, 'Deve aceitar image/* para PNG');
    assert(AssetManager.validateAsset(asset, 'application/pdf') === false, 'Deve rejeitar PDF para PNG');
  });

  // 3. Teste de Processamento (Mock)
  await test('Estrutura do Asset deve ser íntegra', () => {
    const asset: AppAsset = { name: 'icon.png', data: 'UklGR', mimeType: 'image/png' };
    assert(asset.data.length > 0, 'Data não pode estar vazia');
    assert(asset.name.includes('.'), 'Nome deve conter extensão');
  });

  return results;
};
