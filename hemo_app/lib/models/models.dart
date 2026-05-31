class ChatMessage {
  final String role;   // "user" | "assistant"
  final String content;
  final DateTime timestamp;
  final MessageType type;

  ChatMessage({
    required this.role,
    required this.content,
    DateTime? timestamp,
    this.type = MessageType.text,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'role': role,
    'content': content,
  };
}

enum MessageType { text, audio, image, file }

class Language {
  final String code;
  final String label;
  final String nativeLabel;

  const Language({
    required this.code,
    required this.label,
    required this.nativeLabel,
  });

  static const List<Language> supported = [
    Language(code: 'en',  label: 'English',  nativeLabel: 'English'),
    Language(code: 'fr',  label: 'Français',  nativeLabel: 'Français'),
    Language(code: 'ewe', label: 'Ewe',       nativeLabel: 'Ewe'),
  ];

  static const Language defaultLanguage =
      Language(code: 'fr', label: 'Français', nativeLabel: 'Français');
}

/// Représente une session de consultation passée dans l'historique.
class ConversationSession {
  final String id;
  final String title;
  final DateTime date;
  final Language language;
  final List<ChatMessage> messages;

  ConversationSession({
    required this.id,
    required this.title,
    required this.date,
    required this.language,
    required this.messages,
  });
}
