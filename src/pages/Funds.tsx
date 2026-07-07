import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  BarChart3,
} from 'lucide-react';
import { useFundStore, type FundRecord } from '@/store/useFundStore';

const ACCOUNT_CONFIG = [
  { key: 'stock' as const, label: '股票账户', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
  { key: 'fund' as const, label: '基金账户', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  { key: 'primaryMarket' as const, label: '一级市场投资', color: '#D4A853', bg: 'rgba(212,168,83,0.15)' },
  { key: 'daily' as const, label: '日常账户', color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
  { key: 'forex' as const, label: '外汇账户', color: '#C084FC', bg: 'rgba(192,132,252,0.15)' },
];

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(2)}万`;
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getLocalMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Funds() {
  const { records, addRecord, updateRecord, deleteRecord } = useFundStore();
  const [currentMonth, setCurrentMonth] = useState(getLocalMonth());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ stock: '', fund: '', primaryMarket: '', daily: '', forex: '', note: '' });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => a.month.localeCompare(b.month)),
    [records]
  );

  const currentRecord = useMemo(
    () => records.find((r) => r.month === currentMonth),
    [records, currentMonth]
  );

  // Reset form when month changes or form opens
  useEffect(() => {
    if (showForm) {
      const rec = editingId ? records.find((r) => r.id === editingId) : currentRecord;
      if (rec) {
        setForm({
          stock: String(rec.stock),
          fund: String(rec.fund),
          primaryMarket: String(rec.primaryMarket),
          daily: String(rec.daily),
          forex: String(rec.forex),
          note: rec.note || '',
        });
      } else {
        setForm({ stock: '', fund: '', primaryMarket: '', daily: '', forex: '', note: '' });
      }
    }
  }, [showForm, editingId, currentRecord, records]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sortedRecords.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padL = 60;
    const padR = 20;
    const padT = 20;
    const padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Data
    const months = sortedRecords.map((r) => r.month);
    const totals = sortedRecords.map((r) => r.stock + r.fund + r.primaryMarket + r.daily + r.forex);
    const maxVal = Math.max(...totals) * 1.1;
    const minVal = Math.min(...totals) * 0.9;

    // Grid lines
    ctx.strokeStyle = '#2A3040';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padT + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();

      // Y-axis labels
      const val = maxVal - ((maxVal - minVal) / gridLines) * i;
      ctx.fillStyle = '#5A6577';
      ctx.font = '11px DM Sans';
      ctx.textAlign = 'right';
      ctx.fillText(formatMoney(val), padL - 8, y + 4);
    }

    // X-axis labels
    ctx.fillStyle = '#5A6577';
    ctx.font = '11px DM Sans';
    ctx.textAlign = 'center';
    const step = chartW / (months.length - 1 || 1);
    months.forEach((m, i) => {
      const x = padL + step * i;
      const label = m.slice(5); // "06"
      ctx.fillText(label, x, H - padB + 20);
    });

    // Draw each account line
    const drawLine = (key: keyof Pick<FundRecord, 'stock' | 'fund' | 'primaryMarket' | 'daily' | 'forex'>, color: string) => {
      const vals = sortedRecords.map((r) => r[key] as number);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      vals.forEach((v, i) => {
        const x = padL + step * i;
        const y = padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots
      vals.forEach((v, i) => {
        const x = padL + step * i;
        const y = padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Total line
    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    totals.forEach((v, i) => {
      const x = padL + step * i;
      const y = padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Total dots
    totals.forEach((v, i) => {
      const x = padL + step * i;
      const y = padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
      ctx.fillStyle = '#E8E8E8';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Account lines
    drawLine('stock', '#60A5FA');
    drawLine('fund', '#10B981');
    drawLine('primaryMarket', '#D4A853');
    drawLine('daily', '#F472B6');
    drawLine('forex', '#C084FC');
  }, [sortedRecords]);

  const handleSave = () => {
    const data = {
      month: editingId ? (records.find((r) => r.id === editingId)?.month || currentMonth) : currentMonth,
      stock: parseFloat(form.stock) || 0,
      fund: parseFloat(form.fund) || 0,
      primaryMarket: parseFloat(form.primaryMarket) || 0,
      daily: parseFloat(form.daily) || 0,
      forex: parseFloat(form.forex) || 0,
      note: form.note,
    };

    if (editingId) {
      updateRecord(editingId, data);
    } else {
      // Remove existing record for same month if any
      const existing = records.find((r) => r.month === data.month);
      if (existing) {
        updateRecord(existing.id, data);
      } else {
        addRecord(data);
      }
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (record: FundRecord) => {
    setEditingId(record.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteRecord(id);
  };

  const currentTotal = currentRecord
    ? currentRecord.stock + currentRecord.fund + currentRecord.primaryMarket + currentRecord.daily + currentRecord.forex
    : 0;

  // Calculate change from previous month
  const prevMonth = shiftMonth(currentMonth, -1);
  const prevRecord = records.find((r) => r.month === prevMonth);
  const prevTotal = prevRecord
    ? prevRecord.stock + prevRecord.fund + prevRecord.primaryMarket + prevRecord.daily + prevRecord.forex
    : 0;
  const change = currentTotal - prevTotal;
  const changePercent = prevTotal > 0 ? ((change / prevTotal) * 100).toFixed(1) : '--';

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-display flex items-center gap-2">
            <Wallet size={24} className="text-gold" />
            家庭资金
          </h1>
          <p className="text-sm text-text-muted mt-1">月度资产记录与趋势分析</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="btn-gold text-sm flex items-center gap-1.5"
        >
          <Plus size={16} />
          记录
        </button>
      </div>

      {/* Month Navigation */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))}
            className="p-2 rounded-lg bg-[#1A1F2E] text-text-secondary hover:text-gold transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-text-primary font-display">{currentMonth}</h2>
          <button
            onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))}
            className="p-2 rounded-lg bg-[#1A1F2E] text-text-secondary hover:text-gold transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Total + Change */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-text-muted mb-1">总资产</p>
            <p className="text-2xl font-bold text-text-primary">
              {currentTotal > 0 ? `¥${formatMoney(currentTotal)}` : '--'}
            </p>
          </div>
          {currentTotal > 0 && prevTotal > 0 && (
            <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-positive' : 'text-urgent'}`}>
              {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{change >= 0 ? '+' : ''}{formatMoney(change)}</span>
              <span className="text-xs">({changePercent}%)</span>
            </div>
          )}
        </div>

        {/* Account Breakdown */}
        {currentRecord ? (
          <div className="grid grid-cols-2 gap-3">
            {ACCOUNT_CONFIG.map(({ key, label, color, bg }) => (
              <div key={key} className="rounded-xl p-3" style={{ background: bg }}>
                <p className="text-xs text-text-muted mb-1">{label}</p>
                <p className="text-lg font-semibold" style={{ color }}>
                  ¥{formatMoney(currentRecord[key])}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted text-sm">
            本月暂无记录，点击右上角「记录」添加
          </div>
        )}

        {currentRecord?.note && (
          <p className="text-xs text-text-muted mt-3 px-1">备注：{currentRecord.note}</p>
        )}

        {/* Actions */}
        {currentRecord && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#2A3040]">
            <button
              onClick={() => handleEdit(currentRecord)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-gold transition-colors px-3 py-1.5 rounded-lg bg-[#1A1F2E]"
            >
              <Edit3 size={13} /> 编辑
            </button>
            <button
              onClick={() => handleDelete(currentRecord.id)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-urgent transition-colors px-3 py-1.5 rounded-lg bg-[#1A1F2E]"
            >
              <Trash2 size={13} /> 删除
            </button>
          </div>
        )}
      </div>

      {/* Trend Chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-gold" />
          资产趋势
        </h3>
        {sortedRecords.length < 2 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            至少需要2个月的数据才能展示趋势图
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: '220px' }}
            />
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#E8E8E8] inline-block rounded" /> 总资产
              </div>
              {ACCOUNT_CONFIG.map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ background: color }} /> {label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* History Records */}
      {sortedRecords.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">历史记录</h3>
          <div className="space-y-2">
            {[...sortedRecords].reverse().map((rec) => {
              const total = rec.stock + rec.fund + rec.primaryMarket + rec.daily + rec.forex;
              return (
                <div key={rec.id} className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-primary font-medium w-16">{rec.month}</span>
                    <span className="text-sm text-gold font-semibold">¥{formatMoney(total)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(rec)}
                      className="p-1.5 text-text-muted hover:text-gold transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-1.5 text-text-muted hover:text-urgent transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => { setShowForm(false); setEditingId(null); }}>
          <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Wallet size={18} className="text-gold" />
                {editingId ? '编辑记录' : `记录 ${currentMonth} 资金`}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {ACCOUNT_CONFIG.map(({ key, label, color }) => (
                <div key={key}>
                  <label className="block text-xs text-text-secondary mb-1.5" style={{ color }}>
                    {label}（元）
                  </label>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder="0"
                    className="w-full bg-[#0D1117] border border-[#2A3040] rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">备注</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="可选备注..."
                  className="w-full bg-[#0D1117] border border-[#2A3040] rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
            </div>

            <button onClick={handleSave} className="btn-gold w-full py-2.5 text-sm mt-4 flex items-center justify-center gap-1.5">
              <Save size={15} />
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
