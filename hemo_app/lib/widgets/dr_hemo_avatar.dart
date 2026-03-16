import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';

class DrHemoAvatar extends StatelessWidget {
  final double size;
  final bool isSpeaking;

  const DrHemoAvatar({
    super.key,
    this.size = 64,
    this.isSpeaking = false,
  });

  @override
  Widget build(BuildContext context) {
    Widget avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? AppTheme.surfaceDark
            : Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.2),
            blurRadius: size / 4,
            spreadRadius: size / 16,
          )
        ],
      ),
      child: ClipOval(
        child: Image.asset(
          'assets/images/mascot.png',
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            // Fallback just in case image is missing
            return Icon(Icons.smart_toy_rounded,
                color: AppTheme.primary, size: size * 0.6);
          },
        ),
      ),
    );

    // Apply floating and pulsing animations
    avatar = avatar.animate(onPlay: (controller) => controller.repeat())
        .shimmer(duration: 3000.ms, color: Colors.white24)
        .custom(
          duration: 4000.ms,
          builder: (context, value, child) {
            // Float effect
            return Transform.translate(
              offset: Offset(0, 4 * (1 - (value * 2 - 1).abs())),
              child: child,
            );
          },
        );

    if (isSpeaking) {
      avatar = avatar.animate(onPlay: (c) => c.repeat(reverse: true))
          .scale(
            begin: const Offset(1.0, 1.0),
            end: const Offset(1.05, 1.05),
            duration: 800.ms,
            curve: Curves.easeInOutSine,
          );
    }

    return avatar;
  }
}
