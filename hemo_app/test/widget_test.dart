import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hemo_app/main.dart';

void main() {
  testWidgets('HemoApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const HemoApp());
    expect(find.text('Hemo'), findsWidgets);
    
    // Dispose the widget tree to clean up infinite animations/timers
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
  });
}
