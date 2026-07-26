import type { SkillScores } from '@/store/useSkillStore';

// 题目维度
export type Dimension = keyof SkillScores;

export interface InterviewQuestion {
  id: string;
  dimension: Dimension;
  category: string;      // 题目类别（如"商业模式"、"组合管理"）
  title: string;         // 题目标题（简短）
  scenario: string;      // 题干背景（详细描述）
  prompt: string;        // 具体发问
  suggestedMinChars: number;  // 建议最少字数
  referenceKeywords: string[];  // 参考关键词（AI 评分参考）
  source: string;        // 题目来源风格（如"睿远基金面试真题风格"）
}

/**
 * 头部主观基金（睿远、淡水泉、高毅、景林等）面试真题风格
 * 全部为开放性主观题，无标准答案，考察投资思维深度
 */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // ============ 行业研究（industry）- 睿远/淡水泉重点考察 ============
  {
    id: 'ind-1',
    dimension: 'industry',
    category: '商业模式与护城河',
    title: '半导体设备公司的护城河判断',
    scenario: '假设你正在调研一家国产半导体刻蚀设备公司，其在国内市占率约15%，主要客户是中芯国际、长江存储。公司研发投入占比18%，但毛利率只有35%，低于海外龙头Lam Research的45%。',
    prompt: '请从①技术壁垒 ②客户粘性 ③成本结构 ④国产替代节奏 四个维度，论述该公司是否具备真正的护城河，并给出你认为合理的5年后市占率预测及推理过程。',
    suggestedMinChars: 300,
    referenceKeywords: ['技术迭代', '验证周期', '客户认证', '规模效应', '良率', '国产替代', '设备验证', '工艺节点'],
    source: '淡水泉面试真题风格',
  },
  {
    id: 'ind-2',
    dimension: 'industry',
    category: '产业链调研方法',
    title: '如何组织一次有效的产业链调研',
    scenario: '你被分配覆盖新能源车产业链，包括上游锂矿、中游正负极材料、下游整车厂。时间只有2周，预算有限。',
    prompt: '请设计调研方案：①调研对象优先级与理由 ②每环节关键问题清单 ③如何交叉验证信息真伪 ④如何把调研结论转化为投资判断（买什么、规避什么）。',
    suggestedMinChars: 350,
    referenceKeywords: ['草根调研', '专家访谈', '上下游交叉验证', '产能利用率', '库存周期', '订单能见度', '毛利率拐点'],
    source: '睿远基金面试真题风格',
  },

  // ============ 策略研究（strategy）- 高毅/景林风格 ============
  {
    id: 'str-1',
    dimension: 'strategy',
    category: '组合构建与仓位管理',
    title: '熊市中的组合防守与进攻',
    scenario: '当前上证PE处于近10年15%分位，但宏观经济仍在下行（PMI连续3个月低于49），外资持续流出，市场情绪低迷。你管理一只50亿规模的偏股混合基金，当前仓位60%。',
    prompt: '请给出未来3个月的仓位与组合调整方案：①目标仓位区间及理由 ②行业配置思路（防御vs进攻比例）③3只你最可能重仓的子行业及逻辑 ④止损/加仓的触发条件。',
    suggestedMinChars: 350,
    referenceKeywords: ['风险预算', '行业景气度', '估值分位', '左侧建仓', '安全边际', '现金流', '高股息', '逆向布局'],
    source: '高毅资产面试真题风格',
  },
  {
    id: 'str-2',
    dimension: 'strategy',
    category: '风险控制与回撤管理',
    title: '如何控制20%的最大回撤',
    scenario: '你的基金过去2年年化收益25%，但最大回撤达到35%，被机构客户质疑风控能力。',
    prompt: '请系统阐述你的回撤控制体系：①事前预防（仓位/行业集中度/个股止损线）②事中监控（预警指标/触发机制）③事后归因与修正。并说明"控制回撤"与"追求收益"之间的权衡哲学。',
    suggestedMinChars: 300,
    referenceKeywords: ['最大回撤', '波动率', '相关性', '仓位管理', '止损纪律', '风险预算', '压力测试', '归因分析'],
    source: '景林资产面试真题风格',
  },

  // ============ 宏观（macro）- 泓道/敦和风格 ============
  {
    id: 'mac-1',
    dimension: 'macro',
    category: '宏观周期与资产配置',
    title: '美林时钟在A股的本土化应用',
    scenario: '当前中国CPI同比0.5%，PPI同比-2.5%，10年期国债收益率2.3%，GDP增速4.8%；同时美联储处于降息周期初期。',
    prompt: '请判断当前中国经济处于美林时钟哪个阶段，论证依据是什么？在该阶段下，A股（成长/价值/周期）、债券、黄金、港股的配置优先级如何排序？并指出美林时钟在中国的失效场景与修正思路。',
    suggestedMinChars: 350,
    referenceKeywords: ['美林时钟', '通胀', '增长', '流动性', '资产配置', '股债跷跷板', '汇率', '外资流入'],
    source: '敦和资管面试真题风格',
  },

  // ============ 量化（quant）- 幻方/明汯风格 ============
  {
    id: 'qnt-1',
    dimension: 'quant',
    category: '因子构建与检验',
    title: '设计一个有效的选股因子',
    scenario: '你被要求在A股市场构建一个"机构持仓变化"因子，数据来源为公募基金季报披露的十大重仓股。',
    prompt: '请完整阐述因子构建流程：①因子逻辑假设（为什么机构加仓的股票未来会跑赢）②因子计算方法 ③中性化处理（行业/市值/反转）④有效性检验指标（IC/IR/分层回测）⑤可能失效的场景与监控方法。',
    suggestedMinChars: 300,
    referenceKeywords: ['IC', 'IR', '分层回测', '中性化', '市值因子', '行业因子', '换手率', '因子衰减', '过拟合'],
    source: '幻方量化面试真题风格',
  },
];

export function getQuestionsByDimension(dim: Dimension): InterviewQuestion[] {
  return INTERVIEW_QUESTIONS.filter((q) => q.dimension === dim);
}
