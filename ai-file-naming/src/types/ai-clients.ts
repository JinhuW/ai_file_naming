/**
 * Type definitions for AI provider clients
 * These types eliminate the need for 'any' in provider implementations
 */

/**
 * OpenAI Client Types
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIMessageContent[];
}

export interface OpenAIMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

export interface OpenAIChatCompletionOptions {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  n?: number;
  stream?: boolean;
}

export interface OpenAIChatCompletionChoice {
  message?: {
    role: string;
    content: string;
  };
  delta?: {
    content?: string;
  };
  finish_reason?: string;
  index: number;
}

export interface OpenAIChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChatCompletionChoice[];
  usage?: OpenAIChatCompletionUsage;
}

export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface OpenAIModelsListResponse {
  object: string;
  data: OpenAIModel[];
}

export interface OpenAIChatCompletionStream {
  [Symbol.asyncIterator](): AsyncIterator<OpenAIChatCompletionResponse>;
}

export interface OpenAIClient {
  chat: {
    completions: {
      create: (
        options: OpenAIChatCompletionOptions,
      ) => Promise<OpenAIChatCompletionResponse | OpenAIChatCompletionStream>;
    };
  };
  models: {
    list: () => Promise<OpenAIModelsListResponse>;
  };
}

/**
 * Anthropic Client Types
 */
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicMessageContent[];
}

export interface AnthropicMessageContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface AnthropicMessageOptions {
  model: string;
  max_tokens: number;
  temperature?: number;
  messages: AnthropicMessage[];
  stream?: boolean;
}

export interface AnthropicContentBlock {
  type: 'text';
  text: string;
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: AnthropicUsage;
  [Symbol.asyncIterator]?: () => AsyncIterator<AnthropicStreamChunk>;
}

export interface AnthropicStreamChunk {
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop';
  delta?: {
    text?: string;
  };
}

export interface AnthropicClient {
  messages: {
    create: (options: AnthropicMessageOptions) => Promise<AnthropicMessageResponse>;
  };
}

/**
 * Ollama Client Types
 */
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded images
}

export interface OllamaGenerateOptions {
  model: string;
  prompt: string;
  images?: string[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaChatOptions {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface OllamaClient {
  generate: (options: OllamaGenerateOptions) => Promise<OllamaGenerateResponse>;
  chat: (options: OllamaChatOptions) => Promise<OllamaChatResponse>;
}

/**
 * Event Changes Type (for config updates)
 */
export interface ConfigUpdateChanges {
  provider?: Record<string, unknown>;
  naming?: Record<string, unknown>;
  batch?: Record<string, unknown>;
  cache?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  reset?: boolean;
}
