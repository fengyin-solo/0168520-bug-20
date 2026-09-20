import { describe, it, expect } from 'vitest';
import { sendMessageStream, sendMessage, ConfigValidationError } from '../../src/services/api';
import { DEFAULT_CONFIG } from '../../src/types';

const messages = [{ role: 'user' as const, content: 'hi' }];

describe('发送前复核：与输入入口同源的最后一道闸门', () => {
  it('temperature 越界时，流式接口在发请求前抛出且带原因', async () => {
    await expect(
      sendMessageStream(messages, {
        ...DEFAULT_CONFIG,
        apiKey: 'valid-key-123',
        temperature: 2.5,
        stream: true,
      }).next(),
    ).rejects.toBeInstanceOf(ConfigValidationError);

    try {
      await sendMessageStream(messages, {
        ...DEFAULT_CONFIG,
        apiKey: 'valid-key-123',
        temperature: 2.5,
        stream: true,
      }).next();
      throw new Error('应当抛出校验错误');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as ConfigValidationError).errors.temperature).toMatch(/Temperature/);
    }
  });

  it('maxTokens 负数时，非流式接口在发请求前抛出', async () => {
    await expect(
      sendMessage(messages, {
        ...DEFAULT_CONFIG,
        apiKey: 'valid-key-123',
        maxTokens: -1,
        stream: false,
      }),
    ).rejects.toBeInstanceOf(ConfigValidationError);
  });

  it('API Key 不足时，两个接口都拦截，不会带着坏配置发请求', async () => {
    const badConfig = {
      ...DEFAULT_CONFIG,
      apiKey: 'short',
      stream: false,
    } as const;

    await expect(sendMessage(messages, badConfig)).rejects.toBeInstanceOf(
      ConfigValidationError,
    );
    await expect(sendMessageStream(messages, { ...badConfig, stream: true }).next()).rejects.toBeInstanceOf(
      ConfigValidationError,
    );
  });
});
