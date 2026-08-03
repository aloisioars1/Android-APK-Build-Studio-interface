import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppConfig } from '../types';
import { GitHubService } from '../services/githubService';
import { Icons } from '../constants';

interface GitHubActionsMonitorProps {
  config: AppConfig;
  addLog: (msg: string, type?: string) => void;
  onSyncGitHub?: () => void;
}

export const GitHubActionsMonitor: React.FC<GitHubActionsMonitorProps> = ({ config, addLog, onSyncGitHub }) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const previousRunsRef = useRef<Record<number, { status: string; conclusion: string | null }>>({});

  const sendOsNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.error("Erro ao disparar notificação do SO:", err);
      }
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      addLog("Notificações do sistema operacional não são suportadas neste navegador.", "error");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        addLog("Notificações do SO ativadas com sucesso para o pipeline!", "success");
        sendOsNotification(
          "🔔 Notificações do CI/CD Ativadas",
          "Você receberá alertas no SO quando o status da compilação mudar."
        );
      } else {
        addLog("Permissão para notificações do SO foi negada no navegador.", "error");
      }
    } catch (e: any) {
      addLog(`Erro ao solicitar permissão de notificação: ${e.message}`, "error");
    }
  };

  const fetchRuns = useCallback(async () => {
    if (!config.githubUser || !config.githubRepo) return;
    setLoading(true);
    try {
      const data = await GitHubService.getWorkflowRuns(config);
      
      // Checar mudança de status para disparar notificações do SO
      if (data && data.length > 0) {
        const prevMap = previousRunsRef.current;
        data.forEach((run: any) => {
          const prev = prevMap[run.id];
          if (prev) {
            const statusChanged = prev.status !== run.status || prev.conclusion !== run.conclusion;
            if (statusChanged) {
              if (run.conclusion === 'success') {
                sendOsNotification(
                  `✅ Pipeline PASSOU: #${run.run_number}`,
                  `Build '${run.display_title || run.name}' concluído com SUCESSO!`
                );
                addLog(`🔔 [Notificação SO] Pipeline #${run.run_number} finalizado com SUCESSO!`, "success");
              } else if (run.conclusion === 'failure') {
                sendOsNotification(
                  `❌ Pipeline FALHOU: #${run.run_number}`,
                  `Build '${run.display_title || run.name}' falhou durante o CI/CD.`
                );
                addLog(`🔔 [Notificação SO] Pipeline #${run.run_number} FALHOU!`, "error");
              } else if (run.status === 'in_progress' && prev.status !== 'in_progress') {
                sendOsNotification(
                  `⏳ Pipeline Iniciado: #${run.run_number}`,
                  `Build '${run.display_title || run.name}' em execução no GitHub Actions...`
                );
                addLog(`🔔 [Notificação SO] Pipeline #${run.run_number} iniciado...`, "info");
              }
            }
          }
        });

        // Atualizar ref com o estado atual
        const newMap: Record<number, { status: string; conclusion: string | null }> = {};
        data.forEach((r: any) => {
          newMap[r.id] = { status: r.status, conclusion: r.conclusion };
        });
        previousRunsRef.current = newMap;
      }

      setRuns(data);
      if (data.length > 0 && !selectedRunId) {
        setSelectedRunId(data[0].id);
      }
    } catch (err: any) {
      addLog(`Erro ao buscar status do GitHub Actions: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [config.githubUser, config.githubRepo, config.githubToken, selectedRunId, addLog]);

  useEffect(() => {
    fetchRuns();
  }, [config.githubUser, config.githubRepo]);

  useEffect(() => {
    if (!autoRefresh || !config.githubUser || !config.githubRepo) return;
    const interval = setInterval(() => {
      fetchRuns();
    }, 12000); // Poll a cada 12 segundos
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRuns, config.githubUser, config.githubRepo]);

  useEffect(() => {
    if (!selectedRunId) return;
    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        const jobData = await GitHubService.getRunJobs(config, selectedRunId);
        setJobs(jobData);
      } catch (err) {
        console.error("Erro ao carregar jobs do workflow:", err);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, [selectedRunId, config]);

  const handleTriggerBuild = async () => {
    setTriggering(true);
    try {
      addLog("Disparando pipeline de CI/CD no GitHub Actions...", "info");
      const success = await GitHubService.triggerWorkflow(config);
      if (success) {
        addLog("Build disparado com sucesso no GitHub Actions!", "success");
        setTimeout(fetchRuns, 2000);
      } else {
        addLog("Não foi possível disparar o build. Verifique as permissões do Token.", "error");
      }
    } catch (e: any) {
      addLog(`Erro ao disparar build: ${e.message}`, "error");
    } finally {
      setTriggering(false);
    }
  };

  const handleRerun = async (runId: number) => {
    try {
      addLog(`Re-executando pipeline #${runId}...`, "info");
      const success = await GitHubService.rerunWorkflow(config, runId);
      if (success) {
        addLog("Pipeline reiniciada com sucesso!", "success");
        setTimeout(fetchRuns, 2000);
      }
    } catch (e: any) {
      addLog(`Erro ao re-executar: ${e.message}`, "error");
    }
  };

  const latestRun = runs.length > 0 ? runs[0] : null;

  const getStatusBadge = (status: string, conclusion: string | null) => {
    if (status === 'in_progress' || status === 'queued') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          {status === 'queued' ? 'Na Fila...' : 'Executando CI/CD...'}
        </span>
      );
    }
    if (conclusion === 'success') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          PASSSOU (Sucesso)
        </span>
      );
    }
    if (conclusion === 'failure') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          FALHOU (Erro no CI)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-700/50 text-slate-400 border border-slate-600/30">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        {conclusion || status || 'Pendente'}
      </span>
    );
  };

  if (!config.githubUser || !config.githubRepo) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-[#020617]">
        <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 mb-4 text-blue-400">
          <Icons.Settings />
        </div>
        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-2">Monitor de Build do GitHub Actions</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Configure o <strong>Usuário GitHub</strong> e <strong>Nome do Repositório</strong> no painel lateral para conectar o status de compilação em tempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#020617] p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Top Banner Status for Latest Push */}
      <div className="bg-[#0f172a]/90 rounded-2xl border border-white/10 p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status do Último Commit / Push</span>
              {latestRun && getStatusBadge(latestRun.status, latestRun.conclusion)}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{latestRun ? latestRun.display_title || latestRun.name : 'Nenhum build detectado ainda'}</span>
            </h2>
            {latestRun && (
              <p className="text-xs text-slate-400 font-mono flex items-center gap-3">
                <span>Branch: <strong className="text-blue-400">{latestRun.head_branch}</strong></span>
                <span>Commit: <strong className="text-slate-200">{latestRun.head_sha?.substring(0, 7)}</strong></span>
                <span>Iniciado: {new Date(latestRun.created_at).toLocaleTimeString()}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchRuns}
              disabled={loading}
              className="p-2.5 bg-black/40 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 text-xs font-bold transition-all flex items-center gap-2"
              title="Atualizar Status"
            >
              <span className={`inline-block ${loading ? 'animate-spin' : ''}`}>🔄</span>
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                autoRefresh ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-black/40 text-slate-500 border-white/10'
              }`}
              title="Tempo Real (Polling a cada 12s)"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Ao Vivo (12s)' : 'Pausado'}</span>
            </button>

            <button
              onClick={handleRequestNotificationPermission}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                notifPermission === 'granted'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-black/40 text-slate-400 border-white/10 hover:border-purple-500/50'
              }`}
              title="Ativar Notificações do Sistema Operacional (SO)"
            >
              <span>🔔</span>
              <span className="hidden sm:inline">
                {notifPermission === 'granted' ? 'Notificações SO: On' : 'Ativar Alertas SO'}
              </span>
            </button>

            {config.githubToken && (
              <button
                onClick={handleTriggerBuild}
                disabled={triggering}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <span>{triggering ? 'Disparando...' : '⚡ Re-build CI'}</span>
              </button>
            )}

            <a
              href={`https://github.com/${config.githubUser}/${config.githubRepo}/actions`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/10 text-xs font-bold transition-all"
              title="Abrir no GitHub Actions"
            >
              ↗ GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Grid: Runs List & Detailed Job Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[400px]">
        {/* Left column: List of Workflow Runs */}
        <div className="lg:col-span-5 bg-[#0f172a]/60 rounded-2xl border border-white/10 p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>📋 Histórico de Pipelines</span>
              <span className="text-[10px] bg-slate-800 text-blue-400 px-2 py-0.5 rounded-full">{runs.length}</span>
            </h3>
            {onSyncGitHub && (
              <button
                onClick={onSyncGitHub}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-tight"
              >
                + Novo Push
              </button>
            )}
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1 scrollbar-hide">
            {runs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                {loading ? 'Buscando execuções do GitHub Actions...' : 'Nenhum build registrado. Faça um push para iniciar.'}
              </div>
            ) : (
              runs.map((run) => {
                const isSelected = selectedRunId === run.id;
                return (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/50 shadow-md'
                        : 'bg-black/30 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-slate-400">#{run.run_number} ({run.event})</span>
                      {getStatusBadge(run.status, run.conclusion)}
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 truncate mb-1">
                      {run.display_title || run.name}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Sha: {run.head_sha?.substring(0, 7)}</span>
                      <span>{new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Selected Run Details & Job Steps */}
        <div className="lg:col-span-7 bg-[#0f172a]/60 rounded-2xl border border-white/10 p-5 flex flex-col space-y-4">
          {selectedRunId && runs.find((r) => r.id === selectedRunId) ? (
            (() => {
              const run = runs.find((r) => r.id === selectedRunId)!;
              return (
                <>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Detalhes do Job #{run.run_number}</span>
                      <h3 className="text-sm font-bold text-white mt-0.5">{run.name}</h3>
                    </div>
                    {config.githubToken && (
                      <button
                        onClick={() => handleRerun(run.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/10"
                      >
                        🔄 Re-executar
                      </button>
                    )}
                  </div>

                  {loadingJobs ? (
                    <div className="text-center py-12 text-slate-400 text-xs animate-pulse">
                      Carregando etapas do job no GitHub Actions...
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Nenhum detalhe de job disponível para esta execução.
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1">
                      {jobs.map((job) => (
                        <div key={job.id} className="bg-black/40 rounded-xl border border-white/5 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${job.conclusion === 'success' ? 'bg-emerald-400' : job.conclusion === 'failure' ? 'bg-rose-500' : 'bg-amber-400 animate-ping'}`} />
                              <h4 className="text-xs font-black text-slate-200">{job.name}</h4>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {job.completed_at && job.started_at
                                ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                                : job.status}
                            </span>
                          </div>

                          {/* Steps inside job */}
                          <div className="space-y-1.5 font-mono text-[11px] pt-1 border-t border-white/5">
                            {job.steps?.map((step: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-[#020617]/50 rounded-lg text-slate-300">
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <span className="text-[10px]">
                                    {step.conclusion === 'success' ? '✅' : step.conclusion === 'failure' ? '❌' : '⏳'}
                                  </span>
                                  <span className="truncate text-xs font-medium">{step.name}</span>
                                </div>
                                <span className="text-[9px] text-slate-500 shrink-0">
                                  {step.completed_at && step.started_at
                                    ? `${Math.max(1, Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000))}s`
                                    : step.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs py-12">
              Selecione um build da lista ao lado para ver as etapas detalhadas do pipeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GitHubActionsMonitor;
