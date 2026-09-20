import { useCallback } from 'react';
import { message } from 'antd';
import { useChatStore } from '../stores/chatStore';
import { useConfigStore } from '../stores/configStore';
import { useUIStore } from '../stores/uiStore';
import { sendMessageStream } from '../services/api';
import { createStreamHandler, toMessageStats } from '../services/stream';
import { parseError, logError, shouldShowConfigPanel } from '../services/errorHandler';
import { validateConfig } from '../utils/validators';
import type { APIMessage } from '../types';

// 创建流处理器实例
const streamHandler = createStreamHandler();

/**
 * 聊天功能 Hook
 */
export function useChat() {
  const {
    conversations,
    activeConversationId,
    isStreaming,
    streamingMessageId,
    getActiveConversation,
    createConversation,
    deleteConversation,
    setActiveConversation,
    addMessage,
    startStreaming,
    appendStreamContent,
    finishStreaming,
    cancelStreaming,
  } = useChatStore();

  const { config } = useConfigStore();
  const { setConfigPanelVisible } = useUIStore();

  const conversation = getActiveConversation();
  const messages = conversation?.messages || [];

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId) {
        message.warning('请先创建或选择一个对话');
        return;
      }

      // 发送前用同一份判定结果再校验一次（不依赖可能过期的渲染快照）
      const currentConfig = useConfigStore.getState().config;
      const validation = validateConfig(currentConfig);
      if (!validation.isValid) {
        message.warning(Object.values(validation.errors)[0] || '请先完成配置');
        useConfigStore.getState().validateCurrentConfig();
        setConfigPanelVisible(true);
        return;
      }

      // 添加用户消息
      addMessage(activeConversationId, {
        role: 'user',
        content,
        status: 'complete',
      });

      // 准备 API 消息
      const apiMessages: APIMessage[] = [
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user' as const, content },
      ];

      // 开始流式响应
      startStreaming(activeConversationId);

      try {
        const stream = sendMessageStream(apiMessages, {
          ...config,
          stream: true,
        });

        await streamHandler.start(stream, {
          onChunk: (chunk) => {
            appendStreamContent(chunk);
          },
          onComplete: (stats) => {
            finishStreaming(toMessageStats(stats));
          },
          onError: (error) => {
            const appError = parseError(error);
            logError(appError, 'useChat.sendMessage');
            message.error(appError.message);
            cancelStreaming();

            if (shouldShowConfigPanel(appError)) {
              setConfigPanelVisible(true);
            }
          },
        });
      } catch (error) {
        const appError = parseError(error);
        logError(appError, 'useChat.sendMessage');
        message.error(appError.message);
        cancelStreaming();

        if (shouldShowConfigPanel(appError)) {
          setConfigPanelVisible(true);
        }
      }
    },
    [
      activeConversationId,
      config,
      messages,
      addMessage,
      startStreaming,
      appendStreamContent,
      finishStreaming,
      cancelStreaming,
      setConfigPanelVisible,
    ]
  );

  /**
   * 停止流式响应
   */
  const stopStreaming = useCallback(() => {
    streamHandler.abort();
    cancelStreaming();
    message.info('已停止响应');
  }, [cancelStreaming]);

  /**
   * 创建新对话并发送消息
   */
  const startNewChat = useCallback(
    async (content?: string) => {
      const id = createConversation();
      if (content) {
        // 等待状态更新后发送消息
        setTimeout(() => {
          sendMessage(content);
        }, 0);
      }
      return id;
    },
    [createConversation, sendMessage]
  );

  return {
    // State
    conversations,
    activeConversationId,
    conversation,
    messages,
    isStreaming,
    streamingMessageId,

    // Actions
    sendMessage,
    stopStreaming,
    startNewChat,
    createConversation,
    deleteConversation,
    setActiveConversation,
  };
}
