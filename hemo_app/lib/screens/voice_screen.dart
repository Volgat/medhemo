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
    _waveController = AnimationController(vsync: this, duration: 800.ms)
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
      toFile: _recordingPath,
      codec: Codec.pcm16WAV,
    );
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
        audioFile: File(_recordingPath!),
      );

      setState(() {
        _transcription = result['transcription'] ?? '';
        _isProcessing = false;
      });

      if (mounted && result['ai_response'] != null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) =>
                HealthAdviceScreen(adviceText: result['ai_response']!),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _transcription = 'Erreur de transcription. Vérifiez la connexion.';
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Hemo Voice Assistant',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const SizedBox(height: 24),

            // Status badge
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(30),
              ),
              child: Text(
                _isRecording ? 'SESSION ACTIVE' : 'EN ATTENTE',
                style: GoogleFonts.inter(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    letterSpacing: 1.2),
              ),
            ).animate().fadeIn(),

            const SizedBox(height: 12),

            Text(
              _isRecording
                  ? 'Écoute en cours...'
                  : 'Appuyez sur le micro',
              style: GoogleFonts.inter(
                  fontSize: 26, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ).animate().fadeIn(delay: 100.ms),

            if (!_isRecording)
              Text(
                'Parlez clairement dans le microphone',
                style: GoogleFonts.inter(
                    fontSize: 13, color: AppTheme.textMuted),
              ).animate().fadeIn(delay: 200.ms),

            const SizedBox(height: 40),

            // ── Mic animation ──────────────────────────────────────
            Stack(
              alignment: Alignment.center,
              children: [
                // Glow blur
                if (_isRecording)
                  Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.primary.withOpacity(0.1),
                    ),
                  )
                      .animate(onPlay: (c) => c.repeat())
                      .scaleXY(begin: 1, end: 1.2, duration: 800.ms)
                      .then()
                      .scaleXY(begin: 1.2, end: 1, duration: 800.ms),

                // Mic button
                GestureDetector(
                  onTap: _isProcessing
                      ? null
                      : (_isRecording ? _stopRecording : _startRecording),
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isRecording ? Colors.red : AppTheme.primary,
                      boxShadow: [
                        BoxShadow(
                          color: (_isRecording ? Colors.red : AppTheme.primary)
                              .withOpacity(0.4),
                          blurRadius: 32,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: _isProcessing
                        ? const CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 3)
                        : Icon(
                            _isRecording
                                ? Icons.stop_circle_rounded
                                : Icons.mic_rounded,
                            color: Colors.white,
                            size: 70),
                  ),
                ),
              ],
            ),

            // Waveform bars (animated when recording)
            const SizedBox(height: 24),
            if (_isRecording)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(14, (i) {
                  return AnimatedBuilder(
                    animation: _waveController,
                    builder: (_, __) {
                      final height = 8.0 +
                          30.0 *
                              (0.4 +
                                  0.6 *
                                      ((i % 3 == 0
                                              ? _waveController.value
                                              : i % 3 == 1
                                                  ? 1 - _waveController.value
                                                  : _waveController.value *
                                                      0.7)));
                      return Container(
                        width: 4,
                        height: height,
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      );
                    },
                  );
                }),
              ),

            const SizedBox(height: 24),

            // ── Transcription panel ────────────────────────────────
            if (_transcription.isNotEmpty || _isProcessing)
              Expanded(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.surfaceDark : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: AppTheme.primary.withOpacity(0.15)),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 10)
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                                      letterSpacing: 1)),
                            ],
                          ),
                          Text('Temps réel',
                              style: GoogleFonts.inter(
                                  color: AppTheme.textMuted, fontSize: 11)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _isProcessing
                            ? 'Analyse en cours...'
                            : '"$_transcription"',
                        style: GoogleFonts.inter(
                            fontSize: 17,
                            fontWeight: FontWeight.w500,
                            height: 1.5),
                      ),
                    ],
                  ),
                ).animate().fadeIn().slideY(begin: 0.1),
              ),

            const Spacer(),

            // ── Stop button ────────────────────────────────────────
            if (_isRecording)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _stopRecording,
                  icon: const Icon(Icons.stop_circle_rounded),
                  label: Text('Arrêter l\'enregistrement',
                      style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                  ),
                ),
              ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
