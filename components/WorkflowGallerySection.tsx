import React, { useState } from 'react';
import { AppConfig, GeneratedCode } from '../types';
import { WORKFLOW_TEMPLATES, WorkflowTemplateItem } from '../services/workflowTemplates';

interface WorkflowGallerySectionProps {
  config: AppConfig;
  generated: GeneratedCode | null;
  setGenerated: React.Dispatch<React.SetStateAction<GeneratedCode | null>>;
  addLog: (msg: string, type?: string) => void;
}

export const WorkflowGallerySection: React.FC<WorkflowGallerySectionProps> = ({
  config,
  generated,
  setGenerated,
  addLog,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplateItem | null>(null);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'android', label: 'Android' },
    { id: 'testing', label: 'Testes (Espresso)' },
    { id: 'quality', label: 'Análise & Lint' },
    { id: 'ios', label: 'iOS' },
    { id: 'security', label: 'Segurança' }
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? WORKFLOW_TEMPLATES
    : WORKFLOW_TEMPLATES.filter(t => t.category === selectedCategory);

  const processTemplateYaml = (content: string): string => {
    return content
      .replace(/\{\{BRANCH\}\}/g, config.workflowBranch || 'main')
      .replace(/\{\{RUNNER\}\}/g, config.workflowRunner || 'ubuntu-latest')
      .replace(/\{\{APP_NAME\}\}/g, config.appName || 'HeavyApp')
      .replace(/\{\{FIREBASE_TESTERS\}\}/g, config.firebaseTesters || 'beta-testers')
      .replace(/\{\{FIREBASE_RELEASE_NOTES\}\}/g, config.firebaseReleaseNotes || 'Nova versão buildada via CI/CD.');
  };

  const handleApplyTemplate = (template: WorkflowTemplateItem) => {
    if (!generated) {
      addLog("Gere o projeto primeiro para aplicar templates de workflow.", "error");
      return;
    }

    const processedYaml = processTemplateYaml(template.content);

    if (template.id === 'dependabot') {
      setGenerated({
        ...generated,
        dependabotYml: processedYaml
      });
      addLog(`🤖 Dependabot YAML configurado em .github/dependabot.yml!`, "success");
    } else {
      setGenerated({
        ...generated,
        githubWorkflow: processedYaml,
        workflowPath: template.filename
      });
      addLog(`⚡ Workflow '${template.name}' aplicado com sucesso em ${template.filename}!`, "success");
    }
  };

  const handleDownloadYaml = (template: WorkflowTemplateItem) => {
    const yaml = processTemplateYaml(template.content);
    const filename = template.filename.split('/').pop() || 'workflow.yml';
    const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    addLog(`📥 Arquivo ${filename} baixado com sucesso.`, "success");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span>⚙️</span> Galeria de Workflows CI/CD
        </h4>
        <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-500/30 font-mono">
          {WORKFLOW_TEMPLATES.length} YAMLs
        </span>
      </div>

      {/* Categories Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase transition-all whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-black/30 text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* List of Templates */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
        {filteredTemplates.map(template => {
          const isActive = generated && (
            (template.id === 'dependabot' && generated.dependabotYml) ||
            (generated.workflowPath === template.filename)
          );

          return (
            <div
              key={template.id}
              className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                isActive
                  ? 'bg-blue-950/60 border-blue-500/60 shadow-lg ring-1 ring-blue-500/30'
                  : 'bg-slate-900/60 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-sm shrink-0">{template.icon}</span>
                  <div className="truncate">
                    <p className="text-[10px] font-black text-slate-200 truncate flex items-center gap-1.5">
                      {template.name}
                      {isActive && (
                        <span className="text-[7px] bg-emerald-500/20 text-emerald-300 px-1 rounded border border-emerald-500/30 font-mono">
                          ATIVO
                        </span>
                      )}
                    </p>
                    <p className="text-[8px] text-slate-400 font-mono truncate">{template.filename}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors text-[9px]"
                    title="Visualizar YAML"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => handleDownloadYaml(template)}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-emerald-300 transition-colors text-[9px]"
                    title="Baixar arquivo YAML"
                  >
                    📥
                  </button>
                </div>
              </div>

              <p className="text-[8.5px] text-slate-400 leading-snug line-clamp-2">
                {template.description}
              </p>

              <button
                onClick={() => handleApplyTemplate(template)}
                disabled={!generated}
                className={`w-full py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                  isActive
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-blue-600/80 hover:bg-blue-500 text-white shadow'
                }`}
              >
                <span>{isActive ? '✓ Workflow Ativo no Projeto' : '⚡ Usar Este Workflow'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Preview YAML */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-blue-500/40 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{previewTemplate.icon}</span>
                <div>
                  <h3 className="text-xs font-black text-white">{previewTemplate.name}</h3>
                  <p className="text-[9px] text-slate-400 font-mono">{previewTemplate.filename}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-slate-950 font-mono text-[10px] text-emerald-400 whitespace-pre scrollbar-thin">
              {processTemplateYaml(previewTemplate.content)}
            </div>

            <div className="px-4 py-3 bg-slate-900 border-t border-white/10 flex items-center justify-between shrink-0">
              <button
                onClick={() => handleDownloadYaml(previewTemplate)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1"
              >
                📥 Baixar YAML
              </button>

              <button
                onClick={() => {
                  handleApplyTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                disabled={!generated}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg text-[9px] uppercase tracking-wider shadow"
              >
                ⚡ Aplicar ao Projeto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowGallerySection;
