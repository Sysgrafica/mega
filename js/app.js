// Arquivo principal da aplicação
document.addEventListener('DOMContentLoaded', () => {
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
                ui.generateMenu();
                profile.init(); // Inicializa o listener do perfil
                
                // Verifica se há uma rota na URL
                const hash = window.location.hash.substring(1);
                const pageId = hash || 'dashboard';
                
                ui.navigateTo(pageId, true); // true indica que é o carregamento inicial
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
        // Obtém a rota atual da URL
        const hash = window.location.hash.substring(1);
        
        // Se houver uma rota válida na URL, navegue para ela
        if (hash && ui.menuItems.some(item => item.id === hash)) {
            ui.navigateTo(hash);
        } else {
            // Se não houver rota válida, vá para o dashboard
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

// Adicionar aos eventos de login/logout para atualizar a visibilidade do rodapé
function showMainApp() {
    // ... existing code ...
    updateFooterVisibility();
}

function showAuthScreen() {
    // ... existing code ...
    updateFooterVisibility();
}

// Componente de gestão de permissões
class PermissionsComponent {
    constructor() {
        this.roles = Object.keys(SYSTEM_CONFIG.roles).map(role => ({
            id: role,
            name: SYSTEM_CONFIG.roles[role].name
        }));
        this.currentRole = null;
        this.currentPermissions = null;
    }
    
    // Renderiza o componente de permissões
    async render(container) {
        container.innerHTML = `
            <div class="content-header">
                <h2><i class="fas fa-shield-alt"></i> Gerenciar Permissões</h2>
            </div>
            
            <div class="content-body permissions-manager">
                <div class="permissions-intro">
                    <p>Aqui você pode definir as permissões de acesso para cada setor da empresa. 
                    Selecione um setor para configurar suas permissões.</p>
                </div>
                
                <div class="permissions-container">
                    <div class="permissions-sidebar">
                        <h3>Setores</h3>
                        <ul id="roles-list" class="roles-list">
                            ${this.roles.map(role => `
                                <li data-role="${role.id}" class="role-item">
                                    <span class="role-name">${role.name}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="permissions-content">
                        <div id="permissions-placeholder" class="permissions-placeholder">
                            <i class="fas fa-hand-pointer"></i>
                            <p>Selecione um setor ao lado para configurar suas permissões</p>
                        </div>
                        
                        <div id="permissions-editor" class="permissions-editor hidden">
                            <h3>Permissões para: <span id="selected-role-name"></span></h3>
                            
                            <div class="permissions-tabs">
                                <button id="tab-pages" class="tab-button active">Páginas</button>
                                <button id="tab-features" class="tab-button">Funcionalidades</button>
                            </div>
                            
                            <div id="tab-content-pages" class="tab-content">
                                <p class="permissions-help">Marque as páginas que este setor poderá acessar:</p>
                                <div id="pages-list" class="permissions-checkboxes"></div>
                            </div>
                            
                            <div id="tab-content-features" class="tab-content hidden">
                                <p class="permissions-help">Marque as funcionalidades que este setor poderá utilizar:</p>
                                
                                <div class="feature-categories">
                                    ${SYSTEM_CONFIG.featureCategories.map(category => `
                                        <div class="feature-category">
                                            <h4>${category.name}</h4>
                                            <div id="feature-list-${category.id}" class="permissions-checkboxes"></div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="permissions-actions">
                                <button id="save-permissions" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Salvar Permissões
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adiciona os estilos CSS específicos para o gerenciador de permissões
        this.addStyles();
        
        // Configura os event listeners
        this.setupEventListeners();
    }
    
    // Adiciona estilos CSS para o gerenciador de permissões
    addStyles() {
        // Verifica se os estilos já existem
        if (document.getElementById('permissions-styles')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'permissions-styles';
        styleEl.textContent = `
            .permissions-manager {
                padding: 20px;
            }
            
            .permissions-intro {
                margin-bottom: 25px;
            }
            
            .permissions-container {
                display: flex;
                border: 1px solid #3a3a3a;
                border-radius: 8px;
                overflow: hidden;
                background-color: #262626;
            }
            
            .permissions-sidebar {
                width: 250px;
                border-right: 1px solid #3a3a3a;
                background-color: #202020;
                padding: 15px 0;
            }
            
            .permissions-sidebar h3 {
                padding: 0 15px 15px;
                margin: 0;
                border-bottom: 1px solid #3a3a3a;
            }
            
            .roles-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            
            .role-item {
                padding: 12px 15px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .role-item:hover {
                background-color: #2c2c2c;
            }
            
            .role-item.active {
                background-color: #0078d4;
                color: #fff;
            }
            
            .role-name {
                font-weight: 500;
            }
            
            .permissions-content {
                flex: 1;
                padding: 20px;
                min-height: 500px;
            }
            
            .permissions-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 300px;
                color: #7d7d7d;
                text-align: center;
            }
            
            .permissions-placeholder i {
                font-size: 48px;
                margin-bottom: 15px;
            }
            
            .permissions-tabs {
                margin-top: 20px;
                margin-bottom: 15px;
                border-bottom: 1px solid #3a3a3a;
            }
            
            .tab-button {
                background: transparent;
                border: none;
                padding: 10px 20px;
                margin-right: 10px;
                cursor: pointer;
                color: #b9b9b9;
                font-weight: 500;
                position: relative;
                bottom: -1px;
                transition: all 0.2s;
            }
            
            .tab-button.active {
                color: #0078d4;
                border-bottom: 2px solid #0078d4;
            }
            
            .tab-content {
                margin-top: 20px;
            }
            
            .hidden {
                display: none;
            }
            
            .permissions-checkboxes {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 10px;
                margin-top: 15px;
            }
            
            .permission-checkbox {
                display: flex;
                align-items: center;
                padding: 8px;
                background-color: #2c2c2c;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .permission-checkbox:hover {
                background-color: #333;
            }
            
            .permission-checkbox input {
                margin-right: 10px;
            }
            
            .permissions-actions {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #3a3a3a;
            }
            
            .feature-categories {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .feature-category {
                background-color: #202020;
                border-radius: 8px;
                padding: 15px;
            }
            
            .feature-category h4 {
                margin-top: 0;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 1px solid #3a3a3a;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Configura os event listeners
    setupEventListeners() {
        // Event listeners para a lista de papéis
        const rolesList = document.getElementById('roles-list');
        if (rolesList) {
            rolesList.addEventListener('click', (e) => {
                const roleItem = e.target.closest('.role-item');
                if (roleItem) {
                    // Remove a classe ativa de todos os itens
                    document.querySelectorAll('.role-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    // Adiciona a classe ativa ao item clicado
                    roleItem.classList.add('active');
                    
                    // Carrega as permissões do papel selecionado
                    const roleId = roleItem.dataset.role;
                    this.loadPermissions(roleId);
                }
            });
        }
        
        // Event listeners para as abas
        const tabPages = document.getElementById('tab-pages');
        const tabFeatures = document.getElementById('tab-features');
        const tabContentPages = document.getElementById('tab-content-pages');
        const tabContentFeatures = document.getElementById('tab-content-features');
        
        tabPages.addEventListener('click', () => {
            tabPages.classList.add('active');
            tabFeatures.classList.remove('active');
            tabContentPages.classList.remove('hidden');
            tabContentFeatures.classList.add('hidden');
        });
        
        tabFeatures.addEventListener('click', () => {
            tabFeatures.classList.add('active');
            tabPages.classList.remove('active');
            tabContentFeatures.classList.remove('hidden');
            tabContentPages.classList.add('hidden');
        });
        
        // Event listener para o botão de salvar
        const saveButton = document.getElementById('save-permissions');
        saveButton.addEventListener('click', () => this.savePermissions());
    }
    
    // Carrega as permissões de um papel específico
    async loadPermissions(roleId) {
        try {
            // Mostra o editor e esconde o placeholder
            document.getElementById('permissions-placeholder').classList.add('hidden');
            document.getElementById('permissions-editor').classList.remove('hidden');
            
            // Atualiza o nome do papel selecionado
            document.getElementById('selected-role-name').textContent = SYSTEM_CONFIG.roles[roleId].name;
            
            // Armazena o papel atual
            this.currentRole = roleId;
            
            // Busca as permissões no cache ou no Firestore
            const permissions = await auth.loadUserPermissions(roleId);
            this.currentPermissions = permissions;
            
            // Renderiza os checkboxes de páginas
            this.renderPageCheckboxes(permissions.pages || []);
            
            // Renderiza os checkboxes de funcionalidades
            this.renderFeatureCheckboxes(permissions.features || []);
            
            console.log(`Permissões carregadas para ${roleId}:`, permissions);
        } catch (error) {
            console.error(`Erro ao carregar permissões para ${roleId}:`, error);
            ui.showNotification(`Erro ao carregar permissões: ${error.message}`, 'error');
        }
    }
    
    // Renderiza os checkboxes de páginas
    renderPageCheckboxes(selectedPages) {
        const pagesListContainer = document.getElementById('pages-list');
        pagesListContainer.innerHTML = '';
        
        SYSTEM_CONFIG.pages.forEach(page => {
            const isChecked = selectedPages.includes(page.id);
            const checkbox = document.createElement('label');
            checkbox.className = 'permission-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" name="page_${page.id}" data-page-id="${page.id}" 
                       ${isChecked ? 'checked' : ''}>
                <span>${page.name}</span>
            `;
            pagesListContainer.appendChild(checkbox);
        });
    }
    
    // Renderiza os checkboxes de funcionalidades
    renderFeatureCheckboxes(selectedFeatures) {
        // Limpa todos os containers de categorias primeiro
        SYSTEM_CONFIG.featureCategories.forEach(category => {
            const container = document.getElementById(`feature-list-${category.id}`);
            container.innerHTML = '';
        });
        
        // Agrupa as funcionalidades por categoria
        SYSTEM_CONFIG.features.forEach(feature => {
            const isChecked = selectedFeatures.includes(feature.id);
            const checkbox = document.createElement('label');
            checkbox.className = 'permission-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" name="feature_${feature.id}" data-feature-id="${feature.id}" 
                       ${isChecked ? 'checked' : ''}>
                <span>${feature.name}</span>
            `;
            
            // Adiciona o checkbox à categoria correta
            const categoryContainer = document.getElementById(`feature-list-${feature.category}`);
            if (categoryContainer) {
                categoryContainer.appendChild(checkbox);
            }
        });
    }
    
    // Salva as permissões do papel atual
    async savePermissions() {
        if (!this.currentRole) return;
        
        try {
            // Recolhe os valores dos checkboxes de páginas
            const selectedPages = Array.from(document.querySelectorAll('input[data-page-id]:checked'))
                .map(checkbox => checkbox.dataset.pageId);
            
            // Recolhe os valores dos checkboxes de funcionalidades
            const selectedFeatures = Array.from(document.querySelectorAll('input[data-feature-id]:checked'))
                .map(checkbox => checkbox.dataset.featureId);
            
            // Cria o objeto de permissões
            const permissions = {
                pages: selectedPages,
                features: selectedFeatures
            };
            
            // Salva as permissões
            const success = await auth.saveRolePermissions(this.currentRole, permissions);
            
            if (success) {
                ui.showNotification('Permissões salvas com sucesso!', 'success');
            } else {
                ui.showNotification('Erro ao salvar permissões.', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar permissões:', error);
            ui.showNotification(`Erro ao salvar permissões: ${error.message}`, 'error');
        }
    }
    
    // Limpa recursos ao sair da página
    cleanup() {
        // Nada a limpar por enquanto
    }
}

// Registra o componente globalmente
window.PermissionsComponent = PermissionsComponent;

// Sistema de roteamento básico
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o sistema
    try {
        // Verifica se o hash na URL aponta para alguma página válida
        const hash = window.location.hash.substring(1); // Remove o # do início
        let initialPage = 'dashboard'; // Página padrão
        
        // Se o hash existir e for uma página válida, usa ela como página inicial
        if (hash && window.auth.hasPermission(hash)) {
            initialPage = hash;
        }
        
        // Navegação para a página inicial (com flag de carregamento inicial)
        window.ui.navigateTo(initialPage, null, true);
        
        // Configuração para navegação por hash da URL
        window.addEventListener('hashchange', function() {
            const newHash = window.location.hash.substring(1);
            if (newHash && window.auth.hasPermission(newHash)) {
                window.ui.navigateTo(newHash);
            }
        });
        
        console.log('Sistema inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar o sistema:', error);
    }
}); 