
export const contentViewSwiftTemplate = `import SwiftUI

struct Message: Identifiable {
    let id = UUID()
    let text: String
    let isUser: Bool
}

struct ContentView: View {
    @State private var messageText: String = ""
    @State private var messages: [Message] = [
        Message(text: "Olá! Bem-vindo ao {{APP_NAME}}.", isUser: false)
    ]
    
    var body: some View {
        VStack {
            HStack {
                Text("{{APP_NAME}}")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Spacer()
                if "{{WEB_LINK}}" != "" {
                    Link("Visitar Site", destination: URL(string: "{{WEB_LINK}}")!)
                        .font(.caption)
                        .padding(8)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                }
            }
            .padding()

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(messages) { message in
                        HStack {
                            if message.isUser { Spacer() }
                            Text(message.text)
                                .padding()
                                .background(message.isUser ? Color.blue : Color(.systemGray5))
                                .foregroundColor(message.isUser ? .white : .primary)
                                .cornerRadius(16)
                            if !message.isUser { Spacer() }
                        }
                    }
                }
                .padding()
            }

            HStack {
                TextField("Digite uma mensagem...", text: $messageText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding(.horizontal)

                Button(action: sendMessage) {
                    Image(systemName: "paperplane.fill")
                        .foregroundColor(.white)
                        .padding(10)
                        .background(Color.blue)
                        .clipShape(Circle())
                }
                .padding(.trailing)
            }
            .padding(.bottom)
        }
        .preferredColorScheme({{IS_DARK_THEME}} ? .dark : .light)
    }

    func sendMessage() {
        guard !messageText.isEmpty else { return }
        let userMsg = Message(text: messageText, isUser: true)
        messages.append(userMsg)
        
        let sentText = messageText
        messageText = ""
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            let aiMsg = Message(text: "Recebi seu: \(sentText)", isUser: false)
            messages.append(aiMsg)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
`;

export const mainAppSwiftTemplate = `import SwiftUI

@main
struct {{APP_NAME_SNAKE}}App: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`;

export const packageSwiftTemplate = `// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "{{APP_NAME_SNAKE}}",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .executable(name: "{{APP_NAME_SNAKE}}", targets: ["{{APP_NAME_SNAKE}}"])
    ],
    targets: [
        .executableTarget(
            name: "{{APP_NAME_SNAKE}}",
            path: "Sources"
        )
    ]
)
`;

export const infoPlistTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>{{PACKAGE_NAME}}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>{{APP_NAME}}</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<false/>
	</dict>
	<key>UILaunchScreen</key>
	<dict/>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
</dict>
</plist>
`;
