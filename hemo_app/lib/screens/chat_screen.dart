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
  const ChatScreen({super.key, this.initialMessage});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _ctrl = TextEditingController();
  final ScrollController _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    if (widget.initialMessage != null && widget.initialMessage!.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.read<AppState>().sendMessage(widget.initialMessage!).then((_) {
          _scrollToBottom();
        });
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
        title: Column(
          children: [
            Text('Hemo AI',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 17)),
            Text('EN LIGNE',
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
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: appState.messages.length + (appState.isLoading ? 1 : 0),
              itemBuilder: (ctx, i) {
                if (i == appState.messages.length) {
                  return _TypingIndicator();
                }
                final msg = appState.messages[i];
                return _MessageBubble(msg: msg, isDark: isDark)
                    .animate()
                    .fadeIn(duration: 300.ms)
                    .slideY(begin: 0.08);
              },
            ),
          ),

          // ── Input bar ────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 20),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.backgroundDark : Colors.white,
              border: Border(
                  top: BorderSide(
                      color: isDark ? Colors.white10 : Colors.black12)),
            ),
            child: Row(
              children: [
                // Gallery / file add
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.surfaceDark : Colors.grey.shade100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add_circle_outline_rounded,
                      color: AppTheme.textMuted, size: 22),
                ),
                const SizedBox(width: 8),

                // TextField
                Expanded(
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color:
                          isDark ? AppTheme.surfaceDark : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(23),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _ctrl,
                            onSubmitted: (_) => _send(),
                            style: GoogleFonts.inter(fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Posez votre question...',
                              hintStyle: GoogleFonts.inter(
                                  color: AppTheme.textMuted, fontSize: 14),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                            ),
                          ),
                        ),
                        // Mic inside input
                        GestureDetector(
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const VoiceScreen())),
                          child: Container(
                            margin: const EdgeInsets.only(right: 4),
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle),
                            child: const Icon(Icons.mic_rounded,
                                color: Colors.white, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 6),
                // Send
                GestureDetector(
                  onTap: _send,
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: const BoxDecoration(
                        color: AppTheme.primary, shape: BoxShape.circle),
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

class _MessageBubble extends StatelessWidget {
  final ChatMessage msg;
  final bool isDark;
  const _MessageBubble({required this.msg, required this.isDark});

  bool get isUser => msg.role == 'user';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            // AI avatar
            const DrHemoAvatar(size: 32),
            const SizedBox(width: 8),
          ],

          Column(
            crossAxisAlignment:
                isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              Text(
                isUser ? 'Vous' : 'Hemo AI',
                style: GoogleFonts.inter(
                    fontSize: 11,
                    color: AppTheme.textMuted,
                    fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 4),
              Container(
                constraints:
                    const BoxConstraints(maxWidth: 260),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isUser
                      ? const Color(0xFF2563EB)
                      : (isDark
                          ? AppTheme.surfaceDark
                          : Colors.grey.shade100),
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(18),
                    topRight: const Radius.circular(18),
                    bottomLeft: Radius.circular(isUser ? 18 : 4),
                    bottomRight: Radius.circular(isUser ? 4 : 18),
                  ),
                  border: isUser
                      ? null
                      : Border.all(
                          color: isDark
                              ? Colors.white12
                              : Colors.grey.shade200),
                ),
                child: Text(
                  msg.content,
                  style: GoogleFonts.inter(
                      fontSize: 14,
                      color: isUser
                          ? Colors.white
                          : (isDark ? Colors.white : AppTheme.textDark),
                      height: 1.5),
                ),
              ),
              if (!isUser) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    _ActionChip(
                        icon: Icons.play_arrow_rounded,
                        label: 'Écouter'),
                    const SizedBox(width: 6),
                    _ActionChip(
                        icon: Icons.translate_rounded,
                        label: 'Traduire'),
                  ],
                ),
              ],
            ],
          ),

          if (isUser) ...[
            const SizedBox(width: 8),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.blueGrey.shade200,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person_rounded, size: 18),
            ),
          ],
        ],
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _ActionChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.primary),
          const SizedBox(width: 4),
          Text(label,
              style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primary)),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const DrHemoAvatar(size: 32, isSpeaking: true),
        const SizedBox(width: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            children: [
              _Dot(delay: 0),
              const SizedBox(width: 4),
              _Dot(delay: 200),
              const SizedBox(width: 4),
              _Dot(delay: 400),
            ],
          ),
        ),
      ],
    );
  }
}

class _Dot extends StatelessWidget {
  final int delay;
  const _Dot({required this.delay});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: const BoxDecoration(
          color: AppTheme.primary, shape: BoxShape.circle),
    )
        .animate(onPlay: (c) => c.repeat())
        .scaleXY(
            begin: 0.6,
            end: 1.0,
            delay: Duration(milliseconds: delay),
            duration: 600.ms)
        .then()
        .scaleXY(begin: 1.0, end: 0.6, duration: 600.ms);
  }
}
