import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import 'chat_screen.dart';

class HealthAdviceScreen extends StatelessWidget {
  final String adviceText;
  const HealthAdviceScreen({super.key, required this.adviceText});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Analysis Result',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),

            // ── Hemo AI Banner ─────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                    color: AppTheme.primary.withOpacity(0.2)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                        color: AppTheme.primary,
                        shape: BoxShape.circle),
                    child: const Icon(Icons.smart_toy_rounded,
                        color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Hemo AI says...',
                            style: GoogleFonts.inter(
                                color: AppTheme.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 16)),
                        const SizedBox(height: 6),
                        Text(
                          '"$adviceText"',
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              color: isDark
                                  ? Colors.white70
                                  : const Color(0xFF374151),
                              height: 1.6),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn().slideY(begin: -0.05),

            const SizedBox(height: 24),

            // ── Risk Level ─────────────────────────────────────────
            Text('Health Risk Level',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 16))
                .animate()
                .fadeIn(delay: 100.ms),
            const SizedBox(height: 12),
            _RiskBar(isDark: isDark)
                .animate()
                .fadeIn(delay: 150.ms),

            const SizedBox(height: 24),

            // ── Key Takeaways ──────────────────────────────────────
            Text('Key Takeaways',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 16))
                .animate()
                .fadeIn(delay: 200.ms),
            const SizedBox(height: 10),
            ...[
              'Continue maintaining your current hydration levels',
              'Keep up your balanced diet',
              'Monitor your iron levels regularly',
            ].asMap().entries.map((e) => _Takeaway(
                  text: e.value,
                  delay: 250 + e.key * 60,
                  isDark: isDark,
                )),

            const SizedBox(height: 24),

            // ── Nearby Support ─────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.surfaceDark : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                    color: isDark
                        ? Colors.white10
                        : Colors.black.withOpacity(0.06)),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.location_on_rounded,
                            color: AppTheme.primary, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Nearby Support',
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15)),
                          Text('3 locations found',
                              style: GoogleFonts.inter(
                                  color: AppTheme.primary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.local_hospital_rounded,
                          size: 18),
                      label: Text('Find nearby clinic',
                          style: GoogleFonts.inter(
                              fontWeight: FontWeight.bold)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primary,
                        side: const BorderSide(
                            color: AppTheme.primary, width: 1.5),
                        shape: const StadiumBorder(),
                        padding: const EdgeInsets.symmetric(
                            vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 400.ms),

            const SizedBox(height: 20),

            // ── Ask another question ───────────────────────────────
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.push(context,
                    MaterialPageRoute(
                        builder: (_) => const ChatScreen())),
                icon: const Icon(Icons.chat_rounded, size: 18),
                label: Text('Ask another question',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold)),
              ),
            ).animate().fadeIn(delay: 450.ms),

            const SizedBox(height: 16),

            // ── Disclaimer ────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: Colors.orange.withOpacity(0.2)),
              ),
              child: Text(
                'Disclaimer: This AI-generated advice is for informational purposes only and does not replace professional medical advice.',
                style: GoogleFonts.inter(
                    fontSize: 11,
                    color: Colors.orange.shade700,
                    height: 1.5),
              ),
            ).animate().fadeIn(delay: 500.ms),
          ],
        ),
      ),
    );
  }
}

class _RiskBar extends StatelessWidget {
  final bool isDark;
  const _RiskBar({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final levels = [
      ('Low Risk', Colors.green),
      ('Healthy', AppTheme.primary),
      ('Moderate', Colors.orange),
      ('At Risk', Colors.red),
    ];
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: isDark
                ? Colors.white10
                : Colors.black.withOpacity(0.06)),
      ),
      child: Row(
        children: levels.asMap().entries.map((e) {
          final isActive = e.key == 1; // "Sain"
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(
                  right: e.key < levels.length - 1 ? 4 : 0),
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: isActive
                    ? e.value.$2.withOpacity(0.2)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: isActive
                    ? Border.all(color: e.value.$2, width: 1.5)
                    : null,
              ),
              child: Text(
                e.value.$1,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: isActive
                        ? FontWeight.bold
                        : FontWeight.w500,
                    color: isActive
                        ? e.value.$2
                        : AppTheme.textMuted),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _Takeaway extends StatelessWidget {
  final String text;
  final int delay;
  final bool isDark;
  const _Takeaway(
      {required this.text,
      required this.delay,
      required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_rounded,
              color: AppTheme.primary, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: GoogleFonts.inter(
                    fontSize: 14, height: 1.5)),
          ),
        ],
      ).animate().fadeIn(delay: Duration(milliseconds: delay)),
    );
  }
}
