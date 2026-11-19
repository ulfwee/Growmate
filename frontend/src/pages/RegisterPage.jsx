import React, { useEffect, useState } from 'react';
import '../css/LoginPage.css';
import '../css/RegisterInterests.css';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { registerUser } from '../services/authService';
import { getInterests, saveMyInterests, } from '../services/interestsService';
import { useToast } from '../components/ToastProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSeedling, faArrowLeft, faCheck, } from '@fortawesome/free-solid-svg-icons';
const MAX_INTERESTS = 5;
export default function RegisterPage({ onSwitchToLogin, onAuthSuccess, }) {
  const [step, setStep] = useState('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [interests, setInterests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interestsLoading, setInterestsLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  useEffect(() => {
    if (step !== 'interests')
      return;
    let active = true;
    const loadInterests = async () => {
      setInterestsLoading(true);
      setError('');
      try {
        const result = await getInterests();
        if (active) {
          setInterests(result);
        }
      }
      catch (err) {
        if (active) {
          setError(err.message ||
            'Не вдалося завантажити інтереси.');
        }
      }
      finally {
        if (active) {
          setInterestsLoading(false);
        }
      }
    };
    loadInterests();
    return () => {
      active = false;
    };
  }, [step]);
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) {
      setError("Введіть ім'я користувача.");
      return;
    }
    if (password.length < 8) {
      setError('Пароль повинен містити щонайменше 8 символів.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Паролі не збігаються.');
      return;
    }
    setLoading(true);
    try {
      const result = await registerUser({
        username: fullName.trim(),
        email: email.trim(),
        password,
      });
      setRegisteredUser(result);
      setStep('interests');
      showToast('Акаунт створено! Обери свої інтереси.');
    }
    catch (err) {
      setError(err.message || 'Помилка реєстрації.');
    }
    finally {
      setLoading(false);
    }
  };
  const handleGoogleSuccess = (result) => {
    setError('');
    if (result.isNewUser) {
      setRegisteredUser(result);
      setStep('interests');
      showToast('Акаунт створено! Обери свої інтереси.');
    }
    else {
      onAuthSuccess?.(result);
    }
  };
  const toggleInterest = (id) => {
    setError('');
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id);
      }
      if (previous.length >= MAX_INTERESTS) {
        return previous;
      }
      return [...previous, id];
    });
  };
  const finishRegistration = () => {
    if (registeredUser) {
      onAuthSuccess?.(registeredUser);
    }
  };
  const handleSaveInterests = async () => {
    if (selectedIds.length === 0) {
      setError('Обери хоча б один інтерес або натисни «Пропустити».');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await saveMyInterests(selectedIds);
      showToast('Інтереси успішно збережено!');
      finishRegistration();
    }
    catch (err) {
      setError(err.message || 'Не вдалося зберегти інтереси.');
    }
    finally {
      setLoading(false);
    }
  };
  return (<div className="login-container">
    <div className="login-left-panel">
      <div className="login-brand">
        <span className="logo-icon">
          <FontAwesomeIcon icon={faSeedling} />
        </span>
        <span className="logo-text">Growmate</span>
      </div>

      <div className="login-left-content">
        <div className="login-badge">
          Ваш простір для зростання
        </div>

        <h1 className="login-main-title">
          Зростати легше, <br />
          коли ви не самі.
        </h1>

        <p className="login-subtitle">
          Перетворюйте великі наміри на зрозумілі кроки
          та знаходьте підтримку людей зі схожими цілями.
        </p>
      </div>
    </div>

    <div className="login-right-panel">
      <div className="login-form-wrapper register-wrapper">
        <div className="register-progress">
          <span className={`register-progress-line ${step === 'register' ? 'active' : 'completed'}`} />
          <span className={`register-progress-line ${step === 'interests' ? 'active' : ''}`} />
        </div>

        <div key={step} className="register-step-content">
          {step === 'register' ? (<>
            <div className="form-header">
              <span className="form-top-label">
                КРОК 1 ІЗ 2
              </span>

              <h2 className="form-title">
                Створити обліковий запис
              </h2>

              <p className="form-desc">
                Приєднуйтеся до спільноти людей,
                які обирають розвиток.
              </p>
            </div>

            <form className="login-form" onSubmit={handleRegister}>
              <div className="input-group">
                <label htmlFor="fullName">
                  Ім'я користувача
                </label>
                <input id="fullName" type="text" placeholder="Олена Коваль" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div className="input-group">
                <label htmlFor="registerEmail">
                  Електронна пошта
                </label>
                <input id="registerEmail" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="input-group">
                <label htmlFor="registerPassword">
                  Пароль
                </label>
                <input id="registerPassword" type="password" placeholder="Щонайменше 8 символів" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">
                  Підтвердження пароля
                </label>
                <input id="confirmPassword" type="password" placeholder="Повторіть пароль" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              {error && (<div className="auth-message auth-error">
                {error}
              </div>)}

              <button type="submit" className="submit-button" disabled={loading}>
                {loading
                  ? 'Створення акаунта...'
                  : 'Продовжити'}
              </button>

              <div className="auth-divider">
                <span>або</span>
              </div>

              <div className="google-auth-wrapper">
                <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={setError} />
              </div>
              <div className="form-switch">
                Уже маєте акаунт?{' '}
                <a href="#auth" onClick={(e) => {
                  e.preventDefault();
                  onSwitchToLogin?.();
                }}>
                  Увійти
                </a>
              </div>
            </form>
          </>) : (<>
            <div className="form-header">
              <span className="form-top-label">
                КРОК 2 ІЗ 2
              </span>

              <h2 className="form-title">
                Що тебе цікавить?
              </h2>

              <p className="form-desc">
                Обери захоплення, а ми допоможемо
                знайти клуби зі схожими інтересами.
              </p>
            </div>

            <div className="interests-counter">
              <span>Обрано інтересів</span>
              <strong>
                {selectedIds.length} / {MAX_INTERESTS}
              </strong>
            </div>

            <div className="interests-grid">
              {interests.map((interest) => {
                const selected = selectedIds.includes(interest.id);
                const disabled = !selected &&
                  selectedIds.length >= MAX_INTERESTS;
                return (<button key={interest.id} type="button" disabled={disabled || loading} aria-pressed={selected} className={`interest-chip ${selected ? 'selected' : ''}`} onClick={() => toggleInterest(interest.id)}>
                  <span>{interest.name}</span>

                  {selected && (<FontAwesomeIcon icon={faCheck} />)}
                </button>);
              })}
            </div>

            {interestsLoading && (<p className="interests-help">
              Завантаження інтересів...
            </p>)}

            {!interestsLoading &&
              interests.length === 0 &&
              !error && (<p className="interests-help">
                Поки немає доступних інтересів.
              </p>)}

            <p className="interests-help">
              Можна обрати до п'яти інтересів.
              Пізніше їх можна буде змінити у профілі.
            </p>

            {error && (<div className="auth-message auth-error">
              {error}
            </div>)}

            <button type="button" className="submit-button" disabled={loading || selectedIds.length === 0} onClick={handleSaveInterests}>
              {loading
                ? 'Збереження...'
                : 'Завершити реєстрацію'}
            </button>

            <button type="button" className="interests-skip" disabled={loading} onClick={finishRegistration}>
              Пропустити поки що
            </button>

            <div className="interests-back-note">
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>
                Акаунт уже створено. Інтереси можна
                налаштувати пізніше.
              </span>
            </div>
          </>)}
        </div>
      </div>
    </div>
  </div>);
}