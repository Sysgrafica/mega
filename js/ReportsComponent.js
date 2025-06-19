// Componente de Relatórios
class ReportsComponent {
    constructor() {
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        // Não usaremos mais firebase.auth().currentUser diretamente
        this.currentUser = null;
        this.reportsTypes = [
            { id: 'sellers', name: 'Vendedores', icon: 'fa-user-tie', description: 'Desempenho de vendedores, comissões e metas' },
            { id: 'sales', name: 'Vendas', icon: 'fa-shopping-cart', description: 'Análise de vendas por período, produtos e clientes' },
            { id: 'financial', name: 'Financeiro', icon: 'fa-money-bill-wave', description: 'Faturamento, lucratividade e fluxo de caixa' },
            { id: 'production', name: 'Produção', icon: 'fa-industry', description: 'Produtividade, tempo de produção e gargalos' },
            { id: 'clients', name: 'Clientes', icon: 'fa-users', description: 'Análise de clientes, fidelidade e segmentação' },
            { id: 'products', name: 'Produtos', icon: 'fa-boxes', description: 'Análise de produtos, popularidade e lucratividade' }
        ];
    }
    
    // Renderiza o componente de relatórios
    async render(container) {
        let userData = null;
        
        try {
            // Obtém o usuário atual do módulo auth
            if (window.auth && window.auth.currentUser) {
                this.currentUser = window.auth.currentUser;
                console.log('Usuário encontrado no módulo auth:', this.currentUser);
                userData = this.currentUser;
            } else {
                // Tenta recuperar do localStorage
                const savedUser = localStorage.getItem('currentUser');
                console.log('Não encontrou usuário no auth, verificando localStorage...');
                
                if (savedUser) {
                    try {
                        this.currentUser = JSON.parse(savedUser);
                        console.log('Usuário recuperado do localStorage:', this.currentUser);
                        userData = this.currentUser;
                    } catch (error) {
                        console.error('Erro ao processar usuário do localStorage:', error);
                    }
                } else {
                    console.error('Nenhum usuário encontrado no localStorage');
                    container.innerHTML = `
                        <div class="access-denied">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h2>Erro de Autenticação</h2>
                            <p>Não foi possível verificar sua identidade. Por favor, faça login novamente.</p>
                        </div>
                    `;
                    return;
                }
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            container.innerHTML = `
                <div class="access-denied">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Erro ao Carregar</h2>
                    <p>Ocorreu um erro ao verificar suas permissões. Por favor, tente novamente.</p>
                </div>
            `;
            return;
        }
        
        // Verificar dados do usuário para depuração
        console.log('Dados do usuário:', userData);
        
        // Verifica se o usuário tem permissão para acessar relatórios
        if (!userData) {
            console.error('Dados do usuário não disponíveis');
            container.innerHTML = `
                <div class="access-denied">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Erro de Dados</h2>
                    <p>Não foi possível carregar seus dados de usuário. Por favor, tente novamente.</p>
                </div>
            `;
            return;
        }
        
        // Verificar permissões usando diretamente o módulo auth se estiver disponível
        let hasAccess = false;
        
        if (window.auth && typeof window.auth.hasPagePermission === 'function') {
            // Usa a função de verificação de permissão do módulo auth
            hasAccess = window.auth.hasPagePermission('reports');
            console.log('Verificação de permissão usando auth.hasPagePermission:', hasAccess);
        } else {
            // Verificação manual de permissões
            // Administradores sempre têm acesso
            if (userData.role === 'admin') {
                console.log('Acesso concedido: Usuário é administrador');
                hasAccess = true;
            } 
            // Gerentes têm acesso
            else if (userData.role === 'gerente') {
                console.log('Acesso concedido: Usuário é gerente');
                hasAccess = true;
            }
            // Verifica permissão específica
            else if (userData.permissions && 
                    userData.permissions.features && 
                    userData.permissions.features.includes('view_reports')) {
                console.log('Acesso concedido: Usuário tem permissão específica para relatórios');
                hasAccess = true;
            }
        }
        
        // Se o usuário não tiver acesso, mostra mensagem de erro
        if (!hasAccess) {
            container.innerHTML = `
                <div class="access-denied">
                    <i class="fas fa-lock"></i>
                    <h2>Acesso Negado</h2>
                    <p>Você não tem permissão para acessar os relatórios do sistema.</p>
                </div>
            `;
            return;
        }
        
        // Renderiza o conteúdo principal
        container.innerHTML = `
            <div class="content-header">
                <h2><i class="fas fa-chart-bar"></i> Relatórios</h2>
            </div>
            
            <div class="content-body">
                <div class="reports-intro">
                    <p>Selecione o tipo de relatório que deseja visualizar:</p>
                </div>
                
                <div class="reports-grid">
                    ${this.reportsTypes.map(report => `
                        <div class="report-card" data-report="${report.id}">
                            <div class="report-icon">
                                <i class="fas ${report.icon}"></i>
                            </div>
                            <div class="report-info">
                                <h3>${report.name}</h3>
                                <p>${report.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Adiciona estilos específicos
        this.addStyles();
        
        // Configura os event listeners
        this.setupEventListeners();
    }
    
    // Adiciona estilos CSS específicos para o componente de relatórios
    addStyles() {
        // Verifica se os estilos já existem
        if (!document.getElementById('reports-component-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'reports-component-styles';
            styleElement.textContent = `
                .reports-intro {
                    margin-bottom: 2rem;
                }
                
                .reports-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                
                .report-card {
                    background-color: #fff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .report-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                }
                
                .report-icon {
                    font-size: 2.5rem;
                    color: #4a90e2;
                    margin-right: 1.5rem;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #f0f7ff;
                    border-radius: 50%;
                }
                
                .report-info h3 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.25rem;
                    color: #333;
                }
                
                .report-info p {
                    margin: 0;
                    color: #666;
                    font-size: 0.875rem;
                }
                
                /* Dark mode */
                .dark-mode .report-card {
                    background-color: #2c3e50;
                }
                
                .dark-mode .report-icon {
                    background-color: #34495e;
                    color: #3498db;
                }
                
                .dark-mode .report-info h3 {
                    color: #ecf0f1;
                }
                
                .dark-mode .report-info p {
                    color: #bdc3c7;
                }
                
                .access-denied {
                    text-align: center;
                    padding: 3rem;
                }
                
                .access-denied i {
                    font-size: 4rem;
                    color: #e74c3c;
                    margin-bottom: 1rem;
                }
                
                .access-denied h2 {
                    font-size: 1.75rem;
                    margin-bottom: 1rem;
                    color: #333;
                }
                
                .access-denied p {
                    font-size: 1rem;
                    margin-bottom: 1.5rem;
                    color: #666;
                }
                
                .dark-mode .access-denied h2 {
                    color: #ecf0f1;
                }
                
                .dark-mode .access-denied p {
                    color: #bdc3c7;
                }
            `;
            document.head.appendChild(styleElement);
        }
    }
    
    // Configura os event listeners
    setupEventListeners() {
        const reportCards = document.querySelectorAll('.report-card');
        
        reportCards.forEach(card => {
            card.addEventListener('click', () => {
                const reportType = card.dataset.report;
                this.navigateToReport(reportType);
            });
        });
    }
    
    // Navega para o relatório específico
    navigateToReport(reportType) {
        switch (reportType) {
            case 'sellers':
                window.location.href = 'reports-sellers.html';
                break;
            case 'sales':
                window.location.href = 'reports-sales.html';
                break;
            case 'financial':
                ui.showNotification('Relatório financeiro em desenvolvimento', 'info');
                break;
            case 'production':
                ui.showNotification('Relatório de produção em desenvolvimento', 'info');
                break;
            case 'clients':
                ui.showNotification('Relatório de clientes em desenvolvimento', 'info');
                break;
            case 'products':
                ui.showNotification('Relatório de produtos em desenvolvimento', 'info');
                break;
            default:
                ui.showNotification('Tipo de relatório não implementado', 'warning');
        }
    }
    
    // Limpa recursos quando o componente é destruído
    cleanup() {
        // Nada a limpar neste componente
    }
}

// Registra o componente globalmente
window.ReportsComponent = ReportsComponent; 