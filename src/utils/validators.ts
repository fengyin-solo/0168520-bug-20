import type { AppConfig, ConfigValidation } from '../types';
import {
  TEMPERATURE_RULE,
  MAX_TOKENS_RULE,
  API_KEY_MIN_LENGTH,
  API_KEY_PATTERN,
  CONFIG_ERROR_MESSAGES,
} from './rules';

/** 受校验的配置字段 */
export type ConfigField = keyof ConfigValidation['errors'];

/**
 * 验证 API 密钥格式
 * @param apiKey API 密钥
 * @returns 是否有效
 */
export function validateAPIKey(apiKey: unknown): boolean {
  return validateAPIKeyReason(apiKey) === undefined;
}

/**
 * 校验 API 密钥并返回失败原因
 * @returns 失败原因；合法时返回 undefined
 */
export function validateAPIKeyReason(apiKey: unknown): string | undefined {
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return CONFIG_ERROR_MESSAGES.apiKeyEmpty;
  }

  const trimmed = apiKey.trim();

  if (trimmed.length < API_KEY_MIN_LENGTH || !API_KEY_PATTERN.test(trimmed)) {
    return CONFIG_ERROR_MESSAGES.apiKeyInvalid;
  }

  return undefined;
}

/**
 * 校验数值是否满足给定数值规则
 */
function validateNumericRule(
  value: unknown,
  rule: { min: number; max: number; integer: boolean },
  typeReason: string,
  integerReason: string,
  rangeReason: string,
): string | undefined {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return typeReason;
  }

  if (rule.integer && !Number.isInteger(value)) {
    return integerReason;
  }

  if (value < rule.min || value > rule.max) {
    return rangeReason;
  }

  return undefined;
}

/**
 * 验证 temperature 参数
 * @param temperature 温度值
 * @returns 是否有效
 */
export function validateTemperature(temperature: unknown): boolean {
  return validateTemperatureReason(temperature) === undefined;
}

/**
 * 校验 temperature 并返回失败原因
 */
export function validateTemperatureReason(temperature: unknown): string | undefined {
  return validateNumericRule(
    temperature,
    TEMPERATURE_RULE,
    CONFIG_ERROR_MESSAGES.temperatureType,
    CONFIG_ERROR_MESSAGES.temperatureType,
    CONFIG_ERROR_MESSAGES.temperatureRange,
  );
}

/**
 * 验证 maxTokens 参数
 * @param maxTokens 最大 Token 数
 * @returns 是否有效
 */
export function validateMaxTokens(maxTokens: unknown): boolean {
  return validateMaxTokensReason(maxTokens) === undefined;
}

/**
 * 校验 maxTokens 并返回失败原因
 */
export function validateMaxTokensReason(maxTokens: unknown): string | undefined {
  return validateNumericRule(
    maxTokens,
    MAX_TOKENS_RULE,
    CONFIG_ERROR_MESSAGES.maxTokensType,
    CONFIG_ERROR_MESSAGES.maxTokensInteger,
    CONFIG_ERROR_MESSAGES.maxTokensRange,
  );
}

/**
 * 校验单个配置字段并返回失败原因
 *
 * 这是字段级校验的唯一入口：两个输入入口（滑块/手动输入、密钥输入框）
 * 以及 store 的保存闸门都通过它得到同一份结论与原因。
 * @param field 字段名
 * @param value 字段值
 * @returns 失败原因；合法时返回 undefined
 */
export function validateConfigField(field: ConfigField, value: unknown): string | undefined {
  switch (field) {
    case 'apiKey':
      return validateAPIKeyReason(value);
    case 'temperature':
      return validateTemperatureReason(value);
    case 'maxTokens':
      return validateMaxTokensReason(value);
  }
}

/**
 * 验证消息内容
 * @param content 消息内容
 * @returns 是否有效（非空白字符串）
 */
export function validateMessageContent(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  return content.trim().length > 0;
}

/**
 * 验证 URL 格式
 * @param url URL 字符串
 * @returns 是否有效
 */
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证完整配置
 *
 * 这是整份配置合法性的唯一判定入口：配置面板保存、发送前复核都必须
 * 使用本函数返回的同一个结果（isValid / errors），不得另起判定逻辑。
 * @param config 应用配置（或其一部分）
 * @returns 验证结果
 */
export function validateConfig(config: Partial<AppConfig>): ConfigValidation {
  const errors: ConfigValidation['errors'] = {};

  (Object.keys(config) as Array<keyof typeof config>).forEach((field) => {
    if (field === 'apiKey' || field === 'temperature' || field === 'maxTokens') {
      const reason = validateConfigField(field, config[field]);
      if (reason) {
        errors[field] = reason;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * 清理和规范化 API Key
 * @param apiKey 原始 API Key
 * @returns 清理后的 API Key
 */
export function sanitizeAPIKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') {
    return '';
  }
  return apiKey.trim();
}

/**
 * 限制 temperature 到规则范围内
 *
 * 仅用于展示层（例如滑块手柄位置），保存路径不做静默截断。
 * @param temperature 原始值
 * @param fallback 非数字时的兜底值
 * @returns 限制后的值
 */
export function clampTemperature(temperature: number, fallback: number = 0.7): number {
  if (typeof temperature !== 'number' || Number.isNaN(temperature)) {
    return fallback;
  }
  return Math.max(TEMPERATURE_RULE.min, Math.min(TEMPERATURE_RULE.max, temperature));
}

/**
 * 限制 maxTokens 到规则范围内
 *
 * 仅用于展示层（例如滑块位置），保存路径不做静默截断。
 * @param maxTokens 原始值
 * @param fallback 非数字时的兜底值
 * @returns 限制后的值
 */
export function clampMaxTokens(maxTokens: number, fallback: number = 2048): number {
  if (typeof maxTokens !== 'number' || Number.isNaN(maxTokens)) {
    return fallback;
  }
  return Math.max(
    MAX_TOKENS_RULE.min,
    Math.min(MAX_TOKENS_RULE.max, Math.floor(maxTokens)),
  );
}
