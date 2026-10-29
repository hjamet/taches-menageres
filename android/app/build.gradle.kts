plugins {
  alias(libs.plugins.android.application)
}

android {
  namespace = "com.henrijamet.tachesmenageres"
  compileSdk = 36

  defaultConfig {
    applicationId = "com.henrijamet.tachesmenageres"
    minSdk = 26
    targetSdk = 36
    versionCode = 1
    versionName = "1.0"
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
  }
}

kotlin {
  jvmToolchain(17)
}

dependencies {
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.activity)
}

// Tâche automatique de synchronisation des assets Web -> Android assets
val syncAssetsTask = tasks.register<Copy>("syncWebAssets") {
  from(file("../../web")) {
    include("index.html", "style.css", "core.js", "app.js", "manifest.json", "sw.js")
  }
  into(file("src/main/assets"))
}

tasks.named("preBuild") {
  dependsOn(syncAssetsTask)
}
