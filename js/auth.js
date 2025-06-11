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
        // Verifica se há um usuário em sessão no localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
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
    
    // Carrega códigos de acesso do Firestore
    async loadAccessCodes() {
        try {
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
            }
        } catch (error) {
            console.error("Erro ao criar usuários de demonstração:", error);
        }
    }
    
    // Configura event listeners
    setupEventListeners() {
        this.loginBtn.addEventListener('click', () => this.attemptLogin());
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // Login com tecla Enter
        this.accessCodeInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.attemptLogin();
            }
        });
    }
    
    // Tentativa de login com código de acesso
    attemptLogin() {
        const accessCode = this.accessCodeInput.value.trim();
        
        if (!accessCode) {
            this.showError("Por favor, digite seu código de acesso.");
            return;
        }
        
        // Verifica se o código existe
        if (this.accessCodes[accessCode]) {
            const user = this.accessCodes[accessCode];
            this.currentUser = {
                id: user.id,
                name: user.name,
                role: user.role,
                roleInfo: SYSTEM_CONFIG.roles[user.role]
            };
            
            // Salva no localStorage para persistência de sessão
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
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
    
    // Efetua o logout
    logout() {
        if (this.currentUser) {
            this.logUserActivity('logout');
        }
        
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showAuthScreen();
        
        // Limpa campos e mensagens de erro
        this.accessCodeInput.value = '';
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
        this.authContainer.classList.add('active');
        this.authContainer.classList.remove('hidden');
        this.mainApp.classList.add('hidden');
        this.mainApp.classList.remove('active');
    }
    
    // Mostra a aplicação principal
    showMainApp() {
        this.authContainer.classList.remove('active');
        this.authContainer.classList.add('hidden');
        this.mainApp.classList.remove('hidden');
        this.mainApp.classList.add('active');
    }
    
    // Atualiza a exibição de informações do usuário
    updateUserInfo() {
        if (this.currentUser) {
            this.userNameDisplay.textContent = this.currentUser.name;
            this.userRoleDisplay.textContent = SYSTEM_CONFIG.roles[this.currentUser.role].name;
        }
    }
    
    // Mostra mensagem de erro
    showError(message) {
        this.loginError.textContent = message;
        this.loginError.classList.add('active');
    }
    
    // Esconde mensagem de erro
    hideError() {
        this.loginError.textContent = '';
        this.loginError.classList.remove('active');
    }
    
    // Verifica se o usuário atual tem permissão para uma funcionalidade específica
    hasPermission(feature) {
        if (!this.currentUser || !this.currentUser.roleInfo) {
            return false;
        }
        
        return this.currentUser.roleInfo.menuAccess.includes(feature);
    }
    
    // Obtém o nível de acesso do usuário atual
    getUserAccessLevel() {
        if (!this.currentUser || !this.currentUser.roleInfo) {
            return 0;
        }
        
        return this.currentUser.roleInfo.level;
    }
}

// Registra o componente globalmente
window.AuthSystem = AuthSystem; 