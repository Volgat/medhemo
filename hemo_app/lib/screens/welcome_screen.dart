import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../widgets/dr_hemo_avatar.dart';
import 'home_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            children: [
              const SizedBox(height: 24),

              // ── Logo + Title ──────────────────────────────────────
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.favorite_rounded,
                    color: AppTheme.primary, size: 52),
              )
                  .animate()
                  .fadeIn(duration: 600.ms)
                  .scale(begin: const Offset(0.7, 0.7)),

              const SizedBox(height: 16),
              Text('Hemo',
                  style: GoogleFonts.inter(
                      fontSize: 42,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : AppTheme.textDark))
                  .animate()
                  .fadeIn(delay: 200.ms),
              Text(
                'Votre assistant santé IA',
                style: GoogleFonts.inter(
                    fontSize: 16,
                    color: AppTheme.textMuted,
                    fontWeight: FontWeight.w500),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 48),

              // ── Hero Avatar ─────────────────────────────────
              Center(
                child: const DrHemoAvatar(size: 160)
              ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),

              const SizedBox(height: 32),
              
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark
                      ? AppTheme.surfaceDark
                      : Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black12,
                        blurRadius: 8,
                        offset: const Offset(0, 2))
                  ],
                  border: Border.all(
                      color: AppTheme.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.waving_hand_rounded,
                        color: AppTheme.primary, size: 20),
                    const SizedBox(width: 8),
                    Text("Salut ! Je suis Dr. Hemo.",
                        style: GoogleFonts.inter(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: isDark
                                ? Colors.white
                                : AppTheme.textDark)),
                  ],
                ),
              ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.1),

              const SizedBox(height: 48),

              // ── Start Button ──────────────────────────────────────
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => const HomeScreen()),
                  ),
                  child: Text('Démarrer',
                      style: GoogleFonts.inter(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                ),
              ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2),

              const SizedBox(height: 20),

              // ── Bottom hint ───────────────────────────────────────
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.chat_bubble_rounded,
                        color: AppTheme.primary, size: 18),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text('Posez-moi vos questions !',
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: isDark ? Colors.white70 : AppTheme.textDark)),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 700.ms),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
