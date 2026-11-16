/** `@porbit/style/lsp`: language server (stdio) và dịch vụ ngôn ngữ dùng chung cho editor. */
export { startLanguageServer, loadWorkspaceConfig, readServerSettings, hasServerSettings, type LanguageServerOptions, type ServerSettings } from './lsp'
export {
    createLanguageService,
    type LanguageService,
    type ServiceCodeAction,
    type ServiceColor,
    type ServiceCompletion,
    type ServiceDiagnostic,
    type ServiceEdit,
    type ServiceHover,
} from './language-service'
