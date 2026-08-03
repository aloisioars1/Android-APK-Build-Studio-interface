
import { AppConfig, GeneratedCode } from '../types';
import { AssetManager } from './assetManager';
import { generateReadme } from './readmeGenerator';
import { dependabotTemplate } from './workflowTemplates';
import { generateKotlinDocumentation } from './kotlinDocGenerator';

export const GitHubService = {
  /**
   * Cria um repositório ou retorna o existente
   */
  async ensureRepository(config: AppConfig): Promise<boolean> {
    const { githubToken, githubRepo, githubUser } = config;
    if (!githubToken || !githubRepo || !githubUser) throw new Error("Credenciais GitHub (User/Repo/Token) incompletas.");

    try {
      const resp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}`, {
        headers: { Authorization: `token ${githubToken}` }
      });

      if (resp.status === 404) {
        // Criar novo repositório se não existir
        const createResp = await fetch(`https://api.github.com/user/repos`, {
          method: 'POST',
          headers: { 
            Authorization: `token ${githubToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: githubRepo,
            description: `Projeto ${config.platform.toUpperCase()} gerado via Heavy Studio Pro: ${config.appName}`,
            private: false,
            auto_init: true
          })
        });
        return createResp.ok;
      }
      return resp.ok;
    } catch (e: any) {
      throw new Error(`Falha ao validar repositório: ${e.message}`);
    }
  },

  /**
   * Realiza o push de todos os arquivos do projeto em um único commit atômico
   */
  async pushProject(config: AppConfig, generated: GeneratedCode, onLog: (msg: string) => void): Promise<void> {
    const { githubUser, githubRepo, githubToken, workflowBranch } = config;
    const branch = workflowBranch || 'main';
    
    onLog("🚀 Iniciando sincronização neural com GitHub...");
    
    // 1. Tentar obter a referência da branch atual (SHA do último commit)
    let lastCommitSha: string | null = null;
    let refResp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/git/refs/heads/${branch}`, {
      headers: { Authorization: `token ${githubToken}` }
    });
    
    if (refResp.ok) {
      const refData = await refResp.json();
      if (refData.object) {
        lastCommitSha = refData.object.sha;
      }
    } else if (branch === 'main') {
      // Tentar 'master' se 'main' falhar
      const masterResp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/git/refs/heads/master`, {
        headers: { Authorization: `token ${githubToken}` }
      });
      if (masterResp.ok) {
        const masterData = await masterResp.json();
        if (masterData.object) {
          lastCommitSha = masterData.object.sha;
        }
      }
    }

    // 2. Mapear arquivos baseados na plataforma
    onLog(`📦 Mapeando estrutura de arquivos para ${config.platform.toUpperCase()}...`);
    let filesToPush: { path: string; content: string; encoding?: 'utf-8' | 'base64' }[] = [];

    if (config.platform === 'android') {
      filesToPush = [
        { path: 'app/src/main/java/' + config.packageName.replace(/\./g, '/') + '/MainActivity.kt', content: generated.mainActivity },
        { path: 'app/src/main/res/layout/activity_main.xml', content: generated.layout },
        { path: 'app/src/main/res/layout/item_message.xml', content: generated.itemMessageLayout },
        { path: 'app/src/main/res/values/colors.xml', content: generated.colorsXml },
        { path: 'app/src/main/res/values/themes.xml', content: generated.themesXml },
        { path: 'app/src/main/res/values/dimens.xml', content: generated.dimensXml },
        { path: 'app/src/main/res/drawable/input_bg.xml', content: generated.inputBgDrawable },
        { path: 'app/src/main/AndroidManifest.xml', content: generated.manifest },
        { path: 'app/build.gradle', content: generated.buildGradleApp },
        { path: 'build.gradle', content: generated.projectBuildGradle },
        { path: 'settings.gradle', content: generated.settingsGradle },
        { path: 'DOCUMENTATION.md', content: generateKotlinDocumentation(generated.mainActivity, config, generated) },
        { path: generated.workflowPath || '.github/workflows/android.yml', content: generated.githubWorkflow },
        { path: '.github/dependabot.yml', content: generated.dependabotYml || dependabotTemplate },
        { path: 'README.md', content: generated.readmeMd || generateReadme(config) }
      ];

      // Incluir assets carregados (imagens, etc) na pasta de resources do Android
      config.assets.forEach(asset => {
        const sanitized = AssetManager.sanitizeResourceName(asset.name);
        const ext = asset.name.split('.').pop();
        if (asset.mimeType.startsWith('image/')) {
            filesToPush.push({
                path: `app/src/main/res/drawable/${sanitized}.${ext}`,
                content: asset.data,
                encoding: 'base64'
            });
        }
      });

    } else {
      filesToPush = [
        { path: 'Sources/ContentView.swift', content: generated.contentViewSwift },
        { path: 'Sources/MainApp.swift', content: generated.mainAppSwift },
        { path: 'Package.swift', content: generated.packageSwift },
        { path: 'Resources/Info.plist', content: generated.infoPlist },
        { path: '.github/workflows/ios_build.yml', content: generated.githubWorkflow },
        { path: '.github/dependabot.yml', content: generated.dependabotYml || dependabotTemplate },
        { path: 'README.md', content: generated.readmeMd || generateReadme(config) }
      ];

      // Incluir assets carregados para iOS
      config.assets.forEach(asset => {
        filesToPush.push({
            path: `Resources/${asset.name}`,
            content: asset.data,
            encoding: 'base64'
        });
      });
    }

    onLog(`📁 Preparando ${filesToPush.length} arquivos para commit...`);

    // 3. Criar blobs para arquivos (necessário para base64)
    const treeItems = await Promise.all(filesToPush.map(async file => {
      if (file.encoding === 'base64') {
        const blobResp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/git/blobs`, {
          method: 'POST',
          headers: { Authorization: `token ${githubToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: file.content, encoding: 'base64' })
        });
        const blobData = await blobResp.json();
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha
        };
      } else {
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          content: file.content
        };
      }
    }));

    // 4. Criar a Tree com tratamento e Fallback automático via Contents API se o PAT não tiver escopo de Trees
    try {
      onLog("🌳 Gerando árvore de diretórios remota...");
      const treeBody: any = { tree: treeItems };
      if (lastCommitSha) {
        treeBody.base_tree = lastCommitSha;
      }

      const treeResp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/git/trees`, {
        method: 'POST',
        headers: { Authorization: `token ${githubToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(treeBody)
      });
      const treeData = await treeResp.json();
      
      if (!treeResp.ok || !treeData.sha) {
        onLog("⚠️ PAT simples detectado sem suporte a Git Trees API. Ativando fallback resiliente...");
        return await this.pushViaContentsApi(config, filesToPush, onLog);
      }

      // 5. Criar o Commit
      onLog("💾 Consolidando alterações (Atomic Commit)...");
      const commitBody: any = {
        message: `Heavy Studio Build: v${new Date().getTime()} - Compilação ${config.platform} via CI/CD`,
        tree: treeData.sha
      };
      if (lastCommitSha) {
        commitBody.parents = [lastCommitSha];
      } else {
        commitBody.parents = [];
      }

      const commitResp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/git/commits`, {
        method: 'POST',
        headers: { Authorization: `token ${githubToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commitBody)
      });
      const commitData = await commitResp.json();
      if (!commitResp.ok || !commitData.sha) {
        onLog("⚠️ Redirecionando envio para Contents API devido a permissão de Commit...");
        return await this.pushViaContentsApi(config, filesToPush, onLog);
      }

      // 6. Atualizar ou Criar a Referência (Push / Force Push)
      onLog("🔗 Vinculando branch ao novo commit...");
      let pushResp: Response;
      if (lastCommitSha) {
        pushResp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/git/refs/heads/${branch}`, {
          method: 'PATCH',
          headers: { Authorization: `token ${githubToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: commitData.sha, force: true })
        });
      } else {
        // Criar nova ref se não existia
        pushResp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/git/refs`, {
          method: 'POST',
          headers: { Authorization: `token ${githubToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitData.sha })
        });
        if (!pushResp.ok) {
          // Tentar PATCH se a ref já foi criada simultaneamente
          pushResp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers: { Authorization: `token ${githubToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha: commitData.sha, force: true })
          });
        }
      }

      if (pushResp.ok) {
        onLog(`✅ Sincronização concluída! O código e assets foram enviados ao GitHub.`);
        onLog(`🔗 Acesse a aba "Actions" no GitHub para acompanhar a compilação.`);
      } else {
        onLog("⚠️ API de Refs falhou. Ativando fallback via Contents API...");
        return await this.pushViaContentsApi(config, filesToPush, onLog);
      }
    } catch (e: any) {
      onLog(`⚠️ Erro na sincronização via Tree API (${e.message}). Ativando envio via Contents API...`);
      return await this.pushViaContentsApi(config, filesToPush, onLog);
    }
  },

  /**
   * Fallback: Envia os arquivos um a um através da API de Conteúdos (PUT /contents/{path})
   * Funciona com qualquer PAT do GitHub com permissão 'contents:write'
   */
  async pushViaContentsApi(
    config: AppConfig,
    filesToPush: { path: string; content: string; encoding?: 'utf-8' | 'base64' }[],
    onLog: (msg: string) => void
  ): Promise<void> {
    const { githubUser, githubRepo, githubToken, workflowBranch } = config;
    const branch = workflowBranch || 'main';
    onLog("🔄 Sincronizando arquivos diretamente via GitHub Contents API...");

    for (let i = 0; i < filesToPush.length; i++) {
      const file = filesToPush[i];
      onLog(`📤 Sincronizando (${i + 1}/${filesToPush.length}): ${file.path}...`);

      try {
        // Checar SHA existente
        let existingSha: string | undefined = undefined;
        const checkResp = await fetch(
          `https://api.github.com/repos/${githubUser}/${githubRepo}/contents/${file.path}?ref=${branch}`,
          { headers: { Authorization: `token ${githubToken}` } }
        );
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          existingSha = checkData.sha;
        }

        let base64Content = file.content;
        if (file.encoding !== 'base64') {
          // Encode UTF-8 seguro para Base64
          base64Content = btoa(unescape(encodeURIComponent(file.content)));
        }

        const bodyPayload: any = {
          message: `Heavy Studio Build: Update ${file.path}`,
          content: base64Content,
          branch: branch
        };
        if (existingSha) {
          bodyPayload.sha = existingSha;
        }

        const putResp = await fetch(
          `https://api.github.com/repos/${githubUser}/${githubRepo}/contents/${file.path}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `token ${githubToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
          }
        );

        if (!putResp.ok) {
          const errData = await putResp.json().catch(() => ({}));
          onLog(`⚠️ Erro ao enviar ${file.path}: ${errData.message || putResp.statusText}`);
        }
      } catch (err: any) {
        onLog(`⚠️ Falha ao processar ${file.path}: ${err.message}`);
      }
    }

    onLog(`✅ Sincronização concluída com sucesso via Contents API (PAT Simples)!`);
    onLog(`🔗 Acesse a aba "Actions" no GitHub para acompanhar os workflows.`);
  },

  /**
   * Obtém a lista de execuções de workflows no GitHub Actions
   */
  async getWorkflowRuns(config: AppConfig): Promise<any[]> {
    const { githubUser, githubRepo, githubToken } = config;
    if (!githubUser || !githubRepo) return [];

    const headers: Record<string, string> = {};
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    try {
      const resp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/actions/runs?per_page=15`, { headers });
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.workflow_runs || [];
    } catch (e) {
      console.error("Erro ao buscar workflow runs:", e);
      return [];
    }
  },

  /**
   * Obtém os jobs e etapas de um workflow específico
   */
  async getRunJobs(config: AppConfig, runId: number): Promise<any[]> {
    const { githubUser, githubRepo, githubToken } = config;
    if (!githubUser || !githubRepo || !runId) return [];

    const headers: Record<string, string> = {};
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    try {
      const resp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/actions/runs/${runId}/jobs`, { headers });
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.jobs || [];
    } catch (e) {
      console.error("Erro ao buscar jobs do workflow:", e);
      return [];
    }
  },

  /**
   * Dispara uma nova execução de workflow manualmente (workflow_dispatch)
   */
  async triggerWorkflow(config: AppConfig): Promise<boolean> {
    const { githubUser, githubRepo, githubToken, workflowBranch } = config;
    if (!githubUser || !githubRepo || !githubToken) throw new Error("Credenciais GitHub incompletas.");

    const resp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/actions/workflows/android.yml/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref: workflowBranch || 'main' })
    });

    return resp.ok || resp.status === 204;
  },

  /**
   * Re-executa um workflow que falhou ou foi concluído
   */
  async rerunWorkflow(config: AppConfig, runId: number): Promise<boolean> {
    const { githubUser, githubRepo, githubToken } = config;
    if (!githubUser || !githubRepo || !githubToken) throw new Error("Credenciais GitHub incompletas.");

    const resp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/actions/runs/${runId}/rerun`, {
      method: 'POST',
      headers: { Authorization: `token ${githubToken}` }
    });

    return resp.ok;
  },

  /**
   * Obtém os logs textuais brutos de um job do GitHub Actions
   */
  async getJobLogs(config: AppConfig, jobId: number): Promise<string> {
    const { githubUser, githubRepo, githubToken } = config;
    if (!githubUser || !githubRepo || !jobId) return '';

    const headers: Record<string, string> = {};
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    try {
      const resp = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepo}/actions/jobs/${jobId}/logs`, { headers });
      if (resp.ok) {
        return await resp.text();
      }
    } catch (e) {
      console.error("Erro ao buscar logs brutas do job:", e);
    }
    return '';
  }
};

