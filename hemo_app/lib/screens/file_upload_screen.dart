import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/app_state.dart';
import '../theme/app_theme.dart';
import 'health_advice_screen.dart';

class FileUploadScreen extends StatefulWidget {
  const FileUploadScreen({super.key});

  @override
  State<FileUploadScreen> createState() => _FileUploadScreenState();
}

class _FileUploadScreenState extends State<FileUploadScreen> {
  final List<PlatformFile> _files = [];
  bool _isAnalyzing = false;
  String? _summary;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      allowMultiple: true,
    );
    if (result != null) {
      setState(() => _files.addAll(result.files));
    }
  }

  Future<void> _analyze() async {
    if (_files.isEmpty) return;
    setState(() {
      _isAnalyzing = true;
      _summary = null;
    });

    try {
      final file = File(_files.first.path!);
      final result = await ApiService.analyzeFile(file: file);
      setState(() => _summary = result);
    } catch (e) {
      setState(() => _summary = 'Erreur lors de l\'analyse: $e');
    } finally {
      setState(() => _isAnalyzing = false);
    }
  }

  void _removeFile(int index) {
    setState(() => _files.removeAt(index));
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
        title: Text('Hemo Analysis',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),

                // ── Header ──────────────────────────────────────────
                Text('Uploader des résultats',
                    style: GoogleFonts.inter(
                        fontSize: 28, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(
                  'Obtenez une explication IA instantanée de vos analyses sanguines ou ordonnances.',
                  style: GoogleFonts.inter(
                      color: AppTheme.textMuted, fontSize: 13, height: 1.5),
                ),

                const SizedBox(height: 20),

                // ── Upload Drop Zone ──────────────────────────────
                GestureDetector(
                  onTap: _pickFile,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: AppTheme.primary.withOpacity(0.3),
                          width: 2,
                          style: BorderStyle.solid),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.cloud_upload_rounded,
                              color: AppTheme.primary, size: 36),
                        ),
                        const SizedBox(height: 14),
                        Text('Appuyez ou glissez pour importer',
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 4),
                        Text('Formats: PDF, JPG, PNG',
                            style: GoogleFonts.inter(
                                color: AppTheme.textMuted, fontSize: 12)),
                        const SizedBox(height: 16),
                        // Format badges
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _FormatBadge(Icons.picture_as_pdf_rounded, 'PDF'),
                            const SizedBox(width: 10),
                            _FormatBadge(Icons.image_rounded, 'JPG'),
                            const SizedBox(width: 10),
                            _FormatBadge(Icons.image_rounded, 'PNG'),
                          ],
                        ),
                        const SizedBox(height: 18),
                        ElevatedButton(
                          onPressed: _pickFile,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 32, vertical: 12),
                          ),
                          child: Text('Sélectionner un fichier',
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ).animate().fadeIn(),

                const SizedBox(height: 24),

                // ── Uploaded Files ────────────────────────────────
                if (_files.isNotEmpty) ...[
                  Row(
                    children: [
                      const Icon(Icons.folder_open_rounded,
                          color: AppTheme.primary, size: 22),
                      const SizedBox(width: 8),
                      Text('Fichiers importés',
                          style: GoogleFonts.inter(
                              fontSize: 17, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ..._files.asMap().entries.map((e) {
                    final f = e.value;
                    final ext = f.extension?.toLowerCase() ?? '';
                    final icon = ext == 'pdf'
                        ? Icons.picture_as_pdf_rounded
                        : Icons.image_rounded;
                    final size = f.size < 1024 * 1024
                        ? '${(f.size / 1024).toStringAsFixed(0)} KB'
                        : '${(f.size / (1024 * 1024)).toStringAsFixed(1)} MB';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color:
                            isDark ? AppTheme.surfaceDark : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                            color: isDark
                                ? Colors.white10
                                : Colors.grey.shade200)),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(icon,
                                color: AppTheme.primary, size: 28),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(f.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14)),
                                Text('$size • Importé aujourd\'hui',
                                    style: GoogleFonts.inter(
                                        fontSize: 12,
                                        color: AppTheme.textMuted)),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () => _removeFile(e.key),
                            icon: const Icon(Icons.delete_outline_rounded,
                                color: Colors.redAccent),
                          ),
                        ],
                      ),
                    ).animate().fadeIn();
                  }),
                  const SizedBox(height: 16),
                ],

                // ── AI Summary Preview ────────────────────────────
                if (_summary != null) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.06),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: AppTheme.primary.withOpacity(0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: const BoxDecoration(
                                  color: AppTheme.primary,
                                  shape: BoxShape.circle),
                              child: const Icon(Icons.auto_awesome_rounded,
                                  color: Colors.white, size: 18),
                            ),
                            const SizedBox(width: 10),
                            Text('Aperçu IA',
                                style: GoogleFonts.inter(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(_summary!,
                            style: GoogleFonts.inter(
                                fontSize: 14,
                                height: 1.6,
                                color: isDark
                                    ? Colors.white70
                                    : const Color(0xFF374151))),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => HealthAdviceScreen(
                                  adviceText: _summary!),
                            ),
                          ),
                          child: const Text('Voir l\'analyse complète'),
                        ),
                      ],
                    ),
                  ).animate().fadeIn().slideY(begin: 0.1),
                ],
              ],
            ),
          ),

          // ── Floating Analyze Button ─────────────────────────────
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    (isDark ? AppTheme.backgroundDark : AppTheme.backgroundLight),
                    (isDark ? AppTheme.backgroundDark : AppTheme.backgroundLight)
                        .withOpacity(0),
                  ],
                ),
              ),
              child: ElevatedButton.icon(
                onPressed: _files.isNotEmpty && !_isAnalyzing ? _analyze : null,
                icon: _isAnalyzing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.query_stats_rounded),
                label: Text(
                  _isAnalyzing ? 'Analyse en cours...' : 'Analyser les fichiers',
                  style: GoogleFonts.inter(
                      fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FormatBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FormatBadge(this.icon, this.label);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppTheme.primary),
        const SizedBox(width: 4),
        Text(label,
            style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppTheme.textMuted)),
      ],
    );
  }
}
