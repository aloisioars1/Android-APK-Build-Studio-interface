
export interface AppAsset {
  name: string;
  data: string; // Base64
  mimeType: string;
}

export interface UIComponent {
  type: 'button' | 'text' | 'input' | 'image' | 'spacer' | 'chat_message_display' | 'switch' | 'progress';
  label: string; 
  action?: string;
  color?: string; 
  value?: string | number | boolean;
}

export interface AppConfig {
  appName: string;
  webLink: string;
  uploadEndpoint: string;
  packageName: string;
  platform: 'android' | 'ios' | 'both';
  iconLabel: string;
  iconColor: string;
  iconFileName: string;
  iconType: 'text' | 'image';
  iconTextColor: string;
  uploadedIcon?: AppAsset | null;
  iconPrompt?: string;
  allowedMimeTypes: string;
  buildServerUrl: string;
  githubUser: string;
  githubRepo: string;
  githubToken: string;
  googleProjectId: string;
  cloudRegion: string;
  assets: AppAsset[];
  theme: 'light' | 'dark';
  components: UIComponent[]; 
  workflowName: string;
  workflowBranch: string;
  workflowRunner: string;
  modelName: string;
  systemInstruction: string;
  useSearch: boolean;
  thinkingBudget?: number;
  temperature?: number;
  // Keystore / App Signing Configs
  keystoreAlias?: string;
  keystoreStorePassword?: string;
  keystoreKeyPassword?: string;
  keystoreBase64?: string;
  keystoreFileName?: string;
  keystoreCn?: string;
  keystoreOrg?: string;
  autoSignRelease?: boolean;

  // Firebase App Distribution Configs
  firebaseAppId?: string;
  firebaseTesters?: string;
  firebaseReleaseNotes?: string;
  enableFirebaseDistribution?: boolean;

  // App Meta & Documentation
  appDescription?: string;
}

export enum TabType {
  PREVIEW = 'PREVIEW',
  KOTLIN = 'KOTLIN',
  SWIFT = 'SWIFT',
  GITHUB = 'GITHUB',
  KEYSTORE = 'KEYSTORE',
  AAB_EXPLORER = 'AAB_EXPLORER',
  BUILD_HISTORY = 'BUILD_HISTORY',
  DEPLOY = 'DEPLOY',
  MANIFEST_VALIDATOR = 'MANIFEST_VALIDATOR',
  README_GENERATOR = 'README_GENERATOR'
}

/* Updated ConversationMessage to include attachments which are used for file/image context */
export interface ConversationMessage {
  role: 'user' | 'model';
  text: string;
  configUpdate?: Partial<AppConfig>;
  sources?: { uri: string, title: string }[];
  attachments?: AppAsset[];
}

export interface GeneratedCode {
  // Android
  mainActivity: string;
  mainActivityTest: string;
  layout: string;
  manifest: string;
  projectBuildGradle: string;
  settingsGradle: string;
  gradlew: string;
  gradlewBat: string;
  gradleWrapperProperties: string;
  gradleWrapperJar: string;
  buildGradleApp: string;
  itemMessageLayout: string;
  inputBgDrawable: string;
  icSendDrawable: string;
  colorsXml: string;
  themesXml: string;
  dimensXml: string;

  // iOS
  viewController: string;
  viewControllerTest: string;
  storyboard: string;
  infoPlist: string;
  appDelegate: string;
  sceneDelegate: string;
  contentViewSwift: string;
  mainAppSwift: string;
  packageSwift: string;
  assetsCatalog: string; 

  // Common
  githubWorkflow: string;
  workflowPath: string;
  iconPng: string;
  iconRoundPng: string;
  faviconPng: string;
  cloudConfig?: string;
  manifestJson: string;
  pwaIcon192Png: string;
  pwaIcon512Png: string;
  pwaIconMaskable512Png: string;
  readmeMd?: string;
  dependabotYml?: string;
}
