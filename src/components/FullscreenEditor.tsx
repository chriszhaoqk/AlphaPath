import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Indent,
  Type,
  Paperclip,
  Eye,
  Trash2,
  Sparkles,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  Download,
  XCircle,
  Mic,
  GripVertical,
  Table,
} from 'lucide-react';
import { useAttachmentStore, generateAttachmentSummary, type Attachment } from '@/store/useAttachmentStore';
import VoiceInput, { isVoiceSupported } from '@/components/VoiceInput';

interface FullscreenEditorProps {
  label: string;
  value: string;
  onSave: (html: string) => void;
  onClose: () => void;
  parentId?: string; // for attachments, e.g. "industry-abc123"
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return ImageIcon;
  if (fileType === 'application/pdf') return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function FullscreenEditor({ label, value, onSave, onClose, parentId }: FullscreenEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fontSize, setFontSize] = useState(14);
  const [wordCount, setWordCount] = useState(0);

  // 悬浮窗拖拽状态
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // 只通过拖拽手柄触发
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    }
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  // Attachments
  const { getAttachments, addAttachment, removeAttachment, updateAttachmentSummary } = useAttachmentStore();
  const attachments = parentId ? getAttachments(parentId) : [];
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Preview
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // AI summary
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  // Table insertion
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Insert table into editor
  const insertTable = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const rows = Math.max(1, tableRows);
    const cols = Math.max(1, tableCols);
    let html = '<table style="border-collapse:collapse; width:100%; margin:0.5em 0;">';
    // Header row
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += `<th style="border:1px solid #2A3040; padding:6px 10px; background:#1A1F2E; color:#D4A853; font-size:0.9em; text-align:left;">标题${c + 1}</th>`;
    }
    html += '</tr>';
    // Data rows
    for (let r = 0; r < rows - 1; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += `<td style="border:1px solid #2A3040; padding:6px 10px; font-size:0.9em;">&nbsp;</td>`;
      }
      html += '</tr>';
    }
    html += '</table><p><br/></p>';
    document.execCommand('insertHTML', false, html);
    setShowTablePicker(false);
    updateWordCount();
  }, [tableRows, tableCols]);

  // Voice input handler
  const handleVoiceInput = useCallback((text: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertText', false, text);
      updateWordCount();
    }
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      if (value && value.includes('<')) {
        editorRef.current.innerHTML = value;
      } else if (value) {
        const paragraphs = value.split('\n').filter((p: string) => p.trim());
        editorRef.current.innerHTML = paragraphs
          .map((p: string) => `<p style="text-indent:2em; margin-bottom:0.5em;">${p}</p>`)
          .join('');
      } else {
        editorRef.current.innerHTML = '';
      }
      updateWordCount();
    }
  }, []);

  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setWordCount(text.replace(/\s/g, '').length);
    }
  };

  const execCmd = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateWordCount();
  };

  const handleFontSize = (size: number) => {
    setFontSize(size);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        document.execCommand('fontSize', false, '7');
        const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
        fontElements?.forEach((el) => {
          const span = document.createElement('span');
          span.style.fontSize = `${size}px`;
          span.innerHTML = el.innerHTML;
          el.replaceWith(span);
        });
      }
    }
  };

  const handleIndent = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node: Node | null = selection.anchorNode;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLParagraphElement || node instanceof HTMLDivElement) {
        const currentIndent = (node as HTMLElement).style.textIndent;
        (node as HTMLElement).style.textIndent = currentIndent === '2em' ? '0em' : '2em';
        return;
      }
      node = node.parentNode;
    }

    execCmd('formatBlock', 'p');
    const p = editorRef.current?.querySelector('p:last-of-type');
    if (p instanceof HTMLParagraphElement) {
      p.style.textIndent = '2em';
    }
  };

  const handleSave = () => {
    const html = editorRef.current?.innerHTML || '';
    onSave(html);
  };

  // Paste image handler
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (editorRef.current) {
            editorRef.current.focus();
            const imgHtml = `<img src="${dataUrl}" style="max-width:100%; height:auto; cursor:nwse-resize; display:block; margin:0.5em 0; border-radius:6px;" />`;
            document.execCommand('insertHTML', false, imgHtml);
            updateWordCount();
          }
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  // Image resize: click to select, drag corner to resize
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      // Remove previous selection
      editor.querySelectorAll('img[data-selected]').forEach((img) => {
        img.removeAttribute('data-selected');
        img.style.outline = '';
      });
      if (target.tagName === 'IMG' && target.closest('[contenteditable]')) {
        target.setAttribute('data-selected', 'true');
        target.style.outline = '2px solid #D4A853';
      }
    };

    const handleMouseDown = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG' || !target.closest('[contenteditable]')) return;
      e.preventDefault();
      const img = target as HTMLImageElement;
      const startX = (e as MouseEvent).clientX;
      const startWidth = img.offsetWidth;
      const startHeight = img.offsetHeight;
      const ratio = startHeight / startWidth;

      const handleMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const newWidth = Math.max(50, startWidth + dx);
        img.style.width = `${newWidth}px`;
        img.style.height = `${newWidth * ratio}px`;
      };
      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    editor.addEventListener('click', handleClick);
    editor.addEventListener('mousedown', handleMouseDown);
    return () => {
      editor.removeEventListener('click', handleClick);
      editor.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !parentId) return;

    setUploadError('');
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        await addAttachment(parentId, file);
      }
    } catch (err: any) {
      setUploadError(err.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // AI summary
  const handleAISummary = (attachment: Attachment) => {
    if (!parentId) return;
    setSummarizingId(attachment.id);

    // Simulate AI processing delay
    setTimeout(() => {
      const summary = generateAttachmentSummary(attachment);
      updateAttachmentSummary(parentId, attachment.id, summary);
      setSummarizingId(null);
    }, 1200);
  };

  // Download attachment
  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.fileName;
    link.click();
  };

  const TOOLBAR_ITEMS = [
    { icon: Bold, cmd: 'bold', title: '加粗' },
    { icon: Italic, cmd: 'italic', title: '斜体' },
    { icon: Underline, cmd: 'underline', title: '下划线' },
    { sep: true },
    { icon: AlignLeft, cmd: 'justifyLeft', title: '左对齐' },
    { icon: AlignCenter, cmd: 'justifyCenter', title: '居中' },
    { icon: AlignRight, cmd: 'justifyRight', title: '右对齐' },
    { sep: true },
    { icon: List, cmd: 'insertUnorderedList', title: '无序列表' },
    { icon: Indent, action: handleIndent, title: '首行缩进' },
    { sep: true },
    { icon: Table, action: () => setShowTablePicker(true), title: '插入表格' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onMouseDown={handleDragStart}>
      <div
        className="w-[92vw] max-w-4xl h-[88vh] bg-ink border border-border-custom rounded-xl flex flex-col shadow-2xl"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Header - draggable */}
        <div
          data-drag-handle
          className="flex items-center justify-between px-4 py-2.5 border-b border-border-custom flex-shrink-0 cursor-move select-none"
        >
          <div className="flex items-center gap-2">
            <GripVertical size={16} className="text-text-muted" />
            <h3 className="text-base font-semibold text-text-primary font-display">{label}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">{wordCount} 字</span>
            {attachments.length > 0 && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Paperclip size={12} />
                {attachments.length}
              </span>
            )}
            <button onClick={handleSave} className="btn-gold text-sm px-4 py-1.5">
              完成
            </button>
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border-custom bg-ink/50 flex-wrap flex-shrink-0">
          {TOOLBAR_ITEMS.map((item, i) => {
            if ('sep' in item && item.sep) {
              return <div key={i} className="w-px h-5 bg-border-custom mx-1.5" />;
            }
            const Icon = 'icon' in item ? item.icon : Type;
            return (
              <button
                key={i}
                onClick={() => {
                  if ('action' in item && item.action) item.action();
                  else if ('cmd' in item) execCmd(item.cmd);
                }}
                className="p-1.5 rounded text-text-secondary hover:text-gold hover:bg-gold/10 transition-colors"
                title={'title' in item ? item.title : ''}
              >
                <Icon size={15} />
              </button>
            );
          })}

          <div className="w-px h-5 bg-border-custom mx-1.5" />
          <select
            value={fontSize}
            onChange={(e) => handleFontSize(Number(e.target.value))}
            className="bg-ink border border-border-custom rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:border-gold/50"
            title="字体大小"
          >
            {[12, 13, 14, 15, 16, 18, 20, 24].map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>

          <div className="w-px h-5 bg-border-custom mx-1.5" />
          <select
            onChange={(e) => {
              if (e.target.value) execCmd('formatBlock', e.target.value);
            }}
            className="bg-ink border border-border-custom rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:border-gold/50"
            title="段落格式"
            defaultValue=""
          >
            <option value="" disabled>段落</option>
            <option value="p">正文</option>
            <option value="h2">标题2</option>
            <option value="h3">标题3</option>
            <option value="h4">标题4</option>
            <option value="blockquote">引用</option>
          </select>

          {/* Voice input button */}
          <div className="w-px h-5 bg-border-custom mx-1.5" />
          <VoiceInput
            onTextReceived={handleVoiceInput}
            buttonSize="sm"
          />

          {/* File upload button */}
          {parentId && (
            <>
              <div className="w-px h-5 bg-border-custom mx-1.5" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1.5 rounded text-text-secondary hover:text-gold hover:bg-gold/10 transition-colors flex items-center gap-1"
                title="上传文件"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                <span className="text-xs">附件</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx"
              />
            </>
          )}
        </div>

        {/* Editor + Attachments area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={updateWordCount}
            onPaste={handlePaste}
            className="flex-1 overflow-y-auto px-5 py-4 text-text-primary leading-relaxed focus:outline-none"
            style={{ fontSize: `${fontSize}px` }}
          />

          {/* Attachments section */}
          {attachments.length > 0 && (
            <div className="border-t border-border-custom flex-shrink-0">
              <div className="px-4 py-2 flex items-center justify-between bg-[#0D1117]/50">
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Paperclip size={12} />
                  附件 ({attachments.length})
                </span>
              </div>
              <div className="px-4 py-2 space-y-2 max-h-48 overflow-y-auto">
                {uploadError && (
                  <div className="flex items-center gap-2 text-xs text-urgent bg-urgent/10 rounded-lg px-3 py-2">
                    <XCircle size={14} />
                    {uploadError}
                  </div>
                )}
                {attachments.map((att) => {
                  const FileIcon = getFileIcon(att.fileType);
                  const isImage = att.fileType.startsWith('image/');
                  const isPdf = att.fileType === 'application/pdf';

                  return (
                    <div key={att.id} className="flex items-center gap-2 bg-[#1A1F2E] rounded-lg p-2.5 group">
                      {/* Thumbnail or icon */}
                      {isImage ? (
                        <button
                          onClick={() => setPreviewAttachment(att)}
                          className="w-10 h-10 rounded overflow-hidden flex-shrink-0"
                        >
                          <img src={att.data} alt={att.fileName} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#0D1117] flex items-center justify-center flex-shrink-0">
                          <FileIcon size={18} className={isPdf ? 'text-urgent' : 'text-text-muted'} />
                        </div>
                      )}

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary truncate">{att.fileName}</p>
                        <p className="text-[10px] text-text-muted">{formatFileSize(att.fileSize)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {(isImage || isPdf) && (
                          <button
                            onClick={() => setPreviewAttachment(att)}
                            className="p-1.5 text-text-muted hover:text-gold transition-colors"
                            title="预览"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleAISummary(att)}
                          disabled={summarizingId === att.id}
                          className="p-1.5 text-text-muted hover:text-gold transition-colors"
                          title="AI 总结"
                        >
                          {summarizingId === att.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownload(att)}
                          className="p-1.5 text-text-muted hover:text-gold transition-colors"
                          title="下载"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => parentId && removeAttachment(parentId, att.id)}
                          className="p-1.5 text-text-muted hover:text-urgent transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Summary display */}
              {attachments.some((a) => a.summary) && (
                <div className="px-4 pb-3 space-y-2">
                  {attachments.filter((a) => a.summary).map((att) => (
                    <div key={att.id} className="bg-[#0D1117] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gold flex items-center gap-1">
                          <Sparkles size={12} />
                          {att.fileName} - AI 总结
                        </span>
                        <button
                          onClick={() => parentId && updateAttachmentSummary(parentId, att.id, '')}
                          className="text-[10px] text-text-muted hover:text-text-primary"
                        >
                          收起
                        </button>
                      </div>
                      <div className="prose-sm" dangerouslySetInnerHTML={{ __html: att.summary! }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-1.5 border-t border-border-custom text-xs text-text-muted flex justify-between flex-shrink-0">
          <span>选中文本后可设置格式 | 支持粘贴截图{parentId ? ' | 点击📎上传附件' : ''}</span>
          <span>附件限100MB以内</span>
        </div>
      </div>

      {/* Table Picker Popup */}
      {showTablePicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowTablePicker(false)}>
          <div className="card p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Table size={18} className="text-gold" />
                插入表格
              </h3>
              <button onClick={() => setShowTablePicker(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1.5">行数</label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-center text-lg text-text-primary focus:outline-none focus:border-gold/50"
                />
              </div>
              <span className="text-text-muted pb-3">×</span>
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1.5">列数</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-center text-lg text-text-primary focus:outline-none focus:border-gold/50"
                />
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { r: 3, c: 3, label: '3×3' },
                { r: 4, c: 3, label: '4×3' },
                { r: 5, c: 4, label: '5×4' },
                { r: 6, c: 5, label: '6×5' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setTableRows(preset.r); setTableCols(preset.c); }}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    tableRows === preset.r && tableCols === preset.c
                      ? 'border-gold/50 bg-gold/10 text-gold'
                      : 'border-border-custom bg-[#1A1F2E] text-text-secondary hover:text-gold hover:border-gold/30'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button onClick={insertTable} className="btn-gold w-full py-2.5 text-sm">
              插入 {tableRows}×{tableCols} 表格
            </button>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewAttachment(null)}>
          <div className="w-[90vw] max-w-3xl h-[85vh] bg-ink border border-border-custom rounded-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-custom flex-shrink-0">
              <span className="text-sm text-text-primary truncate">{previewAttachment.fileName}</span>
              <button onClick={() => setPreviewAttachment(null)} className="p-1 text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {previewAttachment.fileType.startsWith('image/') ? (
                <img
                  src={previewAttachment.data}
                  alt={previewAttachment.fileName}
                  className="max-w-full max-h-full object-contain rounded"
                />
              ) : previewAttachment.fileType === 'application/pdf' ? (
                <iframe
                  src={previewAttachment.data}
                  className="w-full h-full rounded border-0"
                  title={previewAttachment.fileName}
                />
              ) : (
                <div className="text-center text-text-muted">
                  <File size={48} className="mx-auto mb-3" />
                  <p>此文件类型不支持在线预览</p>
                  <button
                    onClick={() => handleDownload(previewAttachment)}
                    className="mt-3 btn-gold text-sm px-4 py-1.5"
                  >
                    下载文件
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
