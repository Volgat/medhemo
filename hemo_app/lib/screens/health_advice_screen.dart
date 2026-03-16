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
        title: Text('Résultat d\'analyse',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
                        color: AppTheme.primary, shape: BoxShape.circle),
                    child: const Icon(Icons.smart_toy_rounded,
                        color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Hemo AI dit...',
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Niveau de risque',
                    style: GoogleFonts.inter(
                        fontSize: 18, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text('Faible risque',
                      style: GoogleFonts.inter(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: 0.2,
                minHeight: 14,
                backgroundColor: isDark
                    ? Colors.white12
                    : Colors.grey.shade200,
                valueColor:
                    const AlwaysStoppedAnimation<Color>(AppTheme.primary),
              ),
            ).animate().slideX(begin: -0.5, duration: 800.ms),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Sain',
                    style: GoogleFonts.inter(
                        color: AppTheme.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.bold)),
                Text('Modéré',
                    style: GoogleFonts.inter(
                        color: AppTheme.textMuted, fontSize: 11)),
                Text('À risque',
                    style: GoogleFonts.inter(
                        color: AppTheme.textMuted, fontSize: 11)),
              ],
            ),

            const SizedBox(height: 28),

            // ── Key Takeaways ──────────────────────────────────────
            Text('Points essentiels',
                style: GoogleFonts.inter(
                    fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ..._keyTakeaways.asMap().entries.map((e) {
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded,
                        color: AppTheme.primary, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(e.value,
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              color: isDark
                                  ? Colors.white70
                                  : const Color(0xFF374151))),
                    ),
                  ],
                ),
              )
                  .animate()
                  .fadeIn(delay: Duration(milliseconds: 100 * e.key))
                  .slideX(begin: 0.05);
            }),

            const SizedBox(height: 24),

            // ── Map / Nearby support ───────────────────────────────
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: isDark ? Colors.white12 : Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withOpacity(0.05)
                          : Colors.grey.shade50,
                      borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(16)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Soutien proche',
                            style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textMuted,
                                letterSpacing: 0.8)),
                        Text('3 lieux trouvés',
                            style: GoogleFonts.inter(
                                color: AppTheme.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                  Container(
                    height: 100,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: const BorderRadius.vertical(
                          bottom: Radius.circular(16)),
                    ),
                    child: Center(
                      child: Icon(Icons.map_rounded,
                          size: 48,
                          color: Colors.white.withOpacity(0.6)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.location_on_rounded),
                label: Text('Trouver une clinique proche',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),

            const SizedBox(height: 12),

            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ChatScreen()),
                ),
                icon: const Icon(Icons.chat_rounded,
                    color: AppTheme.primary),
                label: Text('Poser une autre question',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primary,
                        fontSize: 15)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(
                      color: AppTheme.primary, width: 1.5),
                  shape: const StadiumBorder(),
                ),
              ),
            ),

            const SizedBox(height: 16),

            Center(
              child: Text(
                'Avertissement : Ce conseil généré par l\'IA est à titre informatif uniquement\net ne remplace pas une consultation médicale professionnelle.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                    fontSize: 10,
                    color: AppTheme.textMuted,
                    height: 1.5),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  static const _keyTakeaways = [
    'Taux de glucose dans la plage optimale',
    'La stabilité de l\'hémoglobine s\'est améliorée de 4%',
    'Les marqueurs d\'hydratation suggèrent une excellente récupération',
  ];
}
