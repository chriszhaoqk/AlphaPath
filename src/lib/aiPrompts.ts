import type { ChatMessage } from './ai';

// 系统角色设定：以成熟基金经理为目标的总教练
export const SYSTEM_PROMPT_FUND_MANAGER = `你是一位管理百亿规模、年化收益20%+且穿越多轮牛熊的资深基金经理，同时是用户的私人职业教练。
用户身份：二级市场券商分析师（专注半导体/科技），目标成为全产业覆盖的基金经理。

你的分析原则：
1. **结果导向**：以"是否能持续跑赢市场、能否积累深度认知、能否向上晋升"为评价标尺，不堆砌套话。
2. **诚实尖锐**：直接指出问题（如时间错配、深度不足、广度不够、执行不力），不留情面。
3. **可落地**：每条建议都要给出"明天就能做的具体动作"，避免"加强学习"这类空话。
4. **基金经理视角**：把每日工作放到职业成长曲线里评估——它对能力雷达图（产业/个股/宏观/策略/量化）哪一维有正向贡献？ROI 是否合理？
5. **数据说话**：基于用户提供的完成率、时间投入、四象限分布、标签分布等数据做诊断，而非泛泛而谈。

输出要求：
- 使用 HTML 格式（<h3>/<h4>/<p>/<ul>/<li>/<strong>），不要使用 markdown。
- 控制篇幅在 600-1000 字，深度优先。
- 涉及建议时，按"立即可做 / 本周规划 / 中长期布局"分层。
- 末尾用一句话总结今日对基金经理成长曲线的贡献（正/负/中性）。`;

export interface DailyTaskStats {
  date: string;
  totalCount: number;
  completedCount: number;
  completionRate: number;
  totalTimeSpentSec: number;
  quadrantStats: Record<string, { total: number; done: number; timeSec: number }>;
  tagStats: Record<string, { total: number; done: number; timeSec: number }>;
  completedTasks: { title: string; tags: string[]; timeSec: number }[];
  uncompletedTasks: { title: string; quadrant: string }[];
}

/**
 * 构造每日总结的 messages
 */
export function buildDailySummaryMessages(stats: DailyTaskStats): ChatMessage[] {
  const lines: string[] = [];
  lines.push(`【日期】${stats.date}`);
  lines.push(`【总任务】${stats.totalCount} 项；【已完成】${stats.completedCount} 项；【完成率】${stats.completionRate}%`);
  lines.push(`【总投入时长】${formatSec(stats.totalTimeSpentSec)}`);
  lines.push('');

  lines.push('【四象限分布】');
  for (const [q, s] of Object.entries(stats.quadrantStats)) {
    if (s.total > 0) lines.push(`  - ${q}: ${s.done}/${s.total} 完成，投入 ${formatSec(s.timeSec)}`);
  }
  lines.push('');

  lines.push('【标签分布】');
  const tagEntries = Object.entries(stats.tagStats).filter(([, s]) => s.total > 0);
  if (tagEntries.length === 0) lines.push('  (无标签)');
  for (const [tag, s] of tagEntries) {
    lines.push(`  - ${tag}: ${s.done}/${s.total} 完成，投入 ${formatSec(s.timeSec)}`);
  }
  lines.push('');

  lines.push('【已完成任务清单】');
  if (stats.completedTasks.length === 0) lines.push('  (无)');
  for (const t of stats.completedTasks) {
    const tags = t.tags.length > 0 ? ` [${t.tags.join(',')}]` : '';
    lines.push(`  - ${t.title}${tags} — ${formatSec(t.timeSec)}`);
  }
  lines.push('');

  lines.push('【未完成任务清单】');
  if (stats.uncompletedTasks.length === 0) lines.push('  (无)');
  for (const t of stats.uncompletedTasks) {
    lines.push(`  - ${t.title} [象限:${t.quadrant}]`);
  }

  const userPrompt = `以下是用户今日（${stats.date}）的工作数据，请你以资深基金经理 + 职业教练的双重身份做深度复盘。

${lines.join('\n')}

请输出 HTML 格式的每日总结，必须包含以下版块（用 <h3> 标题分隔）：

1. <h3>📋 今日工作全景</h3>
   - 一段话概括今日执行情况（完成率/投入/亮点/缺口），不超过 120 字。

2. <h3>🔍 深度诊断</h3>
   - 2-3 条尖锐诊断，结合四象限分布、标签分布、时间投入判断：
     * 时间是否花在了"重要"的事上（B象限重要不紧急是否被忽视）？
     * 产业/个股/宏观/策略/量化五大维度的投入是否均衡？是否有明显短板？
     * 完成率与投入时长的匹配度——是高效完成还是低效拖延？

3. <h3>💡 具体改进建议</h3>
   - 分三层：
     * <strong>立即可做（明日）</strong>：1-2 条具体动作
     * <strong>本周规划</strong>：1-2 条本周重点
     * <strong>中长期布局</strong>：1 条指向基金经理成长曲线的建议

4. <h3>📈 基金经理成长曲线</h3>
   - 末尾一句话：今日对基金经理成长曲线的贡献（正向/负向/中性），并简述原因。

注意：不要使用 markdown 语法，全部用 HTML 标签。`;

  return [
    { role: 'system', content: SYSTEM_PROMPT_FUND_MANAGER },
    { role: 'user', content: userPrompt },
  ];
}

function formatSec(sec: number): string {
  if (!sec || sec < 60) return `${sec || 0}秒`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
}
