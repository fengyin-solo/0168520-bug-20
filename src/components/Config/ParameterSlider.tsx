import { useEffect, useState } from 'react';
import { Slider, InputNumber, Typography, Row, Col } from 'antd';
import {
  TEMPERATURE_RULE,
  MAX_TOKENS_RULE,
} from '../../utils/rules';
import {
  validateTemperatureReason,
  validateMaxTokensReason,
  clampTemperature,
  clampMaxTokens,
} from '../../utils/validators';
import type { ConfigValidation } from '../../types';
import './ParameterSlider.css';

const { Text } = Typography;

interface ParameterSliderProps {
  temperature: number;
  maxTokens: number;
  /** 整配置校验得到的错误原因（与发送前复核同源） */
  errors?: ConfigValidation['errors'];
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
}

/**
 * 参数滑块组件
 *
 * 滑块与手动输入共用同一份规则：
 * - 滑块只会产出合法值，拖动即保存；
 * - 手动输入允许在本地保留非法草稿（例如 2.5 / -1），
 *   只有合法取值才会提交保存，非法时标红并展示原因，不会覆盖已保存的值。
 */
export function ParameterSlider({
  temperature,
  maxTokens,
  errors,
  onTemperatureChange,
  onMaxTokensChange,
}: ParameterSliderProps) {
  // null 表示本地没有草稿，直接展示已保存的值
  const [temperatureDraft, setTemperatureDraft] = useState<number | null>(null);
  const [maxTokensDraft, setMaxTokensDraft] = useState<number | null>(null);

  // 已保存的值在外部变化（重置、重新加载）时，清掉对应草稿
  useEffect(() => {
    setTemperatureDraft(null);
  }, [temperature]);
  useEffect(() => {
    setMaxTokensDraft(null);
  }, [maxTokens]);

  const temperatureShown = temperatureDraft ?? temperature;
  const maxTokensShown = maxTokensDraft ?? maxTokens;

  const temperatureError =
    (temperatureDraft !== null && validateTemperatureReason(temperatureDraft)) ||
    (temperatureDraft === null ? errors?.temperature : undefined);
  const maxTokensError =
    (maxTokensDraft !== null && validateMaxTokensReason(maxTokensDraft)) ||
    (maxTokensDraft === null ? errors?.maxTokens : undefined);

  const handleTemperatureSlider = (value: number) => {
    setTemperatureDraft(null);
    onTemperatureChange(value);
  };

  const handleTemperatureInput = (value: number | null) => {
    if (value === null) {
      setTemperatureDraft(null);
      return;
    }
    setTemperatureDraft(value);
    if (validateTemperatureReason(value) === undefined) {
      onTemperatureChange(value);
    }
  };

  const handleMaxTokensSlider = (value: number) => {
    setMaxTokensDraft(null);
    onMaxTokensChange(value);
  };

  const handleMaxTokensInput = (value: number | null) => {
    if (value === null) {
      setMaxTokensDraft(null);
      return;
    }
    setMaxTokensDraft(value);
    if (validateMaxTokensReason(value) === undefined) {
      onMaxTokensChange(value);
    }
  };

  return (
    <div className="parameter-slider">
      {/* Temperature */}
      <div className="parameter-item">
        <div className="parameter-header">
          <label className="input-label">Temperature</label>
          <Text type="secondary" className="parameter-value">
            {Number(temperatureShown).toFixed(1)}
          </Text>
        </div>
        <Row gutter={16}>
          <Col span={16}>
            <Slider
              min={TEMPERATURE_RULE.min}
              max={TEMPERATURE_RULE.max}
              step={0.1}
              value={clampTemperature(temperatureShown)}
              onChange={handleTemperatureSlider}
              marks={{
                0: '精确',
                1: '平衡',
                2: '创意',
              }}
            />
          </Col>
          <Col span={8}>
            <InputNumber
              min={TEMPERATURE_RULE.min}
              max={TEMPERATURE_RULE.max}
              step={0.1}
              value={temperatureShown}
              onChange={handleTemperatureInput}
              status={temperatureError ? 'error' : undefined}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
        {temperatureError ? (
          <Text type="danger" className="input-error">
            {temperatureError}
          </Text>
        ) : (
          <Text type="secondary" className="parameter-hint">
            较低的值使输出更确定，较高的值使输出更随机
          </Text>
        )}
      </div>

      {/* Max Tokens */}
      <div className="parameter-item">
        <div className="parameter-header">
          <label className="input-label">Max Tokens</label>
        </div>
        <Row gutter={16}>
          <Col span={16}>
            <Slider
              min={MAX_TOKENS_RULE.min}
              max={MAX_TOKENS_RULE.max}
              step={100}
              value={clampMaxTokens(maxTokensShown)}
              onChange={handleMaxTokensSlider}
            />
          </Col>
          <Col span={8}>
            <InputNumber
              min={MAX_TOKENS_RULE.min}
              max={MAX_TOKENS_RULE.max}
              step={100}
              value={maxTokensShown}
              onChange={handleMaxTokensInput}
              status={maxTokensError ? 'error' : undefined}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
        {maxTokensError ? (
          <Text type="danger" className="input-error">
            {maxTokensError}
          </Text>
        ) : (
          <Text type="secondary" className="parameter-hint">
            控制回复的最大长度
          </Text>
        )}
      </div>
    </div>
  );
}
