import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useAIStore, AI_PROVIDERS } from '@/store/useAIStore';
import { testAIConnection } from '@/lib/ai';
import { useNewsStore } from '@/store/useNewsStore';
import {
  Cloud,
  CloudOff,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Download,
  Upload,
  LogOut,
  Info,
  Copy,
  Check,
  AlertCircle,
  FileJson,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Newspaper,
} from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuthStore();
  const syncStore = useSyncStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Update check
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  >('idle');
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState('');

  // AI 助手配置
  const aiStore = useAIStore();
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiTestMessage, setAiTestMessage] = useState('');
  const [aiCustomModel, setAiCustomModel] = useState(aiStore.model);

  // 新闻 API 配置
  const newsStore = useNewsStore();
  const [newsKeyInput, setNewsKeyInput] = useState('');

  const handleSaveAiKey = () => {
    if (aiKeyInput.trim()) {
      aiStore.setApiKey(aiKeyInput.trim());
      setAiKeyInput('');
      setAiTestStatus('idle');
      setAiTestMessage('');
    }
  };

  const handleTestAi = async () => {
    setAiTestStatus('testing');
    setAiTestMessage('');
    try {
      const reply = await testAIConnection();
      setAiTestStatus('success');
      setAiTestMessage(`连接成功：${reply.slice(0, 60)}`);
    } catch (err: any) {
      setAiTestStatus('error');
      setAiTestMessage(err?.message || '连接失败');
    }
  };

  const handleProviderChange = (id: string) => {
    aiStore.setProvider(id);
    const preset = AI_PROVIDERS.find((p) => p.id === id);
    if (preset) setAiCustomModel(preset.defaultModel);
    setAiTestStatus('idle');
    setAiTestMessage('');
  };

  const handleSaveCustomModel = () => {
    if (aiCustomModel.trim()) {
      aiStore.setModel(aiCustomModel.trim());
      setAiTestStatus('idle');
    }
  };

  const {
    githubToken,
    gistId,
    lastSyncTime,
    syncStatus,
    syncMessage,
    autoSync,
    setGithubToken,
    setGistId,
    setAutoSync,
    clearCredentials,
    uploadToCloud,
    downloadFromCloud,
    sync,
    exportToJson,
    importFromJson,
  } = syncStore;

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      setGithubToken(tokenInput.trim());
      setTokenInput('');
    }
  };

  const handleExport = () => {
    const json = exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alphapath-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      importFromJson(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyToken = () => {
    if (githubToken) {
      navigator.clipboard.writeText(githubToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateError('');
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onUpdateStatus) {
      electronAPI.onUpdateStatus((data: any) => {
        switch (data.type) {
          case 'available':
            setUpdateStatus('available');
            setUpdateVersion(data.version);
            break;
          case 'not-available':
            setUpdateStatus('not-available');
            break;
          case 'progress':
            setUpdateStatus('downloading');
            setUpdateProgress(data.percent);
            break;
          case 'downloaded':
            setUpdateStatus('downloaded');
            break;
          case 'error':
            setUpdateStatus('error');
            setUpdateError(data.message);
            break;
        }
      });
    }
    if (electronAPI?.checkForUpdates) {
      await electronAPI.checkForUpdates();
    } else {
      setUpdateStatus('error');
      setUpdateError('当前版本不支持自动更新，请手动下载最新版');
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '从未同步';
    const d = new Date(iso);
    return d.toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-text-primary font-display">设置</h1>

      {/* Cloud Sync - 云端同步 */}
      <section>
        <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Cloud size={18} className="text-gold" />
          云端同步
        </h2>

        <div className="card p-4 md:p-5 space-y-4">
          {/* Status summary */}
          <div className="flex items-start justify-between p-3 bg-[#0D1117] rounded-xl border border-border-custom">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {syncStatus === 'success' && (
                  <Check size={14} className="text-positive flex-shrink-0" />
                )}
                {syncStatus === 'error' && (
                  <AlertCircle size={14} className="text-urgent flex-shrink-0" />
                )}
                {(syncStatus === 'idle' || syncStatus === 'syncing') && (
                  <Cloud size={14} className="text-gold flex-shrink-0" />
                )}
                <span className="text-sm text-text-primary font-medium">
                  {syncStatus === 'success'
                    ? '同步正常'
                    : syncStatus === 'error'
                      ? '同步异常'
                      : syncStatus === 'syncing'
                        ? '同步中...'
                        : '待同步'}
                </span>
              </div>
              {syncMessage && (
                <p
                  className={`text-xs ${
                    syncStatus === 'error' ? 'text-urgent' : 'text-text-muted'
                  }`}
                >
                  {syncMessage}
                </p>
              )}
              <p className="text-xs text-text-muted mt-1">
                最后同步时间: {formatTime(lastSyncTime)}
              </p>
              {gistId && (
                <p className="text-xs text-text-muted mt-0.5">
                  存储位置: GitHub Gist ({gistId.slice(0, 8)}...)
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
              <button
                onClick={() => setAutoSync(!autoSync)}
                className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${
                  autoSync ? 'bg-gold/15 text-gold' : 'bg-[#1A1F2E] text-text-muted'
                }`}
              >
                自动: {autoSync ? '开' : '关'}
              </button>
            </div>
          </div>

          {/* Sync actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={downloadFromCloud}
              disabled={syncStatus === 'syncing'}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[#1A1F2E] active:bg-[#242938] transition-colors disabled:opacity-50"
            >
              <CloudDownload size={20} className="text-gold" />
              <span className="text-xs text-text-primary">拉取</span>
            </button>
            <button
              onClick={sync}
              disabled={syncStatus === 'syncing'}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-gold/15 active:bg-gold/25 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={`text-gold ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span className="text-xs text-gold font-medium">智能同步</span>
            </button>
            <button
              onClick={uploadToCloud}
              disabled={syncStatus === 'syncing'}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[#1A1F2E] active:bg-[#242938] transition-colors disabled:opacity-50"
            >
              <CloudUpload size={20} className="text-gold" />
              <span className="text-xs text-text-primary">上传</span>
            </button>
          </div>

          {/* GitHub Token configuration */}
          <div className="pt-3 border-t border-border-custom">
            <label className="block text-xs text-text-secondary mb-2">
              GitHub Personal Token
              <span className="text-text-muted ml-1">（用于云端存储）</span>
            </label>

            {githubToken ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-muted overflow-hidden">
                    {showToken
                      ? githubToken
                      : '••••••••••••' + githubToken.slice(-8)}
                  </div>
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="flex items-center gap-1 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary active:bg-[#1A1F2E]"
                  >
                    {showToken ? '隐藏' : '显示'}
                  </button>
                  <button
                    onClick={handleCopyToken}
                    className="flex items-center gap-1 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary active:bg-[#1A1F2E]"
                  >
                    {tokenCopied ? <Check size={12} className="text-positive" /> : <Copy size={12} />}
                  </button>
                  <button
                    onClick={clearCredentials}
                    className="flex items-center gap-1 px-3 py-2 text-xs border border-urgent/30 rounded-lg text-urgent active:bg-urgent/10"
                  >
                    <Trash2 size={12} />
                    清除
                  </button>
                </div>
                <p className="text-xs text-text-muted">
                  Token 已保存，仅存储在本地设备。
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
                  />
                  <button
                    onClick={handleSaveToken}
                    disabled={!tokenInput.trim()}
                    className="btn-gold text-sm px-4 disabled:opacity-40"
                  >
                    保存
                  </button>
                </div>
                <details className="text-xs text-text-muted">
                  <summary className="cursor-pointer hover:text-gold">如何获取 GitHub Token？</summary>
                  <div className="mt-2 p-3 bg-ink rounded-lg space-y-1.5 leading-relaxed">
                    <p>1. 打开 github.com → Settings → Developer settings → Personal access tokens</p>
                    <p>2. 点击 Generate new token → Generate new token (classic)</p>
                    <p>3. 勾选 <span className="text-gold">gist</span> 权限（只勾选这一个即可）</p>
                    <p>4. 点击 Generate token，复制 token（形如 ghp_xxx）粘贴到上方</p>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Gist ID display */}
          {gistId && (
            <div className="pt-2">
              <label className="block text-xs text-text-secondary mb-1.5">同步 ID</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-muted truncate">
                  {gistId}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(gistId);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border-custom rounded-lg text-text-secondary active:bg-[#1A1F2E]"
                >
                  <Copy size={12} />
                  复制
                </button>
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                在其他设备上安装 AlphaPath 后，使用相同的 Token 并在此输入 ID 即可同步。
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Backup & Restore - 数据备份 */}
      <section>
        <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
          <FileJson size={18} className="text-gold" />
          本地备份
        </h2>
        <div className="card p-4 md:p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm text-text-primary">导出数据到文件</p>
              <p className="text-xs text-text-muted">将所有数据保存为 JSON 文件，可用于备份或跨设备迁移</p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary active:bg-[#1A1F2E] flex-shrink-0"
            >
              <Download size={14} />
              导出
            </button>
          </div>

          <div className="flex items-start justify-between pt-3 border-t border-border-custom">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm text-text-primary">从文件导入数据</p>
              <p className="text-xs text-text-muted">从 JSON 文件恢复数据，将与本地数据智能合并</p>
            </div>
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary active:bg-[#1A1F2E] flex-shrink-0"
            >
              <Upload size={14} />
              导入
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
          </div>
        </div>
      </section>

      {/* AI Assistant Configuration */}
      <section>
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-gold" />
          AI 助手配置
        </h2>
        <div className="card p-4 md:p-5 space-y-4">
          <p className="text-xs text-text-muted">
            配置 AI 助手后，「任务中心 → 每日总结」将以资深基金经理视角深度分析当日工作，给出立即可做的改进建议与中长期成长规划。所有配置仅存储在本地。
          </p>

          {/* 服务商选择 */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">服务商</label>
            <select
              value={aiStore.providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Base URL（自定义可编辑） */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">Base URL</label>
            <input
              type="text"
              value={aiStore.baseURL}
              onChange={(e) => aiStore.setBaseURL(e.target.value)}
              placeholder="https://api.example.com/v1"
              disabled={aiStore.providerId !== 'custom'}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 disabled:opacity-60"
            />
          </div>

          {/* 模型选择/输入 */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">
              模型
              <span className="text-text-muted ml-1">（可直接编辑模型名）</span>
            </label>
            <div className="flex gap-2">
              {aiStore.providerId !== 'custom' && (AI_PROVIDERS.find((p) => p.id === aiStore.providerId)?.modelOptions.length ?? 0) > 0 ? (
                <select
                  value={aiCustomModel}
                  onChange={(e) => { setAiCustomModel(e.target.value); aiStore.setModel(e.target.value); setAiTestStatus('idle'); setAiTestMessage(''); }}
                  className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                >
                  {/* 合并预设选项与当前已保存模型名（防止预设过时导致当前值丢失） */}
                  {Array.from(new Set([
                    ...(AI_PROVIDERS.find((p) => p.id === aiStore.providerId)?.modelOptions || []),
                    aiStore.model,
                  ])).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={aiCustomModel}
                  onChange={(e) => setAiCustomModel(e.target.value)}
                  placeholder="model-name"
                  className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                />
              )}
              <button
                onClick={() => {
                  if (aiCustomModel.trim() && aiCustomModel.trim() !== aiStore.model) {
                    aiStore.setModel(aiCustomModel.trim());
                    setAiTestStatus('idle');
                    setAiTestMessage('');
                  }
                }}
                disabled={!aiCustomModel.trim() || aiCustomModel.trim() === aiStore.model}
                className="px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary active:bg-[#1A1F2E] disabled:opacity-40"
                title="手动输入自定义模型名后点击保存"
              >
                保存
              </button>
            </div>
            <input
              type="text"
              value={aiCustomModel}
              onChange={(e) => setAiCustomModel(e.target.value)}
              placeholder="或在此手动输入任意模型名（如 deepseek-v4-pro）"
              className="mt-2 w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-gold/50"
            />
            <p className="mt-1 text-xs text-text-muted">
              当前使用：<span className="text-gold">{aiStore.model}</span>
              {aiCustomModel.trim() && aiCustomModel.trim() !== aiStore.model && (
                <span className="text-amber-400 ml-2">（输入框有未保存的改动）</span>
              )}
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">API Key</label>
            {aiStore.apiKey ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-muted overflow-hidden">
                    {showAiKey ? aiStore.apiKey : '••••••••••••' + aiStore.apiKey.slice(-8)}
                  </div>
                  <button
                    onClick={() => setShowAiKey(!showAiKey)}
                    className="flex items-center gap-1 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary active:bg-[#1A1F2E]"
                  >
                    {showAiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    onClick={() => { aiStore.setApiKey(''); setAiTestStatus('idle'); setAiTestMessage(''); }}
                    className="px-3 py-2 text-xs border border-urgent/30 rounded-lg text-urgent active:bg-urgent/10"
                  >
                    清除
                  </button>
                </div>
                <p className="text-xs text-positive flex items-center gap-1">
                  <Check size={12} /> API Key 已保存
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="password"
                  value={aiKeyInput}
                  onChange={(e) => setAiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                />
                <button
                  onClick={handleSaveAiKey}
                  disabled={!aiKeyInput.trim()}
                  className="px-3 py-2 text-xs btn-gold disabled:opacity-40"
                >
                  保存 API Key
                </button>
              </div>
            )}
            {aiStore.providerId !== 'custom' && AI_PROVIDERS.find((p) => p.id === aiStore.providerId)?.apiKeyUrl && (
              <a
                href={AI_PROVIDERS.find((p) => p.id === aiStore.providerId)!.apiKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-gold hover:underline"
              >
                <ExternalLink size={11} /> 获取 API Key
              </a>
            )}
          </div>

          {/* 测试连接 */}
          {aiStore.isConfigured() && (
            <div className="pt-3 border-t border-border-custom">
              <button
                onClick={handleTestAi}
                disabled={aiTestStatus === 'testing'}
                className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gold/30 rounded-lg text-gold hover:bg-gold/10 transition-colors disabled:opacity-40"
              >
                {aiTestStatus === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                测试连接
              </button>
              {aiTestStatus === 'success' && (
                <p className="mt-2 text-xs text-positive flex items-start gap-1.5">
                  <Check size={12} className="flex-shrink-0 mt-0.5" />
                  <span className="break-all">{aiTestMessage}</span>
                </p>
              )}
              {aiTestStatus === 'error' && (
                <p className="mt-2 text-xs text-urgent flex items-start gap-1.5">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  <span className="break-all">{aiTestMessage}</span>
                </p>
              )}
            </div>
          )}

          {/* 当前状态 */}
          <div className="pt-3 border-t border-border-custom text-xs">
            <p className="text-text-muted">
              状态：
              {aiStore.isConfigured() ? (
                <span className="text-positive">已就绪（{aiStore.providerId} / {aiStore.model}）</span>
              ) : (
                <span className="text-text-muted">未配置完整</span>
              )}
            </p>
            <p className="text-text-muted mt-1">
              配置完成后，前往「任务中心」点击「AI 生成总结」体验深度分析。
            </p>
          </div>
        </div>
      </section>

      {/* 新闻 API 配置 */}
      <section>
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Newspaper size={16} className="text-gold" />
          新闻 API 配置
        </h2>
        <div className="card p-4 md:p-5 space-y-4">
          <p className="text-xs text-text-muted">
            配置 GNews API Key 后，每日新闻页面将自动获取全球官方新闻源的实时资讯。免费版每日 100 次请求，可覆盖 7 个分类。
          </p>

          <div>
            <label className="block text-xs text-text-secondary mb-2">GNews API Key</label>
            {newsStore.apiKey ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-muted overflow-hidden">
                    {'••••••••••••' + newsStore.apiKey.slice(-8)}
                  </div>
                  <button
                    onClick={() => { newsStore.setApiKey(''); }}
                    className="px-3 py-2 text-xs border border-urgent/30 rounded-lg text-urgent active:bg-urgent/10"
                  >
                    清除
                  </button>
                </div>
                <p className="text-xs text-positive flex items-center gap-1">
                  <Check size={12} /> API Key 已保存
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="password"
                  value={newsKeyInput}
                  onChange={(e) => setNewsKeyInput(e.target.value)}
                  placeholder="gnews_xxx..."
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                />
                <button
                  onClick={() => { if (newsKeyInput.trim()) { newsStore.setApiKey(newsKeyInput.trim()); setNewsKeyInput(''); } }}
                  disabled={!newsKeyInput.trim()}
                  className="px-3 py-2 text-xs btn-gold disabled:opacity-40"
                >
                  保存 API Key
                </button>
              </div>
            )}
            <a
              href="https://gnews.io/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-gold hover:underline"
            >
              <ExternalLink size={11} /> 免费获取 GNews API Key
            </a>
          </div>
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-base font-semibold text-text-primary mb-3">账户</h2>
        <div className="card p-4 md:p-5 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">邮箱</span>
              <span className="text-sm text-text-primary">{user?.email || 'guest@alphapath'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">姓名</span>
              <span className="text-sm text-text-primary">{user?.name || '访客'}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border-custom">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 text-sm bg-urgent/10 text-urgent rounded-lg active:bg-urgent/20 transition-colors"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-base font-semibold text-text-primary mb-3">关于</h2>
        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-3 mb-3">
            <Info size={18} className="text-gold" />
            <div>
              <p className="text-sm font-semibold text-text-primary">AlphaPath</p>
              <p className="text-xs text-text-muted">版本 1.3.0</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mb-3">基金经理成长管理系统</p>

          <div className="pt-3 border-t border-border-custom">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">版本更新</p>
                {updateStatus === 'checking' && (
                  <p className="text-xs text-gold">正在检查更新...</p>
                )}
                {updateStatus === 'available' && (
                  <p className="text-xs text-positive">发现新版本 v{updateVersion}</p>
                )}
                {updateStatus === 'not-available' && (
                  <p className="text-xs text-text-muted">当前已是最新版本</p>
                )}
                {updateStatus === 'downloading' && (
                  <p className="text-xs text-gold">正在下载更新 {updateProgress}%</p>
                )}
                {updateStatus === 'downloaded' && (
                  <p className="text-xs text-positive">更新已就绪，请重启应用</p>
                )}
                {updateStatus === 'error' && (
                  <p className="text-xs text-urgent">{updateError || '检查更新失败'}</p>
                )}
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary active:bg-[#1A1F2E] disabled:opacity-50"
              >
                <RefreshCw size={14} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                检查更新
              </button>
            </div>
            {updateStatus === 'downloading' && (
              <div className="mt-2 w-full bg-border-custom rounded-full h-1.5">
                <div
                  className="bg-gold h-1.5 rounded-full transition-all"
                  style={{ width: `${updateProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
