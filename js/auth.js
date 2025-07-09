// Sistema de autenticação
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.accessCodes = {}; // Será preenchido com códigos de acesso do Firestore
        this.loginBtn = document.getElementById('login-btn');
        this.accessCodeInput = document.getElementById('access-code');
        this.loginError = document.getElementById('login-error');
        this.logoutBtn = document.getElementById('logout-btn');
        this.authContainer = document.getElementById('auth-container');
        this.mainApp = document.getElementById('main-app');
        this.userNameDisplay = document.getElementById('user-name');
        this.userRoleDisplay = document.getElementById('user-role');
        
        // Cache de permissões por setor para evitar múltiplas consultas
        this.permissionsCache = {};
        
        // Usuários de demonstração para testes iniciais
        this.demoUsers = {
            '123456': { id: 'admin1', name: 'Administrador', role: 'admin' },
            '234567': { id: 'seller1', name: 'Vendedor', role: 'seller' },
            '345678': { id: 'designer1', name: 'Designer', role: 'designer' },
            '456789': { id: 'production1', name: 'Produção', role: 'production' }
        };
        
        this.init();
    }
    
    // Inicializa o sistema de autenticação
    async init() {
        // Aguarda um pouco para garantir que o Firebase foi inicializado
        await this.waitForFirebase();
        
        // Verifica se há um usuário em sessão no localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                // Carrega as permissões do usuário se ele já estava logado
                if (this.currentUser) {
                    await this.loadUserPermissions(this.currentUser.role);
                }
                this.showMainApp();
                this.updateUserInfo();
            } catch (error) {
                console.error("Erro ao recuperar sessão:", error);
                this.logout();
            }
        }
        
        // Carrega códigos de acesso do Firestore
        await this.loadAccessCodes();
        
        // Configura listeners para eventos
        this.setupEventListeners();
    }
    
    // Aguarda o Firebase estar completamente inicializado
    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            if (typeof firebase !== 'undefined' && 
                firebase.apps && 
                firebase.apps.length > 0 && 
                firebase.firestore && 
                typeof db !== 'undefined') {
                console.log('Firebase completamente inicializado para autenticação');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('Firebase não foi completamente inicializado após aguardar');
    }
    
    // Carrega códigos de acesso do Firestore
    async loadAccessCodes() {
        try {
            // Verifica se o Firebase está disponível e inicializado
            if (typeof firebase === 'undefined' || 
                !firebase.firestore || 
                typeof db === 'undefined' || 
                !db) {
                console.log("Firebase ou Firestore não está disponível, usando códigos de demonstração");
                this.accessCodes = this.demoUsers;
                return;
            }
            
            // Aguarda um pouco para garantir que o Firestore está completamente inicializado
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const snapshot = await db.collection('employees').get();
            snapshot.forEach(doc => {
                const employee = doc.data();
                if (employee.accessCode) {
                    this.accessCodes[employee.accessCode] = {
                        id: doc.id,
                        name: employee.name,
                        role: employee.role
                    };
                }
            });
            console.log("Códigos de acesso carregados do Firestore");
            
            // Se não houver códigos de acesso no Firestore, usa os de demonstração
            if (Object.keys(this.accessCodes).length === 0) {
                console.log("Usando códigos de acesso de demonstração");
                this.accessCodes = this.demoUsers;
                
                // Cria os usuários de demonstração no Firestore
                this.createDemoUsers();
            }
        } catch (error) {
            console.error("Erro ao carregar códigos de acesso:", error);
            console.log("Usando códigos de acesso de demonstração");
            this.accessCodes = this.demoUsers;
        }
    }
    
    // Cria usuários de demonstração no Firestore
    async createDemoUsers() {
        try {
            // Verifica se já existem usuários
            const employeesCount = await db.collection('employees').get().then(snap => snap.size);
            
            if (employeesCount === 0) {
                console.log("Criando usuários de demonstração no Firestore");
                
                // Cria cada usuário de demonstração
                for (const [accessCode, user] of Object.entries(this.demoUsers)) {
                    await db.collection('employees').doc(user.id).set({
                        name: user.name,
                        role: user.role,
                        accessCode: accessCode,
                        email: `${user.role}@grafsys.com`,
                        phone: "(00) 00000-0000",
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        active: true
                    });
                }
                
                console.log("Usuários de demonstração criados com sucesso");
                
                // Cria permissões padrão para os setores de demonstração
                await this.createDefaultPermissions();
            }
        } catch (error) {
            console.error("Erro ao criar usuários de demonstração:", error);
        }
    }
    
    // Cria permissões padrão para os setores de demonstração
    async createDefaultPermissions() {
        try {
            console.log("Criando permissões padrão para setores");
            
            // Verifica se já existem permissões configuradas
            const permissionsCount = await db.collection('permissions').get().then(snap => snap.size);
            
            if (permissionsCount === 0) {
                // Define permissões padrão para cada setor
                const defaultPermissions = {
                    // Para administradores, concede todas as permissões
                    'admin': this.createAllPermissions(true),
                    
                    // Para vendedores, concede permissões relacionadas a clientes e pedidos
                    'seller': {
                        pages: ["dashboard", "workflow", "orders", "clients", "products", "inventory"],
                        features: [
                            "view_dashboard", "view_workflow", "view_orders", "create_order", 
                            "edit_order", "delete_order", "view_order_details", "print_order", "view_clients", 
                            "create_client", "edit_client", "view_products", "view_inventory"
                        ]
                    },
                    
                    // Para designers, concede permissões relacionadas a pedidos
                    'designer': {
                        pages: ["dashboard", "workflow", "orders", "products", "inventory"],
                        features: [
                            "view_dashboard", "view_workflow", "view_orders", 
                            "view_order_details", "view_products", "view_inventory"
                        ]
                    },
                    
                    // Para produção, concede permissões básicas para acompanhar o fluxo de pedidos
                    'production': {
                        pages: ["dashboard", "workflow", "impressao", "orders", "inventory"],
                        features: [
                            "view_dashboard", "view_workflow", "view_impressao", "view_orders", 
                            "view_order_details", "change_order_status", "view_inventory"
                        ]
                    },
                    
                    // Para impressores, permissões para acompanhar pedidos e alterar status
                    'impressor': {
                        pages: ["dashboard", "workflow", "impressao", "orders", "inventory"],
                        features: [
                            "view_dashboard", "view_workflow", "view_impressao", "view_orders", 
                            "view_order_details", "change_order_status", "mark_print_item", "view_inventory"
                            // Removido intencionalmente: "edit_order", "delete_order"
                        ]
                    },
                    
                    'acabamento': {
                        pages: ["dashboard", "workflow", "orders", "inventory"],
                        features: [
                            "view_dashboard", "view_workflow", "view_orders", 
                            "view_order_details", "change_order_status", "mark_finishing_item", "view_inventory"
                            // Removido intencionalmente: "edit_order", "delete_order"
                        ]
                    },
                    
                    'cortesEspeciais': {
                        pages: ["dashboard", "workflow", "orders", "inventory"],
                        features: [
                            "view_dashboard", "view_workflow", "view_orders", 
                            "view_order_details", "change_order_status", "mark_special_cut_item", "view_inventory"
                        ]
                    },
                    
                    'aplicador': {
                        pages: ["dashboard", "workflow", "orders", "aplicacao", "inventory"],
                        features: [
                            "view_dashboard", "view_workflow", "view_orders", 
                            "view_order_details", "change_order_status", "mark_application_item", "view_inventory"
                        ]
                    }
                };
                
                // Salva as permissões padrão no Firestore
                for (const [role, permissions] of Object.entries(defaultPermissions)) {
                    await db.collection('permissions').doc(role).set({
                        role: role,
                        roleName: SYSTEM_CONFIG.roles[role].name,
                        pages: permissions.pages,
                        features: permissions.features,
                        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastUpdatedBy: "system"
                    });
                }
                
                console.log("Permissões padrão criadas com sucesso");
            }
        } catch (error) {
            console.error("Erro ao criar permissões padrão:", error);
        }
    }
    
    // Cria um objeto com todas as permissões possíveis
    createAllPermissions(allowed = true) {
        const allPages = SYSTEM_CONFIG.pages.map(page => page.id);
        const allFeatures = SYSTEM_CONFIG.features.map(feature => feature.id);
        
        return {
            pages: allowed ? allPages : [],
            features: allowed ? allFeatures : []
        };
    }
    
    // Configura event listeners
    setupEventListeners() {
        // Verificar se os elementos existem antes de adicionar event listeners
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => this.attemptLogin());
        } else {
            console.log('Botão de login não encontrado');
        }
        
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        } else {
            console.log('Botão de logout não encontrado');
        }
        
        // Login com tecla Enter
        if (this.accessCodeInput) {
            this.accessCodeInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.attemptLogin();
                }
            });
        } else {
            console.log('Campo de código de acesso não encontrado');
        }
    }
    
    // Tentativa de login com código de acesso
    async attemptLogin() {
        const accessCode = this.accessCodeInput.value.trim();
        
        if (!accessCode) {
            this.showError("Por favor, digite seu código de acesso.");
            return;
        }
        
        // Verifica se o código existe
        if (this.accessCodes[accessCode]) {
            const user = this.accessCodes[accessCode];
            
            // Carrega as permissões do usuário
            await this.loadUserPermissions(user.role);
            
            this.currentUser = {
                id: user.id,
                name: user.name,
                role: user.role,
                roleInfo: SYSTEM_CONFIG.roles[user.role],
                permissions: this.permissionsCache[user.role] || {
                    pages: SYSTEM_CONFIG.roles[user.role].menuAccess || [],
                    features: []
                }
            };
            
            // Salva no localStorage para persistência de sessão
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Salva também no formato userConfig para compatibilidade com o módulo de pedidos
            localStorage.setItem('userConfig', JSON.stringify({
                role: user.role,
                name: user.name,
                id: user.id
            }));
            
            // Registra o login no histórico
            this.logUserActivity('login');
            
            // Limpa o campo de entrada
            this.accessCodeInput.value = '';
            this.hideError();
            
            // Mostra a aplicação principal
            this.showMainApp();
            this.updateUserInfo();
            
            // Notifica o usuário
            ui.showNotification('Bem-vindo, ' + this.currentUser.name + '!', 'success');
            
            // Gera o menu e carrega a página inicial
            ui.generateMenu();
            ui.navigateTo('dashboard');
            
            // Força um reflow para aplicar as mudanças de estilo
            setTimeout(() => {
                // Verifica se o auth-container ainda está visível e força a remoção
                if (this.authContainer.offsetHeight > 0) {
                    console.log("Forçando remoção da tela de login");
                    this.authContainer.classList.add('hidden');
                    this.authContainer.style.display = 'none';
                    this.mainApp.classList.remove('hidden');
                    this.mainApp.style.display = 'block';
                }
            }, 300);
        } else {
            this.showError("Código de acesso inválido. Tente novamente.");
        }
    }
    
    // Carrega permissões do usuário com base em seu papel
    async loadUserPermissions(role) {
        // Se já temos no cache, retorna
        if (this.permissionsCache[role]) {
            console.log(`Usando permissões em cache para ${role}`);
            return this.permissionsCache[role];
        }
        
        try {
            // Verifica se o Firebase está disponível antes de tentar carregar
            if (typeof firebase === 'undefined' || 
                !firebase.firestore || 
                typeof db === 'undefined' || 
                !db ||
                !firebase.apps || 
                firebase.apps.length === 0) {
                console.log(`Firebase não disponível, usando permissões padrão para ${role}`);
                this.permissionsCache[role] = {
                    pages: SYSTEM_CONFIG.roles[role].menuAccess || [],
                    features: []
                };
                return this.permissionsCache[role];
            }
            
            console.log(`Carregando permissões para ${role} do Firestore`);
            
            // Busca as permissões no Firestore
            const permissionDoc = await db.collection('permissions').doc(role).get();
            
            if (permissionDoc.exists) {
                const permissionsData = permissionDoc.data();
                
                // Salva no cache para evitar consultas repetidas
                this.permissionsCache[role] = {
                    pages: permissionsData.pages || [],
                    features: permissionsData.features || []
                };
                
                console.log(`Permissões carregadas para ${role}:`, this.permissionsCache[role]);
                return this.permissionsCache[role];
            } else {
                console.log(`Nenhuma permissão encontrada para ${role}, usando padrão do papel`);
                
                // Se não houver configuração específica, usa o padrão
                this.permissionsCache[role] = {
                    pages: SYSTEM_CONFIG.roles[role].menuAccess || [],
                    features: []
                };
                
                // Tenta criar um documento de permissões padrão para este papel
                try {
                    await db.collection('permissions').doc(role).set({
                        role: role,
                        roleName: SYSTEM_CONFIG.roles[role].name,
                        pages: SYSTEM_CONFIG.roles[role].menuAccess || [],
                        features: [],
                        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastUpdatedBy: "system"
                    });
                } catch (setError) {
                    console.log(`Não foi possível criar documento de permissões para ${role}:`, setError);
                }
                
                return this.permissionsCache[role];
            }
        } catch (error) {
            console.error(`Erro ao carregar permissões para ${role}:`, error);
            
            // Em caso de erro, usa o padrão
            this.permissionsCache[role] = {
                pages: SYSTEM_CONFIG.roles[role].menuAccess || [],
                features: []
            };
            
            return this.permissionsCache[role];
        }
    }
    
    // Verifica se o usuário tem permissão para acessar uma página específica
    hasPagePermission(pageId) {
        if (!this.currentUser) return false;
        
        // Administradores sempre têm acesso a tudo
        if (this.currentUser.role === 'admin') return true;
        
        // Verifica nas permissões dinâmicas
        if (this.currentUser.permissions && this.currentUser.permissions.pages) {
            return this.currentUser.permissions.pages.includes(pageId);
        }
        
        // Fallback para o método antigo
        return this.currentUser.roleInfo.menuAccess.includes(pageId);
    }
    
    // Verifica se o usuário tem uma funcionalidade específica
    hasFeaturePermission(featureId) {
        if (!this.currentUser) return false;
        
        // Administradores têm acesso a tudo
        if (this.currentUser.role === 'admin') return true;

        // Tratamento especial para marcação de itens, garantindo que funcione mesmo se as permissões no DB não estiverem atualizadas
        if (featureId === 'mark_print_item') {
            return this.currentUser.role === 'impressor';
        }
        if (featureId === 'mark_finishing_item') {
            return this.currentUser.role === 'acabamento';
        }
        if (featureId === 'mark_special_cut_item') {
            return this.currentUser.role === 'cortesEspeciais';
        }
        
        // Para outras funcionalidades, verifica as permissões carregadas do cache
        const userPermissions = this.permissionsCache[this.currentUser.role];
        if (userPermissions && userPermissions.features) {
            return userPermissions.features.includes(featureId);
        }
        
        return false;
    }
    
    // Interface unificada para verificar permissões (compatibilidade com o código existente)
    hasPermission(id) {
        // Primeiro verifica se é uma página
        if (SYSTEM_CONFIG.pages.some(page => page.id === id)) {
            return this.hasPagePermission(id);
        }
        
        // Depois verifica se é uma funcionalidade
        if (SYSTEM_CONFIG.features.some(feature => feature.id === id)) {
            return this.hasFeaturePermission(id);
        }
        
        // Se não for nem página nem funcionalidade, usa o método antigo
        return this.getUserAccessLevel() >= 1;
    }
    
    // Efetua o logout
    logout() {
        if (this.currentUser) {
            this.logUserActivity('logout');
        }
        
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userConfig');
        
        // Limpa o cache de permissões para garantir que serão recarregadas no próximo login
        this.permissionsCache = {};
        
        this.showAuthScreen();
        
        // Limpa campos e mensagens de erro
        if (this.accessCodeInput) {
            this.accessCodeInput.value = '';
        }
        this.hideError();
    }
    
    // Registra atividade do usuário
    async logUserActivity(activity) {
        try {
            await db.collection('user_logs').add({
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                activity: activity,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Erro ao registrar atividade:", error);
        }
    }
    
    // Mostra a tela de autenticação
    showAuthScreen() {
        if (this.authContainer && this.mainApp) {
            this.authContainer.classList.add('active');
            this.authContainer.classList.remove('hidden');
            this.mainApp.classList.add('hidden');
            this.mainApp.classList.remove('active');
        } else {
            console.log('Elementos de autenticação não encontrados');
        }
    }
    
    // Mostra a aplicação principal
    showMainApp() {
        if (this.authContainer && this.mainApp) {
            this.authContainer.classList.remove('active');
            this.authContainer.classList.add('hidden');
            this.mainApp.classList.remove('hidden');
            this.mainApp.classList.add('active');
        } else {
            console.log('Elementos da aplicação principal não encontrados');
        }
    }
    
    // Atualiza a exibição de informações do usuário
    updateUserInfo() {
        if (this.currentUser) {
            if (this.userNameDisplay) {
                this.userNameDisplay.textContent = this.currentUser.name;
            }
            if (this.userRoleDisplay && SYSTEM_CONFIG.roles[this.currentUser.role]) {
                this.userRoleDisplay.textContent = SYSTEM_CONFIG.roles[this.currentUser.role].name;
            }
        }
    }
    
    // Mostra mensagem de erro
    showError(message) {
        if (this.loginError) {
            this.loginError.textContent = message;
            this.loginError.classList.add('active');
        } else {
            console.error('Elemento de erro de login não encontrado:', message);
        }
    }
    
    // Esconde mensagem de erro
    hideError() {
        if (this.loginError) {
            this.loginError.textContent = '';
            this.loginError.classList.remove('active');
        }
    }
    
    // Obter o nível de acesso do usuário atual
    getUserAccessLevel() {
        if (!this.currentUser) return 0;
        return this.currentUser.roleInfo.level || 0;
    }
    
    // Salva permissões para um papel específico
    async saveRolePermissions(role, permissions) {
        try {
            const permissionsData = {
                role: role,
                roleName: SYSTEM_CONFIG.roles[role].name,
                pages: permissions.pages || [],
                features: permissions.features || [],
                lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdatedBy: this.currentUser ? this.currentUser.id : "system"
            };
            
            await db.collection('permissions').doc(role).set(permissionsData);
            
            // Atualiza o cache
            this.permissionsCache[role] = {
                pages: permissions.pages || [],
                features: permissions.features || []
            };
            
            console.log(`Permissões atualizadas para ${role}`);
            return true;
        } catch (error) {
            console.error(`Erro ao salvar permissões para ${role}:`, error);
            return false;
        }
    }
    
    // Limpa o cache de permissões (útil após atualizações)
    clearPermissionsCache() {
        this.permissionsCache = {};
        console.log("Cache de permissões limpo");
    }
    
    // Retorna o usuário atualmente logado
    getCurrentUser() {
        if (!this.currentUser) {
            return null;
        }
        
        // Garantir que o usuário tenha campos consistentes
        return {
            id: this.currentUser.id || '',
            name: this.currentUser.name || this.currentUser.displayName || '',
            email: this.currentUser.email || '',
            role: this.currentUser.role || ''
        };
    }
}

// Inicializa o sistema de autenticação globalmente
window.auth = new AuthSystem();

// Registra o componente globalmente
window.AuthSystem = AuthSystem;