import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // bytes
  data: string; // base64 data URL
  summary?: string; // AI 生成的总结（HTML）
  summaryGeneratedAt?: string;
  createdAt: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface AttachmentState {
  attachments: Record<string, Attachment[]>; // key: parentId (e.g. "industry-abc123")
  getAttachments: (parentId: string) => Attachment[];
  addAttachment: (parentId: string, file: File) => Promise<Attachment>;
  removeAttachment: (parentId: string, attachmentId: string) => void;
  updateAttachmentSummary: (parentId: string, attachmentId: string, summary: string) => void;
}

export const useAttachmentStore = create<AttachmentState>()(
  persist(
    (set, get) => ({
      attachments: {},

      getAttachments: (parentId: string) => {
        return get().attachments[parentId] || [];
      },

      addAttachment: async (parentId: string, file: File): Promise<Attachment> => {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`文件大小不能超过 100MB（当前: ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
        }

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const data = reader.result as string;
            const attachment: Attachment = {
              id: generateId(),
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              data,
              createdAt: new Date().toISOString(),
            };

            set((state) => {
              const existing = state.attachments[parentId] || [];
              return {
                attachments: {
                  ...state.attachments,
                  [parentId]: [...existing, attachment],
                },
              };
            });

            resolve(attachment);
          };
          reader.onerror = () => reject(new Error('文件读取失败'));
          reader.readAsDataURL(file);
        });
      },

      removeAttachment: (parentId: string, attachmentId: string) => {
        set((state) => {
          const existing = state.attachments[parentId] || [];
          return {
            attachments: {
              ...state.attachments,
              [parentId]: existing.filter((a) => a.id !== attachmentId),
            },
          };
        });
      },

      updateAttachmentSummary: (parentId: string, attachmentId: string, summary: string) => {
        set((state) => {
          const existing = state.attachments[parentId] || [];
          return {
            attachments: {
              ...state.attachments,
              [parentId]: existing.map((a) =>
                a.id === attachmentId
                  ? { ...a, summary, summaryGeneratedAt: new Date().toISOString() }
                  : a
              ),
            },
          };
        });
      },
    }),
    {
      name: 'alphapath-attachments',
    }
  )
);

// Utility: extract text from file for AI summary
export function extractTextFromAttachment(attachment: Attachment): string {
  const { fileType, data } = attachment;

  if (fileType.startsWith('text/') || fileType === 'application/json') {
    // Text files: decode base64
    try {
      const base64 = data.split(',')[1];
      return atob(base64);
    } catch {
      return '';
    }
  }

  if (fileType === 'application/pdf') {
    return '[PDF文档 - 内容需要专业解析工具提取]';
  }

  if (fileType.startsWith('image/')) {
    return `[图片文件: ${attachment.fileName}]`;
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    return '[Word文档 - 内容需要专业解析工具提取]';
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel'
  ) {
    return '[Excel文档 - 内容需要专业解析工具提取]';
  }

  return `[文件: ${attachment.fileName}]`;
}

// Utility: generate AI summary for an attachment
export function generateAttachmentSummary(attachment: Attachment): string {
  const text = extractTextFromAttachment(attachment);
  const fileName = attachment.fileName;
  const fileSize = (attachment.fileSize / 1024).toFixed(1);
  const fileType = attachment.fileType;

  const typeLabel: Record<string, string> = {
    'application/pdf': 'PDF文档',
    'text/plain': '文本文件',
    'text/csv': 'CSV数据',
    'text/markdown': 'Markdown文档',
    'application/json': 'JSON数据',
    'image/png': 'PNG图片',
    'image/jpeg': 'JPEG图片',
    'image/gif': 'GIF图片',
    'image/webp': 'WebP图片',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word文档',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel表格',
  };

  const label = typeLabel[fileType] || '文件';

  let summary = `<h4 style="color:#D4A853; margin-bottom:0.5em;">📎 ${fileName}</h4>`;
  summary += `<p style="margin-bottom:0.3em;"><strong>类型：</strong>${label} | <strong>大小：</strong>${fileSize}KB</p>`;

  if (text && !text.startsWith('[')) {
    // Real text content available
    const lines = text.split('\n').filter((l) => l.trim());
    const totalLines = lines.length;
    const totalChars = text.length;
    const previewLines = lines.slice(0, 20);

    summary += `<p style="margin-bottom:0.3em;"><strong>内容概览：</strong>共 ${totalLines} 行，${totalChars} 字符</p>`;

    if (totalLines > 20) {
      summary += `<p style="margin-bottom:0.3em;"><strong>前20行预览：</strong></p>`;
    } else {
      summary += `<p style="margin-bottom:0.3em;"><strong>内容：</strong></p>`;
    }

    summary += `<pre style="background:#0D1117; padding:0.8em; border-radius:8px; font-size:12px; overflow-x:auto; margin:0.5em 0; white-space:pre-wrap; word-break:break-all; color:#E5E7EB;">${previewLines.map((l) => escapeHtml(l)).join('\n')}${totalLines > 20 ? '\n...' : ''}</pre>`;

    // Try to extract key points
    const keyPoints = extractKeyPoints(text);
    if (keyPoints) {
      summary += `<p style="margin-top:0.5em;"><strong style="color:#D4A853;">💡 要点提取：</strong></p>`;
      summary += keyPoints;
    }
  } else {
    summary += `<p style="color:#9CA3AF; margin-top:0.5em;">${text || '无法解析此文件内容'}</p>`;
  }

  return summary;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractKeyPoints(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim());

  // Try to find lines that look like headings or key points
  const keyLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('##') ||
      trimmed.startsWith('•') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('1.') ||
      trimmed.startsWith('2.') ||
      trimmed.startsWith('3.') ||
      trimmed.match(/^【.*】$/) ||
      trimmed.match(/^[一二三四五六七八九十]、/) ||
      trimmed.match(/^第[一二三四五六七八九十\d]+[章节部分]/)
    ) {
      keyLines.push(trimmed);
    }
  }

  if (keyLines.length === 0) return '';

  const displayLines = keyLines.slice(0, 10);
  return `<ul style="list-style:disc; padding-left:1.5em; margin:0.3em 0;">
${displayLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('\n')}
${keyLines.length > 10 ? `<li style="color:#9CA3AF;">...还有 ${keyLines.length - 10} 条要点</li>` : ''}
</ul>`;
}
