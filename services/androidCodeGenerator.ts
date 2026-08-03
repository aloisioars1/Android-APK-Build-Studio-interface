
// services/androidCodeGenerator.ts
import { AppConfig, GeneratedCode } from '../types';
import { generateIcon } from '../utils/iconGenerator';
import { generatePWAAssets } from './pwaGenerator';
import { mainActivityKtTemplate } from './kotlinTemplates';
import { generateIOSProject } from './iosCodeGenerator';
import { androidWorkflowTemplate, dependabotTemplate } from './workflowTemplates';
import { generateReadme } from './readmeGenerator';

export async function generateAndroidProject(config: AppConfig): Promise<GeneratedCode> {
  const isDarkTheme = config.theme === 'dark';

  const mainActivity = (mainActivityKtTemplate as string)
    .replace(/{{PACKAGE_NAME}}/g, config.packageName)
    .replace(/{{APP_NAME}}/g, config.appName)
    .replace(/{{IS_DARK_THEME}}/g, isDarkTheme.toString());

  const layout = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="${isDarkTheme ? "@color/dark_bg" : "@color/light_bg"}"
    tools:context=".MainActivity">

    <View
        android:id="@+id/headerBg"
        android:layout_width="0dp"
        android:layout_height="?attr/actionBarSize"
        android:background="${isDarkTheme ? "@color/header_bg_dark" : "@color/header_bg_light"}"
        android:elevation="4dp"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

    <TextView
        android:id="@+id/txtAppName"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:text="${config.appName}"
        android:textSize="18sp"
        android:textStyle="bold"
        android:layout_marginStart="@dimen/screen_edge_margin"
        android:textColor="${isDarkTheme ? "@color/text_primary_dark" : "@color/text_primary_light"}"
        android:elevation="5dp"
        app:layout_constraintBottom_toBottomOf="@+id/headerBg"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="@+id/headerBg"
        app:layout_constraintEnd_toStartOf="@+id/btnVisitSite" />
        
    <com.google.android.material.button.MaterialButton
        android:id="@+id/btnVisitSite"
        style="@style/Widget.MaterialComponents.Button.TextButton"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Web"
        android:textSize="12sp"
        android:textColor="@color/send_button_tint"
        android:layout_marginEnd="@dimen/screen_edge_margin"
        android:visibility="${config.webLink ? "visible" : "gone"}"
        app:layout_constraintBottom_toBottomOf="@+id/headerBg"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="@+id/headerBg" />

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/recyclerViewChat"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:paddingTop="12dp"
        android:clipToPadding="false"
        app:layout_constraintTop_toBottomOf="@+id/headerBg"
        app:layout_constraintBottom_toTopOf="@+id/inputContainer"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:background="@android:color/transparent" />

    <androidx.constraintlayout.widget.ConstraintLayout
        android:id="@+id/inputContainer"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:paddingVertical="8dp"
        android:paddingHorizontal="@dimen/screen_edge_margin"
        android:background="${isDarkTheme ? "@color/input_area_bg_dark" : "@color/input_area_bg_light"}"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent">

        <EditText
            android:id="@+id/editTextMessage"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:hint="Sua mensagem..."
            android:background="@drawable/input_bg"
            android:paddingStart="16dp"
            android:paddingTop="10dp"
            android:paddingBottom="10dp"
            android:paddingEnd="16dp"
            android:minHeight="44dp"
            android:layout_marginEnd="8dp"
            android:textColor="${isDarkTheme ? "@color/text_primary_dark" : "@color/text_primary_light"}"
            android:textColorHint="${isDarkTheme ? "@color/text_secondary_dark" : "@color/text_secondary_light"}"
            android:inputType="textCapSentences|textMultiLine"
            android:maxLines="5"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintEnd_toStartOf="@+id/buttonSend"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintTop_toTopOf="parent" />

        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/buttonSend"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            app:fabCustomSize="44dp"
            app:srcCompat="@drawable/ic_send"
            app:tint="@android:color/white"
            app:backgroundTint="@color/send_button_tint"
            app:elevation="0dp"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintTop_toTopOf="parent" />
            
    </androidx.constraintlayout.widget.ConstraintLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`;

  const itemMessageLayout = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingHorizontal="@dimen/screen_edge_margin"
    android:paddingVertical="@dimen/chat_bubble_vertical_padding">

    <com.google.android.material.card.MaterialCardView
        android:id="@+id/messageCard"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:cardCornerRadius="18dp"
        app:cardElevation="2dp"
        app:strokeWidth="0dp"
        app:layout_constrainedWidth="true"
        app:layout_constraintWidth_max="300dp"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintHorizontal_bias="0.0"
        tools:layout_constraintHorizontal_bias="1.0"
        tools:cardBackgroundColor="#2563EB">

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:paddingHorizontal="14dp"
            android:paddingVertical="10dp">

            <TextView
                android:id="@+id/textViewSender"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textStyle="bold"
                android:textSize="9sp"
                android:textAllCaps="true"
                android:alpha="0.8"
                android:layout_marginBottom="2dp"
                tools:text="VOCÊ"
                tools:textColor="#FFFFFF" />

            <TextView
                android:id="@+id/textViewMessage"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textSize="15sp"
                android:lineSpacingExtra="3sp"
                tools:text="Olá! Esta é uma mensagem de exemplo com alinhamento inteligente."
                tools:textColor="#FFFFFF" />
        </LinearLayout>
    </com.google.android.material.card.MaterialCardView>
</androidx.constraintlayout.widget.ConstraintLayout>`;

  const inputBgDrawable = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <corners android:radius="22dp" />
    <solid android:color="${isDarkTheme ? "@color/input_bg_dark" : "@color/input_bg_light"}" />
    <stroke
        android:width="1dp"
        android:color="${isDarkTheme ? "@color/input_stroke_dark" : "@color/input_stroke_light"}" />
</shape>`;

  const icSendDrawable = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M2.01,21L23,12 2.01,3 2,10l15,2 -15,2z" />
</vector>`;

  const projectBuildGradle = `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath "com.android.tools.build:gradle:8.1.1"
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.8.10"
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}`;

  const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${config.appName}"
include ':app'`;

  const buildGradleApp = `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace '${config.packageName}'
    compileSdk 34

    defaultConfig {
        applicationId '${config.packageName}'
        minSdk 24
        targetSdk 34
        versionCode ${config.versionCode || 1}
        versionName "${config.versionName || '1.0.0'}"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        release {
            if (file("release.keystore").exists()) {
                storeFile file("release.keystore")
            } else {
                storeFile file("app/release.keystore")
            }
            storePassword System.getenv("KEYSTORE_STORE_PASSWORD") ?: "${config.keystoreStorePassword || 'android'}"
            keyAlias System.getenv("KEYSTORE_KEY_ALIAS") ?: "${config.keystoreAlias || 'upload_key'}"
            keyPassword System.getenv("KEYSTORE_KEY_PASSWORD") ?: "${config.keystoreKeyPassword || 'android'}"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.10.1'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.9.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.recyclerview:recyclerview:1.3.0'
    implementation 'androidx.security:security-crypto:1.1.0-alpha06'
}
`;

  const gradlew = `#!/usr/bin/env sh
APP_BASE_NAME=\`basename "$0"\`
APP_HOME=\`dirname "$0"\`
exec "$APP_HOME/gradle/wrapper/gradle-wrapper.jar" "$@"
`;

  const gradlewBat = `@if "%DEBUG%" == "" @echo off
set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%
java -jar "%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar" %*
`;

  const gradleWrapperProperties = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.1.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;

  const gradleWrapperJar = "UEsDBAoAAAAAAO..."; 

  const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="${config.appName}"
        android:supportsRtl="true"
        android:theme="@style/Theme.MeuApp"
        tools:targetApi="31">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const githubWorkflow = androidWorkflowTemplate
    .replace(/{{BRANCH}}/g, config.workflowBranch)
    .replace(/{{RUNNER}}/g, config.workflowRunner)
    .replace(/{{PACKAGE_NAME}}/g, config.packageName)
    .replace(/{{FIREBASE_TESTERS}}/g, config.firebaseTesters || 'dev-team@example.com, qa@example.com')
    .replace(/{{FIREBASE_RELEASE_NOTES}}/g, (config.firebaseReleaseNotes || 'Nova versão automatizada via CI/CD').replace(/"/g, '\\"'));

  const imageDataForIcons = config.iconType === 'image' && config.uploadedIcon ? config.uploadedIcon.data : undefined;
  const iconPng = await generateIcon(config.iconLabel, config.iconColor, config.iconTextColor, 432, false, imageDataForIcons);
  const iconRoundPng = await generateIcon(config.iconLabel, config.iconColor, config.iconTextColor, 432, true, imageDataForIcons);
  const faviconPng = await generateIcon(config.iconLabel, config.iconColor, config.iconTextColor, 32, false, imageDataForIcons);

  const pwaAssets = await generatePWAAssets(config);

  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="white">#FFFFFFFF</color>
    <color name="black">#FF000000</color>
    <color name="dark_bg">#FF020617</color>
    <color name="light_bg">#FFF8FAFC</color>
    <color name="header_bg_dark">#FF0F172A</color>
    <color name="header_bg_light">#FFFFFFFF</color>
    <color name="text_primary_dark">#FFF8FAFC</color>
    <color name="text_primary_light">#FF1E293B</color>
    <color name="text_secondary_dark">#FF94A3B8</color>
    <color name="text_secondary_light">#FF64748B</color>
    
    <!-- Cores de Chat Refatoradas -->
    <color name="chat_bubble_user_dark">${config.iconColor}</color>
    <color name="chat_bubble_user_light">${config.iconColor}</color>
    <color name="chat_text_user">#FFFFFFFF</color>
    <color name="chat_sender_user">#CCFFFFFF</color>

    <color name="chat_bubble_ai_dark">#FF1E293B</color>
    <color name="chat_bubble_ai_light">#FFFFFFFF</color>
    <color name="chat_text_ai_dark">#FFCBD5E1</color>
    <color name="chat_text_ai_light">#FF334155</color>
    <color name="chat_sender_ai_dark">#FF64748B</color>
    <color name="chat_sender_ai_light">#FF94A3B8</color>

    <color name="input_bg_dark">#FF020617</color>
    <color name="input_bg_light">#FFFFFFFF</color>
    <color name="input_stroke_dark">#FF1E293B</color>
    <color name="input_stroke_light">#FFE2E8F0</color>
    <color name="input_area_bg_dark">#FF0F172A</color>
    <color name="input_area_bg_light">#FFF1F5F9</color>
    <color name="send_button_tint">${config.iconColor}</color>
</resources>`;

  const themesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.MeuApp" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/send_button_tint</item>
        <item name="colorPrimaryVariant">@color/send_button_tint</item>
        <item name="colorOnPrimary">@color/white</item>
        <item name="android:statusBarColor">${isDarkTheme ? "@color/header_bg_dark" : "@color/header_bg_light"}</item>
        <item name="android:windowLightStatusBar">${!isDarkTheme}</item>
    </style>
</resources>`;
  
  const dimensXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <dimen name="chat_bubble_vertical_padding">4dp</dimen>
    <dimen name="screen_edge_margin">16dp</dimen>
</resources>`;

  const iosProj = generateIOSProject(config);

  return {
    mainActivity,
    mainActivityTest: '',
    layout,
    manifest,
    projectBuildGradle,
    settingsGradle,
    gradlew,
    gradlewBat,
    gradleWrapperProperties,
    gradleWrapperJar,
    buildGradleApp,
    itemMessageLayout,
    inputBgDrawable,
    icSendDrawable,
    viewController: iosProj.viewController || '',
    viewControllerTest: '',
    storyboard: iosProj.storyboard || '',
    infoPlist: iosProj.infoPlist || '',
    appDelegate: iosProj.appDelegate || '',
    sceneDelegate: '',
    contentViewSwift: iosProj.contentViewSwift || '',
    mainAppSwift: iosProj.mainAppSwift || '',
    packageSwift: iosProj.packageSwift || '',
    assetsCatalog: '',
    githubWorkflow,
    workflowPath: config.platform === 'android' ? '.github/workflows/android.yml' : '.github/workflows/ios_build.yml',
    iconPng,
    iconRoundPng,
    faviconPng,
    colorsXml,
    themesXml,
    dimensXml,
    manifestJson: pwaAssets.manifestJson,
    pwaIcon192Png: pwaAssets.pwaIcon192Png,
    pwaIcon512Png: pwaAssets.pwaIcon512Png,
    pwaIconMaskable512Png: pwaAssets.pwaIconMaskable512Png,
    cloudConfig: '',
    readmeMd: generateReadme(config),
    dependabotYml: dependabotTemplate
  };
}
