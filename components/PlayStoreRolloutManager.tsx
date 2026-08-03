import React, { useState } from 'react';
import { AppConfig } from '../types';
import { updatePlayStoreRollout, validateServiceAccountJson } from '../services/googlePlayPublisher';

interface PlayStoreRolloutManagerProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  addLog: (msg: string, type?: string) => void;
}

export const PlayStoreRolloutManager: React.FC<PlayStoreRolloutManagerProps> = ({
  config,
  setConfig,
  addLog
}) => {
  const [updating, setUpdating] = useState<boolean>(false);
  const [selectedPercentage, setSelectedPercentage] = useState<number>(
    Math.round((config.playConsoleUserFraction || 0.10) * 100)
  );

  const currentTrack = config.playConsoleTrack || 'production';
  const serviceAccountJson = config.playConsoleServiceAccountJson || '';
  const jsonValidation = validateServiceAccountJson(serviceAccountJson);
  const currentStatus = config.playConsoleReleaseStatus || 'inProgress';
  const currentFraction = config.playConsoleUserFraction || (selectedPercentage / 100);

  const history = config.playConsoleRolloutHistory || [];

  const handleApplyRollout = async (percentage: number, status: 'inProgress' | 'halted' | 'completed' = 'inProgress') => {
    if (!jsonValidation.isValid) {
      addLog("Forneça uma chave de Conta de Serviço do Google Play Console válida para alterar o rollout.", "error");
      return;
    }

    setUpdating(true);
    const fraction = status === 'completed' ? 1.0 : percentage / 100;

    try {
      const result = await updatePlayStoreRollout(
        {
          packageName: config.packageName,
          versionCode: config.versionCode || 1,
          versionName: config.versionName || '1.0.0',
          track: currentTrack,
          userFraction: fraction,
          status,
          serviceAccountJson,
          notes: config.playConsoleReleaseNotes
        },
        addLog
      );

      if (result.success) {
        const newHistoryItem = {
          id: result.editId,
          versionCode: config.versionCode || 1,
          versionName: config.versionName || '1.0.0',
          track: currentTrack,
          userFraction: fraction,
          status: status,
          timestamp: Date.now(),
          notes: config.playConsoleReleaseNotes
        };

        setConfig(prev => ({
          ...prev,
          playConsoleUserFraction: fraction,
          playConsoleReleaseStatus: status,
          playConsoleRolloutHistory: [newHistoryItem, ...(prev.playConsoleRolloutHistory || [])]
        }));

        setSelectedPercentage(Math.round(fraction * 100));
        addLog(`🎉 Rollout da versão v${config.versionName} atualizado para ${Math.round(fraction * 100)}% (${status.toUpperCase()})!`, "success");
      }
    } catch (err: any) {
      addLog(`❌ Falha ao atualizar rollout no Google Play: ${err.message}`, "error");
    } finally {
      setUpdating(false);
    }
  };

  const estimatedUsers = Math.round((selectedPercentage / 100) * 150000);

  return (
    <div className="bg-[#0f172a]/90 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-5 text-slate-200 shadow-2xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-lg shrink-0">
            📊
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              Gerenciamento de Staged Rollout (Play Store)
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                currentStatus === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : currentStatus === 'halted'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}>
                {currentStatus === 'completed' ? '100% CONCLUÍDO' : currentStatus === 'halted' ? 'PAUSADO (HALTED)' : `${Math.round(currentFraction * 100)}% EM ANDAMENTO`}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Controle a distribuição gradual de versões para usuários na Android Publisher API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
          <span className="text-slate-400">Faixa:</span>
          <span className="text-emerald-400 font-bold uppercase">{currentTrack}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Versão:</span>
          <span className="text-white font-bold">v{config.versionName || '1.0.0'} ({config.versionCode || 1})</span>
        </div>
      </div>

      {/* Visual Rollout Progress & Slider Card */}
      <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <span>🎯</span> Percentual de Usuários no Staged Rollout
          </span>
          <span className="text-lg font-black text-emerald-400 font-mono">
            {selectedPercentage}%
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div className="relative w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-white/10 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-[8px] font-black text-black font-mono ${
              currentStatus === 'halted'
                ? 'bg-gradient-to-r from-rose-600 to-amber-500'
                : selectedPercentage === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 animate-pulse'
            }`}
            style={{ width: `${Math.max(4, selectedPercentage)}%` }}
          >
            {selectedPercentage > 15 && `${selectedPercentage}%`}
          </div>
        </div>

        {/* Preset Percentage Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[5, 10, 20, 50, 100].map(pct => (
            <button
              key={pct}
              onClick={() => setSelectedPercentage(pct)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all border ${
                selectedPercentage === pct
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg scale-105'
                  : 'bg-slate-900 text-slate-400 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              {pct === 100 ? '100% (Total)' : `${pct}%`}
            </button>
          ))}
        </div>

        {/* Custom Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span>1% (Piloto)</span>
            <span>50% (Metade)</span>
            <span>100% (Lançamento Global)</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={selectedPercentage}
            onChange={e => setSelectedPercentage(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* Action Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button
          onClick={() => handleApplyRollout(selectedPercentage, 'inProgress')}
          disabled={updating || !jsonValidation.isValid}
          className="py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg transition-all border border-blue-400/30 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <span>⚡ Aplicar Rollout ({selectedPercentage}%)</span>
        </button>

        <button
          onClick={() => handleApplyRollout(selectedPercentage, 'halted')}
          disabled={updating || !jsonValidation.isValid || currentStatus === 'halted'}
          className="py-2.5 px-3 bg-rose-950/80 hover:bg-rose-900 disabled:bg-slate-800 text-rose-300 rounded-xl text-[10px] font-black uppercase tracking-wider border border-rose-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <span>⏸️ Pausar Rollout (Halt)</span>
        </button>

        <button
          onClick={() => handleApplyRollout(selectedPercentage, 'inProgress')}
          disabled={updating || !jsonValidation.isValid || currentStatus !== 'halted'}
          className="py-2.5 px-3 bg-amber-950/80 hover:bg-amber-900 disabled:bg-slate-800 text-amber-300 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <span>▶️ Retomar Rollout</span>
        </button>

        <button
          onClick={() => handleApplyRollout(100, 'completed')}
          disabled={updating || !jsonValidation.isValid}
          className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg border border-emerald-400/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <span>🚀 Promover a 100%</span>
        </button>
      </div>

      {/* Simulated Play Vitals & Safety Health Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
          <p className="text-[8.5px] font-bold text-slate-400 uppercase">Alcance Estimado</p>
          <p className="text-base font-black text-white font-mono">~{estimatedUsers.toLocaleString()} usuários</p>
          <p className="text-[8px] text-slate-500">Base total estimada em ~150k</p>
        </div>

        <div className="bg-black/30 p-3 rounded-xl border border-emerald-500/20 space-y-1">
          <p className="text-[8.5px] font-bold text-emerald-400 uppercase">Sessões Sem Crash (Vitals)</p>
          <p className="text-base font-black text-emerald-300 font-mono">99.88% ✓</p>
          <p className="text-[8px] text-slate-500">Limite mínimo recomendado: 99.0%</p>
        </div>

        <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
          <p className="text-[8.5px] font-bold text-slate-400 uppercase">Taxa de ANR (Congelamento)</p>
          <p className="text-base font-black text-blue-300 font-mono">0.01%</p>
          <p className="text-[8px] text-slate-500">Abaixo do limite de má qualidade (0.47%)</p>
        </div>
      </div>

      {/* Release Rollout History Log */}
      {history.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <span>📜</span> Histórico de Atualizações do Staged Rollout
          </h4>

          <div className="bg-black/40 rounded-xl border border-white/5 p-2 space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
            {history.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-slate-900/60 rounded-lg text-[10px] font-mono border border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    item.status === 'completed' ? 'bg-emerald-400' : item.status === 'halted' ? 'bg-rose-500' : 'bg-blue-400'
                  }`} />
                  <span className="font-bold text-white">v{item.versionName}</span>
                  <span className="text-slate-400">({Math.round(item.userFraction * 100)}%)</span>
                  <span className="text-slate-500 uppercase">[{item.status}]</span>
                </div>

                <div className="flex items-center gap-3 text-slate-500">
                  <span className="text-[8px] text-slate-400">Edit: #{item.id}</span>
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayStoreRolloutManager;
