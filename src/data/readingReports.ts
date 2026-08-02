// 每日深度阅读报告库
// 覆盖：全球宏观 / 大模型产业链 / AI 硬件产业链 / 核心 CSP 厂商

export type ReadingCategory =
  | 'macro'        // 全球宏观
  | 'llm'          // 大模型产业链
  | 'ai_hardware'  // AI 硬件产业链
  | 'csp';         // 核心 CSP 厂商

// 推荐信息源（中立核心深度：官方一手 / 学术研究 / 权威机构）
export interface ReadingSource {
  name: string;   // 信息源名称
  url: string;    // 原文/官网链接
}

export interface ReadingTopic {
  id: string;
  category: ReadingCategory;
  title: string;              // 报告主题
  subtitle: string;           // 副标题（简短描述）
  sources: ReadingSource[];   // 推荐信息源（官方一手/学术研究/权威机构）
  keyAngles: string[];        // 阅读时关注的关键角度
  keyMetrics: string[];       // 需要跟踪的核心指标
  relatedTickers: string[];   // 相关标的（用于投资转化）
  suggestedDuration: number;  // 建议阅读时长（分钟）
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export const CATEGORY_META: Record<ReadingCategory, { label: string; color: string; icon: string; desc: string }> = {
  macro: {
    label: '全球宏观',
    color: '#C084FC',
    icon: '🌍',
    desc: '美联储/PMI/通胀/利率/汇率/商品',
  },
  llm: {
    label: '大模型产业链',
    color: '#60A5FA',
    icon: '🧠',
    desc: 'OpenAI/Anthropic/通义/豆包/DeepSeek/Kimi',
  },
  ai_hardware: {
    label: 'AI 硬件产业链',
    color: '#F472B6',
    icon: '⚙️',
    desc: 'GPU/CPU/存储/CPO/NPO/电力',
  },
  csp: {
    label: '核心 CSP 厂商',
    color: '#10B981',
    icon: '☁️',
    desc: '谷歌/微软/亚马逊/阿里/腾讯/字节',
  },
};

export const READING_TOPICS: ReadingTopic[] = [
  // ============ 全球宏观 ============
  {
    id: 'macro-1',
    category: 'macro',
    title: '美联储议息会议纪要深度解读',
    subtitle: 'FOMC 会议纪要 + 点阵图 + 经济预测',
    sources: [
      { name: '美联储官网（FOMC 原文）', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
      { name: 'Fed Minutes 原文', url: 'https://www.federalreserve.gov/monetarypolicy/fomcminutes.htm' },
      { name: 'BIS 季度评论', url: 'https://www.bis.org/publ/quarterly.htm' },
      { name: 'Brookings Hutchins Center', url: 'https://www.brookings.edu/center/the-hutchins-center-on-fiscal-and-monetary-policy/' },
      { name: 'PIIE 彼得森国际经济研究所', url: 'https://www.piie.com/research' },
    ],
    keyAngles: [
      '官员分歧度（鹰鸽分布）与未来降息路径',
      '对通胀"最后一公里"的判断（核心 PCE 黏性）',
      '缩表节奏与流动性影响（RRP/ON RRP/TGA）',
      '点阵图与市场定价的预期差',
    ],
    keyMetrics: ['联邦基金利率', '核心 PCE', '失业率', '点阵图中值', '10Y 美债收益率'],
    relatedTickers: ['TLT', 'GLD', 'DXY', 'SPX', 'IWM'],
    suggestedDuration: 60,
    difficulty: 'advanced',
  },
  {
    id: 'macro-2',
    category: 'macro',
    title: '美国 CPI/PCE 通胀结构拆解',
    subtitle: '商品/服务/住房/超级核心通胀分项',
    sources: [
      { name: 'BLS 官网（CPI 原文）', url: 'https://www.bls.gov/cpi/' },
      { name: 'BEA 官网（PCE 原文）', url: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index' },
      { name: 'Cleveland Fed 通胀预期', url: 'https://www.clevelandfed.org/indicators-and-data' },
      { name: 'Atlanta Fed 黏性价格 CPI', url: 'https://www.atlantafed.org/research/data' },
      { name: 'NBER 工作论文', url: 'https://www.nber.org/papers' },
    ],
    keyAngles: [
      '住房通胀滞后性 vs 市场租金领先指标',
      '超级核心通胀（服务剔除住房）与工资增速',
      '商品通缩 vs 服务通胀的结构性转变',
      '通胀预期（密歇根/纽约联储）与实际通胀背离',
    ],
    keyMetrics: ['CPI 同比/环比', '核心 PCE', '住房分项', '超级核心通胀', '亚特兰大联储黏性 CPI'],
    relatedTickers: ['TIP', 'IEF', 'GLD', 'VTI'],
    suggestedDuration: 45,
    difficulty: 'intermediate',
  },
  {
    id: 'macro-3',
    category: 'macro',
    title: '中国金融数据与社融结构分析',
    subtitle: 'M1/M2/社融/信贷/政府债',
    sources: [
      { name: '中国人民银行（金融统计）', url: 'http://www.pbc.gov.cn/diaochatongjisi/116219/index.html' },
      { name: '国家统计局', url: 'http://www.stats.gov.cn/' },
      { name: 'IMF 中国国别页', url: 'https://www.imf.org/en/Countries/CHN' },
      { name: 'BIS 季度评论', url: 'https://www.bis.org/publ/quarterly.htm' },
      { name: 'FRED 中国数据', url: 'https://fred.stlouisfed.org/categories/32252' },
    ],
    keyAngles: [
      'M1-M2 剪刀差与经济活跃度',
      '社融结构（政府债 vs 信贷 vs 直接融资）',
      '居民中长期贷款（房贷）与企业中长期贷款',
      '资金空转与货币政策传导效率',
    ],
    keyMetrics: ['M1/M2 同比', '社融存量增速', '新增信贷', '居民中长贷', '企业中长贷'],
    relatedTickers: ['512720', '511260', '159949', 'HSI'],
    suggestedDuration: 40,
    difficulty: 'intermediate',
  },
  {
    id: 'macro-4',
    category: 'macro',
    title: '全球美元流动性周期与新兴市场资金流',
    subtitle: '美元指数/美债/跨境资本流/EM 资产',
    sources: [
      { name: 'BIS 季度评论', url: 'https://www.bis.org/publ/quarterly.htm' },
      { name: 'IMF 出版物', url: 'https://www.imf.org/en/Publications' },
      { name: '纽约联储市场部', url: 'https://www.newyorkfed.org/markets' },
      { name: 'FRED 美元指数', url: 'https://fred.stlouisfed.org/series/DTWEXBGS' },
      { name: 'IIF 资本流动追踪', url: 'https://www.iif.com/research/capital-flows-tracker' },
    ],
    keyAngles: [
      '美元流动性三因子（美债/美元/利差）',
      '外资流入 A 股/港股的领先指标',
      '新兴市场股汇债联动',
      '中美利差与人民币汇率压力',
    ],
    keyMetrics: ['美元指数', '10Y 中美利差', '北向资金净流入', 'EPFR 新兴市场资金流'],
    relatedTickers: ['UUP', 'EEM', 'FXI', 'KWEB', '北向重仓股'],
    suggestedDuration: 50,
    difficulty: 'advanced',
  },
  {
    id: 'macro-5',
    category: 'macro',
    title: '商品周期与铜油背离信号',
    subtitle: '铜/油/黄金/铁矿的宏观信号',
    sources: [
      { name: 'IEA 月度原油报告', url: 'https://www.iea.org/reports/oil-market-report' },
      { name: 'OPEC 月度石油市场报告', url: 'https://www.opec.org/opec_web/en/publications/338.htm' },
      { name: '世界银行商品市场展望', url: 'https://www.worldbank.org/en/research/commodity-markets' },
      { name: 'LME 市场报告', url: 'https://www.lme.com/en/Market-reports' },
      { name: 'USGS 矿产商品年报', url: 'https://www.usgs.gov/centers/national-minerals-information-center/commodity-statistics-and-information' },
    ],
    keyAngles: [
      '铜油比与全球需求预期',
      '黄金与实际利率背离的尾部风险定价',
      '铁矿与黑色系的中国地产映射',
      'OPEC+ 减产博弈与原油供需平衡表',
    ],
    keyMetrics: ['LME 铜', 'Brent 原油', 'COMEX 黄金', '美元实际利率', '铁矿 62%'],
    relatedTickers: ['GLD', 'GDX', 'FCX', '515220', '600916'],
    suggestedDuration: 45,
    difficulty: 'intermediate',
  },

  // ============ 大模型产业链 ============
  {
    id: 'llm-1',
    category: 'llm',
    title: 'OpenAI 与 Anthropic 前沿模型能力追踪',
    subtitle: 'GPT 系列 / Claude 系列 / 推理能力',
    sources: [
      { name: 'OpenAI Research', url: 'https://openai.com/research' },
      { name: 'Anthropic News', url: 'https://www.anthropic.com/news' },
      { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog' },
      { name: 'arXiv（CS.CL）', url: 'https://arxiv.org/list/cs.CL/recent' },
      { name: 'NeurIPS Papers', url: 'https://papers.nips.cc/' },
    ],
    keyAngles: [
      '推理模型（o1/o3）与传统模型的范式差异',
      '上下文长度与有效利用率的瓶颈',
      '多模态能力（视觉/语音/视频）的突破',
      '训练成本与推理成本的边际变化',
    ],
    keyMetrics: ['MMLU', 'GPQA', 'SWE-Bench', '上下文长度', 'API 价格'],
    relatedTickers: ['MSFT', 'NVDA', 'GOOGL', 'META', '300496'],
    suggestedDuration: 50,
    difficulty: 'intermediate',
  },
  {
    id: 'llm-2',
    category: 'llm',
    title: '国产大模型竞争格局（DeepSeek/豆包/Kimi/通义）',
    subtitle: '开源 vs 闭源 / 推理模型 / 多模态',
    sources: [
      { name: 'DeepSeek GitHub', url: 'https://github.com/deepseek-ai' },
      { name: '通义千问 GitHub', url: 'https://github.com/QwenLM/Qwen' },
      { name: '豆包官网', url: 'https://www.doubao.com/' },
      { name: '月之暗面官网', url: 'https://www.moonshot.cn/' },
      { name: 'arXiv（CS.CL）', url: 'https://arxiv.org/list/cs.CL/recent' },
    ],
    keyAngles: [
      'DeepSeek 的成本效率突破与开源策略影响',
      '豆包的 C 端分发优势与商业化路径',
      'Kimi 的长上下文差异化与用户留存',
      '通义千问的企业服务与海外扩张',
    ],
    keyMetrics: ['MAU', 'API 调用量', 'Token 单价', '训练 FLOPs', '推理延迟'],
    relatedTickers: ['BABA', '300496', '002230', '688041', '腾讯控股'],
    suggestedDuration: 45,
    difficulty: 'intermediate',
  },
  {
    id: 'llm-3',
    category: 'llm',
    title: '大模型推理成本下降与商业化加速',
    subtitle: '推理优化/蒸馏/量化/Token 价格战',
    sources: [
      { name: 'Artificial Analysis', url: 'https://artificialanalysis.ai/' },
      { name: 'Epoch AI', url: 'https://epoch.ai/' },
      { name: 'arXiv（CS.LG）', url: 'https://arxiv.org/list/cs.LG/recent' },
      { name: 'MLPerf 推理基准', url: 'https://mlcommons.org/benchmarks/inference-datacenter/' },
      { name: 'Papers with Code', url: 'https://paperswithcode.com/' },
    ],
    keyAngles: [
      '推理成本每年 10x 下降的可持续性',
      '蒸馏与量化对模型质量的影响',
      'Token 价格战对应用层的盈利影响',
      '边缘部署（端侧模型）的临界点',
    ],
    keyMetrics: ['Token 单价', '推理延迟', 'FP8/INT8 性能', '端侧模型大小'],
    relatedTickers: ['NVDA', 'AAPL', '高通', '300496', '688256'],
    suggestedDuration: 40,
    difficulty: 'intermediate',
  },
  {
    id: 'llm-4',
    category: 'llm',
    title: 'AI Agent 与工具调用能力演进',
    subtitle: 'Function Calling / Computer Use / 多步推理',
    sources: [
      { name: 'OpenAI 官方文档', url: 'https://platform.openai.com/docs' },
      { name: 'Anthropic 官方博客', url: 'https://www.anthropic.com/news' },
      { name: 'LangChain 官方文档', url: 'https://python.langchain.com/docs/' },
      { name: 'arXiv（CS.AI）', url: 'https://arxiv.org/list/cs.AI/recent' },
      { name: 'SWE-Bench / WebArena 基准', url: 'https://www.swebench.com/' },
    ],
    keyAngles: [
      'Agent 框架（LangGraph/AutoGen）的工程化进展',
      'Computer Use 与 RPA 的替代边界',
      '多 Agent 协作与可靠性问题',
      '企业级 Agent 的商业化案例',
    ],
    keyMetrics: ['SWE-Bench', 'WebArena', 'AgentBench', '工具调用成功率'],
    relatedTickers: ['CRM', 'NOW', 'MSFT', 'MDB', 'SNOW'],
    suggestedDuration: 45,
    difficulty: 'advanced',
  },
  {
    id: 'llm-5',
    category: 'llm',
    title: '大模型训练数据瓶颈与合成数据',
    subtitle: '数据耗尽 / 合成数据 / 数据飞轮',
    sources: [
      { name: 'Epoch AI', url: 'https://epoch.ai/' },
      { name: 'Data Provenance Initiative', url: 'https://www.dataprovenance.org/' },
      { name: 'arXiv（CS.CL）', url: 'https://arxiv.org/list/cs.CL/recent' },
      { name: 'Common Crawl', url: 'https://commoncrawl.org/' },
      { name: 'Hugging Face 数据集', url: 'https://huggingface.co/datasets' },
    ],
    keyAngles: [
      '高质量互联网数据的耗尽时间预测',
      '合成数据（Distillation/RLAIF）的有效性边界',
      '数据版权诉讼（NYT vs OpenAI）对训练数据的影响',
      '多模态训练数据的稀缺性',
    ],
    keyMetrics: ['训练 Token 数', '数据集规模', '合成数据占比', 'Common Crawl 增量'],
    relatedTickers: ['NVDA', 'MDB', 'ESTC', 'DATA'],
    suggestedDuration: 35,
    difficulty: 'advanced',
  },

  // ============ AI 硬件产业链 ============
  {
    id: 'hw-1',
    category: 'ai_hardware',
    title: 'GPU 产业链（英伟达/AMD/国产算力）',
    subtitle: 'H100/B100/MI300/昇腾/产能与需求',
    sources: [
      { name: '英伟达投资者关系', url: 'https://investor.nvidia.com/' },
      { name: 'AMD 投资者关系', url: 'https://ir.amd.com/' },
      { name: '英伟达 Newsroom', url: 'https://nvidianews.nvidia.com/' },
      { name: '台积电投资者关系', url: 'https://investor.tsmc.com/english/' },
      { name: 'SemiWiki', url: 'https://semiwiki.com/' },
    ],
    keyAngles: [
      'B100/B200 产能与客户订单能见度',
      'CoWoS 封装产能瓶颈与扩产节奏',
      'HBM3e 供应与单卡 HBM 容量翻倍',
      '国产算力（昇腾 910C）的真实性能与生态差距',
    ],
    keyMetrics: ['英伟达 DAU 收入', 'CoWoS 产能', 'HBM 单卡容量', 'MI300 出货量', '昇腾出货量'],
    relatedTickers: ['NVDA', 'AMD', 'TSM', '000977', '002049'],
    suggestedDuration: 55,
    difficulty: 'advanced',
  },
  {
    id: 'hw-2',
    category: 'ai_hardware',
    title: 'HBM 存储产业链（海力士/三星/长鑫）',
    subtitle: 'HBM3e/HBM4/产能/国产替代',
    sources: [
      { name: 'SK 海力士投资者关系', url: 'https://www.skhynix.com/eng/ir/financialInfo.do' },
      { name: '三星电子投资者关系', url: 'https://www.samsung.com/global/ir/' },
      { name: 'JEDEC 标准', url: 'https://www.jedec.org/' },
      { name: 'SemiWiki', url: 'https://semiwiki.com/' },
      { name: 'arXiv（CS.AR）', url: 'https://arxiv.org/list/cs.AR/recent' },
    ],
    keyAngles: [
      'HBM3e vs HBM4 的技术路线与单卡容量',
      '海力士/三星/美光份额格局',
      'TSV 封装与键合工艺（混合键合）',
      '国产 HBM 的量产进度与差距',
    ],
    keyMetrics: ['HBM 出货量', '单卡 HBM 容量', 'HBM 价格', '国产化率'],
    relatedTickers: ['SK海力士', '三星', 'MU', '603986', '002881'],
    suggestedDuration: 50,
    difficulty: 'advanced',
  },
  {
    id: 'hw-3',
    category: 'ai_hardware',
    title: 'CPO/NPO 光互联产业链',
    subtitle: '共封装光学/硅光/光引擎/电芯片',
    sources: [
      { name: 'Broadcom 投资者关系', url: 'https://investors.broadcom.com/' },
      { name: 'Marvell 投资者关系', url: 'https://investor.marvell.com/' },
      { name: '台积电投资者关系', url: 'https://investor.tsmc.com/english/' },
      { name: 'IEEE 802.3 标准', url: 'https://www.ieee802.org/3/' },
      { name: 'OFC 会议', url: 'https://www.ofcconference.org/' },
      { name: 'SemiWiki', url: 'https://semiwiki.com/' },
    ],
    keyAngles: [
      'CPO vs NPO vs 可插拔的技术路线博弈',
      '硅光集成与光引擎的成本临界点',
      '3.2T/6.4T 光模块的量产时间表',
      '电芯片（DSP/TIA/Driver）的国产替代',
    ],
    keyMetrics: ['光模块出货量', '800G/1.6T 渗透率', 'CPO 渗透率', '硅光占比'],
    relatedTickers: ['中际旭创', '新易盛', 'AVGO', 'MRVL', 'COHR'],
    suggestedDuration: 55,
    difficulty: 'advanced',
  },
  {
    id: 'hw-4',
    category: 'ai_hardware',
    title: '服务器 CPU 产业链（Intel/AMD/ARM）',
    subtitle: '至强/EPYC/Grace/国产 CPU',
    sources: [
      { name: 'Intel 投资者关系', url: 'https://www.intc.com/' },
      { name: 'AMD 投资者关系', url: 'https://ir.amd.com/' },
      { name: 'ARM 投资者关系', url: 'https://investors.arm.com/' },
      { name: 'Intel Newsroom', url: 'https://www.intel.com/content/www/us/en/newsroom/home.html' },
      { name: 'SemiWiki', url: 'https://semiwiki.com/' },
    ],
    keyAngles: [
      'AMD EPYC 份额持续提升对 Intel 的冲击',
      'ARM 服务器渗透率（Grace/Amazon Graviton/Ampere）',
      'AI 服务器 CPU 单机价值量提升',
      '国产 CPU（海光/飞腾/龙芯）的生态与性能',
    ],
    keyMetrics: ['EPYC 份额', 'ARM 服务器份额', 'CPU ASP', '国产 CPU 出货量'],
    relatedTickers: ['AMD', 'INTC', 'ARM', '688041', '海光信息'],
    suggestedDuration: 40,
    difficulty: 'intermediate',
  },
  {
    id: 'hw-5',
    category: 'ai_hardware',
    title: 'AI 数据中心电力与散热产业链',
    subtitle: 'HVDC/液冷/UPS/燃气轮机/核电',
    sources: [
      { name: 'Vertiv 投资者关系', url: 'https://investors.vertiv.com/' },
      { name: 'Eaton 投资者关系', url: 'https://www.eaton.com/us/en-us/company/news-investors/investor-relations.html' },
      { name: '施耐德电气投资者关系', url: 'https://www.se.com/ww/en/about-us/investor-relations/' },
      { name: 'GE Vernova 投资者关系', url: 'https://www.gevernova.com/investor-relations' },
      { name: 'IEA 电力', url: 'https://www.iea.org/topics/electricity' },
      { name: 'Uptime Institute', url: 'https://uptimeinstitute.com/' },
    ],
    keyAngles: [
      '单机柜功率从 30kW 到 100kW+ 的演进',
      '液冷（冷板式 vs 浸没式）渗透率与成本',
      'HVDC vs 交流供电的范式之争',
      '数据中心电力短缺 → 燃气轮机/小型核电的破局',
    ],
    keyMetrics: ['单机柜功率', '液冷渗透率', 'HVDC 部署量', '数据中心耗电量'],
    relatedTickers: ['VRT', 'ETN', 'GEV', 'SMR', '300504'],
    suggestedDuration: 50,
    difficulty: 'advanced',
  },

  // ============ 核心 CSP 厂商 ============
  {
    id: 'csp-1',
    category: 'csp',
    title: '微软云（Azure）AI 增长与 OpenAI 绑定',
    subtitle: 'Azure AI 收入/OpenAI 利润分成/Capex',
    sources: [
      { name: '微软投资者关系', url: 'https://www.microsoft.com/en-us/Investor/' },
      { name: 'Azure 官方博客', url: 'https://azure.microsoft.com/en-us/blog/' },
      { name: '微软 News', url: 'https://news.microsoft.com/' },
      { name: 'Synergy Research Group', url: 'https://www.srgresearch.com/' },
      { name: 'Azure 更新', url: 'https://azure.microsoft.com/en-us/updates/' },
    ],
    keyAngles: [
      'Azure AI 服务收入贡献度（8-10pp 增长贡献）',
      'OpenAI 利润分成与 IP 授权收入',
      'Capex 增长与折旧压力',
      'Copilot 商业化进度（B2B 渗透率）',
    ],
    keyMetrics: ['Azure 同比增长', 'AI 收入贡献', 'Capex', 'Copilot 付费用户数'],
    relatedTickers: ['MSFT', 'NVDA', 'PLTR', 'CRM'],
    suggestedDuration: 50,
    difficulty: 'intermediate',
  },
  {
    id: 'csp-2',
    category: 'csp',
    title: '谷歌云（GCP）TPU 自研与 Gemini 商业化',
    subtitle: 'TPU v6/Trillium/Gemini/广告 AI',
    sources: [
      { name: 'Alphabet 投资者关系', url: 'https://abc.xyz/investor/' },
      { name: 'DeepMind 官方博客', url: 'https://deepmind.google/discover/blog/' },
      { name: 'Google Cloud 博客', url: 'https://cloud.google.com/blog/' },
      { name: 'Synergy Research Group', url: 'https://www.srgresearch.com/' },
      { name: 'Google 官方博客', url: 'https://blog.google/' },
    ],
    keyAngles: [
      'TPU 自研对英伟达依赖的替代节奏',
      'Gemini 模型在企业搜索/Workspace 的渗透',
      '谷歌广告 AI 化（Performance Max）对收入拉动',
      'GCP 利润率拐点与 AWS 竞争',
    ],
    keyMetrics: ['GCP 同比增长', 'GCP 营业利润率', 'TPU 部署量', 'Gemini API 调用'],
    relatedTickers: ['GOOGL', 'NVDA', 'AVGO', 'AMD'],
    suggestedDuration: 45,
    difficulty: 'intermediate',
  },
  {
    id: 'csp-3',
    category: 'csp',
    title: '亚马逊 AWS AI 战略（Bedrock/Trainium）',
    subtitle: 'Trainium/Anthropic 投资/Bedrock 平台',
    sources: [
      { name: '亚马逊投资者关系', url: 'https://ir.aboutamazon.com/' },
      { name: 'AWS 官方博客', url: 'https://aws.amazon.com/blogs/aws/' },
      { name: '亚马逊 News（AWS）', url: 'https://www.aboutamazon.com/news/aws' },
      { name: 'Synergy Research Group', url: 'https://www.srgresearch.com/' },
      { name: 'AWS What\x27s New', url: 'https://aws.amazon.com/about-aws/whats-new/' },
    ],
    keyAngles: [
      'Trainium 自研芯片对客户成本优势',
      'Anthropic 投资与 AWS 独家云绑定',
      'Bedrock 多模型平台的差异化策略',
      'AWS 增速与 Azure 的相对表现',
    ],
    keyMetrics: ['AWS 同比增长', 'Bedrock 客户数', 'Trainium 部署量', 'AWS 营业利润率'],
    relatedTickers: ['AMZN', 'NVDA', 'AMD', 'ANOT'],
    suggestedDuration: 45,
    difficulty: 'intermediate',
  },
  {
    id: 'csp-4',
    category: 'csp',
    title: '阿里云 AI 增长与通义模型商业化',
    subtitle: '通义千问/公有云/海外扩张',
    sources: [
      { name: '阿里巴巴投资者关系', url: 'https://www.alibabagroup.com/en-US/ir-home' },
      { name: '阿里云官网', url: 'https://www.aliyun.com/' },
      { name: '阿里云国际博客', url: 'https://www.alibabacloud.com/blog/' },
      { name: 'Synergy Research Group', url: 'https://www.srgresearch.com/' },
      { name: '阿里巴巴新闻', url: 'https://www.alibabagroup.com/en-US/news' },
    ],
    keyAngles: [
      '阿里云 AI 相关收入占比与增速',
      '通义千问开源 vs 闭源的商业化平衡',
      '海外（东南亚/中东）扩张进展',
      '降价战对利润率的影响',
    ],
    keyMetrics: ['阿里云同比增长', 'AI 收入占比', '公有云利润率', '海外收入占比'],
    relatedTickers: ['BABA', '9988.HK', '300496', '中科曙光'],
    suggestedDuration: 40,
    difficulty: 'intermediate',
  },
  {
    id: 'csp-5',
    category: 'csp',
    title: '腾讯云与字节火山引擎 AI 战略对比',
    subtitle: '混元/豆包/企业微信/视频号',
    sources: [
      { name: '腾讯投资者关系', url: 'https://www.tencent.com/en-us/investors.html' },
      { name: '火山引擎官网', url: 'https://www.volcengine.com/' },
      { name: '腾讯云博客', url: 'https://www.tencentcloud.com/blog/' },
      { name: 'Synergy Research Group', url: 'https://www.srgresearch.com/' },
      { name: '腾讯新闻', url: 'https://www.tencent.com/en-us/about/press.html' },
    ],
    keyAngles: [
      '腾讯混元在微信/企业微信的内部渗透',
      '字节豆包的 C 端流量与 B 端火山引擎联动',
      '视频号广告 AI 化对腾讯广告收入拉动',
      '火山引擎价格战对腾讯云的挤压',
    ],
    keyMetrics: ['腾讯云增速', '火山引擎收入', '混元 API 调用', '视频号广告收入'],
    relatedTickers: ['0700.HK', '腾讯控股', '300496', '微软'],
    suggestedDuration: 45,
    difficulty: 'intermediate',
  },
];

// 按日期哈希从题库抽题：同一天始终是同一题，跨日轮换
export function getTopicForDate(dateStr: string): ReadingTopic {
  const hash = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = hash % READING_TOPICS.length;
  return READING_TOPICS[idx];
}

// 按类别获取主题列表
export function getTopicsByCategory(category: ReadingCategory): ReadingTopic[] {
  return READING_TOPICS.filter((t) => t.category === category);
}

export const DIFFICULTY_META: Record<ReadingTopic['difficulty'], { label: string; color: string }> = {
  basic: { label: '基础', color: '#10B981' },
  intermediate: { label: '进阶', color: '#F59E0B' },
  advanced: { label: '高阶', color: '#EF4444' },
};
