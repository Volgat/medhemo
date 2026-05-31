import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import 'chat_screen.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final appState = context.watch<AppState>();
    final sessions = appState.sessions;

    return Scaffold(
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.all(8),
          child: Container(
            decoration: BoxDecoration(
              color: AppTheme.primary,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.bloodtype_rounded,
                color: Colors.white, size: 22),
          ),
        ),
        title: Text('Hemo',
            style: GoogleFonts.inter(
                fontWeight: FontWeight.bold,
                color: AppTheme.primary)),
        actions: [
          IconButton(
            icon: const Icon(Icons.search_rounded),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Section header ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: Row(
              children: [
                const Icon(Icons.archive_outlined,
                    color: AppTheme.primary, size: 20),
                const SizedBox(width: 8),
                Text('Recent Consultations',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
          ),

          // ── List ──────────────────────────────────────────────────
          Expanded(
            child: sessions.isEmpty
                ? _EmptyHistory(isDark: isDark)
                : ListView.separated(
                    padding:
                        const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    itemCount: sessions.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final session = sessions[i];
                      return _SessionTile(
                        session: session,
                        isDark: isDark,
                        formatDate: _formatDate,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ChatScreen(
                                  restoredSession: session),
                            ),
                          );
                        },
                        onDelete: () =>
                            appState.deleteSession(session.id),
                      ).animate().fadeIn(
                          delay: Duration(milliseconds: 60 * i));
                    },
                  ),
          ),
        ],
      ),

      // ── Bottom Nav ─────────────────────────────────────────────────
      bottomNavigationBar: _HistoryBottomNav(isDark: isDark),
    );
  }
}

class _SessionTile extends StatelessWidget {
  final ConversationSession session;
  final bool isDark;
  final String Function(DateTime) formatDate;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  const _SessionTile({
    required this.session,
    required this.isDark,
    required this.formatDate,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppTheme.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: isDark
                ? Colors.white10
                : Colors.black.withOpacity(0.06)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 6,
              offset: const Offset(0, 2))
        ],
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: AppTheme.primary.withOpacity(0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.chat_bubble_outline_rounded,
              color: AppTheme.primary, size: 20),
        ),
        title: Text(session.title,
            style: GoogleFonts.inter(fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
        subtitle: Row(
          children: [
            const Icon(Icons.translate_rounded,
                size: 12, color: AppTheme.textMuted),
            const SizedBox(width: 4),
            Text(session.language.label,
                style: GoogleFonts.inter(
                    fontSize: 11,
                    color: AppTheme.textMuted)),
            const SizedBox(width: 8),
            Text(formatDate(session.date),
                style: GoogleFonts.inter(
                    fontSize: 11,
                    color: AppTheme.textMuted)),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.chevron_right_rounded,
                color: AppTheme.textMuted),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: onDelete,
              child: const Icon(Icons.delete_outline_rounded,
                  color: Colors.redAccent, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyHistory extends StatelessWidget {
  final bool isDark;
  const _EmptyHistory({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.forum_outlined,
              size: 64,
              color: AppTheme.primary.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text('No consultations yet',
              style: GoogleFonts.inter(
                  color: AppTheme.textMuted,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Text('Start a conversation with Hemo',
              style: GoogleFonts.inter(
                  color: AppTheme.textMuted, fontSize: 13)),
        ],
      ),
    );
  }
}

class _HistoryBottomNav extends StatelessWidget {
  final bool isDark;
  const _HistoryBottomNav({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(0, 4, 0, 16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.backgroundDark : AppTheme.backgroundLight,
        border: Border(
            top: BorderSide(
                color: isDark ? Colors.white10 : Colors.black12,
                width: 0.5)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _BotNavItem(
              icon: Icons.chat_bubble_outline_rounded,
              label: 'Chats',
              active: false,
              onTap: () => Navigator.pop(context)),
          _BotNavItem(
              icon: Icons.favorite_outline_rounded,
              label: 'Health',
              active: false,
              onTap: () {}),
          _BotNavItem(
              icon: Icons.explore_outlined,
              label: 'Explore',
              active: false,
              onTap: () {}),
          _BotNavItem(
              icon: Icons.settings_outlined,
              label: 'Settings',
              active: true,
              onTap: () {}),
        ],
      ),
    );
  }
}

class _BotNavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _BotNavItem(
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
                    color: active ? AppTheme.primary : AppTheme.textMuted)),
          ],
        ),
      ),
    );
  }
}
