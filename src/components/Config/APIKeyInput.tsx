import { useEffect, useState } from 'react';
import { Input, Button, Space, Typography } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { validateAPIKeyReason } from '../../utils/validators';
import './APIKeyInput.css';

const { Text } = Typography;

interface APIKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  /** 整配置校验得到的错误原因（与发送前复核同源） */
  error?: string;
}

/**
 * API 密钥输入组件
 *
 * 与参数输入保持同一口径：非法密钥只保留在本地草稿中，
 * 不会覆盖已保存的值，合法后才提交保存。
 */
export function APIKeyInput({ value, onChange, error }: APIKeyInputProps) {
  const [visible, setVisible] = useState(false);
  // null 表示本地没有草稿，直接展示已保存的值
  const [draft, setDraft] = useState<string | null>(null);

  // 已保存的值在外部变化（重置、重新加载）时，清掉草稿
  useEffect(() => {
    setDraft(null);
  }, [value]);

  const shown = draft ?? value;
  const draftError = draft !== null ? validateAPIKeyReason(draft) : undefined;
  const shownError = draftError ?? error;
  const isValid = validateAPIKeyReason(shown) === undefined;

  const toggleVisibility = () => {
    setVisible(!visible);
  };

  const getStatus = (): "" | "error" | "warning" | undefined => {
    if (!shown) return undefined;
    return isValid ? "" : 'error';
  };

  const getSuffix = () => {
    if (!shown) return null;

    return (
      <Space>
        {isValid ? (
          <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />
        ) : (
          <CloseCircleOutlined style={{ color: 'var(--color-error)' }} />
        )}
        <Button
          type="text"
          size="small"
          icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={toggleVisibility}
        />
      </Space>
    );
  };

  const handleChange = (next: string) => {
    setDraft(next);
    if (validateAPIKeyReason(next) === undefined) {
      onChange(next);
    }
  };

  return (
    <div className="api-key-input">
      <label className="input-label">API Key</label>
      <Input
        type={visible ? 'text' : 'password'}
        value={shown}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="请输入 SiliconFlow API Key"
        status={getStatus()}
        suffix={getSuffix()}
        size="large"
      />
      {shownError && (
        <Text type="danger" className="input-error">
          {shownError}
        </Text>
      )}
      <Text type="secondary" className="input-hint">
        从 SiliconFlow 控制台获取 API Key
      </Text>
    </div>
  );
}
