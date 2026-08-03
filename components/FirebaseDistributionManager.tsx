import React, { useState, useMemo } from 'react';
import { AppConfig } from '../types';

interface FirebaseDistributionManagerProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  addLog: (msg: string, type?: string) => void;
}

export const FirebaseDistributionManager: React.FC<FirebaseDistributionManagerProps> = ({
  config,
  setConfig,
  addLog
}) => {
  const [newTesterEmail, setNewTesterEmail] = useState<string>('');
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [emailInputError, setEmailInputError] = useState<string | null>(null);

  // Parse list of testers from config.firebaseTesters (comma-separated string)
  const testersList = useMemo(() => {
    if (!config.firebaseTesters) return [];
    return config.firebaseTesters
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);
  }, [config.firebaseTesters]);

  const isDistributionEnabled = config.enableFirebaseDistribution ?? true;

  // Toggle distribution enabled
  const handleToggleDistribution = () => {
    const nextVal = !isDistributionEnabled;
    setConfig(prev => ({ ...prev, enableFirebaseDistribution: nextVal }));
    addLog(
      nextVal
        ? "Distribuição automática via Firebase App Distribution HABILITADA no CI/CD."
        : "Distribuição automática via Firebase App Distribution DESABILITADA.",
      nextVal ? "success" : "info"
    );
  };

  // Add individual or multiple tester emails
  const handleAddTester = (emailToAdd?: string) => {
    const target = (emailToAdd || newTesterEmail).trim();
    if (!target) return;

    // Support comma or whitespace separated
    const incomingEmails = target
      .split(/[\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = incomingEmails.filter(e => !emailRegex.test(e));

    if (invalidEmails.length > 0) {
      setEmailInputError(`E-mail inválido: ${invalidEmails.join(', ')}`);
      return;
    }

    setEmailInputError(null);

    // Filter duplicates
    const currentSet = new Set(testersList);
    let addedCount = 0;
    incomingEmails.forEach(e => {
      if (!currentSet.has(e)) {
        currentSet.add(e);
        addedCount++;
      }
    });

    const updatedTesters = Array.from(currentSet).join(', ');
    setConfig(prev => ({ ...prev, firebaseTesters: updatedTesters }));
    setNewTesterEmail('');

    if (addedCount > 0) {
      addLog(`Adicionado(s) ${addedCount} novo(s) testador(es) para o Firebase App Distribution.`, "success");
    } else {
      addLog("Nenhum novo testador adicionado (e-mail(s) já cadastrado(s)).", "info");
    }
  };

  // Remove a tester email
  const handleRemoveTester = (emailToRemove: string) => {
    const updated = testersList.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase());
    setConfig(prev => ({ ...prev, firebaseTesters: updated.join(', ') }));
    addLog(`Testador ${emailToRemove} removido da lista de distribuição.`, "info");
  };

  // Quick preset groups
  const handleApplyPresetGroup = (groupName: string, emails: string[]) => {
    const currentSet = new Set(testersList);
    emails.forEach(e => currentSet.add(e));
    const updatedTesters = Array.from(currentSet).join(', ');
    setConfig(prev => ({ ...prev, firebaseTesters: updatedTesters }));
    addLog(`Grupo de testadores '${groupName}' adicionado com sucesso!`, "success");
  };

  // Copy secret key name helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(label);
    setTimeout(() => setCopiedSecret(null), 2000);
    addLog(`Copiado para a área de transferência: ${label}`, "info");
  };

  // Simulate Build & Firebase Distribution Push
  const handleSimulateDistribution = async () => {
    if (testersList.length === 0) {
      addLog("Erro: Adicione ao menos 1 e-mail de testador antes de disparar a distribuição.", "error");
      return;
    }

    setSimulating(true);
    addLog("🚀 Iniciando simulação de build AAB para Firebase App Distribution...", "info");

    await new Promise(r => setTimeout(r, 1200));
    addLog("📦 Compilando App Bundle (app-release.aab) com suporte a Split APKs...", "info");

    await new Promise(r => setTimeout(r, 1500));
    addLog("🔐 Assinando AAB com a Keystore de Release configurada...", "info");

    await new Promise(r => setTimeout(r, 1800));
    addLog(`🔥 Conectando ao Firebase Console (App ID: ${config.firebaseAppId || '1:123456789:android:app'}) ...`, "info");

    await new Promise(r => setTimeout(r, 1400));
    addLog(`✉️ Notificações enviadas com sucesso para ${testersList.length} testador(es): ${testersList.join(', ')}`, "success");

    setSimulating(false);
  };

  const sampleYamlStep = `      - name: Deploy AAB to Firebase App Distribution
        if: \${{ secrets.FIREBASE_APP_ID != '' && secrets.FIREBASE_TOKEN != '' }}
        uses: w9jds/firebase-action@v2.2.1
        with:
          args: appdistribution:distribute app/build/outputs/bundle/release/app-release.aab --app \${{ secrets.FIREBASE_APP_ID }} --testers "${config.firebaseTesters || 'dev-team@empresa.com, qa@empresa.com'}" --release-notes "${config.firebaseReleaseNotes || 'Nova versão automatizada via CI/CD'}"
        env:
          FIREBASE_TOKEN: \${{ secrets.FIREBASE_TOKEN }}`;

  return (
    <div className="bg-[#0f172a]/90 rounded-2xl border border-amber-500/30 p-5 shadow-2xl space-y-6 my-4 text-slate-100">
      {/* Top Header & Toggle Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 text-xs">
              🔥
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Distribuição Automática de Builds</span>
          </div>
          <h3 className="text-base font-extrabold text-white tracking-tight">Firebase App Distribution (CI/CD)</h3>
          <p className="text-xs text-slate-400">
            Envie compilações AAB/APK assinadas automaticamente para seus testadores via GitHub Actions a cada push de código.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status no Workflow</p>
            <p className={`text-xs font-black ${isDistributionEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isDistributionEnabled ? '● Ativado no CI/CD' : '○ Desativado'}
            </p>
          </div>

          <button
            onClick={handleToggleDistribution}
            className={`w-12 h-6 rounded-full relative transition-colors border ${
              isDistributionEnabled ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-800 border-slate-600'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                isDistributionEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: App ID & Testers Management */}
        <div className="space-y-5">
          {/* Firebase App ID Input */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
              <span>IDs do Aplicativo (Firebase App ID)</span>
              <span className="text-[9px] text-slate-500 font-normal">Obtenha em: Configurações do Projeto Firebase</span>
            </label>
            <input
              type="text"
              value={config.firebaseAppId || ''}
              onChange={e => setConfig(prev => ({ ...prev, firebaseAppId: e.target.value }))}
              placeholder="Ex: 1:10823912093:android:9d82137102938012"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-400">
              Identificador único da sua aplicação no Firebase Console para vincular o artefato AAB gerado.
            </p>
          </div>

          {/* Tester Email Management */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>📧 E-mails de Testadores ({testersList.length})</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {testersList.length} cadastrados
              </span>
            </div>

            {/* Input Add Tester */}
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={newTesterEmail}
                onChange={e => {
                  setNewTesterEmail(e.target.value);
                  setEmailInputError(null);
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddTester()}
                placeholder="Ex: testador@suaempresa.com (ou separada por vírgula)"
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                onClick={() => handleAddTester()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                + Adicionar
              </button>
            </div>

            {emailInputError && (
              <p className="text-[10px] text-rose-400 font-mono">{emailInputError}</p>
            )}

            {/* Group Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Adicionar Grupos Rápidos:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleApplyPresetGroup("Time de QA", ["qa-lead@empresa.com", "qa-tester@empresa.com"])}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-medium border border-white/10 transition-colors"
                >
                  👥 + Time de QA
                </button>
                <button
                  onClick={() => handleApplyPresetGroup("Beta Testers", ["beta1@empresa.com", "beta2@empresa.com", "beta3@empresa.com"])}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-medium border border-white/10 transition-colors"
                >
                  🚀 + Beta Testers
                </button>
                <button
                  onClick={() => handleApplyPresetGroup("Stakeholders", ["cto@empresa.com", "po@empresa.com"])}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-medium border border-white/10 transition-colors"
                >
                  👑 + Stakeholders
                </button>
              </div>
            </div>

            {/* Registered Testers Badge List */}
            <div className="space-y-1.5 pt-2 border-t border-white/5 max-h-48 overflow-y-auto scrollbar-hide">
              {testersList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 italic bg-slate-950/50 rounded-lg border border-dashed border-slate-800">
                  Nenhum e-mail de testador cadastrado. Adicione acima para receber avisos de build.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {testersList.map((email, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2 group hover:border-amber-400 transition-colors"
                    >
                      <span>✉️ {email}</span>
                      <button
                        onClick={() => handleRemoveTester(email)}
                        className="text-slate-400 hover:text-rose-400 text-xs font-bold transition-colors"
                        title="Remover testador"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Release Notes & Secrets Guide */}
        <div className="space-y-5">
          {/* Release Notes Editor */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
              <span>Notas da Versão (Release Notes)</span>
              <span className="text-[9px] text-slate-500">Aparecerão no e-mail de notificação</span>
            </label>

            <textarea
              value={config.firebaseReleaseNotes || ''}
              onChange={e => setConfig(prev => ({ ...prev, firebaseReleaseNotes: e.target.value }))}
              rows={3}
              placeholder="Ex: Versão v1.0.0 compilada via CI/CD. Inclui suporte a notificações nativas do SO e correções de layout."
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
            />

            {/* Release Notes Preset Templates */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setConfig(prev => ({ ...prev, firebaseReleaseNotes: '📝 Versão estável compilada automaticamente pelo workflow de CI/CD.' }))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold border border-white/10"
              >
                📝 Release Padrão
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, firebaseReleaseNotes: '🐛 Build com correções urgentes de bugs e otimizações no renderizador.' }))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold border border-white/10"
              >
                🐛 Correção de Bugs
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, firebaseReleaseNotes: '✨ Novas funcionalidades de IA, suporte a notificações no SO e AAB Explorer.' }))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold border border-white/10"
              >
                ✨ Novas Features
              </button>
            </div>
          </div>

          {/* Required GitHub Secrets Guide */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
              <span>🔑 GitHub Repository Secrets Requeridos</span>
              <span className="text-[9px] text-slate-500">Configuração no repositório GitHub</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-slate-200">FIREBASE_APP_ID</p>
                  <p className="text-[10px] text-slate-400">ID do app no Firebase Console</p>
                </div>
                <button
                  onClick={() => copyToClipboard('FIREBASE_APP_ID', 'FIREBASE_APP_ID')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-white/10"
                >
                  {copiedSecret === 'FIREBASE_APP_ID' ? '✓ Copiado' : '📋 Copiar Nome'}
                </button>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-slate-200">FIREBASE_TOKEN</p>
                  <p className="text-[10px] text-slate-400">Gerado executando <code className="text-amber-400">firebase login:ci</code></p>
                </div>
                <button
                  onClick={() => copyToClipboard('FIREBASE_TOKEN', 'FIREBASE_TOKEN')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-white/10"
                >
                  {copiedSecret === 'FIREBASE_TOKEN' ? '✓ Copiado' : '📋 Copiar Nome'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Actions YAML Live Step Preview */}
      <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-slate-400 text-[10px]">Passo gerado no .github/workflows/android.yml</span>
          <button
            onClick={() => copyToClipboard(sampleYamlStep, 'Workflow YAML')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] border border-white/10 flex items-center gap-1"
          >
            📋 Copiar Step YAML
          </button>
        </div>

        <pre className="bg-black/60 p-3 rounded-lg font-mono text-[9px] text-emerald-400 overflow-x-auto leading-relaxed border border-white/5 select-all">
          {sampleYamlStep}
        </pre>
      </div>

      {/* Action Footer Button: Simulate Trigger */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
        <div className="text-xs text-slate-400">
          💡 Os testes receberão um convite no e-mail assim que o workflow for acionado no GitHub.
        </div>

        <button
          onClick={handleSimulateDistribution}
          disabled={simulating}
          className={`px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/20 transition-all active:scale-95 flex items-center gap-2 ${
            simulating ? 'opacity-50 cursor-wait' : ''
          }`}
        >
          <span>{simulating ? '⏳ Processando Build & Envio...' : '🚀 Testar Disparo de Distribuição'}</span>
        </button>
      </div>
    </div>
  );
};

export default FirebaseDistributionManager;
