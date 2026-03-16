import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // ── Brand Colors ────────────────────────────────────────────────────
  static const Color primary        = Color(0xFF4BBE4F);
  static const Color primaryLight   = Color(0xFFE8F7E9);
  static const Color primaryDark    = Color(0xFF2E8C31);
  static const Color backgroundLight = Color(0xFFF6F8F6);
  static const Color backgroundDark  = Color(0xFF141E15);
  static const Color surfaceLight    = Color(0xFFFFFFFF);
  static const Color surfaceDark     = Color(0xFF1E2B1F);
  static const Color cardDark        = Color(0xFF243025);

  // ── Text Colors ────────────────────────────────────────────────────
  static const Color textDark   = Color(0xFF0F1B10);
  static const Color textLight  = Color(0xFFF1F7F1);
  static const Color textMuted  = Color(0xFF7A8E7B);

  // ── Light Theme ────────────────────────────────────────────────────
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.light(
      primary: primary,
      onPrimary: Colors.white,
      secondary: primaryDark,
      surface: surfaceLight,
      onSurface: textDark,
    ),
    scaffoldBackgroundColor: backgroundLight,
    textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
    appBarTheme: AppBarTheme(
      backgroundColor: backgroundLight,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: GoogleFonts.inter(
        color: textDark,
        fontWeight: FontWeight.bold,
        fontSize: 18,
      ),
      iconTheme: const IconThemeData(color: textDark),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        shape: const StadiumBorder(),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32),
        elevation: 4,
        shadowColor: primary.withOpacity(0.4),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surfaceLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(30),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
    ),
  );

  // ── Dark Theme ─────────────────────────────────────────────────────
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.dark(
      primary: primary,
      onPrimary: Colors.black,
      secondary: primary,
      surface: surfaceDark,
      onSurface: textLight,
    ),
    scaffoldBackgroundColor: backgroundDark,
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
    appBarTheme: AppBarTheme(
      backgroundColor: backgroundDark,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: GoogleFonts.inter(
        color: textLight,
        fontWeight: FontWeight.bold,
        fontSize: 18,
      ),
      iconTheme: const IconThemeData(color: textLight),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.black,
        shape: const StadiumBorder(),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32),
        elevation: 4,
        shadowColor: primary.withOpacity(0.4),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surfaceDark,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(30),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
    ),
  );
}
