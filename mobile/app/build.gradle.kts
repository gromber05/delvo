plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.gromber05.delvo"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.gromber05.delvo"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    // --- BOM (usa la misma versión para todo Compose) ---
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))

    // --- Material 3 ---
    implementation("androidx.compose.material3:material3")

    // --- Foundation / Layout / LazyList / ExperimentalFoundationApi ---
    implementation("androidx.compose.foundation:foundation")

    // --- Runtime + State + LiveData/Flow adapters (opcional) ---
    implementation("androidx.compose.runtime:runtime")

    // --- UI + Tooling + Preview ---
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // --- Icons (Filled) ---
    implementation("androidx.compose.material:material-icons-extended")

    // --- Animations (AnimatedContent) ---
    implementation("androidx.compose.animation:animation")

    // --- Activity Compose integration ---
    implementation("androidx.activity:activity-compose:1.9.3")

    //Coil
    implementation("io.coil-kt:coil-compose:2.2.2")


    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}