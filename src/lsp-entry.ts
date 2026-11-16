/** `@porbit/style/lsp`: language server (stdio) và dịch vụ ngôn ngữ dùng chung cho editor. */
export { startLanguageServer, loadWorkspaceConfig, type LanguageServerOptions } from './lsp'
export {
    createLanguageService,
    type LanguageService,
    type ServiceCodeAction,
    type ServiceCompletion,
    type ServiceDiagnostic,
    type ServiceEdit,
    type ServiceHover,
} from './language-service'
