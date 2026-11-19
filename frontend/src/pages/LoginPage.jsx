import React, { useState } from 'react';
import '../css/LoginPage.css';
import { loginUser } from '../services/authService';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSeedling } from '@fortawesome/free-solid-svg-icons';
export default function LoginPage({ onSwitchToRegister, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginUser({ email: email.trim(), password });
      onAuthSuccess?.(result);
    }
    catch (err) {
      setError(err.message);
    }
    finally {
      setLoading(false);
    }
  };
  const handleGoogleSuccess = (result) => {
    setError('');
    onAuthSuccess?.(result);
  };
  return (<div className="login-container">
    <div className="login-left-panel">
      <div className="login-brand">
        <span className="logo-icon"><FontAwesomeIcon icon={faSeedling} /></span>
        <span className="logo-text">Growmate</span>
      </div>
      <div className="login-left-content">
        <div className="login-badge">Ваш простір для зростання</div>
        <h1 className="login-main-title">Зростати легше, <br /> коли ви не самі.</h1>
        <p className="login-subtitle">Перетворюйте великі наміри на зрозумілі кроки та знаходьте підтримку людей зі схожими цілями.</p>
      </div>
    </div>
    <div className="login-right-panel">
      <div className="login-form-wrapper">
        <div className="form-header">
          <span className="form-top-label">РАДІ БАЧИТИ ВАС ЗНОВУ</span>
          <h2 className="form-title">Увійти до Growmate</h2>
          <p className="form-desc">Продовжуйте рухатися до того, що для вас важливо.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="loginEmail">Електронна пошта</label>
            <input type="email" id="loginEmail" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label htmlFor="loginPassword">Пароль</label>
            <input type="password" id="loginPassword" placeholder="Введіть пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="auth-message auth-error">{error}</div>}
          <button type="submit" className="submit-button" disabled={loading}>{loading ? 'Вхід...' : 'Увійти'}</button>
          <div className="auth-divider"><span>або</span></div>
          <div className="google-auth-wrapper"><GoogleAuthButton onSuccess={handleGoogleSuccess} onError={setError} /></div>
          <div className="form-switch">
            Ще не маєте акаунта?{' '}
            <a href="#auth" onClick={(e) => { e.preventDefault(); onSwitchToRegister?.(); }}>Зареєструватися</a>
          </div>
        </form>
      </div>
    </div>
  </div>);
}