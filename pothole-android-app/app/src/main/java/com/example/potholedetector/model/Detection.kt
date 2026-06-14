package com.example.potholedetector.model

data class Detection(
    val class_id: Int,
    val class_name: String,
    val confidence: Double,
    val severity: String = "Neutral", // Added severity: "Severe", "Not Severe", "Neutral"
    val x1: Double,
    val y1: Double,
    val x2: Double,
    val y2: Double
)

data class PredictResponse(
    val detections: List<Detection>
)

