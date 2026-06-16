import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTaskStore } from './useTaskStore';
import { useGoalStore } from './useGoalStore';
import { useIndustryStore } from './useIndustryStore';
import { useJournalStore } from './useJournalStore';
import { useLearningStore } from './useLearningStore';
import { useSkillStore } from './useSkillStore';
import { useStrategyStore } from './useStrategyStore';

interface SyncPayload {
  version: string;
  syncedAt: string;
  tasks: unknown[];
  goals: unknown[];
  researches: unknown[];
  journals: unknown[];
  learnings: unknown[];
  assessments: unknown[];
  strategies: unknown[];
}

interface SyncState {
  githubToken: string;
  gistId: string;
  lastSyncTime: string | null;
  lastSyncDirection: 'upload' | 'download' | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage: string;
  autoSync: boolean;

  setGithubToken: (token: string) => void;
  setGistId: (id: string) => void;
  setAutoSync: (enabled: boolean) => void;
  clearCredentials: () => void;

  uploadToCloud: () => Promise<boolean>;
  downloadFromCloud: () => Promise<boolean>;
  sync: () => Promise<boolean>;

  exportToJson: () => string;
  importFromJson: (jsonStr: string) => boolean;
}

const GIST_FILENAME = 'alphapath-data.json';
const DATA_VERSION = '1.0.0';

function collectLocalData(): SyncPayload {
  const taskState = useTaskStore.getState();
  const goalState = useGoalStore.getState();
  const industryState = useIndustryStore.getState();
  const journalState = useJournalStore.getState();
  const learningState = useLearningStore.getState();
  const skillState = useSkillStore.getState();
  const strategyState = useStrategyStore.getState();

  return {
    version: DATA_VERSION,
    syncedAt: new Date().toISOString(),
    tasks: [...taskState.tasks],
    goals: [...goalState.goals],
    researches: [...industryState.researches],
    journals: [...journalState.journals],
    learnings: [...learningState.learnings],
    assessments: [...skillState.assessments],
    strategies: [...strategyState.strategies],
  };
}

function mergeByUpdatedAt<T extends { id: string; updatedAt?: string; updated_at?: string; assessedAt?: string; createdAt?: string; created_at?: string }>(
  local: T[],
  remote: T[]
): T[] {
  const map = new Map<string, T>();

  for (const item of local) {
    map.set(item.id, item);
  }

  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const remoteTime = item.updatedAt || item.updated_at || item.assessedAt || item.createdAt || item.created_at || '';
      const localTime = existing.updatedAt || existing.updated_at || existing.assessedAt || existing.createdAt || existing.created_at || '';
      if (remoteTime > localTime) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values());
}

function applyRemoteData(remote: SyncPayload) {
  const local = collectLocalData();

  const mergedTasks = mergeByUpdatedAt(local.tasks as any[], remote.tasks as any[]);
  const mergedGoals = mergeByUpdatedAt(local.goals as any[], remote.goals as any[]);
  const mergedResearches = mergeByUpdatedAt(local.researches as any[], remote.researches as any[]);
  const mergedJournals = mergeByUpdatedAt(local.journals as any[], remote.journals as any[]);
  const mergedLearnings = mergeByUpdatedAt(local.learnings as any[], remote.learnings as any[]);
  const mergedAssessments = mergeByUpdatedAt(local.assessments as any[], remote.assessments as any[]);
  const mergedStrategies = mergeByUpdatedAt(local.strategies as any[], remote.strategies as any[]);

  const { set: _taskSet, ..._taskRest } = useTaskStore.getState();
  const { set: _goalSet, ..._goalRest } = useGoalStore.getState();
  const { set: _industrySet, ..._industryRest } = useIndustryStore.getState();
  const { set: _journalSet, ..._journalRest } = useJournalStore.getState();
  const { set: _learningSet, ..._learningRest } = useLearningStore.getState();
  const { set: _skillSet, ..._skillRest } = useSkillStore.getState();
  const { set: _strategySet, ..._strategyRest } = useStrategyStore.getState();

  useTaskStore.setState({ tasks: mergedTasks as any });
  useGoalStore.setState({ goals: mergedGoals as any });
  useIndustryStore.setState({ researches: mergedResearches as any });
  useJournalStore.setState({ journals: mergedJournals as any });
  useLearningStore.setState({ learnings: mergedLearnings as any });
  useSkillStore.setState({ assessments: mergedAssessments as any });
  useStrategyStore.setState({ strategies: mergedStrategies as any });
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      githubToken: '',
      gistId: '',
      lastSyncTime: null,
      lastSyncDirection: null,
      syncStatus: 'idle',
      syncMessage: '',
      autoSync: false,

      setGithubToken: (token) => set({ githubToken: token }),
      setGistId: (id) => set({ gistId: id }),
      setAutoSync: (enabled) => set({ autoSync: enabled }),
      clearCredentials: () => set({ githubToken: '', gistId: '' }),

      uploadToCloud: async () => {
        const { githubToken, gistId } = get();
        if (!githubToken) {
          set({ syncStatus: 'error', syncMessage: '请先配置 GitHub Token' });
          return false;
        }

        set({ syncStatus: 'syncing', syncMessage: '正在上传数据到云端...' });

        try {
          const data = collectLocalData();
          const content = JSON.stringify(data, null, 2);

          const headers: Record<string, string> = {
            'Authorization': `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
          };

          const payload = {
            description: `AlphaPath 数据备份 - ${new Date().toLocaleString()}`,
            public: false,
            files: {
              [GIST_FILENAME]: { content },
            },
          };

          let response;
          if (gistId) {
            response = await fetch(`https://api.github.com/gists/${gistId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(payload),
            });
          }

          if (!gistId || !response?.ok) {
            response = await fetch('https://api.github.com/gists', {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            });
          }

          if (!response.ok) {
            const err = await response.json().catch(() => ({ message: '网络错误' }));
            throw new Error(err.message || `HTTP ${response.status}`);
          }

          const result = await response.json();
          set({
            gistId: result.id || gistId,
            lastSyncTime: new Date().toISOString(),
            lastSyncDirection: 'upload',
            syncStatus: 'success',
            syncMessage: `上传成功 - ${new Date().toLocaleString()}`,
          });
          return true;
        } catch (err: any) {
          set({ syncStatus: 'error', syncMessage: `上传失败: ${err.message || '未知错误'}` });
          return false;
        }
      },

      downloadFromCloud: async () => {
        const { githubToken, gistId } = get();
        if (!githubToken || !gistId) {
          set({ syncStatus: 'error', syncMessage: '请先配置 GitHub Token 并上传过数据' });
          return false;
        }

        set({ syncStatus: 'syncing', syncMessage: '正在从云端拉取数据...' });

        try {
          const headers: Record<string, string> = {
            'Authorization': `Bearer ${githubToken}`,
          };

          const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({ message: '网络错误' }));
            throw new Error(err.message || `HTTP ${response.status}`);
          }

          const result = await response.json();
          const file = result.files?.[GIST_FILENAME];

          if (!file?.content) {
            throw new Error('云端没有找到 AlphaPath 数据');
          }

          const remote: SyncPayload = JSON.parse(file.content);
          applyRemoteData(remote);

          set({
            lastSyncTime: new Date().toISOString(),
            lastSyncDirection: 'download',
            syncStatus: 'success',
            syncMessage: `拉取成功 - ${new Date().toLocaleString()}`,
          });
          return true;
        } catch (err: any) {
          set({ syncStatus: 'error', syncMessage: `拉取失败: ${err.message || '未知错误'}` });
          return false;
        }
      },

      sync: async () => {
        const { githubToken, gistId } = get();
        if (!githubToken) {
          set({ syncStatus: 'error', syncMessage: '请先配置 GitHub Token' });
          return false;
        }

        set({ syncStatus: 'syncing', syncMessage: '正在智能同步...' });

        try {
          const headers: Record<string, string> = {
            'Authorization': `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
          };

          let remote: SyncPayload | null = null;
          let currentGistId = gistId;

          if (currentGistId) {
            const response = await fetch(`https://api.github.com/gists/${currentGistId}`, {
              method: 'GET',
              headers,
            });

            if (response.ok) {
              const result = await response.json();
              const file = result.files?.[GIST_FILENAME];
              if (file?.content) {
                remote = JSON.parse(file.content);
              }
            }
          }

          if (remote) {
            applyRemoteData(remote);
            const merged = collectLocalData();
            const content = JSON.stringify(merged, null, 2);

            const response = await fetch(`https://api.github.com/gists/${currentGistId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                files: { [GIST_FILENAME]: { content } },
              }),
            });

            if (!response.ok) {
              const err = await response.json().catch(() => ({ message: '网络错误' }));
              throw new Error(err.message || `HTTP ${response.status}`);
            }
          } else {
            const data = collectLocalData();
            const content = JSON.stringify(data, null, 2);

            const response = await fetch('https://api.github.com/gists', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                description: `AlphaPath 数据备份 - ${new Date().toLocaleString()}`,
                public: false,
                files: { [GIST_FILENAME]: { content } },
              }),
            });

            if (!response.ok) {
              const err = await response.json().catch(() => ({ message: '网络错误' }));
              throw new Error(err.message || `HTTP ${response.status}`);
            }

            const result = await response.json();
            currentGistId = result.id;
          }

          set({
            gistId: currentGistId,
            lastSyncTime: new Date().toISOString(),
            lastSyncDirection: 'upload',
            syncStatus: 'success',
            syncMessage: `同步成功 - ${new Date().toLocaleString()}`,
          });
          return true;
        } catch (err: any) {
          set({ syncStatus: 'error', syncMessage: `同步失败: ${err.message || '未知错误'}` });
          return false;
        }
      },

      exportToJson: () => {
        const data = collectLocalData();
        return JSON.stringify(data, null, 2);
      },

      importFromJson: (jsonStr: string) => {
        try {
          const remote: SyncPayload = JSON.parse(jsonStr);
          applyRemoteData(remote);
          set({
            lastSyncTime: new Date().toISOString(),
            syncStatus: 'success',
            syncMessage: `导入成功 - ${new Date().toLocaleString()}`,
          });
          return true;
        } catch (err: any) {
          set({ syncStatus: 'error', syncMessage: `导入失败: ${err.message || 'JSON 格式错误'}` });
          return false;
        }
      },
    }),
    {
      name: 'alphapath-sync',
      partialize: (state) => ({
        githubToken: state.githubToken,
        gistId: state.gistId,
        lastSyncTime: state.lastSyncTime,
        autoSync: state.autoSync,
      }),
    }
  )
);
