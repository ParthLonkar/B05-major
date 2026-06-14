package com.example.potholedetector.util

import android.graphics.Bitmap
import android.graphics.BitmapFactory

fun decodeBitmap(bytes: ByteArray): Bitmap {
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        ?: throw RuntimeException("Failed to decode image")
}

