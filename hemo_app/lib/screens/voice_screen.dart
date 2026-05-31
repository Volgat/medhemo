import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import 'health_advice_screen.dart';

class VoiceScreen extends StatefulWidget {
  const VoiceScreen({super.key});

  @override
  State<VoiceScreen> createState() => _VoiceScreenState();
}

class _VoiceScreenState extends State<VoiceScreen>
    with SingleTickerProviderStateMixin {
  FlutterSoundRecorder? _recorder;
  bool _isRecording = false;
  bool _isProcessing = false;
  String _transcription = '';
  String? _recordingPath;
  late AnimationController _waveController;

  @override
  void initState() {
    super.initState();
    _waveController =
        AnimationController(vsync: this, duration: 800.ms)
          ..repeat(reverse: true);
    _initRecorder();
  }

  @override
  void dispose() {
    _waveController.dispose();
    _recorder?.closeRecorder();
    super.dispose();
  }

  Future<void> _initRecorder() async {
    _recorder = FlutterSoundRecorder();
    await Permission.microphone.request();
    await _recorder!.openRecorder();
  }

  Future<void> _startRecording() async {
    final dir = await getTemporaryDirectory();
    _recordingPath = '${dir.path}/hemo_audio.wav';
    await _recorder!.startRecorder(
        toFile: _recordingPath, codec: Codec.pcm16WAV);
    setState(() {
      _isRecording = true;
      _transcription = '';
    });
  }

  Future<void> _stopRecording() async {
    await _recorder!.stopRecorder();
    setState(() {
      _isRecording = false;
      _isProcessing = true;
    });

    try {
      final result = await ApiService.audioQuery(
          audioFile: File(_recordingPath!));
      final transcript = result['transcription'] ?? '';
      final aiResp = result['ai_response'] ?? '';
      setState(() {
        _transcription = transcript;
        _isProcessing = false;
      });
      if (mounted && aiResp.isNotEmpty) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => HealthAdviceScreen(adviceText: aiResp),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _transcription =
            'Transcription error. Please try again.';
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final appState = context.watch<AppState>();
    final lang = appState.selectedLanguage;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Hemo Voice Assistant',
            style:
                GoogleFonts.inter(fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const SizedBox(height: 24),

              // ── Active Session badge ──────────────────────────────
              if (_isRecording)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: AppTheme.primary.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppTheme.primary,
                          shape: BoxShape.circle,
                        ),
                      )
                          .animate(onPlay: (c) => c.repeat())
                          .fade(begin: 1, end: 0.2, duration: 600.ms)
                          .then()
                          .fade(begin: 0.2, end: 1, duration: 600.ms),
                      const SizedBox(width: 8),
                      Text('Active Session',
                          style: GoogleFonts.inter(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.bold,
                              fontSize: 13)),
                    ],
                  ),
                ).animate().fadeIn()
              else
                const SizedBox(height: 36),

              const SizedBox(height: 20),

              // ── Listening label ───────────────────────────────────
              Text(
                _isRecording
                    ? 'Listening in ${lang.label}...'
                    : _isProcessing
                        ? 'Processing...'
                        : 'Tap the mic to speak',
                style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: _isRecording
                        ? AppTheme.primary
                        : null),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text('Speak clearly into the microphone',
                  style: GoogleFonts.inter(
                      color: AppTheme.textMuted, fontSize: 13),
                  textAlign: TextAlign.center),

              const SizedBox(height: 40),

              // ── Mic / Stop button ─────────────────────────────────
              GestureDetector(
                onTap: _isProcessing
                    ? null
                    : (_isRecording
                        ? _stopRecording
                        : _startRecording),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Outer pulse ring (only when recording)
                    if (_isRecording)
                      Container(
                        width: 160,
                        height: 160,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color:
                              AppTheme.primary.withOpacity(0.12),
                        ),
                      )
                          .animate(onPlay: (c) => c.repeat())
                          .scaleXY(
                              begin: 1,
                              end: 1.2,
                              duration: 900.ms,
                              curve: Curves.easeInOut)
                          .then()
                          .scaleXY(
                              begin: 1.2,
                              end: 1,
                              duration: 900.ms),

                    // Main button
                    AnimatedContainer(
                      duration: 300.ms,
                      width: 130,
                      height: 130,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isRecording
                            ? Colors.redAccent
                            : AppTheme.primary,
                        boxShadow: [
                          BoxShadow(
                              color: (_isRecording
                                      ? Colors.redAccent
                                      : AppTheme.primary)
                                  .withOpacity(0.4),
                              blurRadius: 30,
                              spreadRadius: 4)
                        ],
                      ),
                      child: Icon(
                        _isProcessing
                            ? Icons.hourglass_top_rounded
                            : _isRecording
                                ? Icons.stop_circle_rounded
                                : Icons.mic_rounded,
                        color: Colors.white,
                        size: 60,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Stop label
              if (_isRecording)
                Text('Tap to stop',
                    style: GoogleFonts.inter(
                        color: Colors.redAccent,
                        fontSize: 13,
                        fontWeight: FontWeight.w500))
                    .animate()
                    .fadeIn(),

              const SizedBox(height: 36),

              // ── Transcription area ────────────────────────────────
              if (_transcription.isNotEmpty || _isRecording)
                Expanded(
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppTheme.surfaceDark
                          : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: isDark
                              ? Colors.white10
                              : Colors.black
                                  .withOpacity(0.07)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.translate_rounded,
                                color: AppTheme.primary, size: 16),
                            const SizedBox(width: 6),
                            Text('TRANSCRIPTION',
                                style: GoogleFonts.inter(
                                    color: AppTheme.primary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                    letterSpacing: 1.2)),
                            const SizedBox(width: 6),
                            Text('Real-time',
                                style: GoogleFonts.inter(
                                    color: AppTheme.textMuted,
                                    fontSize: 11)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Expanded(
                          child: SingleChildScrollView(
                            child: Text(
                              _isRecording && _transcription.isEmpty
                                  ? '...'
                                  : _transcription,
                              style: GoogleFonts.inter(
                                  fontSize: 14,
                                  height: 1.6,
                                  color: isDark
                                      ? Colors.white70
                                      : AppTheme.textDark),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(),
                )
              else
                const Spacer(),

              // ── Footer ────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.only(bottom: 16, top: 12),
                child: Text(
                  'Powered by Hemo AI Translation Engine',
                  style: GoogleFonts.inter(
                      color: AppTheme.textMuted, fontSize: 11),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
