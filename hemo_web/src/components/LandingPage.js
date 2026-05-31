"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, MessageCircle, X } from "lucide-react";

export default function LandingPage({ onLogin, onSignup, onClose }) {
  return (
    <div className="landing-page" style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      background: 'radial-gradient(circle at top, #fafdfb 0%, #ffffff 100%)',
      color: '#1a1a1a',
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
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
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
          <span style={{ fontSize: '1.3rem', fontWeight: 750, letterSpacing: '-0.03em', color: '#10a37f' }}>MedHemo</span>
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
            S'inscrire
          </button>
          <button 
            onClick={onLogin}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              background: 'transparent',
              color: '#1a1a1a',
              border: '1px solid #d1d1d1',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#f5f5f5';
              e.currentTarget.style.borderColor = '#999';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#d1d1d1';
            }}
          >
            Se connecter
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh'
      }}>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '3.2rem',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '20px',
            color: '#111',
            letterSpacing: '-0.02em'
          }}
        >
          Explorez le futur de la santé<br />
          personnalisée avec MedHemo
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: '1.2rem',
            color: '#555',
            marginBottom: '40px',
            maxWidth: '750px',
            lineHeight: 1.6
          }}
        >
          Accédez à nos modèles d'analyse de santé pour des conseils clairs, précis et adaptés à votre profil.
        </motion.p>

        {/* Hero Image */}
        <motion.div
           initial={{ opacity: 0, scale: 0.97 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           style={{
             width: '100%',
             maxWidth: '850px',
             borderRadius: '20px',
             overflow: 'hidden',
             marginBottom: '50px',
             boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
             border: '1px solid rgba(0,0,0,0.05)'
           }}
        >
          <img 
            src="/hero.png" 
            alt="MedHemo Lab Illustration" 
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </motion.div>

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
              background: 'linear-gradient(135deg, #10a37f 0%, #4BBE4F 100%)',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(16, 163, 127, 0.25)',
              transition: 'transform 0.2s, boxShadow 0.2s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(16, 163, 127, 0.35)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 163, 127, 0.25)';
            }}
          >
            Commencer avec MedHemo
            <ChevronRight size={18} />
          </button>
          
          <div style={{ color: '#888', fontSize: '0.9rem' }}>
            Inscrivez-vous pour débloquer vos analyses de santé personnalisées
          </div>
          <div style={{ color: '#1a1a1a', fontSize: '0.95rem' }}>
            Déjà inscrit ? <span onClick={onLogin} style={{ fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', color: '#10a37f' }}>Se connecter ici</span>
          </div>
        </motion.div>
      </section>

      {/* Floating Chat Bubble Widget */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring' }}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '12px'
        }}
      >
        {/* Floating Tooltip */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '16px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
          border: '1px solid #eaeaea',
          width: '320px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 750, fontSize: '0.9rem', color: '#10a37f' }}>
               <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #4BBE4F 0%, #10a37f 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <span style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>H</span>
               </div>
               Assistant MedHemo
            </div>
            <X size={16} color="#aaa" style={{ cursor: 'pointer' }} onClick={onClose} />
          </div>
          <div style={{ 
            background: '#f6f9f7', 
            padding: '12px', 
            borderRadius: '10px', 
            color: '#444', 
            fontSize: '0.88rem',
            marginBottom: '10px',
            border: '1px solid rgba(16, 163, 127, 0.05)'
          }}>
            Comment puis-je vous aider aujourd'hui ?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#999', fontSize: '0.8rem' }}>
            <MessageCircle size={14} color="#10a37f" />
             Discuter avec Hemo...
          </div>
        </div>

        {/* Main Circle Icon Trigger */}
        <div 
          onClick={onClose}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '32px',
            background: 'linear-gradient(135deg, #4BBE4F 0%, #10a37f 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(16, 163, 127, 0.3)',
            color: 'white',
            transition: 'transform 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageCircle size={28} />
        </div>
      </motion.div>
    </div>
  );
}
