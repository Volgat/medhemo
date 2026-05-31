import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AppState extends ChangeNotifier {
  // ── Chat messages (current session) ─────────────────────────────────
  List<ChatMessage> _messages = [];
  bool _isLoading = false;
  bool _backendOnline = false;

  // ── Settings ─────────────────────────────────────────────────────────
  Language _selectedLanguage = Language.defaultLanguage;
  bool _voiceEnabled = true;
  double _textScaleFactor = 1.0; // 0.85 = small, 1.0 = medium, 1.2 = large

  // ── Conversation history ──────────────────────────────────────────────
  final List<ConversationSession> _sessions = [];

  // ── Getters ───────────────────────────────────────────────────────────
  List<ChatMessage> get messages => List.unmodifiable(_messages);
  bool get isLoading => _isLoading;
  bool get backendOnline => _backendOnline;
  Language get selectedLanguage => _selectedLanguage;
  bool get voiceEnabled => _voiceEnabled;
  double get textScaleFactor => _textScaleFactor;
  List<ConversationSession> get sessions => List.unmodifiable(_sessions);

  // ── Settings setters ──────────────────────────────────────────────────
  void setLanguage(Language lang) {
    _selectedLanguage = lang;
    notifyListeners();
  }

  void setVoiceEnabled(bool enabled) {
    _voiceEnabled = enabled;
    notifyListeners();
  }

  void setTextScaleFactor(double scale) {
    _textScaleFactor = scale;
    notifyListeners();
  }

  // ── Backend ───────────────────────────────────────────────────────────
  Future<void> checkBackend() async {
    _backendOnline = await ApiService.healthCheck();
    notifyListeners();
  }

  // ── Chat ──────────────────────────────────────────────────────────────
  Future<String> sendMessage(String text) async {
    _messages.add(ChatMessage(role: 'user', content: text));
    _isLoading = true;
    notifyListeners();

    try {
      final resp = await ApiService.chat(
        message: text,
        history: _messages.sublist(
            _messages.length > 10 ? _messages.length - 10 : 0),
      );
      _messages.add(ChatMessage(role: 'assistant', content: resp));
      return resp;
    } catch (e) {
      const err =
          'Connection error. Please make sure the backend is running.';
      _messages.add(ChatMessage(role: 'assistant', content: err));
      return err;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearChat() {
    _messages = [];
    notifyListeners();
  }

  // ── History ───────────────────────────────────────────────────────────
  /// Saves current chat as a conversation session and clears the chat.
  void saveSessionToHistory(String title) {
    if (_messages.isEmpty) return;
    _sessions.insert(
      0,
      ConversationSession(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: title,
        date: DateTime.now(),
        language: _selectedLanguage,
        messages: List.from(_messages),
      ),
    );
    _messages = [];
    notifyListeners();
  }

  void deleteSession(String id) {
    _sessions.removeWhere((s) => s.id == id);
    notifyListeners();
  }
}
