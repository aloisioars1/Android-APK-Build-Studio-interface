
// services/pwaGenerator.ts

import { AppConfig } from '../types';
import { generateIcon } from '../utils/iconGenerator';

interface PWAAssets {
  manifestJson: string;
  pwaIcon192Png: string;
  pwaIcon512Png: string;
  pwaIconMaskable512Png: string;
}

export const generatePWAAssets = async (config: AppConfig): Promise<PWAAssets> => {
  const { appName, iconLabel, iconColor, iconTextColor } = config;

  // Determinar dados de imagem caso o ícone seja do tipo imagem
  const imageDataForPWA = config.iconType === 'image' && config.uploadedIcon ? config.uploadedIcon.data : undefined;

  /**
   * Refatoração de Cores PWA:
   * 1. Ícones 'any': Background = iconTextColor | Símbolo = iconColor
   * 2. Ícone 'maskable': Background = iconColor | Símbolo = iconTextColor
   */
  
  // Geração dos ícones de uso geral ('any')
  // Estes ícones aparecem em contextos onde o fundo pode variar, usamos a cor de texto como fundo para contraste
  const pwaIcon192Png = await generateIcon(
    iconLabel, 
    iconTextColor, // Cor de fundo (inversa para destaque)
    iconColor,     // Cor do símbolo/texto (cor da marca)
    192, 
    false, 
    imageDataForPWA
  );
  
  const pwaIcon512Png = await generateIcon(
    iconLabel, 
    iconTextColor, 
    iconColor, 
    512, 
    false, 
    imageDataForPWA
  );

  // Geração do ícone adaptável ('maskable')
  // O ícone maskable deve preencher toda a área, usamos a cor da marca no fundo
  const pwaIconMaskable512Png = await generateIcon(
    iconLabel, 
    iconColor,     // Cor de fundo (cor da marca)
    iconTextColor, // Cor do símbolo/texto (cor de contraste)
    512, 
    false,         // Mantemos quadrado para que o SO aplique a máscara (círculo, esquilo, etc)
    imageDataForPWA
  );

  const manifestContent = {
    short_name: appName.split(' ')[0],
    name: appName,
    description: "Aplicativo gerado automaticamente com Heavy Mobile Studio AI.",
    icons: [
      {
        src: `data:image/png;base64,${pwaIcon192Png}`,
        sizes: "192x192",
        type: "image/png",
        "purpose": "any" 
      },
      {
        src: `data:image/png;base64,${pwaIcon512Png}`,
        sizes: "512x512",
        type: "image/png",
        "purpose": "any"
      },
      {
        src: `data:image/png;base64,${pwaIconMaskable512Png}`,
        sizes: "512x512",
        type: "image/png",
        "purpose": "maskable"
      }
    ],
    start_url: "./index.html",
    display: "standalone",
    theme_color: config.theme === 'dark' ? '#020617' : '#FFFFFF',
    background_color: config.theme === 'dark' ? '#020617' : '#FFFFFF',
    orientation: "any",
    categories: ["productivity", "developer tools"],
    shortcuts: [
      {
        name: "Novo Projeto",
        url: "/?action=new",
        description: "Iniciar um novo projeto mobile"
      },
      {
        name: "Configurações",
        url: "/?action=settings",
        description: "Ajustar configurações do estúdio"
      }
    ]
  };

  return {
    manifestJson: JSON.stringify(manifestContent, null, 2),
    pwaIcon192Png,
    pwaIcon512Png,
    pwaIconMaskable512Png,
  };
};
