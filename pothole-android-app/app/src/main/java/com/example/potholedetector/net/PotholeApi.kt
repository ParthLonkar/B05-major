package com.example.potholedetector.net

import com.example.potholedetector.config.AppConfig
import com.example.potholedetector.model.PredictResponse
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

class PotholeApi(
    private val client: OkHttpClient = OkHttpClient()
) {
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val predictAdapter = moshi.adapter(PredictResponse::class.java)

    fun health(): Boolean {
        val req = Request.Builder()
            .url("${AppConfig.BASE_URL}/health")
            .get()
            .build()
        client.newCall(req).execute().use { resp ->
            return resp.isSuccessful
        }
    }

    fun predictJson(imageFile: File, conf: Float? = null, iou: Float? = null): PredictResponse {
        val builder = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "file",
                imageFile.name,
                imageFile.asRequestBody("image/*".toMediaType())
            )
        if (conf != null) builder.addFormDataPart("conf", conf.toString())
        if (iou != null) builder.addFormDataPart("iou", iou.toString())
        val body = builder.build()

        val req = Request.Builder()
            .url("${AppConfig.BASE_URL}/predict/image")
            .post(body)
            .build()

        client.newCall(req).execute().use { resp ->
            val raw = resp.body?.string() ?: ""
            if (!resp.isSuccessful) {
                throw RuntimeException("Predict failed: ${resp.code} $raw")
            }
            return predictAdapter.fromJson(raw) ?: throw RuntimeException("Invalid JSON response")
        }
    }

    fun predictAnnotatedPng(imageFile: File, conf: Float? = null, iou: Float? = null): ByteArray {
        val builder = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "file",
                imageFile.name,
                imageFile.asRequestBody("image/*".toMediaType())
            )
        if (conf != null) builder.addFormDataPart("conf", conf.toString())
        if (iou != null) builder.addFormDataPart("iou", iou.toString())
        val body = builder.build()

        val req = Request.Builder()
            .url("${AppConfig.BASE_URL}/predict/image/annotated")
            .post(body)
            .build()

        client.newCall(req).execute().use { resp ->
            val bytes = resp.body?.bytes() ?: ByteArray(0)
            if (!resp.isSuccessful) {
                throw RuntimeException("Annotated predict failed: ${resp.code}")
            }
            return bytes
        }
    }
}
