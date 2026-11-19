import React from 'react';
import '../css/StartPage.css';
import startImage from '../assets/startIMG.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSeedling } from '@fortawesome/free-solid-svg-icons';
export default function StartPage({ onStartClick, onLoginClick }) {
  return (<main className="startpage-container">
    <header className="startpage-header">
      <a href="/" className="startpage-logo">
        <span className="logo-icon"><FontAwesomeIcon icon={faSeedling} /></span>
        <span>Growmate</span>
      </a>
      <a href="#auth" className="header-login" onClick={(e) => { e.preventDefault(); onLoginClick(); }}>Увійти</a>
    </header>
    <section className="startpage-content">
      <div className="startpage-left">
        <span className="startpage-label">ПЛАТФОРМА ОСОБИСТОГО РОЗВИТКУ</span>
        <h1 className="startpage-title">Розвивайся.<br />Досягай більшого.</h1>
        <p className="startpage-description">Growmate — простір для постановки цілей, відстеження особистого прогресу та спільного розвитку з людьми, які прагнуть більшого.</p>
        <div className="startpage-actions">
          <a href="#auth" className="startpage-button" onClick={(e) => { e.preventDefault(); onStartClick(); }}>Почати роботу</a>
          <a href="#auth" className="startpage-secondary" onClick={(e) => { e.preventDefault(); onLoginClick(); }}>Уже зареєстровані?</a>
        </div>
        <div className="startpage-note">Розвивайся у власному темпі. Досягай цілей разом.</div>
      </div>
      <div className="startpage-right">
        <img src={startImage} alt="Люди допомагають одне одному досягати цілей" className="startpage-image" />
      </div>
    </section>
    <div className="scroll-indicator" onClick={onStartClick} title="Прокрутити вниз"><div className="arrow-down"></div></div>
    <footer className="startpage-footer"></footer>
  </main>);
}