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
  final String flag;

  const Language({required this.code, required this.label, required this.flag});

  static const List<Language> supported = [
    Language(code: 'fr',  label: 'Français', flag: '🇫🇷'),
    Language(code: 'ewe', label: 'Ewe',      flag: '🇹🇬'),
    Language(code: 'en',  label: 'English',  flag: '🇬🇧'),
  ];
}
