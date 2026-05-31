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
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 20),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: size.height - 80),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  children: [
                    const SizedBox(height: 24),

                    // ── Health shield icon + title ─────────────────
                    Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.health_and_safety_rounded,
                          color: AppTheme.primary, size: 52),
                    )
                        .animate()
                        .fadeIn(duration: 600.ms)
                        .scale(begin: const Offset(0.7, 0.7)),

                    const SizedBox(height: 14),
                    Text('Hemo',
                        style: GoogleFonts.inter(
                            fontSize: 40,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : AppTheme.textDark))
                        .animate()
                        .fadeIn(delay: 200.ms),

                    Text(
                      'Your AI Health Assistant',
                      style: GoogleFonts.inter(
                          fontSize: 15,
                          color: AppTheme.textMuted,
                          fontWeight: FontWeight.w500),
                    ).animate().fadeIn(delay: 300.ms),

                    const SizedBox(height: 48),

                    // ── Avatar + "Hi! I'm Hemo" speech bubble ──────
                    Stack(
                      clipBehavior: Clip.none,
                      alignment: Alignment.center,
                      children: [
                        const DrHemoAvatar(size: 160)
                            .animate()
                            .fadeIn(delay: 400.ms)
                            .slideY(begin: 0.1),
                        Positioned(
                          top: -18,
                          right: -24,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppTheme.primary,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                    color: AppTheme.primary.withOpacity(0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2))
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.face_6_rounded,
                                    color: Colors.white, size: 16),
                                const SizedBox(width: 6),
                                Text("Hi! I'm Hemo",
                                    style: GoogleFonts.inter(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12)),
                              ],
                            ),
                          ).animate().fadeIn(delay: 700.ms).slideX(begin: 0.2),
                        ),
                      ],
                    ),

                    const SizedBox(height: 36),

                    // ── Ready chip ────────────────────────────────
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.surfaceDark : Colors.white,
                        borderRadius: BorderRadius.circular(30),
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black12,
                              blurRadius: 8,
                              offset: const Offset(0, 2))
                        ],
                        border: Border.all(
                            color: AppTheme.primary.withOpacity(0.2)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.chat_bubble_outline_rounded,
                              color: AppTheme.primary, size: 18),
                          const SizedBox(width: 8),
                          Text('Ready to help you stay healthy!',
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: AppTheme.primary)),
                        ],
                      ),
                    ).animate().fadeIn(delay: 800.ms),
                  ],
                ),

                Column(
                  children: [
                    const SizedBox(height: 40),

                    // ── Start button ───────────────────────────────
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const HomeScreen()),
                        ),
                        child: Text('Get Started',
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.bold,
                                fontSize: 16)),
                      ),
                    ).animate().fadeIn(delay: 900.ms).slideY(begin: 0.1),

                    const SizedBox(height: 20),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
