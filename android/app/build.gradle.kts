import java.util.Properties

plugins {
    id("com.android.application")
}

// The site the app opens. It must match public/.well-known/assetlinks.json on
// that site, or Chrome shows its address bar over the app.
val siteHost = "brew-ni-cat-connect.vercel.app"
val siteUrl = "https://$siteHost/"

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
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        resValue("string", "default_url", siteUrl)
        resValue(
            "string",
            "asset_statements",
            """[{ \"relation\": [\"delegate_permission/common.handle_all_urls\"], \"target\": { \"namespace\": \"web\", \"site\": \"https://$siteHost\" } }]""",
        )
        manifestPlaceholders["siteHost"] = siteHost
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

    lint {
        abortOnError = true
        warningsAsErrors = true
        lintConfig = file("lint.xml")
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.4")
}
