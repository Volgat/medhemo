import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/dr_hemo_avatar.dart';
import 'chat_screen.dart';
import 'voice_screen.dart';
import 'image_analysis_screen.dart';
import 'file_upload_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  final TextEditingController _textController = TextEditingController();

  static const List<_QuickAction> _quickActions = [
    _QuickAction(
      icon: Icons.chat_bubble_rounded,
      title: 'Poser une question',
      subtitle: 'Réponses IA instantanées',
      screen: 'chat',
    ),
    _QuickAction(
      icon: Icons.photo_camera_rounded,
      title: 'Analyser une photo',
      subtitle: 'Analyse visuelle & suivi',
      screen: 'image',
    ),
    _QuickAction(
      icon: Icons.upload_file_rounded,
      title: 'Uploader un fichier médical',
      subtitle: 'PDF, résultats de labo, ordonnances',
      screen: 'file',
    ),
  ];

  void _navigate(String screen) {
    switch (screen) {
      case 'chat':
        Navigator.push(context,
            MaterialPageRoute(builder: (_) => const ChatScreen()));
        break;
      case 'image':
        Navigator.push(context,
            MaterialPageRoute(builder: (_) => const ImageAnalysisScreen()));
        break;
      case 'file':
        Navigator.push(context,
            MaterialPageRoute(builder: (_) => const FileUploadScreen()));
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final appState = context.watch<AppState>();

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ─────────────────────────────────────────────
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  // Mascot avatar
                  const DrHemoAvatar(size: 44, isSpeaking: false),
                  const SizedBox(width: 10),
                  Text('Hemo',
                      style: GoogleFonts.inter(
                          fontSize: 22, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  // Backend status indicator
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: appState.backendOnline
                          ? AppTheme.primary
                          : Colors.red,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.account_circle_outlined, size: 28),
                  ),
                ],
              ),
            ),

            // ── Main Scrollable ────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
                children: [
                  const SizedBox(height: 16),

                  // ── Hero Mic Button ─────────────────────────────
                  Text(
                    'Comment puis-je\nvous aider ?',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                        fontSize: 28, fontWeight: FontWeight.bold),
                  ).animate().fadeIn(),

                  const SizedBox(height: 28),

                  Center(
                    child: GestureDetector(
                      onTap: () => Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const VoiceScreen())),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Pulsing ring
                          Container(
                            width: 148,
                            height: 148,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.primary.withOpacity(0.15),
                            ),
                          )
                              .animate(onPlay: (c) => c.repeat())
                              .scaleXY(
                                  begin: 1,
                                  end: 1.15,
                                  duration: 1200.ms,
                                  curve: Curves.easeInOut)
                              .then()
                              .scaleXY(begin: 1.15, end: 1, duration: 1200.ms),

                          // Main mic button
                          Container(
                            width: 128,
                            height: 128,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.primary,
                              boxShadow: [
                                BoxShadow(
                                    color: AppTheme.primary.withOpacity(0.45),
                                    blurRadius: 28,
                                    spreadRadius: 4),
                              ],
                            ),
                            child: const Icon(Icons.mic_rounded,
                                color: Colors.white, size: 56),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),
                  Text(
                    'Appuyez pour parler à Hemo',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.textMuted),
                  ),

                  const SizedBox(height: 36),

                  // ── Quick Actions ───────────────────────────────
                  Text('Actions rapides',
                      style: GoogleFonts.inter(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),

                  ..._quickActions.asMap().entries.map((e) {
                    final i = e.key;
                    final a = e.value;
                    return GestureDetector(
                      onTap: () => _navigate(a.screen),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.surfaceDark : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: isDark
                                  ? Colors.white12
                                  : Colors.black.withOpacity(0.06)),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withOpacity(0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 2))
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(a.icon,
                                  color: AppTheme.primary, size: 28),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(a.title,
                                      style: GoogleFonts.inter(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 15)),
                                  Text(a.subtitle,
                                      style: GoogleFonts.inter(
                                          fontSize: 12,
                                          color: AppTheme.textMuted)),
                                ],
                              ),
                            ),
                            Icon(Icons.chevron_right_rounded,
                                color: AppTheme.textMuted),
                          ],
                        ),
                      )
                          .animate()
                          .fadeIn(delay: Duration(milliseconds: 100 * i))
                          .slideX(begin: 0.05),
                    );
                  }),

                  const SizedBox(height: 28),

                  // ── Recent Conversations ────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Conversations récentes',
                          style: GoogleFonts.inter(
                              fontSize: 18, fontWeight: FontWeight.bold)),
                      TextButton(
                          onPressed: () {},
                          child: Text('Tout voir',
                              style: GoogleFonts.inter(
                                  color: AppTheme.primary,
                                  fontWeight: FontWeight.bold))),
                    ],
                  ),

                  if (appState.messages.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppTheme.surfaceDark.withOpacity(0.5)
                            : Colors.white.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.black.withOpacity(0.05)),
                      ),
                      child: Center(
                        child: Text('Aucune conversation pour le moment',
                            style: GoogleFonts.inter(
                                color: AppTheme.textMuted, fontSize: 13)),
                      ),
                    )
                  else
                    ...appState.messages.where((m) => m.role == 'user').take(3).map(
                          (m) => Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppTheme.surfaceDark.withOpacity(0.5)
                                  : Colors.white.withOpacity(0.6),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                  color: Colors.black.withOpacity(0.05)),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(m.content,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.inter(
                                          fontWeight: FontWeight.w500)),
                                ),
                                const Icon(Icons.chevron_right_rounded,
                                    color: AppTheme.primary, size: 20),
                              ],
                            ),
                          ),
                        ),
                ],
              ),
            ),
          ],
        ),
      ),

      // ── Bottom Bar (Input + Nav) ───────────────────────────────────
      bottomSheet: Container(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        decoration: BoxDecoration(
          color: (isDark ? AppTheme.backgroundDark : AppTheme.backgroundLight)
              .withOpacity(0.95),
          border: Border(
              top: BorderSide(
                  color: isDark ? Colors.white10 : Colors.black12,
                  width: 0.5)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Text input
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    onSubmitted: (v) {
                      if (v.trim().isNotEmpty) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => ChatScreen(initialMessage: v)),
                        );
                        _textController.clear();
                      }
                    },
                    style:
                        GoogleFonts.inter(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Tapez un message...',
                      hintStyle: GoogleFonts.inter(
                          color: AppTheme.textMuted, fontSize: 14),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(30),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor:
                          isDark ? AppTheme.surfaceDark : Colors.white,
                      suffixIcon: IconButton(
                        onPressed: () {
                          if (_textController.text.trim().isNotEmpty) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ChatScreen(
                                    initialMessage: _textController.text),
                              ),
                            );
                            _textController.clear();
                          }
                        },
                        icon: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                              color: AppTheme.primary, shape: BoxShape.circle),
                          child: const Icon(Icons.send_rounded,
                              color: Colors.white, size: 18),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Nav bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _NavItem(
                    icon: _selectedIndex == 0
                        ? Icons.home_rounded
                        : Icons.home_outlined,
                    label: 'Accueil',
                    active: _selectedIndex == 0,
                    onTap: () => setState(() => _selectedIndex = 0)),
                _NavItem(
                    icon: Icons.history_rounded,
                    label: 'Historique',
                    active: _selectedIndex == 1,
                    onTap: () => setState(() => _selectedIndex = 1)),
                _NavItem(
                    icon: Icons.folder_shared_rounded,
                    label: 'Fichiers',
                    active: _selectedIndex == 2,
                    onTap: () {
                      setState(() => _selectedIndex = 2);
                      Navigator.push(context,
                          MaterialPageRoute(
                              builder: (_) => const FileUploadScreen()));
                    }),
                _NavItem(
                    icon: Icons.settings_outlined,
                    label: 'Paramètres',
                    active: _selectedIndex == 3,
                    onTap: () => setState(() => _selectedIndex = 3)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String title;
  final String subtitle;
  final String screen;
  const _QuickAction(
      {required this.icon,
      required this.title,
      required this.subtitle,
      required this.screen});
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _NavItem(
      {required this.icon,
      required this.label,
      required this.active,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Column(
          children: [
            Icon(icon,
                color: active ? AppTheme.primary : AppTheme.textMuted,
                size: 24),
            const SizedBox(height: 2),
            Text(label,
                style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight:
                        active ? FontWeight.bold : FontWeight.w500,
                    color: active ? AppTheme.primary : AppTheme.textMuted,
                    letterSpacing: 0.5)),
          ],
        ),
      ),
    );
  }
}
