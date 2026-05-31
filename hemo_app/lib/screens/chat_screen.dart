import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/dr_hemo_avatar.dart';
import 'voice_screen.dart';

class ChatScreen extends StatefulWidget {
  final String? initialMessage;
  final ConversationSession? restoredSession;
  const ChatScreen({super.key, this.initialMessage, this.restoredSession});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _ctrl = TextEditingController();
  final ScrollController _scroll = ScrollController();
  Language? _translateTo;

  @override
  void initState() {
    super.initState();
    if (widget.initialMessage != null &&
        widget.initialMessage!.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context
            .read<AppState>()
            .sendMessage(widget.initialMessage!)
            .then((_) => _scrollToBottom());
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: 300.ms, curve: Curves.easeOut);
      }
    });
  }

  void _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    _ctrl.clear();
    await context.read<AppState>().sendMessage(text);
    _scrollToBottom();
  }

  List<ChatMessage> get _displayMessages {
    if (widget.restoredSession != null) {
      return widget.restoredSession!.messages;
    }
    return context.read<AppState>().messages;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final appState = context.watch<AppState>();
    final messages = widget.restoredSession != null
        ? widget.restoredSession!.messages
        : appState.messages;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          children: [
            Text('Hemo AI',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 17)),
            Text('ONLINE',
                style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primary,
                    letterSpacing: 1.2)),
          ],
        ),
        actions: [
          IconButton(
              icon: const Icon(Icons.more_vert_rounded),
              onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          // ── Translate bar ─────────────────────────────────────────
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: isDark
                  ? AppTheme.surfaceDark
                  : AppTheme.backgroundLight,
              border: Border(
                  bottom: BorderSide(
                      color: isDark
                          ? Colors.white10
                          : Colors.black.withOpacity(0.07),
                      width: 0.5)),
            ),
            child: Row(
              children: [
                const Icon(Icons.translate_rounded,
                    color: AppTheme.textMuted, size: 16),
                const SizedBox(width: 6),
                Text('Translate to:',
                    style: GoogleFonts.inter(
                        color: AppTheme.textMuted,
                        fontSize: 12)),
                const SizedBox(width: 8),
                ...Language.supported.map((lang) {
                  final isSelected =
                      _translateTo?.code == lang.code;
                  return GestureDetector(
                    onTap: () => setState(() => _translateTo =
                        isSelected ? null : lang),
                    child: AnimatedContainer(
                      duration: 200.ms,
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.primary
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: isSelected
                                ? AppTheme.primary
                                : AppTheme.textMuted
                                    .withOpacity(0.4)),
                      ),
                      child: Text(lang.label,
                          style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Colors.white
                                  : AppTheme.textMuted)),
                    ),
                  );
                }),
              ],
            ),
          ),

          // ── Messages ──────────────────────────────────────────────
          Expanded(
            child: messages.isEmpty
                ? _EmptyChat(isDark: isDark)
                : ListView.builder(
                    controller: _scroll,
                    padding:
                        const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    itemCount: messages.length +
                        (appState.isLoading ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (i == messages.length &&
                          appState.isLoading) {
                        return const _TypingIndicator();
                      }
                      final msg = messages[i];
                      return msg.role == 'user'
                          ? _UserBubble(
                              message: msg, isDark: isDark)
                          : _HemoBubble(
                              message: msg, isDark: isDark);
                    },
                  ),
          ),

          // ── Input bar ─────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 20),
            decoration: BoxDecoration(
              color: isDark
                  ? AppTheme.backgroundDark
                  : AppTheme.backgroundLight,
              border: Border(
                  top: BorderSide(
                      color: isDark
                          ? Colors.white10
                          : Colors.black12,
                      width: 0.5)),
            ),
            child: Row(
              children: [
                // Attachment
                _BarIcon(
                    icon: Icons.add_circle_outline_rounded,
                    onTap: () {}),
                const SizedBox(width: 6),
                // Text field
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    onSubmitted: (_) => _send(),
                    style: GoogleFonts.inter(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      hintStyle: GoogleFonts.inter(
                          color: AppTheme.textMuted,
                          fontSize: 14),
                      contentPadding:
                          const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(30),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: isDark
                          ? AppTheme.surfaceDark
                          : Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                // Mic
                _BarIcon(
                    icon: Icons.mic_rounded,
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) =>
                                const VoiceScreen()))),
                const SizedBox(width: 6),
                // Send
                GestureDetector(
                  onTap: _send,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                        color: AppTheme.primary,
                        shape: BoxShape.circle),
                    child: const Icon(Icons.send_rounded,
                        color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Widgets ────────────────────────────────────────────────────────────────

class _UserBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isDark;
  const _UserBubble({required this.message, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(4),
                ),
              ),
              child: Text(message.content,
                  style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 14,
                      height: 1.5)),
            ),
          ),
        ],
      ),
    );
  }
}

class _HemoBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isDark;
  const _HemoBubble({required this.message, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DrHemoAvatar(size: 36, isSpeaking: false),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Hemo AI',
                    style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primary)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppTheme.surfaceDark
                        : Colors.white,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4),
                      topRight: Radius.circular(20),
                      bottomLeft: Radius.circular(20),
                      bottomRight: Radius.circular(20),
                    ),
                    border: Border.all(
                        color: isDark
                            ? Colors.white10
                            : Colors.black
                                .withOpacity(0.06)),
                  ),
                  child: Text(message.content,
                      style: GoogleFonts.inter(
                          fontSize: 14,
                          height: 1.6,
                          color: isDark
                              ? Colors.white
                              : AppTheme.textDark)),
                ),

                // ── Audio playback card ─────────────────────────
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color:
                            AppTheme.primary.withOpacity(0.2)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.graphic_eq_rounded,
                          color: AppTheme.primary, size: 16),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                            'Detailed Explanation — Listen',
                            style: GoogleFonts.inter(
                                color: AppTheme.primary,
                                fontWeight: FontWeight.w500,
                                fontSize: 12)),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                            color: AppTheme.primary,
                            shape: BoxShape.circle),
                        child: const Icon(Icons.play_arrow_rounded,
                            color: Colors.white, size: 14),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          const DrHemoAvatar(size: 36, isSpeaking: true),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark
                  ? AppTheme.surfaceDark
                  : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                  color: Colors.black.withOpacity(0.06)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(
                3,
                (i) => Container(
                  margin: const EdgeInsets.symmetric(
                      horizontal: 3),
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    shape: BoxShape.circle,
                  ),
                )
                    .animate(
                        onPlay: (c) => c.repeat(reverse: true))
                    .fade(
                        begin: 0.2,
                        end: 1,
                        delay:
                            Duration(milliseconds: 150 * i),
                        duration: 400.ms),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyChat extends StatelessWidget {
  final bool isDark;
  const _EmptyChat({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const DrHemoAvatar(size: 80, isSpeaking: false),
          const SizedBox(height: 16),
          Text('How can I help you?',
              style: GoogleFonts.inter(
                  fontWeight: FontWeight.bold,
                  fontSize: 16)),
          const SizedBox(height: 8),
          Text('Ask Hemo your question',
              style: GoogleFonts.inter(
                  color: AppTheme.textMuted, fontSize: 13)),
        ],
      ),
    );
  }
}

class _BarIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _BarIcon({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark
              ? AppTheme.surfaceDark
              : Colors.white,
          shape: BoxShape.circle,
          border: Border.all(
              color: Colors.black.withOpacity(0.07)),
        ),
        child: Icon(icon, color: AppTheme.textMuted, size: 20),
      ),
    );
  }
}
