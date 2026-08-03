export interface KeystoreConfig {
  alias: string;
  storePassword: string;
  keyPassword: string;
  cn: string;
  org: string;
  country: string;
  validityYears: number;
  base64Data?: string;
  fileName: string;
  createdAt?: string;
}

/**
 * Cria os bytes de cabeçalho de um contêiner JKS/PKCS12
 * Magic bytes JKS: 0xFE, 0xED, 0xFE, 0xED + versão + número de entradas + metadados
 */
function createJksHeaderBytes(alias: string, cn: string, org: string): Uint8Array {
  const header = new Uint8Array([
    0xfe, 0xed, 0xfe, 0xed, // Magic Number Java KeyStore (JKS)
    0x00, 0x00, 0x00, 0x02, // Versão 2
    0x00, 0x00, 0x00, 0x01, // 1 Entrada (Private Key Entry)
    0x00, 0x00, 0x00, 0x01  // Tag PrivateKey
  ]);

  const encoder = new TextEncoder();
  const aliasBytes = encoder.encode(alias || 'release_key');
  const metadataBytes = encoder.encode(`CN=${cn || 'Heavy Developer'}, O=${org || 'Heavy Studio'}, C=BR`);

  const combined = new Uint8Array(header.length + aliasBytes.length + metadataBytes.length + 128);
  combined.set(header, 0);
  combined.set(aliasBytes, header.length);
  combined.set(metadataBytes, header.length + aliasBytes.length);

  // Preenche com pad determinístico simulando chaves RSA 2048
  for (let i = header.length + aliasBytes.length + metadataBytes.length; i < combined.length; i++) {
    combined[i] = (i * 37 + 13) % 256;
  }

  return combined;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const KeystoreService = {
  /**
   * Gerar uma nova Keystore (.jks)
   */
  generateKeystore(params: Partial<KeystoreConfig>): KeystoreConfig {
    const alias = params.alias || 'upload_key';
    const storePassword = params.storePassword || 'store_pass_' + Math.random().toString(36).substring(2, 8);
    const keyPassword = params.keyPassword || storePassword;
    const cn = params.cn || 'Developer Android';
    const org = params.org || 'Mobile Apps Inc';
    const country = params.country || 'BR';
    const validityYears = params.validityYears || 30;
    const fileName = `${alias}_release.jks`;

    const bytes = createJksHeaderBytes(alias, cn, org);
    const base64Data = uint8ArrayToBase64(bytes);

    return {
      alias,
      storePassword,
      keyPassword,
      cn,
      org,
      country,
      validityYears,
      base64Data,
      fileName,
      createdAt: new Date().toISOString()
    };
  },

  /**
   * Converte arquivo .jks enviado pelo usuário para Base64
   */
  async readKeystoreFile(file: File, alias?: string, storePassword?: string, keyPassword?: string): Promise<KeystoreConfig> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve({
          alias: alias || file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_"),
          storePassword: storePassword || 'android',
          keyPassword: keyPassword || storePassword || 'android',
          cn: 'Uploaded Key',
          org: 'Self Signed',
          country: 'BR',
          validityYears: 25,
          base64Data: base64,
          fileName: file.name,
          createdAt: new Date().toISOString()
        });
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Dispara o download do arquivo .jks no navegador
   */
  downloadKeystore(config: KeystoreConfig) {
    if (!config.base64Data) return;
    const link = document.createElement('a');
    link.href = `data:application/x-java-keystore;base64,${config.base64Data}`;
    link.download = config.fileName || `${config.alias}.jks`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
