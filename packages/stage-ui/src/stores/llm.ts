import type { ChatProvider } from '@xsai-ext/shared-providers'
import type { Message, ToolCall, ToolMessagePart } from '@xsai/shared-chat'

import { listModels } from '@xsai/model'
import { generateText } from '@xsai/generate-text'
import { defineStore } from 'pinia'

import { debug, mcp } from '../tools'

export const useLLM = defineStore('llm', () => {
  async function stream(model: string, chatProvider: ChatProvider, messages: Message[], options?: {
    headers?: Record<string, string>
    disableTools?: boolean
    onToolCall?: (toolCall: ToolCall) => void
    onToolCallResult?: (toolCallResult: {
      id: string
      result?: string | ToolMessagePart[]
    }) => void
  }) {
    const headers = options?.headers

    return await generateText({
      ...chatProvider.chat(model),
      maxSteps: 10,
      messages,
      headers,
      ...(options?.disableTools
        ? {}
        : {
            tools: [
              ...(await mcp()),
              ...(await debug()),
            ],
          }),
      onEvent(event) {
        if (event.type === 'tool-call') {
          options?.onToolCall?.(event.toolCall)
        }
        else if (event.type === 'tool-call-result') {
          options?.onToolCallResult?.({ id: event.id, result: event.result })
        }
      },
    })
  }

  async function models(apiUrl: string, apiKey: string) {
    if (apiUrl === '') {
      return []
    }

    try {
      return await listModels({
        baseURL: (apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`) as `${string}/`,
        apiKey,
      })
    }
    catch (err) {
      if (String(err).includes(`Failed to construct 'URL': Invalid URL`)) {
        return []
      }

      throw err
    }
  }

  return {
    models,
    stream,
  }
})
