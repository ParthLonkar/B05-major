package com.example.potholedetector

import android.app.Application
import android.graphics.Bitmap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.potholedetector.model.PredictResponse
import com.example.potholedetector.net.PotholeApi
import com.example.potholedetector.util.decodeBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.File

data class UiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val annotated: Bitmap? = null,
    val response: PredictResponse? = null
)

class MainViewModel(app: Application) : AndroidViewModel(app) {
    private val api = PotholeApi()

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state

    fun runPrediction(imageFile: File, conf: Float = 0.25f, iou: Float = 0.45f) {
        _state.value = UiState(isLoading = true)
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val response = api.predictJson(imageFile, conf = conf, iou = iou)
                val annotatedBytes = api.predictAnnotatedPng(imageFile, conf = conf, iou = iou)
                val bmp = decodeBitmap(annotatedBytes)
                _state.value = UiState(isLoading = false, annotated = bmp, response = response)
            } catch (e: Exception) {
                _state.value = UiState(isLoading = false, error = e.message ?: "Unknown error")
            }
        }
    }
}
