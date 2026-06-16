import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Cloud, CloudOff, Download, Save, RotateCcw, LogOut, Info } from 'lucide-react';

interface VersionSnapshot {
  id: string;
  date: string;
  description: string;
}

export default function Settings() {
  const { user, logout } = useAuthStore();

  // Data Management
  const [cloudSync, setCloudSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('2025-06-15 10:30');
  const [syncing, setSyncing] = useState(false);

  // Version History
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([
    { id: '1', date: '2025-06-10', description: '初始数据导入' },
    { id: '2', date: '2025-06-12', description: '技能评估更新' },
  ]);
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');

  // Change Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setLastSyncTime(new Date().toLocaleString('zh-CN'));
      setSyncing(false);
    }, 1500);
  };

  const handleExport = () => {
    const data = {
      user,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alphapath-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateSnapshot = () => {
    if (!newSnapshotDesc.trim()) return;
    const snapshot: VersionSnapshot = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('zh-CN'),
      description: newSnapshotDesc.trim(),
    };
    setSnapshots((prev) => [snapshot, ...prev]);
    setNewSnapshotDesc('');
  };

  const handleRestore = (snapshot: VersionSnapshot) => {
    if (window.confirm(`确定恢复到「${snapshot.description}」版本？当前数据将被覆盖。`)) {
      // Restore logic would go here
    }
  };

  const handleChangePassword = () => {
    setPasswordMsg('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg('请填写所有密码字段');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('新密码与确认密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('新密码至少6位');
      return;
    }
    // Password change API call would go here
    setPasswordMsg('密码修改成功');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      <h1 className="text-2xl font-bold text-text-primary font-display">设置</h1>

      {/* Data Management */}
      <section>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">数据管理</h2>
        <div className="card p-4 md:p-5 space-y-3 md:space-y-4">
          {/* Cloud Sync Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {cloudSync ? (
                <Cloud size={20} className="text-positive" />
              ) : (
                <CloudOff size={20} className="text-text-muted" />
              )}
              <div>
                <p className="text-sm text-text-primary">云端同步</p>
                <p className="text-xs text-text-muted">自动同步数据到云端</p>
              </div>
            </div>
            <button
              onClick={() => setCloudSync(!cloudSync)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                cloudSync ? 'bg-positive' : 'bg-border-custom'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  cloudSync ? 'translate-x-5.5 left-0.5' : 'left-0.5'
                }`}
                style={{ transform: cloudSync ? 'translateX(22px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* Manual Sync */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">手动同步</p>
              <p className="text-xs text-text-muted">
                最后同步: {lastSyncTime}
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-gold text-sm px-3 py-1.5 md:px-4"
            >
              {syncing ? '同步中...' : '立即同步'}
            </button>
          </div>

          {/* Export Data */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">导出数据</p>
              <p className="text-xs text-text-muted">下载所有用户数据的JSON文件</p>
            </div>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 text-sm border border-border-custom rounded-lg text-text-secondary hover:text-text-primary hover:border-gold/50 transition-colors">
              <Download size={16} />
              导出
            </button>
          </div>

          {/* Create Snapshot */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">创建版本快照</p>
              <p className="text-xs text-text-muted">保存当前数据状态</p>
            </div>
            <button
              onClick={() => {
                if (newSnapshotDesc.trim()) {
                  handleCreateSnapshot();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 text-sm border border-border-custom rounded-lg text-text-secondary hover:text-text-primary hover:border-gold/50 transition-colors"
            >
              <Save size={16} />
              创建快照
            </button>
          </div>
        </div>
      </section>

      {/* Version History */}
      <section>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">版本历史</h2>
        <div className="card p-4 md:p-5 space-y-3 md:space-y-4">
          {/* Create new version */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSnapshotDesc}
              onChange={(e) => setNewSnapshotDesc(e.target.value)}
              placeholder="输入版本描述..."
              className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSnapshot();
              }}
            />
            <button onClick={handleCreateSnapshot} className="btn-gold text-sm px-3 md:px-4">
              创建
            </button>
          </div>

          {/* Snapshot list */}
          <div className="space-y-2">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="flex items-center justify-between py-2 border-b border-border-custom last:border-0">
                <div>
                  <p className="text-sm text-text-primary">{snapshot.description}</p>
                  <p className="text-xs text-text-muted">{snapshot.date}</p>
                </div>
                <button
                  onClick={() => handleRestore(snapshot)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors"
                >
                  <RotateCcw size={12} />
                  恢复
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">账户</h2>
        <div className="card p-4 md:p-5 space-y-3 md:space-y-4">
          {/* User info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">邮箱</span>
              <span className="text-sm text-text-primary">{user?.email || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">姓名</span>
              <span className="text-sm text-text-primary">{user?.name || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">注册日期</span>
              <span className="text-sm text-text-primary">-</span>
            </div>
          </div>

          {/* Change Password */}
          <div className="pt-4 border-t border-border-custom">
            <h3 className="text-sm font-semibold text-text-primary mb-3">修改密码</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="当前密码"
                className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码"
                className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="确认新密码"
                className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
              />
              {passwordMsg && (
                <p className={`text-xs ${passwordMsg.includes('成功') ? 'text-positive' : 'text-urgent'}`}>
                  {passwordMsg}
                </p>
              )}
              <button onClick={handleChangePassword} className="btn-gold text-sm">
                修改密码
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-4 border-t border-border-custom">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 text-sm bg-urgent/10 text-urgent rounded-lg hover:bg-urgent/20 transition-colors"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">关于</h2>
        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-3 mb-3">
            <Info size={20} className="text-gold" />
            <div>
              <p className="text-sm font-semibold text-text-primary">AlphaPath</p>
              <p className="text-xs text-text-muted">版本 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary">基金经理成长管理系统</p>
        </div>
      </section>
    </div>
  );
}
