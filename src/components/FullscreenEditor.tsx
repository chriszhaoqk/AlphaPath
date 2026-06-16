import { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';

interface FullscreenEditorProps {
  label: string;
  value: string;
  onSave: (html: string) => void;
  onClose: () => void;
}

export default function FullscreenEditor({ label, value, onSave, onClose }: FullscreenEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14);
  const [wordCount, setWordCount] = useState(0);

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
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[92vw] max-w-4xl h-[88vh] bg-ink border border-border-custom rounded-xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-custom flex-shrink-0">
          <h3 className="text-base font-semibold text-text-primary font-display">{label}</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">{wordCount} 字</span>
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
            <option value="" disabled>
              段落
            </option>
            <option value="p">正文</option>
            <option value="h2">标题2</option>
            <option value="h3">标题3</option>
            <option value="h4">标题4</option>
            <option value="blockquote">引用</option>
          </select>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateWordCount}
          className="flex-1 overflow-y-auto px-5 py-4 text-text-primary leading-relaxed focus:outline-none"
          style={{ fontSize: `${fontSize}px` }}
        />

        {/* Footer hint */}
        <div className="px-4 py-1.5 border-t border-border-custom text-xs text-text-muted flex justify-between flex-shrink-0">
          <span>选中文本后可设置格式</span>
          <span>首行缩进：点击缩进按钮切换</span>
        </div>
      </div>
    </div>
  );
}
