import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import './AdminAccountSettings.css';

type Props = {
  adminKey: string;
  onBack: () => void;
  onLogout: () => void;
  onPasswordChanged: () => void;
};

export default function AdminAccountSettings({ adminKey, onBack, onLogout, onPasswordChanged }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    if (newPassword !== confirmation) {
      setError('新密碼與確認新密碼不一致');
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmation }),
      });
      if (response.status === 401) { onLogout(); return; }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? '修改密碼失敗，請稍後重試');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      onPasswordChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密碼失敗，請稍後重試');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><h1>It's okay · 帳號設定</h1><p>管理登入密碼</p></div>
        <div className="admin-actions">
          <button type="button" onClick={onBack} disabled={saving}>返回訂單管理</button>
          <button type="button" onClick={onLogout} disabled={saving}>登出</button>
        </div>
      </header>
      <form className="admin-account-form" onSubmit={submit} aria-busy={saving}>
        <h2>修改密碼</h2>
        <p>新密碼不限制複雜度；修改後請重新登入。</p>
        {error && <div className="admin-error" role="alert">{error}</div>}
        <label htmlFor="current-password">目前密碼</label>
        <input id="current-password" name="current_password" type="password" autoComplete="current-password" required maxLength={1024}
          value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={saving} />
        <label htmlFor="new-password">新密碼</label>
        <input id="new-password" name="new_password" type="password" autoComplete="new-password" required maxLength={1024}
          value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={saving} />
        <label htmlFor="confirm-password">確認新密碼</label>
        <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" required maxLength={1024}
          value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={saving} />
        <button type="submit" disabled={saving}>{saving ? '儲存中…' : '儲存新密碼'}</button>
      </form>
    </main>
  );
}
