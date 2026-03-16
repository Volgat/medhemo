import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ApiService {
  // 10.0.2.2 is localhost from Android emulator
  static const String _baseUrl = 'http://10.0.2.2:8000';

  // ── Chat ──────────────────────────────────────────────────────────
  static Future<String> chat({
    required String message,
    List<ChatMessage> history = const [],
  }) async {
    final uri = Uri.parse('$_baseUrl/api/chat');
    final body = jsonEncode({
      'message': message,
      'history': history.map((m) => m.toJson()).toList(),
    });

    final resp = await http.post(uri,
        headers: {'Content-Type': 'application/json'}, body: body);

    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body);
      return data['response'] as String;
    } else {
      throw Exception('Chat error: ${resp.statusCode}');
    }
  }

  // ── Audio → Transcription + AI Response ──────────────────────────
  static Future<Map<String, String>> audioQuery({
    required File audioFile,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/audio');
    final req = http.MultipartRequest('POST', uri);
    req.files.add(await http.MultipartFile.fromPath('file', audioFile.path));

    final streamed = await req.send();
    final resp = await http.Response.fromStream(streamed);

    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body);
      return {
        'transcription': data['transcription'] as String,
        'ai_response': data['ai_response'] as String,
      };
    } else {
      throw Exception('Audio error: ${resp.statusCode}');
    }
  }

  // ── Vision — Image Analysis ───────────────────────────────────────
  static Future<String> visionQuery({
    required File imageFile,
    String prompt = "Décris cette image médicale et donne ton analyse.",
  }) async {
    final uri = Uri.parse(
        '$_baseUrl/api/vision?prompt=${Uri.encodeComponent(prompt)}');
    final req = http.MultipartRequest('POST', uri);
    req.files.add(await http.MultipartFile.fromPath('file', imageFile.path));

    final streamed = await req.send();
    final resp = await http.Response.fromStream(streamed);

    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body);
      return data['analysis'] as String;
    } else {
      throw Exception('Vision error: ${resp.statusCode}');
    }
  }

  // ── File Analysis ─────────────────────────────────────────────────
  static Future<String> analyzeFile({
    required File file,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/analyze-file');
    final req = http.MultipartRequest('POST', uri);
    req.files.add(await http.MultipartFile.fromPath('file', file.path));

    final streamed = await req.send();
    final resp = await http.Response.fromStream(streamed);

    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body);
      return data['summary'] as String;
    } else {
      throw Exception('File analysis error: ${resp.statusCode}');
    }
  }

  // ── Health check ──────────────────────────────────────────────────
  static Future<bool> healthCheck() async {
    try {
      final resp = await http
          .get(Uri.parse('$_baseUrl/api/health'))
          .timeout(const Duration(seconds: 5));
      return resp.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
