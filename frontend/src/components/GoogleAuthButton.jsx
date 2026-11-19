import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { loginWithGoogle } from '../services/authService';

export default function GoogleAuthButton({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const handleSuccess = async response => {
    if (!response.credential) {
      onError?.('Google не повернув токен.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithGoogle(response.credential);
      onSuccess?.(result);
    } catch (error) {
      onError?.(error.message || 'Помилка входу через Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-login-container">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError?.('Не вдалося авторизуватися через Google.')}
        theme="outline" size="large" shape="rectangular" text="continue_with" width="320"
      />
      {loading && <span className="google-login-loading">Виконується вхід...</span>}
    </div>
  );
}