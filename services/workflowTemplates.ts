export interface WorkflowTemplateItem {
  id: string;
  name: string;
  category: 'android' | 'ios' | 'testing' | 'quality' | 'security';
  description: string;
  icon: string;
  filename: string;
  content: string;
}

export const androidWorkflowTemplate = `name: Android CI/CD Pipeline

on:
  push:
    branches: [ "{{BRANCH}}" ]
  pull_request:
    branches: [ "{{BRANCH}}" ]
  workflow_dispatch:

jobs:
  ktlint_check:
    name: Ktlint & Code Style Check
    runs-on: {{RUNNER}}

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Grant Execute Permission for Gradlew
        run: chmod +x gradlew

      - name: Run Ktlint Code Format & Style Check (Google Style Guide)
        run: |
          curl -sSLO https://github.com/pinterest/ktlint/releases/download/1.3.1/ktlint
          chmod a+x ktlint
          ./ktlint "app/src/**/*.kt" --reporter=plain || echo "Ktlint encontrou avisos de formatação estilo Google, prosseguindo com a pipeline."

      - name: Run Android Gradle Lint
        run: ./gradlew lint || true

  build_and_test:
    name: Build & Test Android App
    needs: ktlint_check
    runs-on: {{RUNNER}}

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Grant Execute Permission for Gradlew
        run: chmod +x gradlew

      - name: Decode Release Keystore (App Signing)
        if: \${{ secrets.KEYSTORE_BASE64 != '' }}
        env:
          KEYSTORE_BASE64: \${{ secrets.KEYSTORE_BASE64 }}
        run: |
          mkdir -p app
          echo "$KEYSTORE_BASE64" | base64 --decode > app/release.keystore

      - name: Run Unit Tests
        run: ./gradlew test

      - name: Build Debug APK
        run: ./gradlew assembleDebug

      - name: Build Release APK
        env:
          KEYSTORE_STORE_PASSWORD: \${{ secrets.KEYSTORE_STORE_PASSWORD }}
          KEYSTORE_KEY_ALIAS: \${{ secrets.KEYSTORE_KEY_ALIAS }}
          KEYSTORE_KEY_PASSWORD: \${{ secrets.KEYSTORE_KEY_PASSWORD }}
        run: ./gradlew assembleRelease

      - name: Build Release AAB (Android App Bundle)
        env:
          KEYSTORE_STORE_PASSWORD: \${{ secrets.KEYSTORE_STORE_PASSWORD }}
          KEYSTORE_KEY_ALIAS: \${{ secrets.KEYSTORE_KEY_ALIAS }}
          KEYSTORE_KEY_PASSWORD: \${{ secrets.KEYSTORE_KEY_PASSWORD }}
        run: ./gradlew bundleRelease

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: debug-apk
          path: app/build/outputs/apk/debug/*.apk

      - name: Upload Release APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-apk
          path: app/build/outputs/apk/release/*.apk

      - name: Upload Release AAB Artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-aab
          path: app/build/outputs/bundle/release/*.aab

      - name: Deploy AAB to Firebase App Distribution
        if: \${{ secrets.FIREBASE_APP_ID != '' && secrets.FIREBASE_TOKEN != '' }}
        uses: w9jds/firebase-action@v2.2.1
        with:
          args: appdistribution:distribute app/build/outputs/bundle/release/app-release.aab --app \${{ secrets.FIREBASE_APP_ID }} --testers "{{FIREBASE_TESTERS}}" --release-notes "{{FIREBASE_RELEASE_NOTES}}"
        env:
          FIREBASE_TOKEN: \${{ secrets.FIREBASE_TOKEN }}

      - name: Upload Test Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-reports
          path: app/build/reports/tests/
`;

export const espressoWorkflowTemplate = `name: Android Espresso UI Tests

on:
  push:
    branches: [ "{{BRANCH}}" ]
  pull_request:
    branches: [ "{{BRANCH}}" ]
  workflow_dispatch:

jobs:
  espresso_testing:
    name: Espresso UI Instrumentation Tests
    runs-on: macos-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Grant Execute Permission for Gradlew
        run: chmod +x gradlew

      - name: Run Android Instrumentation Tests (Emulator API 29)
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 29
          script: ./gradlew connectedCheck
`;

export const detektWorkflowTemplate = `name: Detekt Static Code Analysis

on:
  push:
    branches: [ "{{BRANCH}}" ]
  pull_request:
    branches: [ "{{BRANCH}}" ]
  workflow_dispatch:

jobs:
  detekt_check:
    name: Detekt Static Code Inspection
    runs-on: {{RUNNER}}

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Grant Execute Permission for Gradlew
        run: chmod +x gradlew

      - name: Run Detekt Code Quality Analysis
        run: ./gradlew detekt || echo "Detekt encontrou avisos, continuando a pipeline."
`;

export const lintingWorkflowTemplate = `name: Android Lint & Ktlint Format

on:
  push:
    branches: [ "{{BRANCH}}" ]
  pull_request:
    branches: [ "{{BRANCH}}" ]
  workflow_dispatch:

jobs:
  lint_and_format:
    name: Lint & Style Format Verification
    runs-on: {{RUNNER}}

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Grant Execute Permission for Gradlew
        run: chmod +x gradlew

      - name: Run Ktlint Check
        run: |
          curl -sSLO https://github.com/pinterest/ktlint/releases/download/1.3.1/ktlint
          chmod a+x ktlint
          ./ktlint "app/src/**/*.kt" --reporter=plain || true

      - name: Run Android Lint Check
        run: ./gradlew lintDebug
`;

export const iosWorkflowTemplate = `name: iOS Build & Deploy

on:
  push:
    branches: [ "{{BRANCH}}" ]
  workflow_dispatch:

jobs:
  build:
    name: Build iOS App
    runs-on: macos-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set Xcode Version
        run: sudo xcode-select -s /Applications/Xcode_15.0.app/Contents/Developer

      - name: Install the Apple Certificate and Provisioning Profile
        env:
          BUILD_CERTIFICATE_BASE64: \${{ secrets.BUILD_CERTIFICATE_BASE64 }}
          P12_PASSWORD: \${{ secrets.P12_PASSWORD }}
          BUILD_PROVISION_PROFILE_BASE64: \${{ secrets.BUILD_PROVISION_PROFILE_BASE64 }}
          KEYCHAIN_PASSWORD: \${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          CERTIFICATE_PATH=$RUNNER_TEMP/build_certificate.p12
          PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

          echo -n "$BUILD_CERTIFICATE_BASE64" | base64 --decode -o $CERTIFICATE_PATH
          echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o $PP_PATH

          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-chain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

          security import $CERTIFICATE_PATH -P "$P12_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH

          mkdir -p ~/Library/MobileDevice/Provisioning\\ Profiles
          cp $PP_PATH ~/Library/MobileDevice/Provisioning\\ Profiles

      - name: Build Archive
        run: |
          xcodebuild -scheme "{{APP_NAME}}" \\
          -archivePath $RUNNER_TEMP/{{APP_NAME}}.xcarchive \\
          -sdk iphoneos \\
          -configuration Release \\
          archive

      - name: Export IPA
        env:
          EXPORT_OPTIONS_PLIST: \${{ secrets.EXPORT_OPTIONS_PLIST }}
        run: |
          EXPORT_OPTS_PATH=$RUNNER_TEMP/ExportOptions.plist
          echo -n "$EXPORT_OPTIONS_PLIST" | base64 --decode -o $EXPORT_OPTS_PATH
          xcodebuild -exportArchive \\
          -archivePath $RUNNER_TEMP/{{APP_NAME}}.xcarchive \\
          -exportOptionsPlist $EXPORT_OPTS_PATH \\
          -exportPath $RUNNER_TEMP/build/ipa

      - name: Upload IPA Artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-ipa
          path: \${{ runner.temp }}/build/ipa/*.ipa

  deploy:
    name: Deploy to TestFlight
    needs: build
    runs-on: macos-latest
    steps:
      - name: Download IPA
        uses: actions/download-artifact@v4
        with:
          name: release-ipa

      - name: Upload to TestFlight
        env:
          APPLEID_USERNAME: \${{ secrets.APPLEID_USERNAME }}
          APPLEID_PASSWORD: \${{ secrets.APPLEID_PASSWORD }}
        run: |
          xcrun altool --upload-app \\
          --type ios \\
          --file *.ipa \\
          --username "$APPLEID_USERNAME" \\
          --password "$APPLEID_PASSWORD"
`;

export const playConsoleWorkflowTemplate = `name: Google Play Console Publisher (Android Publisher API)

on:
  push:
    branches: [ "{{BRANCH}}" ]
  workflow_dispatch:

jobs:
  publish_play_console:
    name: Deploy AAB to Google Play Console
    runs-on: {{RUNNER}}

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Grant Execute Permission for Gradlew
        run: chmod +x gradlew

      - name: Decode Release Keystore
        if: \${{ secrets.KEYSTORE_BASE64 != '' }}
        env:
          KEYSTORE_BASE64: \${{ secrets.KEYSTORE_BASE64 }}
        run: |
          mkdir -p app
          echo "$KEYSTORE_BASE64" | base64 --decode > app/release.keystore

      - name: Build Release AAB (Android App Bundle)
        env:
          KEYSTORE_STORE_PASSWORD: \${{ secrets.KEYSTORE_STORE_PASSWORD }}
          KEYSTORE_KEY_ALIAS: \${{ secrets.KEYSTORE_KEY_ALIAS }}
          KEYSTORE_KEY_PASSWORD: \${{ secrets.KEYSTORE_KEY_PASSWORD }}
        run: ./gradlew bundleRelease

      - name: Upload AAB Artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-aab
          path: app/build/outputs/bundle/release/*.aab

      - name: Publish AAB to Google Play Console Tracks (Android Publisher API)
        if: \${{ secrets.PLAY_CONFIG_JSON != '' }}
        uses: raddel/google-play-publish@v1
        with:
          serviceAccountJsonPlainText: \${{ secrets.PLAY_CONFIG_JSON }}
          packageName: '{{PACKAGE_NAME}}'
          releaseFiles: app/build/outputs/bundle/release/app-release.aab
          track: 'internal'
          status: 'completed'
`;

export const dependabotTemplate = `# .github/dependabot.yml
version: 2
updates:
  # Automate updates for GitHub Actions workflows
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "github-actions"

  # Automate updates for Gradle (Android dependencies and plugins)
  - package-ecosystem: "gradle"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "gradle"
      - "android"
`;

export const WORKFLOW_TEMPLATES: WorkflowTemplateItem[] = [
  {
    id: 'android_cicd',
    name: 'Android CI/CD Pipeline',
    category: 'android',
    description: 'Build completo, testes unitários, APK/AAB e Firebase App Distribution.',
    icon: '⚡',
    filename: '.github/workflows/android.yml',
    content: androidWorkflowTemplate
  },
  {
    id: 'play_console_deploy',
    name: 'Google Play Console Auto-Publish',
    category: 'android',
    description: 'Envio automático de arquivos .aab para faixas de teste na Play Store via Android Publisher API.',
    icon: '🎯',
    filename: '.github/workflows/play-console-deploy.yml',
    content: playConsoleWorkflowTemplate
  },
  {
    id: 'espresso_testing',
    name: 'Espresso UI Testing',
    category: 'testing',
    description: 'Testes de interface de usuário com Espresso no emulador Android.',
    icon: '🧪',
    filename: '.github/workflows/espresso-tests.yml',
    content: espressoWorkflowTemplate
  },
  {
    id: 'detekt_analysis',
    name: 'Detekt Static Analysis',
    category: 'quality',
    description: 'Análise estática de código Kotlin para garantir boas práticas e padrões.',
    icon: '🔍',
    filename: '.github/workflows/detekt.yml',
    content: detektWorkflowTemplate
  },
  {
    id: 'lint_ktlint',
    name: 'Android Lint & Ktlint',
    category: 'quality',
    description: 'Verificação de padrões Google Style Guide e Android Gradle Lint.',
    icon: '✨',
    filename: '.github/workflows/lint-check.yml',
    content: lintingWorkflowTemplate
  },
  {
    id: 'ios_cicd',
    name: 'iOS Build & TestFlight',
    category: 'ios',
    description: 'Compilação Xcode, assinatura e deployment automático para o TestFlight.',
    icon: '🍎',
    filename: '.github/workflows/ios.yml',
    content: iosWorkflowTemplate
  },
  {
    id: 'dependabot',
    name: 'Dependabot Auto-Updater',
    category: 'security',
    description: 'Automação de atualizações de segurança para Gradle e GitHub Actions.',
    icon: '🤖',
    filename: '.github/dependabot.yml',
    content: dependabotTemplate
  }
];
