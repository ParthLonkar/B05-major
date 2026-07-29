package com.example.potholedetector

import android.Manifest
import android.content.Context
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.potholedetector.camera.CameraCaptureSheet
import com.example.potholedetector.ui.screens.HomeDashboardScreen
import com.example.potholedetector.ui.screens.LoginScreen
import java.io.File

import androidx.compose.material3.Surface
import androidx.compose.material3.lightColorScheme

import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.DisposableEffect

class MainActivity : ComponentActivity() {
    private val vm: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val lightColors = lightColorScheme(
                primary = Color(0xFF0061A4),
                onPrimary = Color.White,
                primaryContainer = Color(0xFFD1E4FF),
                onPrimaryContainer = Color(0xFF001D36),
                secondary = Color(0xFF535F70),
                onSecondary = Color.White,
                background = Color(0xFFFDFCFF),
                onBackground = Color(0xFF1A1C1E),
                surface = Color(0xFFFDFCFF),
                onSurface = Color(0xFF1A1C1E),
                surfaceVariant = Color(0xFFDFE2EB),
                onSurfaceVariant = Color(0xFF43474E),
                error = Color(0xFFBA1A1A),
                onError = Color.White,
                errorContainer = Color(0xFFFFDAD6),
                onErrorContainer = Color(0xFF410002)
            )
            MaterialTheme(colorScheme = lightColors) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    PotholeApp(vm)
                }
            }
        }
    }
}

private enum class AppScreen { LOGIN, HOME, DETECTOR }

@Composable
private fun PotholeApp(vm: MainViewModel) {
    var currentScreen by remember { mutableStateOf(AppScreen.LOGIN) }
    when (currentScreen) {
        AppScreen.LOGIN -> LoginScreen { _, _ -> currentScreen = AppScreen.HOME }
        AppScreen.HOME -> HomeDashboardScreen(
            onDetectPotholeClick = { currentScreen = AppScreen.DETECTOR },
            onUploadImageClick = { currentScreen = AppScreen.DETECTOR }
        )
        AppScreen.DETECTOR -> DetectionScreen(vm, onBack = { currentScreen = AppScreen.HOME })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetectionScreen(vm: MainViewModel, onBack: () -> Unit) {
    val state by vm.state.collectAsState()
    val context = LocalContext.current

    var showCamera by remember { mutableStateOf(false) }
    var conf by remember { mutableStateOf(0.25f) }
    var iou by remember { mutableStateOf(0.45f) }

    val requestCameraPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) showCamera = true
    }

    val pickImage = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            val file = copyUriToCache(context, uri, "gallery.jpg")
            vm.runPrediction(file, conf = conf, iou = iou)
        }
    }

    if (showCamera) {
        CameraCaptureSheet(
            onClose = { showCamera = false },
            onCaptured = { file ->
                showCamera = false
                vm.runPrediction(file, conf = conf, iou = iou)
            }
        )
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = { Text("Pothole Detection", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    androidx.compose.material3.IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back to Home")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    "AI-Powered Road Safety",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.secondary
                )
            }

            // Always-visible actions (easier to find than FABs on some devices)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                modifier = Modifier.weight(1f),
                                onClick = { pickImage.launch("image/*") }
                            ) {
                                Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                                Spacer(Modifier.size(8.dp))
                                Text("Gallery")
                            }
                            Button(
                                modifier = Modifier.weight(1f),
                                onClick = { requestCameraPermission.launch(Manifest.permission.CAMERA) }
                            ) {
                                Icon(Icons.Default.CameraAlt, contentDescription = null)
                                Spacer(Modifier.size(8.dp))
                                Text("Camera")
                            }
                        }

                        Spacer(Modifier.height(12.dp))

                        Text("Confidence: ${"%.2f".format(conf)}", style = MaterialTheme.typography.bodySmall)
                        Slider(
                            value = conf,
                            onValueChange = { conf = it.coerceIn(0.05f, 0.95f) },
                            valueRange = 0.05f..0.95f
                        )

                        Text("IoU: ${"%.2f".format(iou)}", style = MaterialTheme.typography.bodySmall)
                        Slider(
                            value = iou,
                            onValueChange = { iou = it.coerceIn(0.10f, 0.90f) },
                            valueRange = 0.10f..0.90f
                        )

                        Text(
                            "Tip: Higher confidence = fewer false positives; higher IoU = stricter box suppression.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            if (state.isLoading) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            Text("Analyzing road conditions...")
                        }
                    }
                }
            }

            state.error?.let {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Text(
                            "Error: $it",
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }

            state.annotated?.let { bmp ->
                item {
                    Card(
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column {
                            Box(modifier = Modifier.fillMaxWidth().aspectRatio(4/3f)) {
                                Image(
                                    bitmap = bmp.asImageBitmap(),
                                    contentDescription = "Annotated result",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .padding(8.dp)
                                        .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(8.dp))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text("Analyzed", color = Color.White, style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                }
            }

            state.response?.let { resp ->
                val severeCount = resp.detections.count { it.severity.equals("Severe", ignoreCase = true) }
                val risk = when {
                    severeCount >= 2 -> "HIGH"
                    severeCount == 1 || resp.detections.size >= 3 -> "MED"
                    else -> "LOW"
                }

                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Summary", fontWeight = FontWeight.Bold)
                                Text("Total: ${resp.detections.size} • Severe: $severeCount", style = MaterialTheme.typography.bodySmall)
                            }
                            Text("RISK: $risk", fontWeight = FontWeight.ExtraBold)
                        }
                    }
                }

                if (resp.detections.isEmpty()) {
                    item {
                        Text(
                            "No potholes detected! The road looks good.",
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                } else {
                    item {
                        Text(
                            "Detections (${resp.detections.size})",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    items(resp.detections) { d ->
                        val severityColor = when (d.severity.lowercase()) {
                            "severe" -> Color(0xFFD32F2F)
                            "not severe" -> Color(0xFF388E3C)
                            else -> Color(0xFFF57C00)
                        }

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(12.dp)
                                    .height(60.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(severityColor.copy(alpha = 0.1f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = severityColor
                                    )
                                }

                                Spacer(Modifier.size(16.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        d.class_name.replaceFirstChar { it.uppercase() },
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        "Confidence: ${(d.confidence * 100).toInt()}%",
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        d.severity.uppercase(),
                                        style = MaterialTheme.typography.labelLarge,
                                        color = severityColor,
                                        fontWeight = FontWeight.ExtraBold
                                    )
                                    Text(
                                        "SEVERITY",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.outline
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun copyUriToCache(context: Context, uri: Uri, fileName: String): File {
    val outFile = File(context.cacheDir, fileName)
    context.contentResolver.openInputStream(uri).use { input ->
        if (input == null) throw RuntimeException("Unable to open selected image")
        outFile.outputStream().use { output -> input.copyTo(output) }
    }
    return outFile
}
