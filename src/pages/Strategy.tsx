import { useEffect, useState } from 'react';
import { useStrategyStore, type Strategy } from '@/store/useStrategyStore';
import { TrendingUp, TrendingDown, Minus, Save, X, Edit3, Maximize2 } from 'lucide-react';
import FullscreenEditor from '@/components/FullscreenEditor';

interface StrategyTemplate {
  type: 'bull' | 'bear' | 'range';
  name: string;
  icon: React.ReactNode;
  iconColor: string;
  borderColor: string;
  fields: { key: keyof Strategy; label: string; defaultValue: string }[];
}

const TEMPLATES: StrategyTemplate[] = [
  {
    type: 'bull',
    name: '牛市策略',
    icon: <TrendingUp size={24} />,
    iconColor: 'text-positive',
    borderColor: 'border-positive/30',
    fields: [
      { key: 'positionGuidance', label: '仓位指引', defaultValue: '80-95%' },
      { key: 'allocationGuidance', label: '配置方向', defaultValue: '成长>价值，进攻性行业集中' },
      { key: 'stockSelection', label: '选股策略', defaultValue: '景气度最高+弹性最大' },
      { key: 'signals', label: '信号', defaultValue: '成交量放大/融资余额上升/新基金爆款' },
      { key: 'hedging', label: '对冲', defaultValue: '估值极端+情绪过热时逐步减仓' },
    ],
  },
  {
    type: 'bear',
    name: '熊市策略',
    icon: <TrendingDown size={24} />,
    iconColor: 'text-urgent',
    borderColor: 'border-urgent/30',
    fields: [
      { key: 'positionGuidance', label: '仓位指引', defaultValue: '20-40%' },
      { key: 'allocationGuidance', label: '配置方向', defaultValue: '高股息+低估值+防御行业' },
      { key: 'stockSelection', label: '选股策略', defaultValue: '现金流充裕+护城河深+分红稳定' },
      { key: 'signals', label: '信号', defaultValue: '破净率>10%/换手率极低/情绪冰点时逐步加仓' },
      { key: 'hedging', label: '对冲', defaultValue: '股指期货/期权保护' },
    ],
  },
  {
    type: 'range',
    name: '震荡市策略',
    icon: <Minus size={24} />,
    iconColor: 'text-gold',
    borderColor: 'border-gold/30',
    fields: [
      { key: 'positionGuidance', label: '仓位指引', defaultValue: '50-70%' },
      { key: 'allocationGuidance', label: '配置方向', defaultValue: '结构性行业轮动' },
      { key: 'stockSelection', label: '选股策略', defaultValue: '业绩确定性+估值合理' },
      { key: 'signals', label: '信号', defaultValue: '跌买涨卖，控制节奏' },
      { key: 'hedging', label: '增强', defaultValue: '量化因子+事件驱动' },
    ],
  },
];

interface SignalItem {
  id: string;
  label: string;
  category: 'bull' | 'bear' | 'range';
}

const SIGNALS: SignalItem[] = [
  { id: 'b1', label: '成交量持续放大', category: 'bull' },
  { id: 'b2', label: '融资余额上升', category: 'bull' },
  { id: 'b3', label: '新基金爆款频出', category: 'bull' },
  { id: 'b4', label: '市场情绪高涨', category: 'bull' },
  { id: 'b5', label: '经济数据超预期', category: 'bull' },
  { id: 'be1', label: '破净率>10%', category: 'bear' },
  { id: 'be2', label: '换手率极低', category: 'bear' },
  { id: 'be3', label: '市场情绪冰点', category: 'bear' },
  { id: 'be4', label: '经济数据不及预期', category: 'bear' },
  { id: 'be5', label: '政策收紧信号', category: 'bear' },
  { id: 'r1', label: '指数区间震荡', category: 'range' },
  { id: 'r2', label: '板块轮动加速', category: 'range' },
  { id: 'r3', label: '成交量温和', category: 'range' },
  { id: 'r4', label: '政策方向不明', category: 'range' },
  { id: 'r5', label: '经济数据平稳', category: 'range' },
];

const SIGNAL_CATEGORY_META: { key: 'bull' | 'bear' | 'range'; label: string; color: string }[] = [
  { key: 'bull', label: '牛市信号', color: '#10B981' },
  { key: 'bear', label: '熊市信号', color: '#EF4444' },
  { key: 'range', label: '震荡市信号', color: '#D4A853' },
];

function StrategyCard({
  template,
  strategy,
  onUpdate,
}: {
  template: StrategyTemplate;
  strategy?: Strategy;
  onUpdate: (id: string, updates: Partial<Strategy>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorField, setEditorField] = useState<string>('');
  const [editorValue, setEditorValue] = useState('');

  const handleStartEdit = () => {
    const values: Record<string, string> = {};
    template.fields.forEach(({ key, defaultValue }) => {
      values[key] = (strategy?.[key] as string) || defaultValue;
    });
    setEditValues(values);
    setEditing(true);
  };

  const handleSave = () => {
    if (strategy) {
      onUpdate(strategy.id, editValues);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const getValue = (key: keyof Strategy, defaultValue: string) => {
    return (strategy?.[key] as string) || defaultValue;
  };

  const openEditor = (key: string) => {
    setEditorField(key);
    setEditorValue(editValues[key] || '');
    setEditorOpen(true);
  };

  return (
    <div className={`card p-4 md:p-5 border-l-4 ${template.borderColor}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <span className={template.iconColor}>{template.icon}</span>
          <h3 className="text-lg font-bold text-text-primary font-display">{template.name}</h3>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={handleSave} className="p-1.5 text-positive hover:bg-positive/10 rounded">
              <Save size={16} />
            </button>
            <button onClick={handleCancel} className="p-1.5 text-text-muted hover:text-text-primary rounded">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={handleStartEdit} className="p-1.5 text-text-muted hover:text-gold rounded">
            <Edit3 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {template.fields.map(({ key, label, defaultValue }) => (
          <div key={key}>
            <span className="text-xs text-text-muted">{label}</span>
            {editing ? (
              <div className="mt-1">
                <div className="flex items-center justify-end mb-1">
                  <button type="button" onClick={() => openEditor(key)} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors">
                    <Maximize2 size={11} />
                    展开
                  </button>
                </div>
                <textarea
                  value={editValues[key] || ''}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={2}
                  className="w-full bg-ink border border-border-custom rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-none"
                />
              </div>
            ) : (
              <div className="text-sm text-text-primary mt-0.5 prose-sm" dangerouslySetInnerHTML={{ __html: getValue(key, defaultValue) }} />
            )}
          </div>
        ))}
      </div>
      {editorOpen && (
        <FullscreenEditor
          label={template.fields.find(f => f.key === editorField)?.label || '编辑'}
          value={editorValue}
          onSave={(val) => {
            setEditorValue(val);
            setEditValues(prev => ({ ...prev, [editorField]: val }));
            setEditorOpen(false);
          }}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}

export default function Strategy() {
  const { strategies, fetchStrategies, updateStrategy } = useStrategyStore();
  const [checkedSignals, setCheckedSignals] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const toggleSignal = (id: string) => {
    setCheckedSignals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bullCount = SIGNALS.filter((s) => s.category === 'bull' && checkedSignals.has(s.id)).length;
  const bearCount = SIGNALS.filter((s) => s.category === 'bear' && checkedSignals.has(s.id)).length;
  const rangeCount = SIGNALS.filter((s) => s.category === 'range' && checkedSignals.has(s.id)).length;

  const marketBias = (() => {
    const max = Math.max(bullCount, bearCount, rangeCount);
    if (max === 0) return '未判断';
    if (bullCount === max && bullCount > bearCount && bullCount > rangeCount) return '牛市';
    if (bearCount === max && bearCount > bullCount && bearCount > rangeCount) return '熊市';
    if (rangeCount === max && rangeCount > bullCount && rangeCount > bearCount) return '震荡市';
    return '混合信号';
  })();

  const biasColor = (() => {
    switch (marketBias) {
      case '牛市': return '#10B981';
      case '熊市': return '#EF4444';
      case '震荡市': return '#D4A853';
      default: return '#8B95A5';
    }
  })();

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      <h1 className="text-2xl font-bold text-text-primary font-display">策略框架</h1>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {TEMPLATES.map((template) => {
          const strategy = strategies.find((s) => s.type === template.type);
          return (
            <StrategyCard
              key={template.type}
              template={template}
              strategy={strategy}
              onUpdate={updateStrategy}
            />
          );
        })}
      </div>

      {/* Signal Checklist */}
      <div>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">市场信号检查</h2>

        {/* Market Bias Summary */}
        <div className="card p-3 md:p-4 mb-3 md:mb-4 flex items-center gap-3">
          <span className="text-sm text-text-secondary">当前市场状态倾向:</span>
          <span className="text-lg font-bold font-display" style={{ color: biasColor }}>
            {marketBias}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {SIGNAL_CATEGORY_META.map(({ key, label, color }) => (
            <div key={key} className="card p-3 md:p-4">
              <h4 className="text-sm font-semibold mb-2 md:mb-3" style={{ color }}>
                {label}
              </h4>
              <div className="space-y-2">
                {SIGNALS.filter((s) => s.category === key).map((signal) => (
                  <label key={signal.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checkedSignals.has(signal.id)}
                      onChange={() => toggleSignal(signal.id)}
                      className="w-4 h-4 rounded border-border-custom bg-ink accent-gold"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                      {signal.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
