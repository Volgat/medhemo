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
      background: 'white',
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
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: 32, height: 32, 
            background: 'linear-gradient(135deg, #8b0000 0%, #1a1a1a 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
             <span style={{ color: 'white', fontWeight: 'bold' }}>H</span>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#1a1a1a' }}>MedHemo</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={onSignup}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: '#a52a2a',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Signup
          </button>
          <button 
            onClick={onLogin}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: 'white',
              color: '#1a1a1a',
              border: '1px solid #d1d1d1',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 40px',
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
            fontSize: '3.5rem',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '16px',
            color: '#111'
          }}
        >
          Explore the Future of Personalized<br />
          Health with MedHemo
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: '1.25rem',
            color: '#666',
            marginBottom: '40px',
            maxWidth: '800px'
          }}
        >
          Access powerful general health models for comprehensive personal insights
        </motion.p>

        {/* Hero Image */}
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           style={{
             width: '100%',
             maxWidth: '900px',
             borderRadius: '24px',
             overflow: 'hidden',
             marginBottom: '60px',
             boxShadow: '0 30px 60px rgba(0,0,0,0.1)'
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
              padding: '16px 40px',
              borderRadius: '12px',
              background: '#a52a2a',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 10px 20px rgba(165, 42, 42, 0.2)'
            }}
          >
            Get started with MedHemo
          </button>
          
          <div style={{ color: '#888', fontSize: '0.95rem' }}>
            Sign Up to Unlock General Health Insights
          </div>
          <div style={{ color: '#1a1a1a', fontSize: '1rem' }}>
            Have an Account? <span onClick={onLogin} style={{ fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Login Here</span>
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
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          border: '1px solid #eee',
          width: '320px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
               <div style={{ width: 24, height: 24, background: '#a52a2a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <span style={{ color: 'white', fontSize: 12 }}>H</span>
               </div>
               MedHemo Assistant
            </div>
            <X size={16} color="#aaa" style={{ cursor: 'pointer' }} onClick={() => {}} />
          </div>
          <div style={{ 
            background: '#f4f4f4', 
            padding: '12px', 
            borderRadius: '10px', 
            color: '#666', 
            fontSize: '0.9rem',
            marginBottom: '10px'
          }}>
            How can I help you?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#999', fontSize: '0.8rem' }}>
            <MessageCircle size={14} />
             Type your message...
          </div>
        </div>

        {/* Main Circle Icon Trigger */}
        <div 
          onClick={onClose}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '32px',
            background: '#a52a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(165, 42, 42, 0.3)',
            color: 'white'
          }}
        >
          <MessageCircle size={32} />
        </div>
      </motion.div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      `}</style>
    </div>
  );
}
