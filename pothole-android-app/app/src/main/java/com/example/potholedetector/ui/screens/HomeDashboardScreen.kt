package com.example.potholedetector.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.potholedetector.ui.theme.*

data class ReportItem(val title: String, val subtitle: String, val status: ReportStatus)
enum class ReportStatus(val label: String, val color: Color) {
    PENDING("Pending", PotholeColors.Yellow), RESOLVED("Resolved", PotholeColors.Green), IN_REVIEW("In Review", PotholeColors.BlueLight)
}
private enum class NavDestination(val label: String, val icon: ImageVector) {
    HOME("Home", Icons.Default.Home), MAP("Map", Icons.Default.Place), HISTORY("History", Icons.Default.List), PROFILE("Profile", Icons.Default.Person)
}

@Composable
fun HomeDashboardScreen(onDetectPotholeClick: () -> Unit, onUploadImageClick: () -> Unit) {
    val reports = listOf(
        ReportItem("MG Road, Sector 4", "Medium • 2h ago", ReportStatus.PENDING),
        ReportItem("Ring Road Bypass", "High • 1d ago", ReportStatus.RESOLVED)
    )
    var selectedNav by remember { mutableStateOf(NavDestination.HOME) }
    Scaffold(containerColor = PotholeColors.DarkBg2, bottomBar = {
        NavigationBar(containerColor = PotholeColors.DarkBg2) {
            NavDestination.entries.forEach { destination ->
                NavigationBarItem(selected = selectedNav == destination, onClick = { selectedNav = destination },
                    icon = { Icon(destination.icon, destination.label) }, label = { Text(destination.label, fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = PotholeColors.BlueLight, selectedTextColor = PotholeColors.BlueLight, indicatorColor = Color.Transparent))
            }
        }
    }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp)) {
            item { Greeting() }
            item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ActionCard(Modifier.weight(1f), "Detect Pothole", Icons.Default.CameraAlt, PotholeBrushes.blueCardGradient(), onDetectPotholeClick)
                ActionCard(Modifier.weight(1f), "Upload Image", Icons.Default.FileUpload, PotholeBrushes.orangeCardGradient(), onUploadImageClick)
            } }
            item { DashboardRow(Icons.Default.Warning, "Report a Pothole") }
            item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard(Modifier.weight(1f), "128", "Nearby Reports", PotholeColors.BlueLight)
                StatCard(Modifier.weight(1f), "34", "Resolved", PotholeColors.OrangeLight)
            } }
            item { Text("Recent Reports", color = PotholeColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
            items(reports) { ReportRow(it) }
        }
    }
}

@Composable private fun Greeting() = Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
    Column { Text("Good morning,", color = PotholeColors.TextDim, fontSize = 12.sp); Text("Aditya Rao", color = PotholeColors.TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold) }
    Box(Modifier.size(42.dp).background(PotholeBrushes.logoGradient, RoundedCornerShape(13.dp)))
}
@Composable private fun ActionCard(modifier: Modifier, label: String, icon: ImageVector, brush: androidx.compose.ui.graphics.Brush, onClick: () -> Unit) =
    Column(modifier.background(brush, RoundedCornerShape(PotholeShapes.cardRadius)).clickable(onClick = onClick).padding(16.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
        Icon(icon, null, tint = PotholeColors.TextPrimary); Text(label, color = PotholeColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
    }
@Composable private fun DashboardRow(icon: ImageVector, label: String) = Row(Modifier.fillMaxWidth().background(PotholeColors.GlassFill, RoundedCornerShape(16.dp)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
    Icon(icon, null, tint = PotholeColors.OrangeLight); Spacer(Modifier.width(10.dp)); Text(label, Modifier.weight(1f), color = PotholeColors.TextPrimary, fontWeight = FontWeight.SemiBold); Icon(Icons.Default.ChevronRight, null, tint = PotholeColors.TextDim)
}
@Composable private fun StatCard(modifier: Modifier, value: String, label: String, color: Color) = Column(modifier.background(PotholeColors.GlassFill, RoundedCornerShape(14.dp)).padding(12.dp)) {
    Text(value, color = color, fontWeight = FontWeight.Bold, fontSize = 18.sp); Text(label, color = PotholeColors.TextDim, fontSize = 10.sp)
}
@Composable private fun ReportRow(report: ReportItem) = Row(Modifier.fillMaxWidth().background(PotholeColors.GlassFill, RoundedCornerShape(14.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
    Column(Modifier.weight(1f)) { Text(report.title, color = PotholeColors.TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp); Text(report.subtitle, color = PotholeColors.TextDim, fontSize = 10.sp) }
    Text(report.status.label, color = report.status.color, fontSize = 10.sp, fontWeight = FontWeight.Bold)
}
