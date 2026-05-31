import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final appState = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Settings',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Language Section ──────────────────────────────────────
          _SectionHeader(title: 'Language', isDark: isDark),
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: isDark ? Colors.white10 : Colors.black.withOpacity(0.06)),
            ),
            child: Column(
              children: Language.supported.asMap().entries.map((e) {
                final i = e.key;
                final lang = e.value;
                final isSelected =
                    appState.selectedLanguage.code == lang.code;
                final isLast = i == Language.supported.length - 1;
                return Column(
                  children: [
                    ListTile(
                      onTap: () => appState.setLanguage(lang),
                      leading: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primary.withOpacity(0.15)
                              : (isDark
                                  ? Colors.white10
                                  : Colors.black.withOpacity(0.05)),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.language_rounded,
                            color: isSelected
                                ? AppTheme.primary
                                : AppTheme.textMuted,
                            size: 20),
                      ),
                      title: Text(lang.label,
                          style: GoogleFonts.inter(
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.w500,
                              color: isSelected ? AppTheme.primary : null)),
                      trailing: isSelected
                          ? const Icon(Icons.check_circle_rounded,
                              color: AppTheme.primary, size: 22)
                          : null,
                    ),
                    if (!isLast)
                      Divider(
                          height: 1,
                          indent: 16,
                          endIndent: 16,
                          color: isDark
                              ? Colors.white10
                              : Colors.black.withOpacity(0.06)),
                  ],
                );
              }).toList(),
            ),
          ).animate().fadeIn(delay: 50.ms),

          const SizedBox(height: 20),

          // ── Voice Section ─────────────────────────────────────────
          _SectionHeader(title: 'Voice', isDark: isDark),
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: isDark
                      ? Colors.white10
                      : Colors.black.withOpacity(0.06)),
            ),
            child: SwitchListTile(
              value: appState.voiceEnabled,
              onChanged: (v) => appState.setVoiceEnabled(v),
              activeColor: AppTheme.primary,
              secondary: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: appState.voiceEnabled
                      ? AppTheme.primary.withOpacity(0.15)
                      : (isDark
                          ? Colors.white10
                          : Colors.black.withOpacity(0.05)),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.graphic_eq_rounded,
                    color: appState.voiceEnabled
                        ? AppTheme.primary
                        : AppTheme.textMuted,
                    size: 20),
              ),
              title: Text('Read answers aloud',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
              subtitle: Text('Automated voice narration for health tips',
                  style:
                      GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 12)),
            ),
          ).animate().fadeIn(delay: 100.ms),

          const SizedBox(height: 20),

          // ── Accessibility Section ─────────────────────────────────
          _SectionHeader(title: 'Accessibility', isDark: isDark),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: isDark
                      ? Colors.white10
                      : Colors.black.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.text_fields_rounded,
                          color: AppTheme.primary, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Text('Text size',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
                    const Spacer(),
                    Text(
                      appState.textScaleFactor < 1.0
                          ? 'Small'
                          : appState.textScaleFactor > 1.0
                              ? 'Large'
                              : 'Medium',
                      style: GoogleFonts.inter(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _TextSizeButton(
                      label: 'A',
                      scale: 0.85,
                      fontSize: 13,
                      current: appState.textScaleFactor,
                      onTap: () => appState.setTextScaleFactor(0.85),
                    ),
                    _TextSizeButton(
                      label: 'A',
                      scale: 1.0,
                      fontSize: 17,
                      current: appState.textScaleFactor,
                      onTap: () => appState.setTextScaleFactor(1.0),
                    ),
                    _TextSizeButton(
                      label: 'A',
                      scale: 1.2,
                      fontSize: 22,
                      current: appState.textScaleFactor,
                      onTap: () => appState.setTextScaleFactor(1.2),
                    ),
                  ],
                ),
              ],
            ),
          ).animate().fadeIn(delay: 150.ms),

          const SizedBox(height: 20),

          // ── Privacy Section ───────────────────────────────────────
          _SectionHeader(title: 'Privacy', isDark: isDark),
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: isDark
                      ? Colors.white10
                      : Colors.black.withOpacity(0.06)),
            ),
            child: ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.security_rounded,
                    color: AppTheme.primary, size: 20),
              ),
              title: Text('How we protect your data',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
              trailing: const Icon(Icons.chevron_right_rounded,
                  color: AppTheme.textMuted),
              onTap: () {},
            ),
          ).animate().fadeIn(delay: 200.ms),

          const SizedBox(height: 32),

          // ── App version ───────────────────────────────────────────
          Center(
            child: Column(
              children: [
                Text('Hemo App',
                    style: GoogleFonts.inter(
                        color: AppTheme.textMuted,
                        fontWeight: FontWeight.bold,
                        fontSize: 13)),
                const SizedBox(height: 4),
                Text('Version 2.4.0 (2025)',
                    style: GoogleFonts.inter(
                        color: AppTheme.textMuted, fontSize: 12)),
              ],
            ),
          ).animate().fadeIn(delay: 250.ms),

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final bool isDark;
  const _SectionHeader({required this.title, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(title,
          style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: AppTheme.textMuted,
              letterSpacing: 0.8)),
    );
  }
}

class _TextSizeButton extends StatelessWidget {
  final String label;
  final double scale;
  final double fontSize;
  final double current;
  final VoidCallback onTap;
  const _TextSizeButton({
    required this.label,
    required this.scale,
    required this.fontSize,
    required this.current,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = (current - scale).abs() < 0.01;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: 200.ms,
        width: 80,
        height: 56,
        decoration: BoxDecoration(
          color: isActive
              ? AppTheme.primary
              : Theme.of(context).brightness == Brightness.dark
                  ? Colors.white10
                  : Colors.black.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: isActive
              ? null
              : Border.all(color: Colors.transparent),
        ),
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: fontSize,
              fontWeight: FontWeight.bold,
              color: isActive ? Colors.white : AppTheme.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}
