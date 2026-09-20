
import { useEffect, useState } from 'react';
import { Slider, InputNumber, Typography, Row, Col } from 'antd';
import {
  PARAM_LIMITS,
  validateTemperature,
  validateMaxTokens,
  validateField,
} from '../../utils/validators';
import './ParameterSlider.css';

const { Text } = Typography;

interface ParameterSliderProps {
  temperature: number;
  maxTokens: number;
  /** 配置面板中同一份校验产生的错误原因 */
  errors?: {
    temperature?: string;
    maxTokens?: string;
  };
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
}

/**
 * 参数滑块组件
 *
 * 滑块与手动输入框是同一份取值的两个入口：
 * - 只有通过 validateTemperature / validateMaxTokens 的值才会回调保存；
 * - 手动输入的越界/非法值只留在本地草稿中并显示原因，不会落库，
 *   失焦后恢复为上一次合法保存的值。
 */
export function ParameterSlider({
  temperature,
  maxTokens,
  errors,
  onTemperatureChange,
  onMaxTokensChange,
}: ParameterSliderProps) {
  // 手动输入草稿：允许临时非法，便于编辑；合法时立即同步到外部
  const [temperatureDraft, setTemperatureDraft] = useState<number | null>(temperature);
  const [maxTokensDraft, setMaxTokensDraft] = useState<number | null>(maxTokens);

  // 外部（已保存）的值变化时，以它为准同步草稿 —— 滑块拖动、重置都由此收口
  useEffect(() => {
    setTemperatureDraft(temperature);
  }, [temperature]);
  useEffect(() => {
    setMaxTokensDraft(maxTokens);
  }, [maxTokens]);

  const temperatureInvalid =
    temperatureDraft !== null && !validateTemperature(temperatureDraft);
  const maxTokensInvalid =
    maxTokensDraft !== null && !validateMaxTokens(maxTokensDraft);

  // 草稿非法时用同一份口径生成原因；草稿合法时展示配置整体校验的原因
  const temperatureError = temperatureInvalid
    ? validateField('temperature', temperatureDraft)
    : errors?.temperature;
  const maxTokensError = maxTokensInvalid
    ? validateField('maxTokens', maxTokensDraft)
    : errors?.maxTokens;

  const handleTemperatureInput = (value: number | null) => {
    setTemperatureDraft(value);
    if (value !== null && validateTemperature(value)) {
      onTemperatureChange(value);
    }
  };

  const handleMaxTokensInput = (value: number | null) => {
    setMaxTokensDraft(value);
    if (value !== null && validateMaxTokens(value)) {
      onMaxTokensChange(value);
    }
  };

  // 失焦时丢弃非法草稿，恢复为已保存的合法值（不做任何截断式"修正"）
  const handleTemperatureBlur = () => {
    if (temperatureDraft === null || !validateTemperature(temperatureDraft)) {
      setTemperatureDraft(temperature);
    }
  };

  const handleMaxTokensBlur = () => {
    if (maxTokensDraft === null || !validateMaxTokens(maxTokensDraft)) {
      setMaxTokensDraft(maxTokens);
    }
  };

  return (
    <div className="parameter-slider">
      {/* Temperature */}
      <div className="parameter-item">
        <div className="parameter-header">
          <label className="input-label">Temperature</label>
          <Text type="secondary" className="parameter-value">
            {temperature.toFixed(1)}
          </Text>
        </div>
        <Row gutter={16}>
          <Col span={16}>
            <Slider
              min={PARAM_LIMITS.temperature.min}
              max={PARAM_LIMITS.temperature.max}
              step={0.1}
              value={temperature}
              onChange={onTemperatureChange}
              marks={{
                0: '精确',
                1: '平衡',
                2: '创意',
              }}
            />
          </Col>
          <Col span={8}>
            <InputNumber
              min={PARAM_LIMITS.temperature.min}
              max={PARAM_LIMITS.temperature.max}
              step={0.1}
              value={temperatureDraft}
              onChange={handleTemperatureInput}
              onBlur={handleTemperatureBlur}
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
              min={100}
              max={PARAM_LIMITS.maxTokens.max}
              step={100}
              value={maxTokens}
              onChange={onMaxTokensChange}
            />
          </Col>
          <Col span={8}>
            <InputNumber
              min={PARAM_LIMITS.maxTokens.min}
              max={PARAM_LIMITS.maxTokens.max}
              step={100}
              value={maxTokensDraft}
              onChange={handleMaxTokensInput}
              onBlur={handleMaxTokensBlur}
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
