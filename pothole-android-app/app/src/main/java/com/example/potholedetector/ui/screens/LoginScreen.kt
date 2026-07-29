package com.example.potholedetector.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.potholedetector.ui.theme.*

@Composable
fun LoginScreen(onLoginClick: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().background(PotholeColors.DarkBg2)) {
        Box(
            Modifier.fillMaxWidth().height(220.dp).background(
                Brush.radialGradient(listOf(PotholeColors.Blue.copy(alpha = .30f), Color.Transparent), radius = 700f)
            )
        ) {
            Column(Modifier.align(Alignment.BottomStart).padding(24.dp)) {
                Box(Modifier.size(46.dp).background(PotholeBrushes.logoGradient, RoundedCornerShape(14.dp)))
                Spacer(Modifier.height(14.dp))
                Text("Welcome back", color = PotholeColors.TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Text("Log in to continue reporting road hazards", color = PotholeColors.TextDim, fontSize = 13.sp)
            }
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            LoginField(email, { email = it }, "Email address", Icons.Default.Email, KeyboardType.Email)
            LoginField(password, { password = it }, "Password", Icons.Default.Lock, KeyboardType.Password,
                if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility) { passwordVisible = !passwordVisible }
            Text("Forgot password?", color = PotholeColors.BlueLight, fontSize = 12.sp, modifier = Modifier.align(Alignment.End))
            Button(
                onClick = { onLoginClick(email, password) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(PotholeShapes.buttonRadius),
                colors = ButtonDefaults.buttonColors(containerColor = PotholeColors.Blue)
            ) { Text("Log In", fontWeight = FontWeight.Bold) }
            Text("Demo mode: enter any email and password to continue.", color = PotholeColors.TextDim, fontSize = 12.sp)
        }
    }
}

@Composable
private fun LoginField(value: String, onValueChange: (String) -> Unit, placeholder: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector, type: KeyboardType,
    transformation: VisualTransformation = VisualTransformation.None,
    trailing: androidx.compose.ui.graphics.vector.ImageVector? = null, onTrailing: () -> Unit = {}) {
    OutlinedTextField(value, onValueChange, Modifier.fillMaxWidth(), placeholder = { Text(placeholder) },
        leadingIcon = { Icon(icon, null) }, trailingIcon = trailing?.let { { Icon(it, null, Modifier.clickable { onTrailing() }) } },
        singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = type), visualTransformation = transformation,
        colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = PotholeColors.GlassFill, unfocusedContainerColor = PotholeColors.GlassFill,
            focusedTextColor = PotholeColors.TextPrimary, unfocusedTextColor = PotholeColors.TextPrimary,
            focusedBorderColor = PotholeColors.Blue, unfocusedBorderColor = PotholeColors.GlassBorder))
}
