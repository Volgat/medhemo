import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hemo_app/main.dart';

void main() {
  testWidgets('HemoApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const HemoApp());
    expect(find.text('Hemo'), findsWidgets);
  });
}
