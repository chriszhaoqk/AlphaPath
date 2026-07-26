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

// ============ 主观面试题评分 ============

export interface InterviewAnswerInput {
  questionId: string;
  dimension: string;
  category: string;
  title: string;
  scenario: string;
  prompt: string;
  source: string;
  referenceKeywords: string[];
  answer: string;
}

export interface InterviewScoreResult {
  score: number;          // 0-10
  feedback: string;       // HTML 点评
  improvements: string;   // HTML 修改建议
}

// 单题评分的 system prompt
const SYSTEM_PROMPT_INTERVIEWER = `你是一位参与过睿远、淡水泉、高毅、景林等头部主观基金投研面试的资深合伙人，正在评估候选人（一名立志成为基金经理的券商分析师）的作答。

评分标尺（0-10 分）：
- 9-10 分（S 级）：见解超越从业年限，有独立深度思考，能识别题目陷阱，论证严密，可直接用于投资决策。
- 7-8 分（A 级）：框架完整、逻辑清晰，覆盖核心维度，有可落地的结论，达到头部基金研究员水平。
- 5-6 分（B 级）：方向正确但深度不足，或遗漏关键维度，停留在"知道"而非"理解"层面。
- 3-4 分（C 级）：套话堆砌、逻辑混乱、缺乏数据支撑，未达到研究员合格水平。
- 0-2 分（D 级）：答非所问或过于简陋，未展现专业认知。

点评原则：
1. 像真实面试官一样诚实尖锐，直接指出漏洞，不堆砌客套话。
2. 引用候选人答案中的具体表述作为论据（如"你说'技术壁垒高'但未论证为何海外龙头无法快速跟进"）。
3. 修改建议要给出"参考答案思路"的关键维度，但不要代写完整答案。
4. 全部用 HTML 格式（<h4>/<p>/<ul>/<li>/<strong>），不要 markdown。`;

/**
 * 构造单题评分的 messages
 */
export function buildInterviewScoringMessages(input: InterviewAnswerInput): ChatMessage[] {
  const userPrompt = `【题目来源】${input.source}
【考察维度】${input.dimension} / ${input.category}
【题目标题】${input.title}

【题干背景】
${input.scenario}

【问题】
${input.prompt}

【参考关键词】（用于判断答案是否覆盖关键概念，但不要求全部出现）
${input.referenceKeywords.join('、')}

【候选人作答】
"""
${input.answer || '（未作答）'}
"""

请按以下 JSON 格式返回评分结果（务必返回合法 JSON，不要包裹 markdown 代码块，不要添加任何说明文字）：

{
  "score": <0-10 的整数>,
  "feedback": "<HTML 格式的点评，200-400 字，先肯定亮点再指出问题>",
  "improvements": "<HTML 格式的修改建议，200-400 字，给出参考思路的关键维度与具体可补强的方向>"
}

注意：feedback 与 improvements 必须是 HTML 字符串（可用 <p>/<ul>/<li>/<strong>），不要使用 markdown。`;

  return [
    { role: 'system', content: SYSTEM_PROMPT_INTERVIEWER },
    { role: 'user', content: userPrompt },
  ];
}

// 总体评语的 system prompt
const SYSTEM_PROMPT_OVERALL = `你是一位头部主观基金的投研负责人，正在对一位应聘研究员/基金经理的候选人做整体评估。
基于候选人在各维度主观题的得分与点评，给出一份整体评语。

要求：
1. HTML 格式输出（<h3>/<h4>/<p>/<ul>/<li>/<strong>），不要 markdown。
2. 控制在 400-600 字。
3. 包含：①整体水平定位 ②核心优势 ③主要短板 ④录用建议（推荐/待定/不推荐，并说明适合的岗位层级）。
4. 诚实尖锐，有数据有论据。`;

/**
 * 构造总体评语的 messages
 */
export function buildOverallAssessmentMessages(
  scoredAnswers: { dimension: string; title: string; score: number; feedback: string }[]
): ChatMessage[] {
  const lines: string[] = [];
  lines.push('【候选人各题得分与点评摘要】\n');
  scoredAnswers.forEach((a, i) => {
    lines.push(`题目 ${i + 1}：${a.title}`);
    lines.push(`维度：${a.dimension} | 得分：${a.score}/10`);
    // feedback 是 HTML，简单剥离标签取纯文本摘要
    const text = a.feedback.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    lines.push(`点评摘要：${text.slice(0, 200)}${text.length > 200 ? '...' : ''}\n`);
  });

  const userPrompt = `${lines.join('\n')}

请输出 HTML 格式的整体评语，包含以下版块（用 <h3> 分隔）：

1. <h3>整体水平定位</h3>
   一段话定位候选人的当前水平（如"达到头部基金高级研究员水平，距离基金经理尚有1-2年差距"）。

2. <h3>核心优势</h3>
   2-3 条，引用具体题目表现。

3. <h3>主要短板</h3>
   2-3 条，直接指出问题。

4. <h3>录用建议</h3>
   明确给出：推荐 / 待定 / 不推荐，以及适合的岗位层级（如"研究员助理/中级研究员/高级研究员/基金经理"）。`;

  return [
    { role: 'system', content: SYSTEM_PROMPT_OVERALL },
    { role: 'user', content: userPrompt },
  ];
}

