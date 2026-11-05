package com.henrijamet.tachesmenageres

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.File

class MainActivity : ComponentActivity() {

    class AndroidNativeBridge(private val context: Context) {
        private val backupFile = File(context.filesDir, "taches_menageres_sessions.json")

        @JavascriptInterface
        fun saveBackupJson(json: String) {
            try {
                val tempFile = File(context.filesDir, "taches_menageres_sessions.json.tmp")
                tempFile.writeText(json, Charsets.UTF_8)
                if (tempFile.exists()) {
                    tempFile.renameTo(backupFile)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @JavascriptInterface
        fun loadBackupJson(): String {
            return try {
                if (backupFile.exists()) {
                    backupFile.readText(Charsets.UTF_8)
                } else {
                    ""
                }
            } catch (e: Exception) {
                e.printStackTrace()
                ""
            }
        }

        @JavascriptInterface
        fun shareCsv(filename: String, csvContent: String) {
            try {
                val csvFile = File(context.cacheDir, filename)
                csvFile.writeText(csvContent, Charsets.UTF_8)

                val uri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    csvFile
                )

                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/csv"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_SUBJECT, "Export Tâches Ménagères")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                val chooser = Intent.createChooser(intent, "Partager le CSV via...")
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(chooser)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Configuration des couleurs de barres système
        window.statusBarColor = Color.parseColor("#0F172A")
        window.navigationBarColor = Color.parseColor("#0F172A")

        val container = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowFileAccessFromFileURLs = true
            settings.allowUniversalAccessFromFileURLs = true
            webViewClient = WebViewClient()
            addJavascriptInterface(AndroidNativeBridge(this@MainActivity), "AndroidNativeBridge")
            loadUrl("file:///android_asset/index.html")
        }

        container.addView(webView)

        // Gestion Edge-to-Edge Android 15 (Pixel) : padding automatique contre status bar et barres de navigation
        ViewCompat.setOnApplyWindowInsetsListener(container) { view, insets ->
            val systemBars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        setContentView(container)
    }
}
