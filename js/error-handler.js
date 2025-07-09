
// Sistema centralizado de tratamento de erros
class ErrorHandler {
    constructor() {
        this.setupGlobalErrorHandlers();
        this.errorQueue = [];
        this.maxErrors = 10;
    }
    
    setupGlobalErrorHandlers() {
        // Captura erros JavaScript não tratados
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        
        // Captura promessas rejeitadas não tratadas
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Promise rejeitada',
                reason: event.reason
            });
        });
    }
    
    handleError(errorInfo) {
        console.error('Erro capturado:', errorInfo);
        
        // Adiciona à fila de erros
        this.errorQueue.push({
            ...errorInfo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        // Mantém apenas os últimos erros
        if (this.errorQueue.length > this.maxErrors) {
            this.errorQueue.shift();
        }
        
        // Tenta registrar no Firebase se disponível
        this.logErrorToFirebase(errorInfo);
        
        // Mostra notificação amigável para o usuário
        if (window.ui) {
            const userMessage = this.getUserFriendlyMessage(errorInfo);
            window.ui.showNotification(userMessage, 'error');
        }
    }
    
    async logErrorToFirebase(errorInfo) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && window.auth?.currentUser) {
                await firebase.firestore().collection('error_logs').add({
                    ...errorInfo,
                    userId: window.auth.currentUser.id,
                    userName: window.auth.currentUser.name,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (firebaseError) {
            console.error('Erro ao registrar no Firebase:', firebaseError);
        }
    }
    
    getUserFriendlyMessage(errorInfo) {
        switch (errorInfo.type) {
            case 'network':
                return 'Problema de conexão. Verifique sua internet e tente novamente.';
            case 'permission':
                return 'Você não tem permissão para executar esta ação.';
            case 'validation':
                return 'Dados inválidos. Verifique as informações e tente novamente.';
            default:
                return 'Ocorreu um erro inesperado. Nossa equipe foi notificada.';
        }
    }
    
    // Método para reportar erros personalizados
    reportError(message, type = 'custom', additionalInfo = {}) {
        this.handleError({
            type,
            message,
            ...additionalInfo
        });
    }
    
    // Método para obter estatísticas de erro
    getErrorStats() {
        const stats = {};
        this.errorQueue.forEach(error => {
            stats[error.type] = (stats[error.type] || 0) + 1;
        });
        return stats;
    }
}

// Inicializa o manipulador de erros globalmente
window.errorHandler = new ErrorHandler();
