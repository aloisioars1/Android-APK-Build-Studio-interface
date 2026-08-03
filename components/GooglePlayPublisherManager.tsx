import React, { useState } from 'react';
import { AppConfig, GeneratedCode } from '../types';
import {
  validateVersionNumber,
  validateServiceAccountJson,
  uploadToGooglePlayConsole,
  generatePlayPublisherWorkflowYaml
} from '../services/googlePlayPublisher';
import { PlayStoreRolloutManager } from './PlayStoreRolloutManager';
import { PlayStoreChangelogGenerator } from './PlayStoreChangelogGenerator';
import { PlayStoreMockupGenerator } from './PlayStoreMockupGenerator';

interface GooglePlayPublisherManagerProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  generated: GeneratedCode | null;
  setGenerated: React.Dispatch<React.SetStateAction<GeneratedCode | null>>;
  addLog: (msg: string, type?: string) => void;
}

export const GooglePlayPublisherManager: React.FC<GooglePlayPublisherManagerProps> = ({
  config,
  setConfig,
  generated,
  setGenerated,
  addLog
}) => {
  const [subTab, setSubTab] = useState<'publish' | 'changelog' | 'mockups' | 'rollout'>('publish');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishLog, setPublishLog] = useState<string[]>([]);
  const [previousVersionCode, setPreviousVersionCode] = useState<number>(0);

  const selectedTrack = config.playConsoleTrack || 'internal';
  const serviceAccountJson = config.playConsoleServiceAccountJson || '';
  const releaseNotes = config.playConsoleReleaseNotes || 'Nova compilação gerada via Heavy Studio Pro com otimizações e correções.';

  const versionValidation = validateVersionNumber(
    config.versionCode,
    config.versionName,
    config.packageName,
    previousVersionCode
  );

  const jsonValidation = validateServiceAccountJson(serviceAccountJson);

  const tracks: { id: 'internal' | 'alpha' | 'beta' | 'production'; label: string; icon: string; desc: string }[] = [
    { id: 'internal', label: 'Compartilhamento Interno', icon: '🔒', desc: 'Disponível instantaneamente para até 100 testadores internos.' },
    { id: 'alpha', label: 'Teste Fechado (Alpha)', icon: '🧪', desc: 'Acesso controlado por grupos do Google Groups ou e-mails selecionados.' },
    { id: 'beta', label: 'Teste Aberto (Beta)', icon: '🚀', desc: 'Disponível publicamente na Play Store para usuários voluntários.' },
    { id: 'production', label: 'Produção Final', icon: '🌐', desc: 'Lançamento oficial para todos os usuários Android.' },
  ];

  const appendPublishLog = (msg: string) => {
    setPublishLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setConfig(prev => ({ ...prev, playConsoleServiceAccountJson: content }));
        addLog("🔑 Chave de Conta de Serviço do Google Play Console carregada!", "success");
      }
    };
    reader.readAsText(file);
  };

  const handleIncrementVersionCode = () => {
    const currentCode = config.versionCode || 1;
    const nextCode = currentCode + 1;
    const nextName = `1.0.${nextCode}`;
    setConfig(prev => ({
      ...prev,
      versionCode: nextCode,
      versionName: nextName
    }));
    addLog(`📱 Versão atualizada: versionCode ${nextCode}, versionName ${nextName}`, "info");
  };

  const handlePublishToPlayConsole = async () => {
    if (!generated) {
      addLog("Gere o código do projeto primeiro para exportar o arquivo AAB.", "error");
      return;
    }

    if (!versionValidation.isValid) {
      addLog("Corrija os erros de validação de versão antes de publicar.", "error");
      return;
    }

    if (!jsonValidation.isValid) {
      addLog("Forneça uma chave de Conta de Serviço do Google Play Console válida.", "error");
      return;
    }

    setIsPublishing(true);
    setPublishLog([]);
    appendPublishLog("🚀 Iniciando publicação no Google Play Console via Android Publisher API v3...");

    try {
      const result = await uploadToGooglePlayConsole(
        {
          packageName: config.packageName,
          versionCode: config.versionCode || 1,
          versionName: config.versionName || '1.0.0',
          track: selectedTrack,
          serviceAccountJson: serviceAccountJson,
          releaseNotes: releaseNotes
        },
        (msg, type) => {
          appendPublishLog(msg);
          addLog(msg, type);
        }
      );

      if (result.success) {
        setPreviousVersionCode(config.versionCode || 1);
        appendPublishLog(`🎉 Publicação concluída na faixa ${selectedTrack.toUpperCase()}! Edit ID: ${result.editId}`);
      }
    } catch (err: any) {
      appendPublishLog(`❌ Erro no processo de publicação: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleInjectWorkflow = () => {
    if (!generated) {
      addLog("Gere o projeto primeiro.", "error");
      return;
    }

    const playStepYaml = generatePlayPublisherWorkflowYaml(config);
    const updatedWorkflow = generated.githubWorkflow + "\n" + playStepYaml;

    setGenerated({
      ...generated,
      githubWorkflow: updatedWorkflow
    });

    addLog("🎯 Passos do Google Play Console injetados no workflow do GitHub Actions!", "success");
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-blue-950/80 border border-emerald-500/30 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
            🎯
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              Android Publisher API & Play Console
              <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                API v3 Integration
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Envio de AAB e controle de distribuição de versões (Staged Rollout) na Play Store.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-white/10 shadow-lg">
        <button
          onClick={() => setSubTab('publish')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'publish'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg border border-emerald-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🚀 Upload AAB & Validador</span>
        </button>

        <button
          onClick={() => setSubTab('changelog')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'changelog'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-blue-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🤖 Release Notes (IA Changelog)</span>
        </button>

        <button
          onClick={() => setSubTab('mockups')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'mockups'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg border border-purple-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>📱 Mockups & Screenshots (IA)</span>
        </button>

        <button
          onClick={() => setSubTab('rollout')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'rollout'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg border border-indigo-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>📊 Rollout ({Math.round((config.playConsoleUserFraction || 0.10) * 100)}%)</span>
        </button>
      </div>

      {subTab === 'changelog' ? (
        <PlayStoreChangelogGenerator
          config={config}
          setConfig={setConfig}
          generated={generated}
          addLog={addLog}
        />
      ) : subTab === 'mockups' ? (
        <PlayStoreMockupGenerator
          config={config}
          setConfig={setConfig}
          generated={generated}
          addLog={addLog}
        />
      ) : subTab === 'rollout' ? (
        <PlayStoreRolloutManager
          config={config}
          setConfig={setConfig}
          addLog={addLog}
        />
      ) : (
        <>
          {/* Grid: Version Validator & Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Validador de Versão */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>📊</span> Validador de Versão do App
                  </h4>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                    versionValidation.isValid
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    {versionValidation.isValid ? '✓ APROVADO PLAY STORE' : '❌ REPROVADO'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[8px] font-bold uppercase text-slate-400 block mb-1">versionCode (Inteiro)</label>
                    <input
                      type="number"
                      value={config.versionCode || 1}
                      onChange={e => setConfig({ ...config, versionCode: parseInt(e.target.value) || 1 })}
                      className="w-full bg-black/40 p-2 rounded-xl border border-white/10 text-[11px] font-mono font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-bold uppercase text-slate-400 block mb-1">versionName (SemVer)</label>
                    <input
                      type="text"
                      value={config.versionName || '1.0.0'}
                      onChange={e => setConfig({ ...config, versionName: e.target.value })}
                      className="w-full bg-black/40 p-2 rounded-xl border border-white/10 text-[11px] font-mono font-bold outline-none focus:border-emerald-500"
                      placeholder="1.0.0"
                    />
                  </div>
                </div>

                {/* Validation Feedback Messages */}
                <div className="space-y-1 bg-black/30 p-2.5 rounded-xl border border-white/5 text-[9px] font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Package Name:</span>
                    <span className="text-white font-bold">{config.packageName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Faixa Recomendada:</span>
                    <span className="text-emerald-400 font-bold uppercase">{versionValidation.details.recommendedTrack}</span>
                  </div>

                  {versionValidation.errors.map((err, idx) => (
                    <p key={idx} className="text-rose-400 flex items-center gap-1 mt-1">
                      <span>⚠️</span> {err}
                    </p>
                  ))}

                  {versionValidation.warnings.map((warn, idx) => (
                    <p key={idx} className="text-amber-400 flex items-center gap-1 mt-1">
                      <span>💡</span> {warn}
                    </p>
                  ))}
                </div>
              </div>

              <button
                onClick={handleIncrementVersionCode}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <span>➕ Incremento Automático (versionCode +1)</span>
              </button>
            </div>

            {/* Card 2: Service Account JSON */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>🔑</span> Conta de Serviço Google Play
                  </h4>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                    jsonValidation.isValid
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {jsonValidation.isValid ? '✓ CHAVE VÁLIDA' : '⚠️ CHAVE PENDENTE'}
                  </span>
                </div>

                <p className="text-[9px] text-slate-400 leading-tight mb-2">
                  Chave JSON de Conta de Serviço do Google Cloud habilitada para a Android Publisher API.
                </p>

                {jsonValidation.isValid ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl space-y-1 text-[9px] font-mono">
                    <p className="text-emerald-300 font-bold truncate">✉️ {jsonValidation.clientEmail}</p>
                    <p className="text-slate-400">ID do Projeto GCP: <span className="text-slate-200">{jsonValidation.projectId}</span></p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="service-account-upload"
                    />
                    <label
                      htmlFor="service-account-upload"
                      className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors bg-black/20 text-[9.5px] text-slate-300 font-bold uppercase"
                    >
                      <span>📂 Importar arquivo .json da Chave</span>
                    </label>
                  </div>
                )}

                <div className="mt-2">
                  <textarea
                    value={serviceAccountJson}
                    onChange={e => setConfig({ ...config, playConsoleServiceAccountJson: e.target.value })}
                    placeholder='Cole o conteúdo do JSON da Service Account aqui...'
                    rows={3}
                    className="w-full bg-black/40 p-2 rounded-xl border border-white/5 text-[9px] font-mono text-slate-300 outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <p className="text-[8px] text-slate-500 italic">
                🔒 As credenciais são mantidas estritamente no seu ambiente local/seguro.
              </p>
            </div>
          </div>

          {/* Track Selection & Release Notes */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🎯</span> Selecionar Faixa de Teste na Play Store
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {tracks.map(track => (
                <button
                  key={track.id}
                  onClick={() => setConfig({ ...config, playConsoleTrack: track.id })}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                    selectedTrack === track.id
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-lg ring-1 ring-emerald-500/30'
                      : 'bg-black/30 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{track.icon}</span>
                    {selectedTrack === track.id && (
                      <span className="text-[7px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                        SELECIONADO
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white">{track.label}</p>
                    <p className="text-[8px] text-slate-400 leading-tight mt-0.5">{track.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[8.5px] font-bold uppercase text-slate-400">Notas da Versão (Release Notes)</label>
                <button
                  onClick={() => setSubTab('changelog')}
                  className="text-[9px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/20 transition-colors"
                >
                  <span>🤖 Gerar com IA</span>
                </button>
              </div>
              <input
                type="text"
                value={releaseNotes}
                onChange={e => setConfig({ ...config, playConsoleReleaseNotes: e.target.value })}
                className="w-full bg-black/40 p-2.5 rounded-xl border border-white/10 text-[10px] text-white outline-none focus:border-emerald-500 font-mono"
                placeholder="Descreva as novidades desta compilação..."
              />
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePublishToPlayConsole}
              disabled={isPublishing || !generated || !versionValidation.isValid || !jsonValidation.isValid}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
                isPublishing || !generated || !versionValidation.isValid || !jsonValidation.isValid
                  ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/30'
              }`}
            >
              {isPublishing ? (
                <>
                  <span className="animate-spin">🌀</span>
                  <span>Publicando na Android Publisher API...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Publicar AAB no Google Play Console ({selectedTrack.toUpperCase()})</span>
                </>
              )}
            </button>

            <button
              onClick={() => setSubTab('rollout')}
              className="py-3 px-4 bg-purple-600/80 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-purple-400/30 transition-all flex items-center gap-1.5"
            >
              <span>📊</span>
              <span>Gerenciar Rollout (10% - 100%)</span>
            </button>

            <button
              onClick={handleInjectWorkflow}
              disabled={!generated}
              className="py-3 px-4 bg-blue-600/80 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-blue-400/30 transition-all flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Injetar Workflow CI/CD</span>
            </button>
          </div>

          {/* Live Log Console */}
          {publishLog.length > 0 && (
            <div className="bg-black/90 border border-emerald-500/30 rounded-2xl p-3 font-mono text-[9.5px] space-y-1 max-h-48 overflow-y-auto scrollbar-thin shadow-2xl">
              <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider border-b border-white/10 pb-1 mb-1">
                Console de Execução - Android Publisher API
              </p>
              {publishLog.map((log, idx) => (
                <p key={idx} className="text-slate-300 leading-snug">
                  {log}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GooglePlayPublisherManager;
