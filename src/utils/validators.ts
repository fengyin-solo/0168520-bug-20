import type { AppConfig, ConfigValidation } from '../types';

/**
 * 参数取值边界 —— 全应用唯一的一份口径。
 * 滑块、手动输入、保存、发请求前的校验都必须以此为准。
 */
export const PARAM_LIMITS = {
  temperature: {
    min: 0,
    max: 2,
  },
  maxTokens: {
    min: 1,
    max: 8192,
  },
} as const;

/**
 * 各字段的错误原因，组件提示与发请求前拦截共用同一份文案。
 */
export const VALIDATION_MESSAGES = {
  apiKey: 'API 密钥格式无效（长度至少 10 位，仅支持字母、数字、下划线、连字符）',
  temperature: `Temperature 必须在 ${PARAM_LIMITS.temperature.min}-${PARAM_LIMITS.temperature.max} 范围内的数字`,
  maxTokens: `Max Tokens 必须是 ${PARAM_LIMITS.maxTokens.min}-${PARAM_LIMITS.maxTokens.max} 之间的正整数`,
} as const;

/**
 * 验证 API 密钥格式
 * @param apiKey API 密钥
 * @returns 是否有效
 */
export function validateAPIKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  const trimmed = apiKey.trim();

  // API Key 应该是非空字符串，长度至少 10 个字符
  if (trimmed.length < 10) {
    return false;
  }

  // 检查是否只包含有效字符（字母、数字、下划线、连字符）
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(trimmed);
}

/**
 * 验证 temperature 参数
 * @param temperature 温度值
 * @returns 是否有效（0-2 范围内）
 */
export function validateTemperature(temperature: number): boolean {
  if (typeof temperature !== 'number') {
    return false;
  }

  if (Number.isNaN(temperature) || !Number.isFinite(temperature)) {
    return false;
  }

  return temperature >= PARAM_LIMITS.temperature.min && temperature <= PARAM_LIMITS.temperature.max;
}

/**
 * 验证 max_tokens 参数
 * @param maxTokens 最大 Token 数
 * @returns 是否有效（1-8192 的正整数）
 */
export function validateMaxTokens(maxTokens: number): boolean {
  if (typeof maxTokens !== 'number') {
    return false;
  }

  if (Number.isNaN(maxTokens) || !Number.isFinite(maxTokens)) {
    return false;
  }

  return (
    Number.isInteger(maxTokens) &&
    maxTokens >= PARAM_LIMITS.maxTokens.min &&
    maxTokens <= PARAM_LIMITS.maxTokens.max
  );
}

/**
 * 可校验的配置字段
 */
export type ConfigField = keyof ConfigValidation['errors'];

/**
 * 校验单个配置字段 —— 唯一的单项判定入口。
 * 两个输入入口（滑块 / 手动输入）在保存前都调用它。
 * @param field 字段名
 * @param value 字段值
 * @returns 错误原因；undefined 表示合法
 */
export function validateField(field: ConfigField, value: unknown): string | undefined {
  switch (field) {
    case 'apiKey':
      return validateAPIKey(value as string) ? undefined : VALIDATION_MESSAGES.apiKey;
    case 'temperature':
      return validateTemperature(value as number) ? undefined : VALIDATION_MESSAGES.temperature;
    case 'maxTokens':
      return validateMaxTokens(value as number) ? undefined : VALIDATION_MESSAGES.maxTokens;
    default:
      return undefined;
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
 * @param config 应用配置
 * @returns 验证结果
 */
export function validateConfig(config: Partial<AppConfig>): ConfigValidation {
  const errors: ConfigValidation['errors'] = {};

  (Object.keys(VALIDATION_MESSAGES) as ConfigField[]).forEach((field) => {
    if (config[field] === undefined) {
      return;
    }
    const error = validateField(field, config[field]);
    if (error) {
      errors[field] = error;
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
 * 限制 temperature 到有效范围
 *
 * 仅供历史调用方做展示兜底；保存与发请求的判定一律使用
 * validateTemperature，绝不以此函数"修正"用户输入后落库。
 * @param temperature 原始值
 * @returns 限制后的值
 */
export function clampTemperature(temperature: number): number {
  if (typeof temperature !== 'number' || Number.isNaN(temperature)) {
    return 0.7; // 默认值
  }
  return Math.max(
    PARAM_LIMITS.temperature.min,
    Math.min(PARAM_LIMITS.temperature.max, temperature)
  );
}

/**
 * 限制 maxTokens 到有效范围
 *
 * 仅供历史调用方做展示兜底；保存与发请求的判定一律使用
 * validateMaxTokens，绝不以此函数"修正"用户输入后落库。
 * @param maxTokens 原始值
 * @param max 最大允许值
 * @returns 限制后的值
 */
export function clampMaxTokens(maxTokens: number, max: number = PARAM_LIMITS.maxTokens.max): number {
  if (typeof maxTokens !== 'number' || Number.isNaN(maxTokens)) {
    return 2048; // 默认值
  }
  return Math.max(
    PARAM_LIMITS.maxTokens.min,
    Math.min(max, Math.floor(maxTokens))
  );
}
