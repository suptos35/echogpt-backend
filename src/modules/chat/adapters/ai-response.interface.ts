export interface AiResponse {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

export interface ChatMessageContext {
  role: string;
  content: string;
}
