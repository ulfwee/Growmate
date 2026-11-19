import React, { useRef, useState } from 'react';
import StartPage from './StartPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
export default function LandingPage({ onAuthSuccess }) {
  const authRef = useRef(null);
  const [authMode, setAuthMode] = useState('register');
  const scrollToAuth = (mode) => {
    setAuthMode(mode);
    setTimeout(() => {
      authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };
  return (<div className="landing-page">
    <StartPage onStartClick={() => scrollToAuth('register')} onLoginClick={() => scrollToAuth('login')} />
    <div ref={authRef} id="auth">
      {authMode === 'register' ? (<RegisterPage onSwitchToLogin={() => setAuthMode('login')} onAuthSuccess={onAuthSuccess} />) : (<LoginPage onSwitchToRegister={() => setAuthMode('register')} onAuthSuccess={onAuthSuccess} />)}
    </div>
  </div>);
}