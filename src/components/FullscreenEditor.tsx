import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import {
  X, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, CheckSquare, Quote, Code, Code2,
  AlignLeft, AlignCenter, AlignRight,
  Link, Image as ImageIcon, Table as TableIcon, Minus,
  Undo2, Redo2, Palette, Type, PaintBucket,
  Paperclip, Eye, Trash2, Sparkles, FileText, File,
  Loader2, Download, XCircle, Mic, GripVertical,
  Check, Heading1, Heading2, Heading3, Heading4,
  RemoveFormatting, Pilcrow,
} from 'lucide-react';
import { useAttachmentStore, generateAttachmentSummary, type Attachment } from '@/store/useAttachmentStore';
import VoiceInput from '@/components/VoiceInput';

const lowlight = createLowlight(common);

interface FullscreenEditorProps {
  label: string;
  value: string;
  onSave: (html: string) => void;
  onClose: () => void;
  onAutoSave?: (html: string) => void;
  parentId?: string;
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

const PRESET_COLORS = [
  '#E8E8E8', '#9CA3AF', '#D4A853', '#F59E0B',
  '#EF4444', '#EC4899', '#A855F7', '#3B82F6',
  '#10B981', '#14B8A6', '#6366F1', '#FFFFFF',
];

const PRESET_HIGHLIGHTS = [
  '#D4A85333', '#EF444433', '#10B98133', '#3B82F633',
  '#A855F733', '#F59E0B33', '#EC489933', '#FFFFFF22',
];

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20, 24, 28, 32];

export default function FullscreenEditor({ label, value, onSave, onClose, onAutoSave, parentId }: FullscreenEditorProps) {
  // --- Drag state ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clampPosition = useCallback((x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return { x, y };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    const centeredLeft = (vw - w) / 2;
    const centeredTop = (vh - h) / 2;
    const maxX = Math.max(0, w / 2 - 120);
    const minX = -maxX;
    const minY = -centeredTop + 8;
    const maxY = vh - centeredTop - h - 8;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }, []);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, select')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      posX: position.x, posY: position.y,
    };
  }, [position]);

  const handleHeaderTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('button, select')) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.touches[0].clientX, y: e.touches[0].clientY,
      posX: position.x, posY: position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition(clampPosition(
        dragStart.current.posX + e.clientX - dragStart.current.x,
        dragStart.current.posY + e.clientY - dragStart.current.y,
      ));
    };
    const handleUp = () => setIsDragging(false);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      setPosition(clampPosition(
        dragStart.current.posX + t.clientX - dragStart.current.x,
        dragStart.current.posY + t.clientY - dragStart.current.y,
      ));
    };
    const handleTouchEnd = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, clampPosition]);

  // --- Attachments ---
  const { getAttachments, addAttachment, removeAttachment, updateAttachmentSummary } = useAttachmentStore();
  const attachments = parentId ? getAttachments(parentId) : [];
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Link dialog ---
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; url: string }>({ open: false, url: '' });

  // --- Table picker ---
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // --- Color pickers ---
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'highlight' | null>(null);
  const [showFontSize, setShowFontSize] = useState(false);

  // --- Save hint ---
  const [saveHint, setSaveHint] = useState<{ type: 'auto' | 'manual'; at: number } | null>(null);
  const lastSavedHtml = useRef<string>('');

  // --- TipTap Editor ---
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'editor-link' },
      }),
      ImageExtension.configure({
        inline: false,
        HTMLAttributes: { class: 'editor-image' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      HorizontalRule,
      Placeholder.configure({ placeholder: '开始输入...（输入 / 插入各类内容）' }),
      CharacterCount.configure({ limit: 100000 }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      setWordCount(editor.storage.characterCount.characters());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor prose prose-sm max-w-none focus:outline-none',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              editor?.chain().focus().setImage({ src: dataUrl }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  const [wordCount, setWordCount] = useState(0);

  // Sync word count on mount
  useEffect(() => {
    if (editor) {
      setWordCount(editor.storage.characterCount.characters());
      editor.commands.focus('end');
    }
  }, [editor]);

  // Auto-save every 30s
  useEffect(() => {
    if (!editor) return;
    const timer = setInterval(() => {
      handleSave('auto');
    }, 30000);
    return () => clearInterval(timer);
  }, [editor]);

  // Cleanup: save on unmount
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        const html = editor.getHTML();
        if (html && html !== lastSavedHtml.current) {
          if (onAutoSave) onAutoSave(html);
          else onSave(html);
        }
      }
    };
  }, [editor]);

  const handleSave = useCallback((type: 'auto' | 'manual' = 'manual') => {
    if (!editor || editor.isDestroyed) return;
    const html = editor.getHTML();
    if (type === 'auto' && html === lastSavedHtml.current) return;
    if (type === 'auto') {
      onAutoSave?.(html);
    } else {
      onSave(html);
    }
    lastSavedHtml.current = html;
    setSaveHint({ type, at: Date.now() });
    if (type === 'manual') {
      setTimeout(() => setSaveHint(null), 2000);
    }
  }, [editor, onSave, onAutoSave]);

  // --- Toolbar actions ---
  const execAction = useCallback((action: string, value?: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (action) {
      case 'bold': chain.toggleBold().run(); break;
      case 'italic': chain.toggleItalic().run(); break;
      case 'underline': chain.toggleUnderline().run(); break;
      case 'strike': chain.toggleStrike().run(); break;
      case 'code': chain.toggleCode().run(); break;
      case 'highlight': chain.toggleHighlight().run(); break;
      case 'bulletList': chain.toggleBulletList().run(); break;
      case 'orderedList': chain.toggleOrderedList().run(); break;
      case 'taskList': chain.toggleTaskList().run(); break;
      case 'blockquote': chain.toggleBlockquote().run(); break;
      case 'codeBlock': chain.toggleCodeBlock().run(); break;
      case 'horizontalRule': chain.setHorizontalRule().run(); break;
      case 'alignLeft': chain.setTextAlign('left').run(); break;
      case 'alignCenter': chain.setTextAlign('center').run(); break;
      case 'alignRight': chain.setTextAlign('right').run(); break;
      case 'heading': chain.toggleHeading({ level: parseInt(value || '1') as 1|2|3|4 }).run(); break;
      case 'undo': chain.undo().run(); break;
      case 'redo': chain.redo().run(); break;
      case 'clearFormat': chain.clearNodes().unsetAllMarks().run(); break;
      case 'paragraph': chain.setParagraph().run(); break;
      case 'setColor': chain.setColor(value || '#FFFFFF').run(); break;
      case 'unsetColor': chain.unsetColor().run(); break;
      case 'setHighlight': chain.toggleHighlight({ color: value }).run(); break;
      case 'setFontSize': {
        const selection = editor.state.selection;
        if (!selection.empty) {
          editor.commands.setMark('textStyle', { fontSize: `${value}px` });
        }
        break;
      }
    }
  }, [editor]);

  // Insert table
  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({
      rows: Math.max(1, tableRows),
      cols: Math.max(1, tableCols),
      withHeaderRow: true,
    }).run();
    setShowTablePicker(false);
  }, [editor, tableRows, tableCols]);

  // Insert link
  const handleInsertLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    setLinkDialog({ open: true, url: previousUrl || '' });
  }, [editor]);

  const confirmLink = useCallback(() => {
    if (!editor) return;
    const url = linkDialog.url;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const finalUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    setLinkDialog({ open: false, url: '' });
  }, [editor, linkDialog.url]);

  // Voice input
  const handleVoiceInput = useCallback((text: string) => {
    if (editor) {
      editor.chain().focus().insertContent(text).run();
    }
  }, [editor]);

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
    setTimeout(() => {
      const summary = generateAttachmentSummary(attachment);
      updateAttachmentSummary(parentId, attachment.id, summary);
      setSummarizingId(null);
    }, 1200);
  };

  // Download
  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.fileName;
    link.click();
  };

  // Table toolbar
  const [tableToolbar, setTableToolbar] = useState<{ rowIdx: number; colIdx: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const editorEl = editor.view.dom;
    const handleClick = () => {
      if (editor.isActive('table')) {
        const { view } = editor;
        const pos = view.state.selection.$anchor;
        const node = pos.node(pos.depth);
        if (node.type.name === 'table') {
          // Find table element
          const tables = editorEl.querySelectorAll('table');
          for (const table of Array.from(tables)) {
            if (table.contains(view.domAtPos(pos.pos).node)) {
              // Try to find the cell
            }
          }
        }
        // Simplified: just show toolbar when table is active
        setTableToolbar({ rowIdx: 0, colIdx: 0 });
      } else {
        setTableToolbar(null);
      }
    };
    editorEl.addEventListener('click', handleClick);
    return () => editorEl.removeEventListener('click', handleClick);
  }, [editor]);

  const tableAddRow = () => editor?.chain().focus().addRowAfter().run();
  const tableDeleteRow = () => editor?.chain().focus().deleteRow().run();
  const tableAddCol = () => editor?.chain().focus().addColumnAfter().run();
  const tableDeleteCol = () => editor?.chain().focus().deleteColumn().run();
  const tableDelete = () => editor?.chain().focus().deleteTable().run();

  // Close color pickers on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-color-picker]')) {
        setShowColorPicker(null);
      }
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showColorPicker]);

  // -- Toolbar configuration --
  interface ToolbarBtn {
    icon: any;
    action: string;
    value?: string;
    title: string;
    isActive?: () => boolean;
  }

  const getToolbarGroups = (): (ToolbarBtn | 'sep')[][] => {
    if (!editor) return [];
    return [
      // Group 1: Undo/Redo
      [
        { icon: Undo2, action: 'undo', title: '撤销 (Ctrl+Z)' },
        { icon: Redo2, action: 'redo', title: '重做 (Ctrl+Y)' },
      ],
      // Group 2: Text formatting
      [
        { icon: Bold, action: 'bold', title: '加粗 (Ctrl+B)', isActive: () => editor.isActive('bold') },
        { icon: Italic, action: 'italic', title: '斜体 (Ctrl+I)', isActive: () => editor.isActive('italic') },
        { icon: UnderlineIcon, action: 'underline', title: '下划线 (Ctrl+U)', isActive: () => editor.isActive('underline') },
        { icon: Strikethrough, action: 'strike', title: '删除线', isActive: () => editor.isActive('strike') },
        { icon: Code, action: 'code', title: '行内代码', isActive: () => editor.isActive('code') },
      ],
      // Group 3: Highlight & Color
      [
        { icon: PaintBucket, action: 'highlight', title: '高亮', isActive: () => editor.isActive('highlight') },
        { icon: Palette, action: 'color', title: '字体颜色', isActive: () => editor.isActive('textStyle') },
      ],
      // Group 4: Headings & Paragraph
      [
        { icon: Pilcrow, action: 'paragraph', title: '正文', isActive: () => editor.isActive('paragraph') },
        { icon: Heading1, action: 'heading', value: '1', title: '标题1', isActive: () => editor.isActive('heading', { level: 1 }) },
        { icon: Heading2, action: 'heading', value: '2', title: '标题2', isActive: () => editor.isActive('heading', { level: 2 }) },
        { icon: Heading3, action: 'heading', value: '3', title: '标题3', isActive: () => editor.isActive('heading', { level: 3 }) },
        { icon: Heading4, action: 'heading', value: '4', title: '标题4', isActive: () => editor.isActive('heading', { level: 4 }) },
      ],
      // Group 5: Lists
      [
        { icon: List, action: 'bulletList', title: '无序列表', isActive: () => editor.isActive('bulletList') },
        { icon: ListOrdered, action: 'orderedList', title: '有序列表', isActive: () => editor.isActive('orderedList') },
        { icon: CheckSquare, action: 'taskList', title: '任务列表', isActive: () => editor.isActive('taskList') },
      ],
      // Group 6: Blocks
      [
        { icon: Quote, action: 'blockquote', title: '引用', isActive: () => editor.isActive('blockquote') },
        { icon: Code2, action: 'codeBlock', title: '代码块', isActive: () => editor.isActive('codeBlock') },
        { icon: Minus, action: 'horizontalRule', title: '分割线' },
      ],
      // Group 7: Alignment
      [
        { icon: AlignLeft, action: 'alignLeft', title: '左对齐', isActive: () => editor.isActive({ textAlign: 'left' }) },
        { icon: AlignCenter, action: 'alignCenter', title: '居中', isActive: () => editor.isActive({ textAlign: 'center' }) },
        { icon: AlignRight, action: 'alignRight', title: '右对齐', isActive: () => editor.isActive({ textAlign: 'right' }) },
      ],
      // Group 8: Insert
      [
        { icon: Link, action: 'link', title: '插入链接' },
        { icon: ImageIcon, action: 'image', title: '插入图片' },
        { icon: TableIcon, action: 'table', title: '插入表格' },
      ],
      // Group 9: Clear
      [
        { icon: RemoveFormatting, action: 'clearFormat', title: '清除格式' },
      ],
    ];
  };

  const renderToolbarBtn = (btn: ToolbarBtn, idx: number) => {
    const isActive = btn.isActive?.() ?? false;
    const Icon = btn.icon;
    const isSpecial = btn.action === 'link' || btn.action === 'image' || btn.action === 'table' || btn.action === 'color' || btn.action === 'highlight';
    return (
      <button
        key={idx}
        onClick={() => {
          if (btn.action === 'link') handleInsertLink();
          else if (btn.action === 'image') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file && editor) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  editor.chain().focus().setImage({ src: ev.target?.result as string }).run();
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          }
          else if (btn.action === 'table') setShowTablePicker(true);
          else if (btn.action === 'color') setShowColorPicker(showColorPicker === 'text' ? null : 'text');
          else if (btn.action === 'highlight') setShowColorPicker(showColorPicker === 'highlight' ? null : 'highlight');
          else execAction(btn.action, btn.value);
        }}
        className={`p-1.5 rounded-lg text-text-secondary hover:text-gold hover:bg-gold/10 transition-all flex items-center justify-center ${
          isActive ? 'bg-gold/15 text-gold ring-1 ring-gold/30' : ''
        } ${isSpecial ? 'bg-gold/5 text-gold border border-gold/10' : ''}`}
        title={btn.title}
      >
        <Icon size={15} />
      </button>
    );
  };

  const renderToolbar = () => {
    if (!editor) return null;
    const groups = getToolbarGroups();
    return (
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border-custom bg-ink/50 flex-wrap flex-shrink-0 overflow-x-auto">
        {groups.map((group, gi) => (
          <span key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-5 bg-border-custom mx-1" />}
            {group.map((item, i) =>
              item === 'sep' ? (
                <div key={i} className="w-px h-5 bg-border-custom mx-1" />
              ) : (
                renderToolbarBtn(item, i)
              )
            )}
          </span>
        ))}

        {/* Font size */}
        <div className="w-px h-5 bg-border-custom mx-1" />
        <div className="relative">
          <button
            onClick={() => setShowFontSize(!showFontSize)}
            className="px-2 py-1 rounded text-xs text-text-secondary hover:text-gold hover:bg-gold/10 transition-colors border border-border-custom"
          >
            {editor?.getAttributes('textStyle').fontSize?.replace('px', '') || '14'}px
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 p-1.5 bg-ink border border-border-custom rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    execAction('setFontSize', String(s));
                    setShowFontSize(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-gold hover:bg-gold/10 rounded transition-colors"
                >
                  {s}px
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Voice input */}
        <VoiceInput onTextReceived={handleVoiceInput} buttonSize="sm" />

        {/* File upload */}
        {parentId && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-1.5 rounded text-text-secondary hover:text-gold hover:bg-gold/10 transition-colors flex items-center gap-1"
              title="上传附件"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
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
    );
  };

  // --- Color picker overlay ---
  const renderColorPicker = () => {
    if (!showColorPicker) return null;
    const isHighlight = showColorPicker === 'highlight';
    return (
      <div
        className="absolute top-full left-0 mt-1 p-2 bg-ink border border-border-custom rounded-lg shadow-xl z-10"
        data-color-picker
        style={{ minWidth: '180px' }}
      >
        <div className="text-xs text-text-muted mb-2 px-1">
          {isHighlight ? '高亮颜色' : '字体颜色'}
        </div>
        <div className="grid grid-cols-6 gap-1.5 mb-2">
          {(isHighlight ? PRESET_HIGHLIGHTS : PRESET_COLORS).map((c) => (
            <button
              key={c}
              onClick={() => {
                if (isHighlight) {
                  editor?.chain().focus().toggleHighlight({ color: c }).run();
                } else {
                  execAction('setColor', c);
                }
                setShowColorPicker(null);
              }}
              className="w-7 h-7 rounded border border-border-custom hover:scale-110 transition-transform"
              style={{ background: c }}
            />
          ))}
        </div>
        {!isHighlight && (
          <button
            onClick={() => {
              execAction('unsetColor');
              setShowColorPicker(null);
            }}
            className="text-xs text-text-muted hover:text-text-primary px-1"
          >
            清除颜色
          </button>
        )}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
      <div
        ref={containerRef}
        className="w-full max-w-4xl h-[92vh] sm:h-[88vh] bg-ink border border-border-custom rounded-xl flex flex-col shadow-2xl"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Header */}
        <div
          data-drag-handle
          onMouseDown={handleHeaderMouseDown}
          onTouchStart={handleHeaderTouchStart}
          className={`flex items-center justify-between px-4 py-3 border-b border-border-custom flex-shrink-0 cursor-move select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <div className="flex items-center gap-2">
            <GripVertical size={16} className="text-text-muted" />
            <h3 className="text-base font-semibold text-text-primary font-display">{label}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">{wordCount} 字</span>
            {saveHint && (
              <span className="text-xs text-positive flex items-center gap-1">
                <Check size={12} />
                {saveHint.type === 'auto' ? '已自动保存' : '已保存'}
              </span>
            )}
            {attachments.length > 0 && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Paperclip size={12} />
                {attachments.length}
              </span>
            )}
            <button onClick={() => handleSave('manual')} className="btn-gold text-sm px-4 py-1.5">
              完成
            </button>
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {editor && renderToolbar()}

        {/* Color picker positioned below toolbar */}
        {showColorPicker && (
          <div className="relative px-3">
            {renderColorPicker()}
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {editor && (
              <>
                <EditorContent editor={editor} className="min-h-full" />

                {/* Bubble menu on text selection */}
                <BubbleMenu
                  editor={editor}
                  className="flex items-center gap-0.5 bg-[#0D1117] border border-gold/30 rounded-lg px-2 py-1.5 shadow-2xl"
                  options={{ placement: 'top' }}
                >
                  <button onClick={() => execAction('bold')} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('bold') ? 'text-gold bg-gold/10' : ''}`} title="加粗">
                    <Bold size={14} />
                  </button>
                  <button onClick={() => execAction('italic')} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('italic') ? 'text-gold bg-gold/10' : ''}`} title="斜体">
                    <Italic size={14} />
                  </button>
                  <button onClick={() => execAction('underline')} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('underline') ? 'text-gold bg-gold/10' : ''}`} title="下划线">
                    <UnderlineIcon size={14} />
                  </button>
                  <button onClick={() => execAction('strike')} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('strike') ? 'text-gold bg-gold/10' : ''}`} title="删除线">
                    <Strikethrough size={14} />
                  </button>
                  <div className="w-px h-4 bg-border-custom mx-1" />
                  <button onClick={() => execAction('code')} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('code') ? 'text-gold bg-gold/10' : ''}`} title="行内代码">
                    <Code size={14} />
                  </button>
                  <button onClick={() => execAction('highlight')} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('highlight') ? 'text-gold bg-gold/10' : ''}`} title="高亮">
                    <PaintBucket size={14} />
                  </button>
                  <div className="w-px h-4 bg-border-custom mx-1" />
                  <button onClick={() => execAction('bulletList')} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('bulletList') ? 'text-gold bg-gold/10' : ''}`} title="无序列表">
                    <List size={14} />
                  </button>
                  <button onClick={() => execAction('orderedList')} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('orderedList') ? 'text-gold bg-gold/10' : ''}`} title="有序列表">
                    <ListOrdered size={14} />
                  </button>
                  <div className="w-px h-4 bg-border-custom mx-1" />
                  <button onClick={() => handleInsertLink()} className={`p-1 rounded text-text-secondary hover:text-gold ${editor.isActive('link') ? 'text-gold bg-gold/10' : ''}`} title="链接">
                    <Link size={14} />
                  </button>
                  <button onClick={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')} className="p-1 rounded text-text-secondary hover:text-gold" title="字体颜色">
                    <Palette size={14} />
                  </button>
                </BubbleMenu>
              </>
            )}
          </div>

          {/* Table toolbar overlay */}
          {tableToolbar && editor?.isActive('table') && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#0D1117] border border-gold/40 rounded-lg px-2 py-1.5 shadow-xl z-20">
              <span className="text-xs text-text-muted px-1">表格</span>
              <div className="w-px h-4 bg-border-custom" />
              <button onClick={tableAddRow} className="text-xs text-text-secondary hover:text-gold px-1.5 py-0.5 hover:bg-gold/10 rounded" title="插入行">+行</button>
              <button onClick={tableDeleteRow} className="text-xs text-text-secondary hover:text-urgent px-1.5 py-0.5 hover:bg-urgent/10 rounded" title="删除行">-行</button>
              <div className="w-px h-4 bg-border-custom" />
              <button onClick={tableAddCol} className="text-xs text-text-secondary hover:text-gold px-1.5 py-0.5 hover:bg-gold/10 rounded" title="插入列">+列</button>
              <button onClick={tableDeleteCol} className="text-xs text-text-secondary hover:text-urgent px-1.5 py-0.5 hover:bg-urgent/10 rounded" title="删除列">-列</button>
              <div className="w-px h-4 bg-border-custom" />
              <button onClick={tableDelete} className="text-xs text-text-secondary hover:text-urgent px-1.5 py-0.5 hover:bg-urgent/10 rounded" title="删除表格">删除</button>
              <button onClick={() => setTableToolbar(null)} className="text-text-muted hover:text-text-primary px-1" title="关闭">
                <X size={12} />
              </button>
            </div>
          )}

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
                      {isImage ? (
                        <button onClick={() => setPreviewAttachment(att)} className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                          <img src={att.data} alt={att.fileName} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#0D1117] flex items-center justify-center flex-shrink-0">
                          <FileIcon size={18} className={isPdf ? 'text-urgent' : 'text-text-muted'} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary truncate">{att.fileName}</p>
                        <p className="text-[10px] text-text-muted">{formatFileSize(att.fileSize)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {(isImage || isPdf) && (
                          <button onClick={() => setPreviewAttachment(att)} className="p-1.5 text-text-muted hover:text-gold transition-colors" title="预览">
                            <Eye size={14} />
                          </button>
                        )}
                        <button onClick={() => handleAISummary(att)} disabled={summarizingId === att.id} className="p-1.5 text-text-muted hover:text-gold transition-colors" title="AI 总结">
                          {summarizingId === att.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        </button>
                        <button onClick={() => handleDownload(att)} className="p-1.5 text-text-muted hover:text-gold transition-colors" title="下载">
                          <Download size={14} />
                        </button>
                        <button onClick={() => parentId && removeAttachment(parentId, att.id)} className="p-1.5 text-text-muted hover:text-urgent transition-colors" title="删除">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {attachments.some((a) => a.summary) && (
                <div className="px-4 pb-3 space-y-2">
                  {attachments.filter((a) => a.summary).map((att) => (
                    <div key={att.id} className="bg-[#0D1117] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gold flex items-center gap-1">
                          <Sparkles size={12} />
                          {att.fileName} - AI 总结
                        </span>
                        <button onClick={() => parentId && updateAttachmentSummary(parentId, att.id, '')} className="text-[10px] text-text-muted hover:text-text-primary">
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

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-border-custom text-xs text-text-muted flex justify-between flex-shrink-0">
          <span>拖拽顶部标题栏可移动窗口 | 选中文本弹出浮动工具栏 | Ctrl+Z撤销 Ctrl+S保存{parentId ? ' | 支持附件' : ''}</span>
          <span>附件限100MB以内</span>
        </div>
      </div>

      {/* Table Picker Popup */}
      {showTablePicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowTablePicker(false)}>
          <div className="card p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <TableIcon size={18} className="text-gold" />
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
                  type="number" min="2" max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-center text-lg text-text-primary focus:outline-none focus:border-gold/50"
                />
              </div>
              <span className="text-text-muted pb-3">×</span>
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1.5">列数</label>
                <input
                  type="number" min="2" max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-center text-lg text-text-primary focus:outline-none focus:border-gold/50"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { r: 3, c: 3, label: '3×3' }, { r: 4, c: 3, label: '4×3' },
                { r: 5, c: 4, label: '5×4' }, { r: 6, c: 5, label: '6×5' },
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

      {/* Link Dialog */}
      {linkDialog.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setLinkDialog({ open: false, url: '' })}>
          <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Link size={18} className="text-gold" />
                {linkDialog.url ? '编辑链接' : '插入链接'}
              </h3>
              <button onClick={() => setLinkDialog({ open: false, url: '' })} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <input
              type="url"
              value={linkDialog.url}
              onChange={(e) => setLinkDialog({ ...linkDialog, url: e.target.value })}
              placeholder="输入链接地址..."
              className="w-full bg-ink border border-border-custom rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 mb-3"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') confirmLink(); }}
            />
            <div className="flex gap-2">
              {linkDialog.url && (
                <button onClick={() => { setLinkDialog({ open: false, url: '' }); editor?.chain().focus().extendMarkRange('link').unsetLink().run(); }} className="flex-1 py-2.5 text-sm border border-border-custom rounded-lg text-text-secondary hover:text-text-primary transition-colors">
                  移除链接
                </button>
              )}
              <button onClick={confirmLink} className="flex-1 btn-gold py-2.5 text-sm">
                确认
              </button>
            </div>
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
                <img src={previewAttachment.data} alt={previewAttachment.fileName} className="max-w-full max-h-full object-contain rounded" />
              ) : previewAttachment.fileType === 'application/pdf' ? (
                <iframe src={previewAttachment.data} className="w-full h-full rounded border-0" title={previewAttachment.fileName} />
              ) : (
                <div className="text-center text-text-muted">
                  <File size={48} className="mx-auto mb-3" />
                  <p>此文件类型不支持在线预览</p>
                  <button onClick={() => handleDownload(previewAttachment)} className="mt-3 btn-gold text-sm px-4 py-1.5">下载文件</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}