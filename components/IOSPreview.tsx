
import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { AppConfig, AppAsset, UIComponent, ConversationMessage } from '../types';
import { Icons } from '../constants';
import { generateIcon } from '../utils/iconGenerator';

interface IOSPreviewProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  handleAiGenerate: () => Promise<void>;
  conversationHistory: ConversationMessage[];
  attachments: AppAsset[];
  setAttachments: React.Dispatch<React.SetStateAction<AppAsset[]>>;
  isProcessing: boolean;
  isListening: boolean;
  toggleMic: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const IOSPreview: React.FC<IOSPreviewProps> = ({ 
  config, aiPrompt, setAiPrompt, handleAiGenerate, conversationHistory, attachments, setAttachments,
  isProcessing, isListening, toggleMic, fileInputRef
}) => {
  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState<'chat' | 'app'>('app'); 
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const [appIconSrc, setAppIconSrc] = useState<string | null>(null);
  const [showSendTooltip, setShowSendTooltip] = useState<boolean>(false);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      setScale(Math.min(containerRef.current.clientHeight / 800, containerRef.current.clientWidth / 400, 1)); 
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const updateIcon = async () => {
      const imgData = config.iconType === 'image' && config.uploadedIcon ? config.uploadedIcon.data : undefined;
      const b64 = await generateIcon(config.iconLabel, config.iconColor, config.iconTextColor, 64, false, imgData);
      setAppIconSrc(`data:image/png;base64,${b64}`);
    };
    updateIcon();
  }, [conversationHistory, viewMode, config.iconLabel, config.iconColor, config.iconType, config.uploadedIcon]);

  const isDark = config.theme === 'dark';
  const bgColor = isDark ? 'bg-black' : 'bg-[#F2F2F7]';
  const textColor = isDark ? 'text-white' : 'text-black';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const accent = config.iconColor || '#007AFF';

  const renderAppUI = () => {
    if (!config.components || config.components.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-500/10 flex items-center justify-center text-gray-500">
             <Icons.Apple />
          </div>
          <p className={`text-sm font-semibold ${textColor}`}>SwiftUI Canvas</p>
          <p className={`text-xs mt-2 ${subTextColor}`}>No components generated for iOS platform yet.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {config.components.map((comp, idx) => {
          switch (comp.type) {
            case 'text': return <p key={idx} className={`text-[17px] leading-tight font-normal ${textColor}`}>{comp.label}</p>;
            case 'button': return (
                <button key={idx} className="w-full py-3 rounded-xl text-white font-semibold text-[17px] active:opacity-70 transition-opacity" style={{ backgroundColor: comp.color || accent }}>
                  {comp.label}
                </button>
              );
            case 'input': return (
                <div key={idx} className="space-y-1">
                  <label className={`text-[13px] font-medium ml-1 ${subTextColor}`}>{comp.label}</label>
                  <input type="text" readOnly value={String(comp.value || '')} placeholder="Enter text..." className={`w-full p-3 rounded-xl ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'} border-none text-[17px] ${textColor} focus:ring-0 shadow-sm`} />
                </div>
              );
            case 'switch': return (
                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'} shadow-sm`}>
                  <span className={`text-[17px] font-medium ${textColor}`}>{comp.label}</span>
                  <div className={`w-12 h-7 rounded-full relative transition-colors cursor-pointer ${comp.value ? 'bg-[#34C759]' : 'bg-gray-300'}`}>
                     <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-md transition-all ${comp.value ? 'right-0.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
              );
            case 'progress': return (
              <div key={idx} className="space-y-1">
                <div className="w-full h-1 bg-gray-300 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${comp.value || 50}%`, backgroundColor: accent }}></div>
                </div>
              </div>
            );
            case 'spacer': return <div key={idx} style={{ height: (Number(comp.value) || 20) + 'px' }} />;
            default: return null;
          }
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <div style={{ transform: `scale(${scale})` }} className="w-[375px] h-[812px] bg-black rounded-[50px] p-2.5 shadow-2xl border-[8px] border-[#1f1f1f] relative">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-[20px] z-50 flex items-center justify-center">
           <div className="w-3 h-3 bg-[#0a0a0a] rounded-full mr-2 shadow-inner"></div>
        </div>
        
        {/* iOS Style Lightbox */}
        {expandedImage && (
          <div 
            className="absolute inset-0 z-[100] bg-black flex flex-col rounded-[42px] animate-in slide-in-from-bottom-10 duration-300"
            onClick={() => setExpandedImage(null)}
          >
            <div className="flex justify-end p-8 pt-12">
               <button className="text-white text-[17px] font-semibold">OK</button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
               <img src={expandedImage} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="iOS Expand" />
            </div>
            <div className="h-20" />
          </div>
        )}

        <div className={`w-full h-full ${bgColor} rounded-[42px] overflow-hidden flex flex-col relative`}>
          <div className="h-12 shrink-0 flex items-end justify-between px-8 pb-1">
             <span className={`text-[12px] font-bold ${textColor}`}>9:41</span>
             <div className="flex gap-1.5 items-center">
                <div className={`w-4 h-2 rounded-[1px] border border-current opacity-60 relative`}>
                   <div className="absolute top-[1px] left-[1px] bottom-[1px] bg-current rounded-[1px]" style={{ width: '80%' }}></div>
                </div>
             </div>
          </div>

          <header className={`px-6 py-4 flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-3">
              {appIconSrc ? (
                <img src={appIconSrc} className="w-8 h-8 rounded-[8px] shadow-sm" alt="Icon" />
              ) : (
                <div className="w-8 h-8 rounded-[8px] bg-gray-500/20" />
              )}
              <h1 className={`text-[17px] font-bold ${textColor} truncate max-w-[120px]`}>{config.appName}</h1>
            </div>
            <div className={`flex bg-gray-500/10 p-1 rounded-xl`}>
              <button onClick={() => setViewMode('chat')} className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${viewMode === 'chat' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>Chat</button>
              <button onClick={() => setViewMode('app')} className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${viewMode === 'app' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>Preview</button>
            </div>
          </header>
          
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {viewMode === 'app' ? renderAppUI() : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-transparent">
                {conversationHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm leading-tight ${msg.role === 'user' 
                      ? 'bg-[#007AFF] text-white rounded-br-sm' 
                      : `${isDark ? 'bg-[#1C1C1E] text-gray-200' : 'bg-white text-black border border-gray-100'} rounded-bl-sm`}`}
                      style={{ backgroundColor: msg.role === 'user' ? accent : undefined }}
                    >
                      <p>{msg.text}</p>
                      
                      {/* iOS Style Attachment Carousel */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
                          {msg.attachments.map((att, idx) => {
                            const imgSrc = `data:${att.mimeType};base64,${att.data}`;
                            return (
                              <div 
                                key={idx} 
                                className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-lg cursor-pointer active:scale-95 transition-transform snap-center"
                                onClick={() => setExpandedImage(imgSrc)}
                              >
                                <img src={imgSrc} className="w-full h-full object-cover" alt="iOS Attachment" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isProcessing && <div className="text-[12px] text-blue-500 font-semibold animate-pulse px-4">Connecting to core...</div>}
                <div ref={chatMessagesEndRef}></div>
              </div>
            )}
          </div>

          <footer className={`p-4 pb-8 ${isDark ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-xl shrink-0`}>
            {/* Refactored Input area attachments preview */}
            {attachments.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-2 snap-x">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-[18px] overflow-hidden border-2 border-[#007AFF] shrink-0 shadow-lg snap-center animate-in slide-in-from-bottom-2 duration-300">
                    <img src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover" alt="iOS Pre" />
                    <button 
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/40 hover:bg-black/60 text-white p-1 rounded-full backdrop-blur-md border border-white/20 transition-all active:scale-75"
                    >
                      <Icons.X />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="text-[#007AFF]"><Icons.Paperclip /></button>
              <div className={`flex-1 flex items-center px-4 py-2 rounded-full ${isDark ? 'bg-[#1C1C1E]' : 'bg-gray-100'} border border-transparent shadow-inner`}>
                <input 
                  type="text" 
                  placeholder="Swift Command..."
                  className={`bg-transparent outline-none text-[15px] w-full ${textColor}`} 
                  value={aiPrompt} 
                  onChange={e => setAiPrompt(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAiGenerate()} 
                />
              </div>
              <div className="relative flex items-center justify-center">
                {showSendTooltip && (
                  <div className="absolute bottom-11 right-0 w-60 p-2.5 bg-black/95 text-white text-[10px] rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
                    <div className="flex items-center gap-1.5 font-bold text-[#007AFF] mb-1 pb-1 border-b border-white/10">
                      <Icons.Sparkles />
                      <span>Processamento de Comando</span>
                    </div>
                    <p className="leading-snug text-gray-200">
                      Dispara a ação de <strong>gerar ou processar o contexto atual</strong> (prompt, anexos e histórico).
                    </p>
                    <div className="absolute -bottom-1 right-3 w-2.5 h-2.5 bg-black/95 border-r border-b border-white/20 rotate-45" />
                  </div>
                )}

                <button 
                  onClick={handleAiGenerate} 
                  onMouseEnter={() => setShowSendTooltip(true)}
                  onMouseLeave={() => setShowSendTooltip(false)}
                  onClickCapture={() => setShowSendTooltip(false)}
                  disabled={isProcessing} 
                  title="Dispara a geração ou processamento do contexto atual"
                  aria-label="Gerar e processar contexto atual"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md active:opacity-70 transition-opacity relative" 
                  style={{ backgroundColor: accent }}
                >
                  <Icons.Sparkles />
                </button>
              </div>
            </div>
            <div className="mt-4 w-32 h-1.5 bg-gray-500/30 rounded-full mx-auto"></div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default IOSPreview;
