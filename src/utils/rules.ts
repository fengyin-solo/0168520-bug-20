/**
 * 参数规则：整个应用唯一的取值判定口径
 *
 * 滑块边界、输入框边界、字段校验、发送前校验都必须引用这里的常量，
 * 任何地方都不要再自行硬编码范围或默认值。
 */

export interface NumericRule {
  /** 允许的最小值（含） */
  readonly min: number;
  /** 允许的最大值（含） */
  readonly max: number;
  /** 是否要求为整数 */
  readonly integer: boolean;
}

/**
 * Temperature 取值规则：[0, 2]，允许一位小数
 */
export const TEMPERATURE_RULE: NumericRule = {
  min: 0,
  max: 2,
  integer: false,
};

/**
 * Max Tokens 取值规则：[100, 8192]，正整数
 */
export const MAX_TOKENS_RULE: NumericRule = {
  min: 100,
  max: 8192,
  integer: true,
};

/**
 * API Key 最短长度
 */
export const API_KEY_MIN_LENGTH = 10;

/**
 * API Key 允许的字符：字母、数字、下划线、连字符
 */
export const API_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * 校验失败时向用户展示的原因
 *
 * 这里是错误文案的唯一定义处，组件、store、发送前提示共用。
 */
export const CONFIG_ERROR_MESSAGES = {
  apiKeyEmpty: 'API Key 不能为空',
  apiKeyInvalid: `API Key 至少 ${API_KEY_MIN_LENGTH} 个字符，且只能包含字母、数字、下划线和连字符`,
  temperatureType: 'Temperature 必须是数字',
  temperatureRange: `Temperature 必须在 ${TEMPERATURE_RULE.min}-${TEMPERATURE_RULE.max} 范围内`,
  maxTokensType: 'Max Tokens 必须是数字',
  maxTokensInteger: 'Max Tokens 必须是整数',
  maxTokensRange: `Max Tokens 必须是 ${MAX_TOKENS_RULE.min}-${MAX_TOKENS_RULE.max} 之间的正整数`,
} as const;
