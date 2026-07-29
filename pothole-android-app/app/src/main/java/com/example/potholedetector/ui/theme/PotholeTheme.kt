package com.example.potholedetector.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

object PotholeColors {
    val DarkBg2 = Color(0xFF0D1119)
    val CardBg = Color(0xFF161D28)
    val GlassFill = Color(0xFF172131)
    val GlassBorder = Color(0xFF2A3A50)
    val TextPrimary = Color(0xFFF3F6FA)
    val TextDim = Color(0xFF9AAABD)
    val TextDim2 = Color(0xFF718096)
    val Blue = Color(0xFF287BFF)
    val BlueLight = Color(0xFF70A9FF)
    val Orange = Color(0xFFFF8A3D)
    val OrangeLight = Color(0xFFFFB071)
    val Yellow = Color(0xFFFFC857)
    val Green = Color(0xFF54C78B)
}

object PotholeBrushes {
    val logoGradient = Brush.linearGradient(listOf(PotholeColors.Blue, Color(0xFF7459FF)))
    val blueButtonGradient = Brush.linearGradient(listOf(PotholeColors.Blue, Color(0xFF496DFF)))
    fun blueCardGradient() = Brush.linearGradient(listOf(Color(0xFF142B4D), Color(0xFF172131)))
    fun orangeCardGradient() = Brush.linearGradient(listOf(Color(0xFF482919), Color(0xFF172131)))
}

object PotholeShapes {
    const val buttonRadius = 14
    const val fieldRadius = 14
    const val cardRadius = 16
    const val pillRadius = 50
}
