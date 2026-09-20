import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateTemperature,
  validateTemperatureReason,
  validateMaxTokens,
  validateMaxTokensReason,
  validateConfig,
  validateConfigField,
} from '../../src/utils/validators';
import { TEMPERATURE_RULE, MAX_TOKENS_RULE } from '../../src/utils/rules';

describe('property：任何输入下三处口径始终一致', () => {
  it('temperature：单字段函数 / validateConfigField / 规则常量 判定相同', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, min: -100, max: 100 }), (n) => {
        const expected =
          Number.isFinite(n) && n >= TEMPERATURE_RULE.min && n <= TEMPERATURE_RULE.max;

        expect(validateTemperature(n)).toBe(expected);
        expect(validateTemperatureReason(n) === undefined).toBe(expected);
        expect(validateConfigField('temperature', n) === undefined).toBe(expected);

        const whole = validateConfig({ temperature: n });
        expect(whole.isValid).toBe(expected);
        expect(whole.errors.temperature === undefined).toBe(expected);
      }),
    );
  });

  it('maxTokens：单字段函数 / validateConfigField / 规则常量 判定相同', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 20000 }), (n) => {
        const expected =
          n >= MAX_TOKENS_RULE.min && n <= MAX_TOKENS_RULE.max;

        expect(validateMaxTokens(n)).toBe(expected);
        expect(validateMaxTokensReason(n) === undefined).toBe(expected);
        expect(validateConfigField('maxTokens', n) === undefined).toBe(expected);

        const whole = validateConfig({ maxTokens: n });
        expect(whole.isValid).toBe(expected);
        expect(whole.errors.maxTokens === undefined).toBe(expected);
      }),
    );
  });

  it('maxTokens：随机小数永远不通过整数要求（除非本身是整数）', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, min: -50, max: 9000 }), (n) => {
        const reason = validateMaxTokensReason(n);
        if (!Number.isInteger(n)) {
          expect(reason).toBeDefined();
        }
      }),
    );
  });
});
