import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// The website. The app places orders through its /api/orders route (the same
// rate limit, opening-hours check and pricing as the website), and its
// assetlinks.json lets order links open in the app.
val siteHost = "brew-ni-cat-connect.vercel.app"
val siteUrl = "https://$siteHost"

// The Supabase project address and publishable key: the same public values the
// website ships to every browser (never the service-role key). They are read at
// build time from the environment, Gradle properties, or the website's
// .env.local, so they are not committed here. Without them the app builds and
// shows that the menu can't load (CI builds it that way).
val webEnv = Properties().apply {
    val file = rootProject.file("../.env.local")
    if (file.isFile) file.inputStream().use { load(it) }
}
fun publicConfig(key: String): String =
    (System.getenv(key) ?: providers.gradleProperty(key).orNull ?: webEnv.getProperty(key) ?: "")
        .trim().removeSurrounding("\"")
fun buildConfigString(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

// The release key lives outside the repository. Point BNC_ANDROID_KEYSTORE_PROPERTIES
// at a properties file with storeFile, storePassword, keyAlias and keyPassword,
// or put android/keystore.properties next to this project (it is ignored by git).
// Without one, the release build is unsigned (CI builds it that way).
val keystoreProps = Properties().apply {
    val path = System.getenv("BNC_ANDROID_KEYSTORE_PROPERTIES")
        ?: rootProject.file("keystore.properties").path
    val file = file(path)
    if (file.isFile) file.inputStream().use { load(it) }
}
val hasReleaseKey = keystoreProps.getProperty("storeFile")?.isNotBlank() == true

android {
    namespace = "com.brewnicat.connect"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.brewnicat.connect"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "1.0.0"

        buildConfigField("String", "SITE_URL", buildConfigString(siteUrl))
        buildConfigField("String", "SUPABASE_URL", buildConfigString(publicConfig("NEXT_PUBLIC_SUPABASE_URL")))
        buildConfigField(
            "String",
            "SUPABASE_PUBLISHABLE_KEY",
            buildConfigString(publicConfig("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")),
        )
        manifestPlaceholders["siteHost"] = siteHost
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            // For trying checkout without touching the live shop: point a debug build
            // at android/tools/mock_backend.py (e.g. BNC_DEBUG_BACKEND=http://10.0.2.2:8787
            // from the emulator). Release builds always use the real site.
            val backend = System.getenv("BNC_DEBUG_BACKEND").orEmpty().trim()
            if (backend.isNotEmpty()) {
                buildConfigField("String", "SITE_URL", buildConfigString(backend))
                buildConfigField("String", "SUPABASE_URL", buildConfigString(backend))
            }
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasReleaseKey) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }

    lint {
        abortOnError = true
        warningsAsErrors = true
        lintConfig = file("lint.xml")
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.09.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    testImplementation("junit:junit:4.13.2")
    // The real org.json for JVM tests; android.jar only has stubs.
    testImplementation("org.json:json:20250517")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
}
