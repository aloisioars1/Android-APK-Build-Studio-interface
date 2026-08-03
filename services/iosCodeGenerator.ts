
import { AppConfig, GeneratedCode } from '../types';
import { contentViewSwiftTemplate, mainAppSwiftTemplate, infoPlistTemplate, packageSwiftTemplate } from './iosTemplates';
import { iosWorkflowTemplate } from './workflowTemplates';

export function generateIOSProject(config: AppConfig): Partial<GeneratedCode> {
  const isDarkTheme = config.theme === 'dark';
  const appNameSnake = config.appName.replace(/\s+/g, '');

  const contentViewSwift = contentViewSwiftTemplate
    .replace(/{{APP_NAME}}/g, config.appName)
    .replace(/{{WEB_LINK}}/g, config.webLink || '')
    .replace(/{{IS_DARK_THEME}}/g, isDarkTheme.toString());

  const mainAppSwift = mainAppSwiftTemplate
    .replace(/{{APP_NAME_SNAKE}}/g, appNameSnake);

  const packageSwift = packageSwiftTemplate
    .replace(/{{APP_NAME_SNAKE}}/g, appNameSnake);

  const infoPlist = infoPlistTemplate
    .replace(/{{PACKAGE_NAME}}/g, config.packageName)
    .replace(/{{APP_NAME}}/g, config.appName);

  const githubWorkflow = iosWorkflowTemplate
    .replace(/{{BRANCH}}/g, config.workflowBranch)
    .replace(/{{APP_NAME}}/g, config.appName)
    .replace(/{{PACKAGE_NAME}}/g, config.packageName);

  return {
    contentViewSwift,
    mainAppSwift,
    packageSwift,
    infoPlist,
    githubWorkflow,
    appDelegate: '', // For SwiftUI we use @main
    viewController: '',
    storyboard: ''
  };
}
