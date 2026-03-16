"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Shield, Activity, Zap } from "lucide-react";
import DrHemoAvatar from "@/components/DrHemoAvatar";

export default function LandingPage({ onLogin, onSignup, onClose }) {
  return (
    <div className="landing-page" style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--main-bg)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Hero Section */}
      <section style={{
        padding: '80px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, var(--accent-muted) 0%, transparent 100%)'
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '32px' }}
        >
          <DrHemoAvatar size={120} state="idle" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}
        >
          Hemo <span style={{ color: 'var(--accent)' }}>AI</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '40px', lineHeight: 1.6 }}
        >
          Votre assistant médical intelligent spécialisé. Analyse d'images, conseils santé et suivi personnalisé en un seul endroit.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {onClose ? (
            <button
              onClick={onClose}
              style={{
                padding: '16px 32px',
                borderRadius: '30px',
                background: 'var(--accent)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Continuer vers le chat <ArrowRight size={20} />
            </button>
          ) : (
            <>
              <button
                onClick={onSignup}
                style={{
                  padding: '16px 32px',
                  borderRadius: '30px',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Commencer maintenant <ArrowRight size={20} />
              </button>
              <button
                onClick={onLogin}
                style={{
                  padding: '16px 32px',
                  borderRadius: '30px',
                  border: '1px solid var(--border)',
                  background: 'var(--sidebar-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}
              >
                Se connecter
              </button>
            </>
          )}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '80px 24px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px'
        }}>
          <FeatureCard 
            icon={<MessageCircle style={{ color: 'var(--accent)' }} />}
            title="Chat Intelligent"
            desc="Discutez avec Hemo pour des conseils santé immédiats basés sur les dernières données médicales."
          />
          <FeatureCard 
            icon={<Activity style={{ color: '#eb4899' }} />}
            title="Analyse Multimodale"
            desc="Envoyez des photos de vos analyses ou symptômes pour une description visuelle précise."
          />
          <FeatureCard 
            icon={<Shield style={{ color: '#3b82f6' }} />}
            title="Sécurisé & Privé"
            desc="Vos données de santé sont cryptées et traitées avec la plus grande confidentialité."
          />
        </div>
      </section>

      {/* Footer Presentation */}
      <section style={{
        padding: '60px 24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border)',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '32px', opacity: 0.6 }}>
          <Zap size={24} /> Orchestré par EARCP
          <Activity size={24} /> Monitoring en temps réel
          <Shield size={24} /> Conforme RGPD
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          &copy; 2026 Hemo AI. Tous droits réservés.
        </p>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{
      padding: '32px',
      borderRadius: '24px',
      background: 'var(--sidebar-bg)',
      border: '1px solid var(--border)',
      transition: 'transform 0.2s ease',
      cursor: 'default'
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{
        width: '50px',
        height: '50px',
        borderRadius: '12px',
        background: 'var(--accent-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '12px' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
