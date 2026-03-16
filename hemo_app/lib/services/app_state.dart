import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AppState extends ChangeNotifier {
  List<ChatMessage> _messages = [];
  bool _isLoading = false;
  bool _backendOnline = false;

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  bool get isLoading => _isLoading;
  bool get backendOnline => _backendOnline;

  Future<void> checkBackend() async {
    _backendOnline = await ApiService.healthCheck();
    notifyListeners();
  }

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
      final err = 'Erreur de connexion au serveur. Vérifiez que le backend est démarré.';
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
}
