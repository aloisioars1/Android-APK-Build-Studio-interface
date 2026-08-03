import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppConfig } from '../types';
import { GitHubService } from '../services/githubService';
import { Icons } from '../constants';

interface GitHubActionsMonitorProps {
  config: AppConfig;
  addLog: (msg: string, type?: string) => void;
  onSyncGitHub?: () => void;
}

type LogFilter = 'all' | 'errors' | 'success' | 'warnings';

export const GitHubActionsMonitor: React.FC<GitHubActionsMonitorProps> = ({ config, addLog, onSyncGitHub }) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(false);
  const [rawLogs, setRawLogs] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<LogFilter>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const logsContainerRef = useRef<HTMLDivElement>(null);
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
    }, 10000); // Polling a cada 10 segundos
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRuns, config.githubUser, config.githubRepo]);

  // Carregar jobs da execução selecionada
  useEffect(() => {
    if (!selectedRunId) return;
    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        const jobData = await GitHubService.getRunJobs(config, selectedRunId);
        setJobs(jobData);
        if (jobData && jobData.length > 0) {
          setSelectedJobId(jobData[0].id);
        } else {
          setSelectedJobId(null);
          setRawLogs('');
        }
      } catch (err) {
        console.error("Erro ao carregar jobs do workflow:", err);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, [selectedRunId, config]);

  // Carregar logs do job selecionado
  useEffect(() => {
    if (!selectedJobId) {
      setRawLogs('');
      return;
    }

    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const logContent = await GitHubService.getJobLogs(config, selectedJobId);
        if (logContent && logContent.trim()) {
          setRawLogs(logContent);
        } else {
          // Gerar log estruturado caso a API do GitHub não retorne raw text por CORS/Auth
          const currentJob = jobs.find(j => j.id === selectedJobId);
          if (currentJob) {
            let synthLogs = `=== HEAVY STUDIO MONITOR - RUN LOGS JOB: ${currentJob.name} ===\n`;
            synthLogs += `Status do Job: ${currentJob.status?.toUpperCase()} | Conclusão: ${currentJob.conclusion?.toUpperCase() || 'EM EXECUÇÃO'}\n`;
            synthLogs += `Iniciado em: ${currentJob.started_at || 'N/A'} | Finalizado em: ${currentJob.completed_at || 'Em progresso'}\n\n`;

            if (currentJob.steps && currentJob.steps.length > 0) {
              currentJob.steps.forEach((st: any) => {
                const icon = st.conclusion === 'success' ? '[SUCCESS]' : st.conclusion === 'failure' ? '[ERROR]' : '[RUNNING]';
                synthLogs += `${icon} Step: ${st.name}\n`;
                synthLogs += `   Status: ${st.status} | Conclusion: ${st.conclusion || 'pending'}\n`;
                if (st.conclusion === 'failure') {
                  synthLogs += `   FATAL ERROR: Falha detectada durante a execução da etapa "${st.name}". Verifique as configurações de compilação ou chaves Keystore.\n`;
                } else if (st.conclusion === 'success') {
                  synthLogs += `   BUILD SUCCESSFUL: Etapa "${st.name}" executada e aprovada com sucesso.\n`;
                }
                synthLogs += `----------------------------------------------------------------------\n`;
              });
            }
            setRawLogs(synthLogs);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar logs do job:", err);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, [selectedJobId, jobs, config]);

  // Scroll automático para o final dos logs
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [rawLogs, autoScroll]);

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

  const handleCopyLogs = () => {
    if (!rawLogs) return;
    navigator.clipboard.writeText(rawLogs);
    addLog("📋 Logs copiados para a área de transferência!", "success");
  };

  const latestRun = runs.length > 0 ? runs[0] : null;

  // Estatísticas do Dashboard
  const totalRuns = runs.length;
  const successRuns = runs.filter(r => r.conclusion === 'success').length;
  const failedRuns = runs.filter(r => r.conclusion === 'failure').length;
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;

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
          PASSOU (Sucesso)
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

  // Processamento e coloração das linhas de log
  const parseLogLine = (line: string, index: number) => {
    const upperLine = line.toUpperCase();

    const isError =
      upperLine.includes('ERROR') ||
      upperLine.includes('FATAL') ||
      upperLine.includes('FAILED') ||
      upperLine.includes('EXCEPTION') ||
      upperLine.includes('REPROVADO') ||
      upperLine.includes('FAIL') ||
      line.includes('❌') ||
      line.includes('[ERROR]');

    const isSuccess =
      upperLine.includes('SUCCESS') ||
      upperLine.includes('SUCCESSFUL') ||
      upperLine.includes('PASSED') ||
      upperLine.includes('COMPLETED') ||
      upperLine.includes('APROVADO') ||
      line.includes('✅') ||
      line.includes('[SUCCESS]');

    const isWarning =
      upperLine.includes('WARN') ||
      upperLine.includes('WARNING') ||
      upperLine.includes('DEPRECATED') ||
      line.includes('⚠️');

    // Filtros
    if (logFilter === 'errors' && !isError) return null;
    if (logFilter === 'success' && !isSuccess) return null;
    if (logFilter === 'warnings' && !isWarning) return null;

    if (logSearch.trim() && !line.toLowerCase().includes(logSearch.toLowerCase())) {
      return null;
    }

    let lineClass = 'text-slate-300 hover:bg-white/5';
    let icon = '  ';

    if (isError) {
      lineClass = 'bg-rose-950/60 text-rose-200 border-l-2 border-rose-500 font-bold px-2 py-0.5 my-0.5 rounded-r';
      icon = '❌ ';
    } else if (isSuccess) {
      lineClass = 'bg-emerald-950/60 text-emerald-300 border-l-2 border-emerald-500 font-bold px-2 py-0.5 my-0.5 rounded-r';
      icon = '✅ ';
    } else if (isWarning) {
      lineClass = 'bg-amber-950/40 text-amber-300 border-l-2 border-amber-500 px-2 py-0.5 my-0.5 rounded-r';
      icon = '⚠️ ';
    }

    return (
      <div key={index} className={`font-mono text-[11px] leading-relaxed transition-colors whitespace-pre-wrap ${lineClass}`}>
        <span className="text-slate-600 select-none mr-2 inline-block w-8 text-right font-mono text-[9px]">{index + 1}</span>
        <span>{icon}</span>
        <span>{line}</span>
      </div>
    );
  };

  const rawLines = rawLogs.split('\n');

  if (!config.githubUser || !config.githubRepo) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-[#020617]">
        <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 mb-4 text-blue-400">
          <Icons.Settings />
        </div>
        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-2">Dashboard de Monitoramento GitHub Actions</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Configure o <strong>Usuário GitHub</strong> e <strong>Nome do Repositório</strong> no painel lateral para conectar os logs em tempo real do seu pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#020617] p-3 sm:p-5 overflow-y-auto space-y-4 relative">
      {/* Animated Top Progress Bar Indicator */}
      {(loading || loadingJobs || loadingLogs || triggering) && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 overflow-hidden z-50 rounded-t-2xl">
          <div className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 animate-pulse w-full" />
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0f172a]/90 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Total de Builds</p>
            <p className="text-lg font-black text-white">{totalRuns}</p>
          </div>
          <span className="text-xl">📊</span>
        </div>

        <div className="bg-[#0f172a]/90 p-3.5 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
          <div>
            <p className="text-[8.5px] font-black uppercase text-emerald-400 tracking-wider">Taxa de Sucesso</p>
            <p className="text-lg font-black text-emerald-300">{successRate}%</p>
          </div>
          <span className="text-xl">🎯</span>
        </div>

        <div className="bg-[#0f172a]/90 p-3.5 rounded-2xl border border-rose-500/30 flex items-center justify-between">
          <div>
            <p className="text-[8.5px] font-black uppercase text-rose-400 tracking-wider">Falhas / Erros</p>
            <p className="text-lg font-black text-rose-300">{failedRuns}</p>
          </div>
          <span className="text-xl">❌</span>
        </div>

        <div className="bg-[#0f172a]/90 p-3.5 rounded-2xl border border-blue-500/30 flex items-center justify-between">
          <div>
            <p className="text-[8.5px] font-black uppercase text-blue-400 tracking-wider">Status Atual</p>
            <div className="mt-0.5">
              {latestRun ? getStatusBadge(latestRun.status, latestRun.conclusion) : <span className="text-xs text-slate-500">Sem dados</span>}
            </div>
          </div>
          <span className="text-xl">⚡</span>
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="bg-[#0f172a]/90 rounded-2xl border border-white/10 p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-lg shrink-0">
            🖥️
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              Console de Logs em Tempo Real (CI/CD)
              <span className="text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-mono">
                {config.githubUser}/{config.githubRepo}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Acompanhe a compilação no GitHub Actions com destaque para erros em vermelho e sucesso em verde.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchRuns}
            disabled={loading}
            className="p-2 bg-black/40 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Atualizar Execuções"
          >
            <span className={`inline-block ${loading ? 'animate-spin' : ''}`}>🔄</span>
            <span className="text-[10px]">Atualizar</span>
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              autoRefresh ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-black/40 text-slate-500 border-white/10'
            }`}
            title="Polling Automático a cada 10 segundos"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>{autoRefresh ? 'Ao Vivo' : 'Pausado'}</span>
          </button>

          <button
            onClick={handleRequestNotificationPermission}
            className={`px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              notifPermission === 'granted'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : 'bg-black/40 text-slate-400 border-white/10'
            }`}
            title="Ativar Alertas no Sistema Operacional"
          >
            <span>🔔</span>
            <span>{notifPermission === 'granted' ? 'Notificações SO' : 'Ativar SO'}</span>
          </button>

          {config.githubToken && (
            <button
              onClick={handleTriggerBuild}
              disabled={triggering}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-1.5"
            >
              <span>⚡ Disparar Build</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Pipeline Runs List & Terminal Log Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[480px]">
        {/* Left Column: Workflow Runs List */}
        <div className="lg:col-span-4 bg-[#0f172a]/70 rounded-2xl border border-white/10 p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>📋</span> Histórico de Execuções
            </h3>
            <span className="text-[9px] bg-slate-800 text-blue-400 px-2 py-0.5 rounded-full font-bold">
              {runs.length} builds
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[520px] pr-1 scrollbar-thin">
            {loading && runs.length === 0 ? (
              /* Skeleton Screen for Runs List */
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 animate-pulse space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-12 bg-slate-800 rounded" />
                      <div className="h-4 w-20 bg-slate-800 rounded-full" />
                    </div>
                    <div className="h-3.5 w-3/4 bg-slate-800 rounded" />
                    <div className="flex justify-between">
                      <div className="h-2.5 w-16 bg-slate-800/60 rounded" />
                      <div className="h-2.5 w-12 bg-slate-800/60 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : runs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Nenhum build registrado.
              </div>
            ) : (
              runs.map((run) => {
                const isSelected = selectedRunId === run.id;
                return (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-black/30 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-slate-400">#{run.run_number}</span>
                      {getStatusBadge(run.status, run.conclusion)}
                    </div>
                    <h4 className="text-[11px] font-bold text-slate-200 truncate">
                      {run.display_title || run.name}
                    </h4>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>Branch: {run.head_branch}</span>
                      <span>{new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Log Terminal */}
        <div className="lg:col-span-8 bg-black/90 rounded-2xl border border-white/10 p-3.5 flex flex-col space-y-3">
          {/* Terminal Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[10px] font-mono font-bold text-slate-400 ml-1">
                Terminal CI/CD {selectedJobId ? `(Job #${selectedJobId})` : ''}
              </span>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all ${
                  logFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setLogFilter('errors')}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 ${
                  logFilter === 'errors' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <span>❌</span> Erros
              </button>
              <button
                onClick={() => setLogFilter('success')}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 ${
                  logFilter === 'success' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <span>✅</span> Sucesso
              </button>
              <button
                onClick={() => setLogFilter('warnings')}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 ${
                  logFilter === 'warnings' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <span>⚠️</span> Avisos
              </button>
            </div>

            {/* Terminal Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold border ${
                  autoScroll ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'bg-black/40 text-slate-500 border-white/5'
                }`}
                title="Rolar automaticamente até a última linha do log"
              >
                {autoScroll ? '↓ Auto-scroll On' : 'Pause Scroll'}
              </button>

              <button
                onClick={handleCopyLogs}
                disabled={!rawLogs}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold border border-white/10"
                title="Copiar todo o log"
              >
                📋 Copiar
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              placeholder="🔍 Filtrar logs da compilação (ex: Gradle, Manifest, Error)..."
              className="w-full bg-slate-950 p-2 pl-3 rounded-xl border border-white/10 text-[10px] text-slate-200 outline-none focus:border-blue-500 font-mono"
            />
            {logSearch && (
              <button
                onClick={() => setLogSearch('')}
                className="absolute right-3 top-2 text-[10px] text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Jobs Step Tabs */}
          {jobs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`px-3 py-1.5 rounded-xl text-[9.5px] font-mono font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                    selectedJobId === job.id
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-900 text-slate-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span>{job.conclusion === 'success' ? '✅' : job.conclusion === 'failure' ? '❌' : '⏳'}</span>
                  <span>{job.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Raw Terminal Log Display Container */}
          <div
            ref={logsContainerRef}
            className="flex-1 bg-[#020617] p-3 rounded-xl border border-white/5 font-mono text-[11px] overflow-y-auto max-h-[420px] min-h-[300px] scrollbar-thin space-y-0.5 select-text"
          >
            {loadingLogs ? (
              <div className="h-full flex flex-col space-y-3 p-2">
                {/* Progress bar indicator */}
                <div className="flex items-center justify-between text-[10px] text-blue-400 font-mono">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    Buscando logs em tempo real do GitHub Actions...
                  </span>
                  <span className="text-[9px] text-slate-500">Carregando...</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 h-full w-2/3 animate-pulse rounded-full" />
                </div>

                {/* Log Line Skeleton Screen */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-6 bg-slate-900 rounded" />
                    <div className="h-3 w-1/3 bg-slate-800/80 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-6 bg-slate-900 rounded" />
                    <div className="h-3 w-2/3 bg-slate-800/60 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-6 bg-slate-900 rounded" />
                    <div className="h-3 w-1/2 bg-slate-800/70 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-6 bg-slate-900 rounded" />
                    <div className="h-3 w-3/4 bg-slate-800/50 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-6 bg-slate-900 rounded" />
                    <div className="h-3 w-2/5 bg-slate-800/80 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-6 bg-slate-900 rounded" />
                    <div className="h-3 w-4/5 bg-slate-800/60 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ) : rawLines.length === 0 || (rawLines.length === 1 && !rawLines[0]) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-12">
                <span>Nenhum log disponível para exibição no momento.</span>
                <span className="text-[10px] mt-1 text-slate-600">Dispare um novo build ou selecione outra execução.</span>
              </div>
            ) : (
              rawLines.map((line, idx) => parseLogLine(line, idx))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubActionsMonitor;

