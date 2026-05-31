"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import DrHemoAvatar from "./DrHemoAvatar";

const TRANSLATIONS = {
  fr: {
    title: "Votre compagnon santé au quotidien",
    description: "MedHemo vous aide à comprendre vos symptômes et répond à vos questions de bien-être. Il s'agit d'un simple outil de soutien pour vous accompagner au quotidien : il ne remplace en aucun cas un médecin ou un avis médical professionnel.",
    btnGetStarted: "Commencer avec Hemo",
    textUnlock: "Inscrivez-vous pour échanger avec votre assistant personnalisé",
    textHaveAccount: "Déjà inscrit ?",
    loginHere: "Se connecter ici",
    signup: "S'inscrire",
    login: "Se connecter",
  },
  en: {
    title: "Your daily health companion",
    description: "MedHemo helps you understand your symptoms and answers your well-being questions. It is a simple support tool to accompany you daily: it does not replace a doctor or professional medical advice.",
    btnGetStarted: "Get started with Hemo",
    textUnlock: "Sign up to chat with your personalized assistant",
    textHaveAccount: "Already registered?",
    loginHere: "Login here",
    signup: "Sign up",
    login: "Log in",
  }
};

export default function LandingPage({ config = {}, onLogin, onSignup, onClose }) {
  const lang = config.language || "en";
  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS["en"][key];

  return (
    <div className="landing-page" style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      background: 'radial-gradient(circle at top, #0a1f18 0%, #070b09 100%)',
      color: '#ffffff',
      fontFamily: '"Inter", sans-serif',
      position: 'relative'
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 80px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(7, 11, 9, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: 32, height: 32, 
            background: 'linear-gradient(135deg, #4BBE4F 0%, #10a37f 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
             <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>H</span>
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#4BBE4F' }}>MedHemo</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onSignup}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              background: '#10a37f',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#0e906f'}
            onMouseOut={e => e.currentTarget.style.background = '#10a37f'}
          >
            {t("signup")}
          </button>
          <button 
            onClick={onLogin}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              background: 'transparent',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            {t("login")}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 40px 100px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh'
      }}>
        {/* Animated Central Mascot Container */}
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.6, ease: "easeOut" }}
           style={{
             marginBottom: '30px',
             position: 'relative',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
           }}
        >
          {/* Ambient Glow behind mascot */}
          <div style={{
            position: 'absolute',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(75, 190, 79, 0.25) 0%, rgba(16, 163, 127, 0) 70%)',
            zIndex: 0,
            filter: 'blur(10px)'
          }} />

          {/* Animated floating ring */}
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              zIndex: 1,
              padding: '24px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <DrHemoAvatar size={150} state="idle" isSpeaking={true} />
          </motion.div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: '3rem',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '20px',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            maxWidth: '800px'
          }}
        >
          {t("title")}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: '1.05rem',
            color: '#b0bbc0',
            marginBottom: '40px',
            maxWidth: '680px',
            lineHeight: 1.7
          }}
        >
          {t("description")}
        </motion.p>

        {/* CTA Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
        >
          <button
            onClick={onSignup}
            style={{
              padding: '16px 36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4BBE4F 0%, #10a37f 100%)',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(75, 190, 79, 0.25)',
              transition: 'transform 0.2s, boxShadow 0.2s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(75, 190, 79, 0.35)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(75, 190, 79, 0.25)';
            }}
          >
            {t("btnGetStarted")}
            <ChevronRight size={18} />
          </button>
          
          <div style={{ color: '#808f89', fontSize: '0.88rem', maxWidth: '400px', lineHeight: 1.4 }}>
            {t("textUnlock")}
          </div>
          <div style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '6px' }}>
            {t("textHaveAccount")} <span onClick={onLogin} style={{ fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', color: '#4BBE4F' }}>{t("loginHere")}</span>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
