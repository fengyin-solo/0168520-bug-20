import { useCallback } from 'react';
import { message } from 'antd';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { useChatStore } from '../../stores/chatStore';
import { useConfigStore } from '../../stores/configStore';
import { sendMessageStream } from '../../services/api';
import { createStreamHandler, toMessageStats } from '../../services/stream';
import { parseError, logError, shouldShowConfigPanel } from '../../services/errorHandler';
import { useUIStore } from '../../stores/uiStore';
import type { APIMessage } from '../../types';
import './ChatArea.css';

// 创建流处理器实例
const streamHandler = createStreamHandler();

/**
 * 聊天区域主组件
 */
export function ChatArea() {
  const {
    activeConversationId,
    isStreaming,
    streamingMessageId,
    getActiveConversation,
    addMessage,
    startStreaming,
    appendStreamContent,
    finishStreaming,
    cancelStreaming,
    createConversation,
  } = useChatStore();

  const { config, isValid: isConfigValid, errors: configErrors } = useConfigStore();
  const { setConfigPanelVisible } = useUIStore();

  const conversation = getActiveConversation();
  const messages = conversation?.messages || [];

  const sendDisabledReason =
    Object.values(configErrors).find(Boolean) ?? '请先在设置中完善 API Key 与参数配置';

  const handleSend = useCallback(
    async (content: string) => {
      // 发请求之前用同一份校验结果再校验一次当前配置
      const validation = useConfigStore.getState().validateCurrentConfig();
      if (!validation.isValid) {
        const reason =
          Object.values(validation.errors).find(Boolean) ?? '请先完成配置';
        message.warning(reason);
        setConfigPanelVisible(true);
        return;
      }

      // 如果没有活动对话，自动创建一个
      let conversationId = activeConversationId;
      if (!conversationId) {
        conversationId = createConversation();
      }

      // 获取当前对话的历史消息（在添加新消息之前）
      const stateBeforeAdd = useChatStore.getState();
      const currentConversation = stateBeforeAdd.conversations.find(c => c.id === conversationId);
      const historyMessages = currentConversation?.messages || [];

      // 添加用户消息
      addMessage(conversationId, {
        role: 'user',
        content,
        status: 'complete',
      });

      // 准备 API 消息（历史消息 + 当前消息）
      const apiMessages: APIMessage[] = [
        ...historyMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user' as const, content },
      ];

      // 开始流式响应
      startStreaming(conversationId);

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
            logError(appError, 'ChatArea.handleSend');
            message.error(appError.message);
            cancelStreaming();

            if (shouldShowConfigPanel(appError)) {
              setConfigPanelVisible(true);
            }
          },
        });
      } catch (error) {
        const appError = parseError(error);
        logError(appError, 'ChatArea.handleSend');
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

  const handleStop = useCallback(() => {
    streamHandler.abort();
    cancelStreaming();
    message.info('已停止响应');
  }, [cancelStreaming]);

  return (
    <div className="chat-area">
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        streamingMessageId={streamingMessageId}
      />
      <InputArea
        onSend={handleSend}
        onStop={handleStop}
        isLoading={false}
        isStreaming={isStreaming}
        disabled={false}
        sendDisabled={!isConfigValid}
        sendDisabledReason={sendDisabledReason}
      />
    </div>
  );
}
