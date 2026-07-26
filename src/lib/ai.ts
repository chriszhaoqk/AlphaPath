import { useAIStore } from '@/store/useAIStore';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIError extends Error {
  status?: number;
  type?: 'not_configured' | 'network' | 'api' | 'parse';
}

function makeError(message: string, type: AIError['type'], status?: number): AIError {
  const e = new Error(message) as AIError;
  e.type = type;
  e.status = status;
  return e;
}

/**
 * 调用兼容 OpenAI 协议的 Chat Completions 接口
 * 支持 DeepSeek / 智谱 GLM / OpenAI / Moonshot / 自定义
 */
export async function chatCompletion(opts: ChatOptions): Promise<string> {
  const { apiKey, baseURL, model } = useAIStore.getState();
  if (!apiKey || !baseURL || !model) {
    throw makeError('AI 未配置：请在设置中填写 API Key / Base URL / 模型', 'not_configured');
  }

  const url = `${baseURL.replace(/\/$/, '')}/chat/completions`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 2000,
        stream: false,
      }),
      signal: opts.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw makeError('已取消', 'network');
    throw makeError(`网络错误：${err?.message || '无法连接到 AI 服务'}`, 'network');
  }

  if (!resp.ok) {
    let detail = '';
    try {
      const errBody = await resp.json();
      detail = errBody?.error?.message || errBody?.message || JSON.stringify(errBody);
    } catch {
      try { detail = await resp.text(); } catch { /* ignore */ }
    }
    if (resp.status === 401) {
      throw makeError(`API Key 无效或已过期 (401)${detail ? `：${detail}` : ''}`, 'api', 401);
    }
    if (resp.status === 429) {
      throw makeError('请求频率超限或余额不足 (429)，请稍后再试或检查账户额度', 'api', 429);
    }
    throw makeError(`AI 服务返回错误 (${resp.status})${detail ? `：${detail}` : ''}`, 'api', resp.status);
  }

  let data: any;
  try {
    data = await resp.json();
  } catch {
    throw makeError('AI 响应解析失败：非 JSON 格式', 'parse');
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw makeError('AI 响应格式异常：未返回内容', 'parse');
  }
  return content.trim();
}

/**
 * 测试连通性（发送一条简短消息）
 */
export async function testAIConnection(): Promise<string> {
  return chatCompletion({
    messages: [
      { role: 'system', content: '你是 AlphaPath AI 助手。' },
      { role: 'user', content: '请回复"连接成功"四个字。' },
    ],
    maxTokens: 20,
    temperature: 0,
  });
}
