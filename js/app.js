// Arquivo principal da aplicação
document.addEventListener('DOMContentLoaded', () => {
    console.log("[App] DOM totalmente carregado e processado.");
    // Inicializa os módulos principais
    window.ui = new UI();
    window.auth = new AuthSystem();
    window.profile = new Profile();
    
    // Flag global para controle de carregamento de dados
    window.isLoadingData = false;
    
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
                console.log("[App] Usuário autenticado. Gerando menu e rota inicial.");
                ui.generateMenu();
                profile.init(); // Inicializa o listener do perfil
                
                // Verifica se há uma rota na URL
                const hash = window.location.hash.substring(1);
                console.log(`[App] Hash da URL encontrado: #${hash}`);
                const pageId = hash || 'dashboard';
                
                ui.navigateTo(pageId, null, true); // true indica que é o carregamento inicial
            } else {
                console.warn("[App] Usuário não autenticado no momento da navegação inicial.");
            }
        }, 500);
    } else {
        // Usuário não logado: mostra o auth e esconde o app
        authContainer.classList.add('active');
        authContainer.classList.remove('hidden');
        mainApp.classList.add('hidden');
        mainApp.classList.remove('active');
    }
    
    // Intercepta cliques no menu para evitar navegação durante carregamento pesado
    document.getElementById('main-menu').addEventListener('click', (e) => {
        if (window.isLoadingData && e.target.tagName === 'A') {
            const targetPage = e.target.dataset.page;
            // Permite apenas navegação para páginas leves durante carregamento
            if (targetPage !== 'dashboard') {
                e.stopPropagation();
                e.preventDefault();
                ui.showNotification('Aguarde o carregamento dos dados...', 'info');
            }
        }
    });
    
    // Adiciona listener para eventos de navegação do navegador (botão voltar/avançar)
    window.addEventListener('popstate', function(event) {
        console.log("[App] Evento 'popstate' (voltar/avançar) detectado.");
        // Obtém a rota atual da URL
        const hash = window.location.hash.substring(1);
        
        // Se houver uma rota válida na URL, navegue para ela
        if (hash && ui.menuItems.some(item => item.id === hash)) {
            console.log(`[App.popstate] Rota válida encontrada: #${hash}. Navegando...`);
            ui.navigateTo(hash);
        } else {
            // Se não houver rota válida, vá para o dashboard
            console.log(`[App.popstate] Nenhuma rota válida encontrada na URL. Navegando para o dashboard.`);
            ui.navigateTo('dashboard');
        }
    });
    
    console.log("Sistema GrafSys inicializado com sucesso!");
    console.log("Firebase configurado para o projeto:", firebase.app().options.projectId);
    
    // Inicializar a visibilidade do rodapé
    updateFooterVisibility();
});

// Função para atualizar a visibilidade do rodapé
function updateFooterVisibility() {
    const authContainerActive = document.getElementById('auth-container').classList.contains('active');
    const mainAppActive = document.getElementById('main-app').classList.contains('active');
    const systemFooter = document.getElementById('system-footer');
    
    if (mainAppActive && !authContainerActive) {
        systemFooter.classList.add('active');
    } else {
        systemFooter.classList.remove('active');
    }
}