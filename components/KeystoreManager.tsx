import React, { useState } from 'react';
import { AppConfig } from '../types';
import { KeystoreService, KeystoreConfig } from '../services/keystoreService';
import { Icons } from '../constants';

interface KeystoreManagerProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  addLog: (msg: string, type?: string) => void;
}

export const KeystoreManager: React.FC<KeystoreManagerProps> = ({ config, setConfig, addLog }) => {
  const [mode, setMode] = useState<'status' | 'generate' | 'upload'>('status');

  // Generator form state
  const [alias, setAlias] = useState(config.keystoreAlias || 'upload_key');
  const [storePassword, setStorePassword] = useState(config.keystoreStorePassword || 'store_pass_' + Math.random().toString(36).substring(2, 7));
  const [keyPassword, setKeyPassword] = useState(config.keystoreKeyPassword || storePassword);
  const [cn, setCn] = useState(config.keystoreCn || 'Heavy Studio Developer');
  const [org, setOrg] = useState(config.keystoreOrg || 'Heavy Mobile Inc');
  const [validityYears, setValidityYears] = useState(30);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAlias, setUploadAlias] = useState('');
  const [uploadStorePass, setUploadStorePass] = useState('');
  const [uploadKeyPass, setUploadKeyPass] = useState('');

  const [copied, setCopied] = useState(false);

  const hasActiveKeystore = Boolean(config.keystoreBase64 || config.keystoreAlias);

  const handleGenerate = () => {
    try {
      addLog("Gerando nova chave de assinatura Android Keystore (.jks)...", "info");
      const generated = KeystoreService.generateKeystore({
        alias,
        storePassword,
        keyPassword,
        cn,
        org,
        validityYears
      });

      setConfig(prev => ({
        ...prev,
        keystoreAlias: generated.alias,
        keystoreStorePassword: generated.storePassword,
        keystoreKeyPassword: generated.keyPassword,
        keystoreBase64: generated.base64Data,
        keystoreFileName: generated.fileName,
        keystoreCn: generated.cn,
        keystoreOrg: generated.org,
        autoSignRelease: true
      }));

      addLog(`Keystore '${generated.fileName}' gerada com sucesso!`, "success");
      KeystoreService.downloadKeystore(generated);
      setMode('status');
    } catch (e: any) {
      addLog(`Erro ao gerar Keystore: ${e.message}`, "error");
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      addLog("Por favor selecione um arquivo .jks ou .keystore.", "error");
      return;
    }
    try {
      addLog(`Carregando Keystore ${uploadFile.name}...`, "info");
      const loaded = await KeystoreService.readKeystoreFile(
        uploadFile,
        uploadAlias || undefined,
        uploadStorePass || undefined,
        uploadKeyPass || undefined
      );

      setConfig(prev => ({
        ...prev,
        keystoreAlias: loaded.alias,
        keystoreStorePassword: loaded.storePassword,
        keystoreKeyPassword: loaded.keyPassword,
        keystoreBase64: loaded.base64Data,
        keystoreFileName: loaded.fileName,
        autoSignRelease: true
      }));

      addLog(`Keystore '${loaded.fileName}' carregada com sucesso!`, "success");
      setMode('status');
    } catch (e: any) {
      addLog(`Erro ao processar arquivo Keystore: ${e.message}`, "error");
    }
  };

  const handleDownloadActive = () => {
    if (!config.keystoreBase64) return;
    KeystoreService.downloadKeystore({
      alias: config.keystoreAlias || 'release_key',
      storePassword: config.keystoreStorePassword || 'password',
      keyPassword: config.keystoreKeyPassword || 'password',
      cn: config.keystoreCn || 'Developer',
      org: config.keystoreOrg || 'Company',
      country: 'BR',
      validityYears: 30,
      base64Data: config.keystoreBase64,
      fileName: config.keystoreFileName || `${config.keystoreAlias || 'release'}.jks`
    });
    addLog("Download da Keystore ativo iniciado.", "info");
  };

  const handleCopyBase64 = () => {
    if (!config.keystoreBase64) return;
    navigator.clipboard.writeText(config.keystoreBase64);
    setCopied(true);
    addLog("Base64 da Keystore copiada para a área de transferência!", "success");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-[#0f172a]/90 rounded-2xl border border-blue-500/30 p-5 shadow-2xl space-y-6 my-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              🔐
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Assinatura de Aplicativos Android</span>
          </div>
          <h3 className="text-base font-extrabold text-white tracking-tight">Gerenciador de Keystore (.jks)</h3>
          <p className="text-xs text-slate-400">
            Gere ou envie sua chave Keystore digital para assinar automaticamente arquivos APK e AAB (App Bundle) para a Google Play Store.
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5 shrink-0">
          <button
            onClick={() => setMode('status')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'status' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setMode('generate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'generate' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            + Gerar Nova Chave
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            📤 Upload .jks
          </button>
        </div>
      </div>

      {/* Mode 1: Status & Active Keystore */}
      {mode === 'status' && (
        <div className="space-y-5">
          {hasActiveKeystore ? (
            <div className="bg-black/40 rounded-2xl border border-emerald-500/30 p-5 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Keystore Ativa e Configurada</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{config.keystoreFileName || 'release.jks'}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Key Alias</span>
                  <p className="font-mono text-slate-200 font-bold">{config.keystoreAlias || 'Nenhum'}</p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Store Password</span>
                  <p className="font-mono text-slate-200 font-bold">••••••••••••</p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Key Password</span>
                  <p className="font-mono text-slate-200 font-bold">••••••••••••</p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Organização / Desenvolvedor</span>
                  <p className="font-mono text-slate-200 font-bold">{config.keystoreCn || 'Heavy Studio'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleDownloadActive}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>⬇ Download Arquivo (.jks)</span>
                </button>

                <button
                  onClick={handleCopyBase64}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-2"
                >
                  <span>{copied ? '✓ Copiado!' : '📋 Copiar Base64 (Secrets)'}</span>
                </button>

                <button
                  onClick={() => {
                    setConfig(prev => ({
                      ...prev,
                      keystoreBase64: undefined,
                      keystoreAlias: undefined,
                      keystoreStorePassword: undefined,
                      keystoreKeyPassword: undefined,
                      autoSignRelease: false
                    }));
                    addLog("Keystore removida das configurações.", "info");
                  }}
                  className="px-3 py-2 text-rose-400 hover:text-rose-300 text-xs font-bold"
                >
                  Remover Keystore
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-black/30 rounded-2xl border border-dashed border-white/10 p-6 space-y-4">
              <div className="text-3xl">🔑</div>
              <h4 className="text-sm font-bold text-white">Nenhuma chave Keystore configurada</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Para publicar seu aplicativo Android na Google Play Store, você precisa assinar digitalmente o APK ou AAB. Crie uma nova chave ou faça upload da sua chave existente.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setMode('generate')}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg"
                >
                  + Gerar Nova Keystore
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-white/10"
                >
                  Upload .jks Existente
                </button>
              </div>
            </div>
          )}

          {/* GitHub Actions Secrets Guide */}
          <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <span>⚙️ Configuração no GitHub Secrets (CI/CD Automático)</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O pipeline de GitHub Actions lê automaticamente os dados de assinatura das <strong>Secrets</strong> do repositório:
            </p>
            <div className="font-mono text-[10px] bg-black/60 p-3 rounded-lg text-slate-300 space-y-1 overflow-x-auto border border-white/5">
              <div><strong className="text-purple-400">KEYSTORE_BASE64</strong> = {config.keystoreBase64 ? `${config.keystoreBase64.substring(0, 24)}...` : '(Base64 do arquivo .jks)'}</div>
              <div><strong className="text-purple-400">KEYSTORE_KEY_ALIAS</strong> = {config.keystoreAlias || 'upload_key'}</div>
              <div><strong className="text-purple-400">KEYSTORE_STORE_PASSWORD</strong> = {config.keystoreStorePassword || '••••••••'}</div>
              <div><strong className="text-purple-400">KEYSTORE_KEY_PASSWORD</strong> = {config.keystoreKeyPassword || '••••••••'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Generate Keystore */}
      {mode === 'generate' && (
        <div className="space-y-4 bg-black/30 p-5 rounded-2xl border border-white/10">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>✨ Gerar Nova Keystore (.jks)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Key Alias</label>
              <input
                type="text"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                placeholder="ex: release_alias"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Store Password</label>
              <input
                type="text"
                value={storePassword}
                onChange={e => setStorePassword(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Key Password</label>
              <input
                type="text"
                value={keyPassword}
                onChange={e => setKeyPassword(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Nome do Desenvolvedor (CN)</label>
              <input
                type="text"
                value={cn}
                onChange={e => setCn(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Organização (O)</label>
              <input
                type="text"
                value={org}
                onChange={e => setOrg(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Validade (Anos)</label>
              <input
                type="number"
                value={validityYears}
                onChange={e => setValidityYears(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <button
              onClick={() => setMode('status')}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg"
            >
              🔑 Gerar & Baixar Keystore
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: Upload Existing Keystore */}
      {mode === 'upload' && (
        <div className="space-y-4 bg-black/30 p-5 rounded-2xl border border-white/10">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>📤 Upload de Keystore (.jks / .keystore)</span>
          </h4>

          <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 text-center hover:border-blue-500 transition-all cursor-pointer relative bg-slate-900/50">
            <input
              type="file"
              accept=".jks,.keystore,.ks"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setUploadFile(e.target.files[0]);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {uploadFile ? (
              <div className="space-y-1">
                <span className="text-emerald-400 text-lg font-bold">✓ {uploadFile.name}</span>
                <p className="text-[10px] text-slate-400">({(uploadFile.size / 1024).toFixed(1)} KB)</p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-2xl">📁</span>
                <p className="text-xs font-bold text-slate-200">Clique ou arraste o arquivo .jks aqui</p>
                <p className="text-[10px] text-slate-500">Suporta arquivos .jks, .keystore e .ks</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Alias da Chave</label>
              <input
                type="text"
                value={uploadAlias}
                onChange={e => setUploadAlias(e.target.value)}
                placeholder="ex: upload"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Store Password</label>
              <input
                type="password"
                value={uploadStorePass}
                onChange={e => setUploadStorePass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Key Password</label>
              <input
                type="password"
                value={uploadKeyPass}
                onChange={e => setUploadKeyPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <button
              onClick={() => setMode('status')}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleUploadSubmit}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg"
            >
              Salvar Keystore
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeystoreManager;
