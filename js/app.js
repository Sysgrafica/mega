// Arquivo principal da aplicação
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa os módulos principais
    window.ui = new UI();
    window.auth = new AuthSystem();
    
    // Garante que as classes estejam corretamente aplicadas no início
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    
    // Verifica se o usuário está logado
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        // Usuário logado: esconde o auth e mostra o app
        authContainer.classList.remove('active');
        authContainer.classList.add('hidden');
        mainApp.classList.remove('hidden');
        mainApp.classList.add('active');
        
        // Força as configurações de estilo
        setTimeout(() => {
            if (authContainer.offsetHeight > 0) {
                authContainer.style.display = 'none';
                mainApp.style.display = 'block';
            }
        }, 300);
        
        // Aguarda a autenticação ser concluída
        setTimeout(() => {
            // Se o usuário estiver autenticado, gera o menu e carrega a página inicial
            if (auth.currentUser) {
                ui.generateMenu();
                ui.navigateTo('dashboard');
            }
        }, 500);
    } else {
        // Usuário não logado: mostra o auth e esconde o app
        authContainer.classList.add('active');
        authContainer.classList.remove('hidden');
        mainApp.classList.add('hidden');
        mainApp.classList.remove('active');
    }
    
    console.log("Sistema GrafSys inicializado com sucesso!");
    console.log("Firebase configurado para o projeto:", firebase.app().options.projectId);
}); 