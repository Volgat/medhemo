import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import 'health_advice_screen.dart';

class ImageAnalysisScreen extends StatefulWidget {
  const ImageAnalysisScreen({super.key});

  @override
  State<ImageAnalysisScreen> createState() => _ImageAnalysisScreenState();
}

class _ImageAnalysisScreenState extends State<ImageAnalysisScreen> {
  File? _selectedImage;
  bool _isAnalyzing = false;
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    final XFile? file = await _picker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1200,
    );
    if (file != null) {
      setState(() => _selectedImage = File(file.path));
    }
  }

  Future<void> _analyze() async {
    if (_selectedImage == null) return;
    setState(() => _isAnalyzing = true);

    try {
      final result = await ApiService.visionQuery(
        imageFile: _selectedImage!,
        prompt: "Analyse cette image médicale en relation avec la santé et la drépanocytose. Réponds de manière concise.",
      );

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => HealthAdviceScreen(adviceText: result),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur d\'analyse: $e')),
      );
    } finally {
      setState(() => _isAnalyzing = false);
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
        title: Text('Analyse d\'image',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.help_outline_rounded), onPressed: () {})
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // ── Camera / Image Preview ────────────────────────────
            GestureDetector(
              onTap: () => _pickImage(ImageSource.camera),
              child: AspectRatio(
                aspectRatio: 3 / 4,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: _selectedImage != null
                      ? Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.file(_selectedImage!, fit: BoxFit.cover),
                            // Scanner line overlay
                            Positioned.fill(
                              child: Container(
                                alignment: Alignment.center,
                                child: Container(
                                  height: 2,
                                  decoration: BoxDecoration(
                                    color:
                                        AppTheme.primary.withOpacity(0.6),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppTheme.primary,
                                        blurRadius: 12,
                                      )
                                    ],
                                  ),
                                ),
                              )
                                  .animate(onPlay: (c) => c.repeat())
                                  .moveY(begin: -100, end: 100, duration: 2.seconds)
                                  .then()
                                  .moveY(begin: 100, end: -100, duration: 2.seconds),
                            ),
                          ],
                        )
                      : Container(
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppTheme.surfaceDark
                                : Colors.grey.shade100,
                            border: Border.all(
                                color: AppTheme.primary.withOpacity(0.2),
                                width: 2),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // Focus corners
                              _FocusCorners(),
                              const SizedBox(height: 20),
                              Icon(Icons.camera_alt_rounded,
                                  size: 56,
                                  color:
                                      AppTheme.primary.withOpacity(0.5)),
                              const SizedBox(height: 12),
                              Text('Appuyez pour prendre une photo',
                                  style: GoogleFonts.inter(
                                      color: AppTheme.textMuted,
                                      fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                ),
              ),
            ).animate().fadeIn(),

            const SizedBox(height: 16),

            // ── Info ──────────────────────────────────────────────
            Text('Capturez votre mise à jour',
                style: GoogleFonts.inter(
                    fontSize: 20, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(
              'Prenez une photo nette de la plaie ou du médicament.\nAssurez-vous d\'un bon éclairage.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                  color: AppTheme.textMuted, fontSize: 13, height: 1.5),
            ),

            const SizedBox(height: 16),

            // ── Gallery button ────────────────────────────────────
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _pickImage(ImageSource.gallery),
                icon: const Icon(Icons.image_rounded, color: AppTheme.primary),
                label: Text('Importer depuis la galerie',
                    style: GoogleFonts.inter(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                      color: AppTheme.primary.withOpacity(0.3), width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── Guidance panel ────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.surfaceDark : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: AppTheme.primary.withOpacity(0.1)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.check_circle_rounded,
                        color: AppTheme.primary, size: 32),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.check_circle_rounded,
                                size: 14, color: AppTheme.primary),
                            const SizedBox(width: 4),
                            Text('Exemple de guidance',
                                style: GoogleFonts.inter(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                    color: AppTheme.primary,
                                    letterSpacing: 0.8)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Centrez la zone, évitez les ombres pour un meilleur résultat IA.',
                          style: GoogleFonts.inter(
                              fontSize: 12, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ── Analyze button ────────────────────────────────────
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed:
                    _selectedImage != null && !_isAnalyzing ? _analyze : null,
                icon: _isAnalyzing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.biotech_rounded),
                label: Text(
                  _isAnalyzing ? 'Analyse en cours...' : 'Analyser l\'image',
                  style: GoogleFonts.inter(
                      fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FocusCorners extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 120,
      height: 120,
      child: Stack(
        children: [
          // Top-left
          Positioned(
              top: 0, left: 0,
              child: _Corner(top: true, left: true)),
          // Top-right
          Positioned(
              top: 0, right: 0,
              child: _Corner(top: true, left: false)),
          // Bottom-left
          Positioned(
              bottom: 0, left: 0,
              child: _Corner(top: false, left: true)),
          // Bottom-right
          Positioned(
              bottom: 0, right: 0,
              child: _Corner(top: false, left: false)),
        ],
      ),
    );
  }
}

class _Corner extends StatelessWidget {
  final bool top, left;
  const _Corner({required this.top, required this.left});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        border: Border(
          top: top
              ? const BorderSide(color: Colors.white54, width: 3)
              : BorderSide.none,
          bottom: !top
              ? const BorderSide(color: Colors.white54, width: 3)
              : BorderSide.none,
          left: left
              ? const BorderSide(color: Colors.white54, width: 3)
              : BorderSide.none,
          right: !left
              ? const BorderSide(color: Colors.white54, width: 3)
              : BorderSide.none,
        ),
        borderRadius: BorderRadius.only(
          topLeft: top && left ? const Radius.circular(8) : Radius.zero,
          topRight: top && !left ? const Radius.circular(8) : Radius.zero,
          bottomLeft: !top && left ? const Radius.circular(8) : Radius.zero,
          bottomRight: !top && !left ? const Radius.circular(8) : Radius.zero,
        ),
      ),
    );
  }
}
