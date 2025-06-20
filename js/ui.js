// Sistema de interface do usuário
class UI {
    constructor() {
        // Elementos do DOM
        this.mainMenu = document.getElementById('main-menu');
        this.mainContent = document.getElementById('main-content');
        this.notificationArea = document.getElementById('notification-area');
        this.quickActionModal = document.getElementById('quick-action-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.closeModalBtn = document.getElementById('close-modal');
        
        // Estados
        this.currentPage = null;
        this.notificationTimeout = null;
        this.menuItems = [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie', component: 'DashboardComponent' },
            { id: 'workflow', label: 'Fluxo de Trabalho', icon: 'fa-tasks', component: 'WorkflowComponent' },
            { id: 'impressao', label: 'Impressão', icon: 'fa-print', component: 'ImpressaoComponent' },
            { id: 'aplicacao', label: 'Aplicação', icon: 'fa-spray-can', component: 'AplicacaoComponent' },
            { id: 'acabamento', label: 'Acabamento', icon: 'fa-cut', component: 'AcabamentoComponent' },
            { id: 'cortes-especiais', label: 'Cortes Especiais', icon: 'fa-ruler-combined', component: 'CortesEspeciaisComponent' },
            { id: 'orders', label: 'Pedidos', icon: 'fa-clipboard-list', component: 'OrdersComponent' },
            { id: 'search-orders', label: 'Buscar Pedidos', icon: 'fa-search', component: 'SearchOrdersComponent' },
            { id: 'clients', label: 'Clientes', icon: 'fa-users', component: 'ClientsComponent' },
            { id: 'products', label: 'Produtos', icon: 'fa-boxes', component: 'ProductsComponent' },
            { id: 'employees', label: 'Funcionários', icon: 'fa-id-card', component: 'EmployeesComponent' },
            { id: 'suppliers', label: 'Fornecedores', icon: 'fa-truck', component: 'SuppliersComponent' },
            { id: 'inventory', label: 'Estoque', icon: 'fa-warehouse', component: 'Inventory' },
            { id: 'reports', label: 'Relatórios', icon: 'fa-chart-bar', component: 'ReportsComponent' },
            { id: 'permissions', label: 'Gerenciar Permissões', icon: 'fa-shield-alt', component: 'PermissionsComponent' },
            { id: 'profile', label: 'Meu Perfil', icon: 'fa-user', component: 'Profile', isHidden: true }
        ];
        
        this.init();
    }
    
    // Inicialização
    init() {
        this.setupEventListeners();
    }
    
    // Configura event listeners
    setupEventListeners() {
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        
        // Fechar modal ao clicar fora dele
        this.quickActionModal.addEventListener('click', (e) => {
            if (e.target === this.quickActionModal) {
                this.closeModal();
            }
        });
        
        // Fechar modal com tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.quickActionModal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }
    
    // Gera o menu principal com base nas permissões do usuário
    generateMenu() {
        this.mainMenu.innerHTML = '';
        
        this.menuItems.forEach(item => {
            // Verifica se o usuário tem permissão para este item e se não está oculto
            if (!item.isHidden && window.auth.hasPagePermission(item.id)) {
                const menuItem = document.createElement('a');
                menuItem.href = '#';
                menuItem.dataset.page = item.id;
                menuItem.innerHTML = `<i class="fas ${item.icon}"></i> ${item.label}`;
                
                // Marca como ativo se for a página atual
                if (this.currentPage === item.id) {
                    menuItem.classList.add('active');
                }
                
                // Adiciona evento de clique
                menuItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo(item.id);
                });
                
                this.mainMenu.appendChild(menuItem);
            }
        });
    }
    
    // Navega para uma página específica
    navigateTo(pageId, callback = null, isInitialLoad = false) {
        console.log(`[UI.navigateTo] Iniciando navegação para: ${pageId}. É carregamento inicial? ${isInitialLoad}`);
        // Verifica se o usuário tem permissão para acessar a página
        if (pageId !== 'profile' && !window.auth.hasPagePermission(pageId)) {
            console.error(`[UI.navigateTo] Falha na permissão para a página: ${pageId}`);
            this.showNotification('Você não tem permissão para acessar esta página.', 'error');
            return;
        }
        
        const menuItem = this.menuItems.find(item => item.id === pageId);

        // Verifica se a página existe
        if (!menuItem) {
            console.error(`[UI.navigateTo] Página não encontrada na lista menuItems: ${pageId}. Redirecionando para o dashboard.`);
            this.showErrorPage(`Componente para a página "${pageId}" não foi encontrado.`);
            return;
        }
        
        // Limpa o componente anterior, se existir
        if (this.currentComponent && typeof this.currentComponent.cleanup === 'function') {
            console.log(`Limpando componente anterior: ${this.currentPage}`);
            this.currentComponent.cleanup();
        }
        
        // Atualiza a página atual
        this.currentPage = pageId;
        
        // Atualiza o menu
        this.updateActiveMenuItem();
        
        // Verifica se é o Dashboard e se não é o carregamento inicial
        if (pageId === 'dashboard' && !isInitialLoad) {
            // Mostra um indicador de carregamento pequeno na área de conteúdo
            this.mainContent.innerHTML = `
                <div class="loading-indicator-small">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Carregando dashboard...</p>
                </div>
            `;
        }
        
        // Renderiza o componente correspondente de forma assíncrona
        setTimeout(() => {
            this.renderComponent(pageId, callback, isInitialLoad);
            
            // Atualiza a URL sem recarregar a página
            window.history.pushState({}, '', `#${pageId}`);
        }, 50); // Pequeno delay para permitir que a UI atualize
    }
    
    // Atualiza o item de menu ativo
    updateActiveMenuItem() {
        const menuLinks = this.mainMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            if (link.dataset.page === this.currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    // Renderiza um componente na área de conteúdo principal
    renderComponent(componentId, callback = null, isInitialLoad = false) {
        console.log(`[UI.renderComponent] Tentando renderizar componente: ${componentId}`);
        // Encontra o componente correspondente
        const menuItem = this.menuItems.find(item => item.id === componentId);
        
        if (menuItem && window[menuItem.component]) {
            console.log(`[UI.renderComponent] Componente "${menuItem.component}" encontrado para a página "${componentId}".`);
            try {
                // Se for dashboard e não for carregamento inicial, mostra indicador de carregamento
                if (componentId === 'dashboard' && !isInitialLoad) {
                    // Já mostrado na função navigateTo
                } else if (componentId !== 'dashboard') {
                    // Para outros componentes, limpa o conteúdo anterior
                    this.mainContent.innerHTML = '';
                }
                
                // Cria e renderiza o componente
                console.log(`[UI.renderComponent] Instanciando a classe: new window.${menuItem.component}()`);
                const component = new window[menuItem.component]();
                
                // Armazena referência ao componente atual
                this.currentComponent = component;
                
                // Se for dashboard, define a flag global de carregamento
                if (componentId === 'dashboard') {
                    window.isLoadingData = true;
                }
                
                // Renderiza o componente
                component.render(this.mainContent)
                    .then(() => {
                        // Após renderização completa, reseta a flag de carregamento
                        if (componentId === 'dashboard') {
                            window.isLoadingData = false;
                        }
                        if (callback && typeof callback === 'function') {
                            callback();
                        }
                    })
                    .catch(error => {
                        console.error(`[UI.renderComponent] Erro CRÍTICO ao renderizar o componente ${componentId}:`, error);
                        window.isLoadingData = false;
                        this.showErrorPage(`Erro ao renderizar o componente "${componentId}": ${error.message}`);
                    });
            } catch (error) {
                console.error(`[UI.renderComponent] Erro CRÍTICO ao instanciar o componente ${menuItem.component}:`, error);
                this.showErrorPage(`Erro ao criar o componente "${menuItem.component}": ${error.message}`);
            }
        } else {
            console.error(`[UI.renderComponent] Definição do componente não encontrada para: ${componentId}. Verifique se o ID está correto em menuItems e se a classe/arquivo JS existe.`);
            this.showErrorPage(`Componente "${menuItem?.component || 'desconhecido'}" não foi encontrado ou carregado.`);
        }
    }
    
    // Exibe página de erro
    showErrorPage(message = 'Página não encontrada') {
        console.error(`[UI.showErrorPage] Exibindo página de erro com a mensagem: "${message}"`);
        this.mainContent.innerHTML = `
            <div class="error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Erro</h2>
                <p>${message}</p>
                <button class="btn btn-primary" id="go-home">Voltar ao Início</button>
            </div>
        `;
        
        document.getElementById('go-home').addEventListener('click', () => {
            this.navigateTo('dashboard');
        });
    }
    
    // Exibe uma notificação temporária
    showNotification(message, type = 'success', customTime = null) {
        console.log('Exibindo notificação:', message, 'tipo:', type, 'tempo:', customTime);
        
        // Limpa timeout anterior, se existir
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Força a criação da área de notificações se não existir
        if (!this.notificationArea || !document.body.contains(this.notificationArea)) {
            console.log('Área de notificações não encontrada, criando nova');
            this.notificationArea = document.createElement('div');
            this.notificationArea.id = 'notification-area';
            document.body.appendChild(this.notificationArea);
        }
        
        // Cria elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.display = 'block'; // Garante que a notificação seja exibida
        
        // Adiciona botão de fechar para notificações importantes
        if (message.includes('excluído') || type === 'error' || type === 'warning') {
            notification.innerHTML = `
                ${message}
                <span class="notification-close-btn">×</span>
            `;
            // Adiciona evento ao botão de fechar
            const closeBtn = notification.querySelector('.notification-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateY(-20px)';
                    notification.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    setTimeout(() => {
                        if (notification.parentNode === this.notificationArea) {
                            this.notificationArea.removeChild(notification);
                        }
                    }, 500);
                });
            }
        } else {
            notification.textContent = message;
        }
        
        // Adiciona à área de notificações
        this.notificationArea.appendChild(notification);
        
        // Define tempo de exibição com base no tipo e no conteúdo da mensagem
        let displayTime = customTime || 5000; // 5 segundos (padrão)
        
        // Aumenta o tempo para mensagens importantes
        if (message.includes('excluído com sucesso') || message.includes('excluir')) {
            displayTime = customTime || 15000; // 15 segundos para exclusões (aumentado de 8s para 15s)
        } else if (type === 'error' || type === 'warning') {
            displayTime = customTime || 12000; // 12 segundos para erros e avisos (aumentado de 7s para 12s)
        } else if (message.length > 50) {
            displayTime = customTime || 8000; // 8 segundos para mensagens longas (aumentado de 6s para 8s)
        }
        
        // Configura a remoção automática após o tempo definido
        this.notificationTimeout = setTimeout(() => {
            // Adiciona classe para animação de saída
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            notification.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            // Remove do DOM após a animação de fade out
            setTimeout(() => {
                if (notification.parentNode === this.notificationArea) {
                    this.notificationArea.removeChild(notification);
                }
            }, 500);
        }, displayTime);
    }
    
    // Abre o modal de ação rápida
    openModal(title, content, width = '600px') {
        this.modalTitle.textContent = title;
        this.modalBody.innerHTML = '';
        
        // Se o conteúdo for um elemento HTML
        if (content instanceof HTMLElement) {
            this.modalBody.appendChild(content);
        } else {
            // Se for uma string HTML
            this.modalBody.innerHTML = content;
        }
        
        // Define largura personalizada
        this.quickActionModal.querySelector('.modal-content').style.maxWidth = width;
        
        // Exibe o modal
        this.quickActionModal.classList.add('active');
    }
    
    // Fecha o modal
    closeModal() {
        this.quickActionModal.classList.remove('active');
    }
    
    // Mostra um modal com opções de confirmar e cancelar
    showModal(title, content, onConfirm, confirmText = 'Confirmar', cancelText = 'Cancelar') {
        const modalBody = this.quickActionModal.querySelector('#modal-body');
        if (!modalBody) {
            console.error('Elemento #modal-body não encontrado no modal.');
            return;
        }

        // Define o título
        this.modalTitle.textContent = title;
        modalBody.innerHTML = ''; // Limpa o conteúdo anterior

        // Adiciona o novo conteúdo
        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else {
            modalBody.appendChild(content);
        }

        // Remove o container de botões antigo, se existir, para evitar duplicatas
        const oldButtons = modalBody.querySelector('.modal-buttons');
        if (oldButtons) {
            oldButtons.remove();
        }

        // Cria e adiciona o novo container de botões
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'modal-buttons';

        // Botão de Cancelar
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.addEventListener('click', () => this.closeModal());
        buttonsContainer.appendChild(cancelBtn);

        // Botão de Confirmar
        if (onConfirm) {
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.textContent = confirmText;
            confirmBtn.addEventListener('click', () => {
                onConfirm();
                this.closeModal();
            });
            buttonsContainer.appendChild(confirmBtn);
        }

        modalBody.appendChild(buttonsContainer);

        // Abre o modal diretamente
        this.quickActionModal.classList.add('active');
    }
    
    // Cria um formulário a partir de uma definição de campos
    createForm(fields, submitCallback, initialValues = {}) {
        const form = document.createElement('form');
        form.className = 'custom-form';
        
        // Para cada campo, cria os elementos correspondentes
        fields.forEach(field => {
            // Verifica permissão, se o campo exigir
            if (field.requiresPermission && !window.auth.hasFeaturePermission(field.requiresPermission)) {
                // Se não tiver permissão, não inclui o campo no formulário
                return;
            }
            
            const fieldContainer = document.createElement('div');
            fieldContainer.className = 'form-group';
            
            // Label para o campo
            const label = document.createElement('label');
            label.textContent = field.label;
            if (field.id) {
                label.htmlFor = field.id;
            }
            fieldContainer.appendChild(label);
            
            // Elemento de input, conforme o tipo
            let inputElement;
            
            switch (field.type) {
                case 'select':
                    inputElement = document.createElement('select');
                    // Adiciona as opções
                    if (field.options && Array.isArray(field.options)) {
                        field.options.forEach(option => {
                            const optionElement = document.createElement('option');
                            optionElement.value = option.value;
                            optionElement.textContent = option.label;
                            inputElement.appendChild(optionElement);
                        });
                    }
                    break;
                    
                case 'textarea':
                    inputElement = document.createElement('textarea');
                    if (field.rows) inputElement.rows = field.rows;
                    break;
                    
                case 'checkbox':
                    const checkWrapper = document.createElement('div');
                    checkWrapper.className = 'checkbox-wrapper';
                    
                    inputElement = document.createElement('input');
                    inputElement.type = 'checkbox';
                    
                    const checkLabel = document.createElement('span');
                    checkLabel.className = 'checkbox-label';
                    checkLabel.textContent = field.checkLabel || '';
                    
                    checkWrapper.appendChild(inputElement);
                    checkWrapper.appendChild(checkLabel);
                    fieldContainer.appendChild(checkWrapper);
                    break;
                    
                default: // text, email, number, password, etc.
                    inputElement = document.createElement('input');
                    inputElement.type = field.type || 'text';
                    if (field.placeholder) inputElement.placeholder = field.placeholder;
                    if (field.min !== undefined) inputElement.min = field.min;
                    if (field.max !== undefined) inputElement.max = field.max;
                    if (field.step !== undefined) inputElement.step = field.step;
                    break;
            }
            
            // Configura os atributos comuns
            if (field.id) {
                inputElement.id = field.id;
            }
            inputElement.name = field.name;
            inputElement.className = 'form-control';
            if (field.required) {
                inputElement.required = true;
            }
            
            // Desabilita o campo se o usuário não tiver permissão para editar
            if (field.editRequiresPermission && !window.auth.hasFeaturePermission(field.editRequiresPermission)) {
                inputElement.disabled = true;
                inputElement.title = 'Você não tem permissão para editar este campo';
            }
            
            // Aplica o valor inicial, se existir
            if (initialValues[field.name] !== undefined) {
                if (field.type === 'checkbox') {
                    inputElement.checked = !!initialValues[field.name];
                } else {
                    inputElement.value = initialValues[field.name];
                }
            } else if (field.defaultValue !== undefined) {
                if (field.type === 'checkbox') {
                    inputElement.checked = !!field.defaultValue;
                } else {
                    inputElement.value = field.defaultValue;
                }
            }
            
            // Se não for checkbox, adiciona o input ao container agora
            // (para checkbox já foi adicionado junto com seu label)
            if (field.type !== 'checkbox') {
                fieldContainer.appendChild(inputElement);
            }
            
            // Mensagem de ajuda, se existir
            if (field.helpText) {
                const helpText = document.createElement('div');
                helpText.className = 'help-text';
                helpText.textContent = field.helpText;
                fieldContainer.appendChild(helpText);
            }
            
            form.appendChild(fieldContainer);
        });
        
        // Botões de ação
        const actionButtons = document.createElement('div');
        actionButtons.className = 'form-actions';
        
        // Botão de cancelar, se solicitado
        if (fields.some(field => field.name === 'cancel')) {
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'btn btn-secondary';
            cancelButton.textContent = 'Cancelar';
            cancelButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof submitCallback === 'function') {
                    submitCallback({ cancel: true });
                }
            });
            actionButtons.appendChild(cancelButton);
        }
        
        // Botão de enviar
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'btn btn-primary';
        submitButton.textContent = 'Salvar';
        actionButtons.appendChild(submitButton);
        
        form.appendChild(actionButtons);
        
        // Event listener para envio do formulário
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Coleta os valores do formulário
            const formData = {};
            fields.forEach(field => {
                const element = form.elements[field.name];
                if (element) {
                    if (field.type === 'checkbox') {
                        formData[field.name] = element.checked;
                    } else {
                        formData[field.name] = element.value;
                    }
                }
            });
            
            // Chama o callback com os dados
            if (typeof submitCallback === 'function') {
                submitCallback(formData);
            }
        });
        
        return form;
    }
    
    // Cria uma tabela de dados a partir de cabeçalhos e dados
    createDataTable(headers, data, options = {}) {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        
        // Elemento de busca, se solicitado
        if (options.searchable) {
            const searchContainer = document.createElement('div');
            searchContainer.className = 'table-search-container';
            
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'table-search-input';
            searchInput.placeholder = 'Buscar...';
            
            // Ícone de busca
            const searchIcon = document.createElement('i');
            searchIcon.className = 'fas fa-search table-search-icon';
            
            searchContainer.appendChild(searchIcon);
            searchContainer.appendChild(searchInput);
            tableContainer.appendChild(searchContainer);
            
            // Lógica de busca
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                
                // Filtra os dados conforme o termo de busca
                const filteredData = searchTerm ? 
                    data.filter(row => 
                        Object.values(row).some(value => 
                            value && value.toString().toLowerCase().includes(searchTerm)
                        )
                    ) : data;
                
                // Atualiza a tabela com os dados filtrados
                updateTableRows(filteredData);
            });
        }
        
        // Container de ações em lote, se houver
        if (options.batchActions && options.batchActions.length > 0) {
            const batchActionsContainer = document.createElement('div');
            batchActionsContainer.className = 'batch-actions-container';
            
            const actionsSelect = document.createElement('select');
            actionsSelect.className = 'batch-actions-select';
            
            // Opção padrão
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Ações em lote';
            defaultOption.selected = true;
            defaultOption.disabled = true;
            actionsSelect.appendChild(defaultOption);
            
            // Adiciona as opções de ação
            options.batchActions.forEach(action => {
                // Verifica se o usuário tem permissão para esta ação
                if (!action.requiresPermission || window.auth.hasFeaturePermission(action.requiresPermission)) {
                    const option = document.createElement('option');
                    option.value = action.id;
                    option.textContent = action.label;
                    actionsSelect.appendChild(option);
                }
            });
            
            // Botão de aplicar
            const applyButton = document.createElement('button');
            applyButton.className = 'btn btn-sm btn-secondary batch-actions-button';
            applyButton.textContent = 'Aplicar';
            applyButton.disabled = true; // Desabilitado inicialmente
            
            batchActionsContainer.appendChild(actionsSelect);
            batchActionsContainer.appendChild(applyButton);
            tableContainer.appendChild(batchActionsContainer);
            
            // Lógica para ativar/desativar o botão de aplicar
            actionsSelect.addEventListener('change', () => {
                applyButton.disabled = !actionsSelect.value;
            });
            
            // Lógica para aplicar a ação selecionada
            applyButton.addEventListener('click', () => {
                const selectedAction = options.batchActions.find(a => a.id === actionsSelect.value);
                const selectedRows = Array.from(tableBody.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(checkbox => checkbox.dataset.id);
                
                if (selectedAction && selectedRows.length > 0) {
                    if (typeof selectedAction.handler === 'function') {
                        selectedAction.handler(selectedRows);
                    }
                    
                    // Reseta a seleção
                    actionsSelect.selectedIndex = 0;
                    applyButton.disabled = true;
                }
            });
        }
        
        // Cria a tabela
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Cabeçalho da tabela
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Checkbox de seleção para todos, se necessário
        if (options.selectable) {
            const selectAllHeader = document.createElement('th');
            selectAllHeader.className = 'select-column';
            
            const selectAllCheckbox = document.createElement('input');
            selectAllCheckbox.type = 'checkbox';
            selectAllCheckbox.className = 'select-all-checkbox';
            
            selectAllHeader.appendChild(selectAllCheckbox);
            headerRow.appendChild(selectAllHeader);
            
            // Lógica para selecionar/deselecionar todos
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = tableBody.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
                
                // Atualiza o estado do botão de ações em lote
                if (options.batchActions) {
                    const applyButton = tableContainer.querySelector('.batch-actions-button');
                    if (applyButton) {
                        const actionsSelect = tableContainer.querySelector('.batch-actions-select');
                        applyButton.disabled = !actionsSelect.value || !Array.from(checkboxes).some(cb => cb.checked);
                    }
                }
            });
        }
        
        // Adiciona os cabeçalhos
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.label;
            
            // Adiciona classe se for uma coluna de ações
            if (header.isAction) {
                th.className = 'action-column';
            }
            
            // Adiciona funcionalidade de ordenação, se solicitada
            if (options.sortable && header.sortable !== false) {
                th.className = (th.className + ' sortable').trim();
                th.dataset.field = header.field;
                
                // Ícone de ordenação
                const sortIcon = document.createElement('i');
                sortIcon.className = 'fas fa-sort sort-icon';
                th.appendChild(sortIcon);
                
                // Lógica de ordenação
                th.addEventListener('click', () => {
                    // Remove classe de ordenação de todos os cabeçalhos
                    headerRow.querySelectorAll('th').forEach(header => {
                        header.classList.remove('sort-asc', 'sort-desc');
                    });
                    
                    // Define a direção da ordenação
                    let sortDirection = 'asc';
                    if (th.classList.contains('sort-asc')) {
                        sortDirection = 'desc';
                    }
                    
                    // Adiciona classe de ordenação
                    th.classList.add(`sort-${sortDirection}`);
                    
                    // Ordena os dados
                    const sortedData = [...data].sort((a, b) => {
                        const aValue = a[header.field];
                        const bValue = b[header.field];
                        
                        if (aValue === bValue) return 0;
                        
                        if (aValue == null) return 1; // Valores nulos por último
                        if (bValue == null) return -1;
                        
                        // Compara os valores conforme a direção
                        return sortDirection === 'asc' ? 
                            (aValue < bValue ? -1 : 1) : 
                            (aValue > bValue ? -1 : 1);
                    });
                    
                    // Atualiza a tabela
                    updateTableRows(sortedData);
                });
            }
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Corpo da tabela
        const tableBody = document.createElement('tbody');
        table.appendChild(tableBody);
        
        // Função para atualizar as linhas da tabela
        const updateTableRows = (rowsData) => {
            tableBody.innerHTML = '';
            
            if (rowsData.length === 0) {
                // Mensagem para quando não há dados
                const emptyRow = document.createElement('tr');
                const emptyCell = document.createElement('td');
                emptyCell.colSpan = headers.length + (options.selectable ? 1 : 0);
                emptyCell.className = 'no-data';
                emptyCell.textContent = options.emptyMessage || 'Nenhum dado disponível';
                emptyRow.appendChild(emptyCell);
                tableBody.appendChild(emptyRow);
                return;
            }
            
            // Adiciona as linhas de dados
            rowsData.forEach(rowData => {
                const row = document.createElement('tr');
                
                // Adiciona o ID como atributo data, se existir
                if (rowData.id) {
                    row.dataset.id = rowData.id;
                }
                
                // Checkbox de seleção, se necessário
                if (options.selectable) {
                    const selectCell = document.createElement('td');
                    selectCell.className = 'select-column';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'row-checkbox';
                    if (rowData.id) {
                        checkbox.dataset.id = rowData.id;
                    }
                    
                    // Lógica para atualizar o estado do botão de ações em lote
                    if (options.batchActions) {
                        checkbox.addEventListener('change', () => {
                            const applyButton = tableContainer.querySelector('.batch-actions-button');
                            if (applyButton) {
                                const actionsSelect = tableContainer.querySelector('.batch-actions-select');
                                const anyChecked = tableBody.querySelector('input[type="checkbox"]:checked');
                                applyButton.disabled = !actionsSelect.value || !anyChecked;
                            }
                        });
                    }
                    
                    selectCell.appendChild(checkbox);
                    row.appendChild(selectCell);
                }
                
                // Adiciona as células de dados
                headers.forEach(header => {
                    const cell = document.createElement('td');
                    
                    // Para colunas de ação, adiciona os botões de ação
                    if (header.isAction && header.actions) {
                        header.actions.forEach(action => {
                            // Verifica se o usuário tem permissão para esta ação
                            if (!action.requiresPermission || window.auth.hasFeaturePermission(action.requiresPermission)) {
                                // Se houver uma condição para mostrar o botão, verifica
                                if (!action.condition || action.condition(rowData)) {
                                    const actionButton = document.createElement('button');
                                    actionButton.className = `btn btn-sm ${action.class || 'btn-primary'}`;
                                    
                                    // Adiciona ícone, se existir
                                    if (action.icon) {
                                        actionButton.innerHTML = `<i class="fas ${action.icon}"></i>`;
                                        actionButton.title = action.label;
                                    } else {
                                        actionButton.textContent = action.label;
                                    }
                                    
                                    // Adiciona evento de clique
                                    actionButton.addEventListener('click', () => {
                                        if (typeof action.handler === 'function') {
                                            action.handler(rowData);
                                        }
                                    });
                                    
                                    cell.appendChild(actionButton);
                                }
                            }
                        });
                        
                        cell.className = 'action-column';
                    } else if (header.field) {
                        // Para campos normais, exibe o valor
                        let value = rowData[header.field];
                        
                        // Aplica o formatter, se existir
                        if (header.formatter && typeof header.formatter === 'function') {
                            value = header.formatter(value, rowData);
                        }
                        
                        cell.innerHTML = value !== undefined && value !== null ? value : '';
                        
                        // Adiciona classe específica, se existir
                        if (header.cellClass) {
                            cell.className = header.cellClass;
                        }
                    }
                    
                    row.appendChild(cell);
                });
                
                // Adiciona evento de clique na linha, se existir handler
                if (options.onRowClick && typeof options.onRowClick === 'function') {
                    row.style.cursor = 'pointer';
                    row.addEventListener('click', (e) => {
                        // Ignora cliques em checkboxes e botões
                        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') {
                            options.onRowClick(rowData);
                        }
                    });
                }
                
                tableBody.appendChild(row);
            });
        };
        
        // Inicializa a tabela com os dados
        updateTableRows(data);
        
        // Adiciona paginação, se solicitada
        if (options.pageable && data.length > (options.pageSize || 10)) {
            const pageSize = options.pageSize || 10;
            let currentPage = 1;
            const totalPages = Math.ceil(data.length / pageSize);
            
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-container';
            
            // Conteúdo da paginação
            const updatePagination = () => {
                paginationContainer.innerHTML = '';
                
                // Exibe informações sobre a página atual
                const pageInfo = document.createElement('div');
                pageInfo.className = 'pagination-info';
                pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
                paginationContainer.appendChild(pageInfo);
                
                // Botões de navegação
                const paginationControls = document.createElement('div');
                paginationControls.className = 'pagination-controls';
                
                // Botão anterior
                const prevButton = document.createElement('button');
                prevButton.className = 'btn btn-sm btn-secondary';
                prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
                prevButton.disabled = currentPage === 1;
                prevButton.addEventListener('click', () => {
                    if (currentPage > 1) {
                        currentPage--;
                        updateTablePage();
                        updatePagination();
                    }
                });
                paginationControls.appendChild(prevButton);
                
                // Botão próximo
                const nextButton = document.createElement('button');
                nextButton.className = 'btn btn-sm btn-secondary';
                nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
                nextButton.disabled = currentPage === totalPages;
                nextButton.addEventListener('click', () => {
                    if (currentPage < totalPages) {
                        currentPage++;
                        updateTablePage();
                        updatePagination();
                    }
                });
                paginationControls.appendChild(nextButton);
                
                paginationContainer.appendChild(paginationControls);
            };
            
            // Função para atualizar os dados da tabela conforme a página
            const updateTablePage = () => {
                const start = (currentPage - 1) * pageSize;
                const end = start + pageSize;
                const pageData = data.slice(start, end);
                updateTableRows(pageData);
            };
            
            // Inicializa a paginação
            updateTablePage();
            updatePagination();
            
            tableContainer.appendChild(paginationContainer);
        }
        
        tableContainer.appendChild(table);
        return tableContainer;
    }
    
    // Formata um valor como moeda
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    // Formata uma data
    formatDate(date) {
        if (!date) return '';
        
        // Se for um timestamp do Firestore
        if (date && typeof date.toDate === 'function') {
            date = date.toDate();
        }
        
        // Se for uma string, converte para Date
        if (typeof date === 'string' || typeof date === 'number') {
            date = new Date(date);
        }
        
        // Formato padrão DD/MM/YYYY
        return new Intl.DateTimeFormat('pt-BR').format(date);
    }
    
    // Cria notificação tipo "desfazer"
    createUndoNotification(message, undoCallback) {
        const notification = document.createElement('div');
        notification.className = 'undo-notification';
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        notification.appendChild(messageSpan);
        
        const undoBtn = document.createElement('span');
        undoBtn.className = 'undo-btn';
        undoBtn.textContent = 'DESFAZER';
        undoBtn.addEventListener('click', () => {
            document.body.removeChild(notification);
            if (undoCallback) undoCallback();
        });
        
        notification.appendChild(undoBtn);
        document.body.appendChild(notification);
        
        // Remove após a animação terminar
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }
    
    // Exibe indicador de carregamento
    showLoading(message = 'Carregando...') {
        // Remove qualquer loader existente
        this.hideLoading();
        
        // Cria o elemento de loader
        const loaderContainer = document.createElement('div');
        loaderContainer.id = 'global-loader';
        loaderContainer.className = 'global-loader';
        
        loaderContainer.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        
        // Adiciona ao body
        document.body.appendChild(loaderContainer);
        
        // Impede rolagem da página
        document.body.style.overflow = 'hidden';
    }
    
    // Oculta indicador de carregamento
    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            document.body.removeChild(loader);
        }
        
        // Restaura rolagem da página
        document.body.style.overflow = '';
    }
    
    // Exibe um toast de carregamento que não bloqueia a interface
    showLoadingToast(message = 'Carregando dados...') {
        // Remove qualquer toast existente
        this.hideLoadingToast();
        
        // Cria o elemento de toast
        const toastContainer = document.createElement('div');
        toastContainer.id = 'loading-toast';
        toastContainer.className = 'loading-toast';
        
        toastContainer.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Adiciona ao body
        document.body.appendChild(toastContainer);
        
        // Mostra o toast com animação
        setTimeout(() => {
            toastContainer.classList.add('visible');
        }, 10);
        
        // Retorna o ID para que possa ser usado para atualizar ou remover o toast
        return 'loading-toast';
    }
    
    // Atualiza a mensagem de um toast existente
    updateLoadingToast(message) {
        const toast = document.getElementById('loading-toast');
        if (toast) {
            const messageSpan = toast.querySelector('span');
            if (messageSpan) {
                messageSpan.textContent = message;
            }
        }
    }
    
    // Oculta o toast de carregamento
    hideLoadingToast() {
        const loadingToastEl = document.getElementById('loading-toast');
        if (loadingToastEl) {
            loadingToastEl.classList.remove('active');
            
            // Remove após a animação
            setTimeout(() => {
                if (loadingToastEl.parentNode) {
                    loadingToastEl.parentNode.removeChild(loadingToastEl);
                }
            }, 300);
        }
    }
    
    // Exibe diálogo de confirmação
    showConfirmation(message) {
        return new Promise((resolve) => {
            const content = `
                <div class="confirmation-message">
                    <i class="fas fa-question-circle"></i>
                    <p>${message}</p>
                </div>
            `;
            
            this.showModal('Confirmação', content, () => {
                resolve(true);
            }, 'Confirmar', 'Cancelar');
            
            // Configura o botão de cancelar para resolver com false
            document.getElementById('modal-cancel').addEventListener('click', () => {
                resolve(false);
            });
        });
    }
    
    // Exibe prompt para entrada de texto
    showPrompt(message, defaultValue = '') {
        return new Promise(resolve => {
            // Cria o modal de prompt
            const promptModal = document.createElement('div');
            promptModal.className = 'prompt-modal';
            
            promptModal.innerHTML = `
                <div class="prompt-content">
                    <p>${message}</p>
                    <input type="text" id="prompt-input" value="${defaultValue}" class="form-control">
                    <div class="prompt-buttons">
                        <button id="prompt-ok" class="btn btn-primary">OK</button>
                        <button id="prompt-cancel" class="btn btn-secondary">Cancelar</button>
                    </div>
                </div>
            `;
            
            // Adiciona ao body
            document.body.appendChild(promptModal);
            
            // Foca no input
            const input = document.getElementById('prompt-input');
            input.focus();
            input.select();
            
            // Função para confirmar
            const confirm = () => {
                const value = input.value;
                document.body.removeChild(promptModal);
                resolve(value);
            };
            
            // Função para cancelar
            const cancel = () => {
                document.body.removeChild(promptModal);
                resolve(null);
            };
            
            // Adiciona eventos aos botões
            document.getElementById('prompt-ok').addEventListener('click', confirm);
            document.getElementById('prompt-cancel').addEventListener('click', cancel);
            
            // Pressionar Enter confirma
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    confirm();
                } else if (e.key === 'Escape') {
                    cancel();
                }
            });
        });
    }
    
    // Exibe dicas sobre captura de tela do Windows
    showScreenshotHelp() {
        const modal = document.getElementById('quick-action-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalTitle || !modalBody) return;
        
        modalTitle.textContent = 'Captura de Tela Simplificada';
        
        modalBody.innerHTML = `
            <div class="screenshot-help">
                <div class="help-method highlighted">
                    <h3>Método Recomendado: Ctrl+V</h3>
                    <div class="help-item">
                        <p><strong>1.</strong> Capture a tela usando as ferramentas do Windows:</p>
                        <ul>
                            <li>Use <kbd>Windows</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> para capturar uma área específica</li>
                            <li>Ou use <kbd>PrtScn</kbd> para capturar toda a tela</li>
                        </ul>
                        <p><strong>2.</strong> Cole diretamente no sistema com <kbd>Ctrl</kbd> + <kbd>V</kbd></p>
                        <p class="help-note-success">Este método é o mais rápido e funciona perfeitamente no Windows 11!</p>
                    </div>
                </div>
                
                <h3>Outros Métodos</h3>
                
                <div class="help-method">
                    <h4>Usar o botão "Capturar Tela"</h4>
                    <div class="help-item">
                        <p>Clique no botão "Capturar Tela" e escolha a área que deseja capturar.</p>
                    </div>
                </div>
                
                <div class="help-method">
                    <h4>Enviar Arquivo</h4>
                    <div class="help-item">
                        <p>Use o botão "Enviar Arquivo" para fazer upload de uma imagem do seu computador.</p>
                    </div>
                </div>
                
                <h3>Problemas conhecidos com Windows 11</h3>
                <div class="help-item">
                    <p>O Windows 11 tem um problema conhecido com a ferramenta de captura nativa que pode ser resolvido temporariamente com estas soluções:</p>
                    <ol>
                        <li>Altere a data do sistema para antes de 31/10/2021</li>
                        <li>Repare o aplicativo de Captura nas configurações do Windows</li>
                    </ol>
                    <p>Para mais detalhes, <a href="https://www.techtudo.com.br/dicas-e-tutoriais/2021/11/ferramenta-de-captura-de-tela-do-windows-11-nao-funciona-veja-solucoes-para-o-problema.ghtml" target="_blank">consulte este artigo</a>.</p>
                    <p><strong>Nota:</strong> O método Ctrl+V funciona independentemente deste problema!</p>
                </div>
                
                <div class="modal-buttons">
                    <button id="close-help" class="btn btn-primary">Entendi</button>
                </div>
            </div>
        `;
        
        // Mostra o modal
        modal.classList.add('active');
        
        // Adiciona evento para fechar
        document.getElementById('close-help').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        document.getElementById('close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    // Verifica problemas com captura de tela
    detectScreenshotIssues() {
        // Verifica se html2canvas está disponível
        if (typeof html2canvas !== 'function') {
            return false;
        }
        
        // Detecta o sistema operacional
        const userAgent = window.navigator.userAgent;
        const isWindows11 = userAgent.indexOf("Windows NT 10.0") !== -1 && 
                           (userAgent.indexOf("Windows 11") !== -1 || 
                            parseInt(userAgent.split("NT ")[1]) >= 10.0);
        
        // Se for Windows 11, mostrar aviso sobre problemas conhecidos
        if (isWindows11) {
            this.showNotification(
                'O Windows 11 pode ter problemas com captura de tela. Clique para ver alternativas.', 
                'warning',
                6000,
                () => this.showScreenshotHelp()
            );
        }
        
        return true;
    }
    
    // Exibe um modal de confirmação com botões Sim/Não
    confirmModal(title, message, onConfirm, { confirmText = 'Confirmar', cancelText = 'Cancelar', contentHTML = '' } = {}) {
        const modalId = `confirm-modal-${Date.now()}`;
        const modal = document.createElement('div');
        modal.className = 'modal-container active';
        modal.id = modalId;

        const bodyContent = contentHTML || `<p>${message}</p>`;

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${bodyContent}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">${cancelText}</button>
                    <button class="btn btn-danger confirm-btn">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }, 300);
        };

        modal.querySelector('.confirm-btn').addEventListener('click', async () => {
            if (onConfirm) {
                // onConfirm agora pode ser assíncrona e deve retornar true para fechar.
                const shouldClose = await onConfirm();
                if (shouldClose) {
                    closeModal();
                }
            } else {
                closeModal();
            }
        });

        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Exibe um modal para entrada de texto
    promptModal(title, message, onConfirm, onCancel) {
        const modalBody = this.quickActionModal.querySelector('#modal-body');
        if (!modalBody) {
            console.error('Elemento #modal-body não encontrado no modal.');
            return;
        }

        // Define o título e limpa o conteúdo anterior
        this.modalTitle.textContent = title;
        modalBody.innerHTML = '';
        
        // Cria o conteúdo do modal
        const contentHTML = `
            <p>${message}</p>
            <div class="form-group">
                <input type="text" id="prompt-input" class="form-control">
            </div>
        `;
        
        modalBody.innerHTML = contentHTML;
        
        // Remove o container de botões antigo, se existir
        const oldButtons = modalBody.querySelector('.modal-buttons');
        if (oldButtons) {
            oldButtons.remove();
        }
        
        // Cria e adiciona o container de botões
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'modal-buttons';
        
        // Botão de Cancelar
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', () => {
            this.closeModal();
            if (onCancel) {
                onCancel();
            }
        });
        buttonsContainer.appendChild(cancelBtn);
        
        // Botão de Confirmar
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = 'Confirmar';
        confirmBtn.addEventListener('click', () => {
            const value = document.getElementById('prompt-input').value;
            if (onConfirm) {
                onConfirm(value);
            }
            this.closeModal();
        });
        buttonsContainer.appendChild(confirmBtn);
        
        // Adiciona os botões ao corpo do modal
        modalBody.appendChild(buttonsContainer);
        
        // Abre o modal diretamente
        this.quickActionModal.classList.add('active');
        
        // Foca no input após abrir o modal
        setTimeout(() => {
            const input = document.getElementById('prompt-input');
            if (input) {
                input.focus();
                input.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') {
                        confirmBtn.click();
                    } else if (e.key === 'Escape') {
                        cancelBtn.click();
                    }
                });
            }
        }, 100);
    }
    
    // Verifica se um botão deve estar habilitado baseado em permissões
    buttonShouldBeEnabled(featureId) {
        return window.auth.hasFeaturePermission(featureId);
    }
    
    // Cria um botão com verificação de permissões
    createPermissionedButton(label, featureId, onClick, className = 'btn-primary', icon = '') {
        const button = document.createElement('button');
        const hasPermission = window.auth.hasFeaturePermission(featureId);
        
        button.className = `btn ${className} ${!hasPermission ? 'btn-disabled' : ''}`;
        
        // Adicionar ícone se fornecido
        if (icon) {
            button.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
        } else {
            button.textContent = label;
        }
        
        // Se o usuário não tem permissão, desabilita o botão
        if (!hasPermission) {
            button.disabled = true;
            button.title = 'Você não tem permissão para executar esta ação';
        } else {
            button.addEventListener('click', onClick);
        }
        
        return button;
    }
    
    // Exibe um elemento apenas se o usuário tem permissão
    showIfHasPermission(element, featureId) {
        if (window.auth.hasFeaturePermission(featureId)) {
            if (typeof element === 'string') {
                const el = document.querySelector(element);
                if (el) el.style.display = '';
            } else if (element instanceof HTMLElement) {
                element.style.display = '';
            }
            return true;
        } else {
            if (typeof element === 'string') {
                const el = document.querySelector(element);
                if (el) el.style.display = 'none';
            } else if (element instanceof HTMLElement) {
                element.style.display = 'none';
            }
            return false;
        }
    }

    async showOrderDetails(orderId) {
        try {
            // Define o ID do pedido no localStorage para ser pego pelo OrdersComponent
            localStorage.setItem('viewOrderId', orderId);
            // Navega para a página de pedidos, que irá renderizar a visualização de detalhes
            this.navigateTo('orders');
        } catch (error) {
            console.error("Erro ao tentar navegar para os detalhes do pedido:", error);
            this.showNotification('Não foi possível abrir os detalhes do pedido.', 'error');
        }
    }
    
    async showChangeStatusDialog(orderId, currentStatus, onStatusChanged) {
        if (!window.auth.hasFeaturePermission('change_order_status')) {
            this.showNotification('Você não tem permissão para alterar o status do pedido.', 'error');
            return;
        }
    
        const statusOptions = SYSTEM_CONFIG.orderStatus
            .filter(status => status.id !== 'cancelled')
            .map(status => `<option value="${status.id}" ${status.id === currentStatus ? 'selected' : ''}>${status.name}</option>`)
            .join('');
    
        const content = `
            <div class="form-group">
                <label for="status-select">Selecione o novo status:</label>
                <select id="status-select" class="form-control">
                    ${statusOptions}
                </select>
            </div>
        `;
    
        this.showModal('Alterar Status do Pedido', content, async () => {
            const newStatus = document.getElementById('status-select').value;
            if (newStatus !== currentStatus) {
                try {
                    this.showLoading('Atualizando status...');

                    const user = window.auth.getCurrentUser();
                    const historyEntry = {
                        previousStatus: currentStatus,
                        newStatus: newStatus,
                        changedAt: new Date(),
                        changedBy: user ? user.name : 'Sistema'
                    };

                    await db.collection('orders').doc(orderId).update({ 
                        status: newStatus,
                        statusUpdatedBy: user ? user.name : 'Sistema',
                        statusUpdatedAt: new Date(),
                        statusHistory: firebase.firestore.FieldValue.arrayUnion(historyEntry)
                    });

                    this.hideLoading();
                    this.showNotification('Status do pedido atualizado com sucesso!', 'success');
                    if (onStatusChanged) {
                        onStatusChanged(newStatus);
                    }
                } catch (error) {
                    this.hideLoading();
                    this.showNotification('Erro ao atualizar o status do pedido.', 'error');
                    console.error("Erro ao alterar status:", error);
                }
            }
        });
    }

    async confirmDeleteOrder(orderId) {
        if (!window.auth.hasFeaturePermission('delete_order')) {
            this.showNotification('Você não tem permissão para excluir pedidos.', 'error');
            return Promise.resolve(false); // Retorna uma promessa resolvida como falso
        }

        return new Promise(async (resolve) => {
            const orderDetails = await firebase.firestore().collection('orders').doc(orderId).get();
            const orderNumber = orderDetails.data()?.orderNumber || orderId;

            const contentHTML = `
                <p>Tem certeza que deseja excluir o pedido <strong>#${orderNumber}</strong>? Esta ação não pode ser desfeita.</p>
                <div class="form-group mt-3">
                    <label for="cancellation-reason"><strong>Motivo do cancelamento (obrigatório):</strong></label>
                    <textarea id="cancellation-reason" class="form-control" rows="3" placeholder="Ex: Cliente desistiu, erro no pedido, etc."></textarea>
                    <small id="reason-error" class="text-danger" style="display: none;">O motivo é obrigatório.</small>
                </div>
            `;
            
            this.confirmModal(
                'Confirmar Exclusão',
                '', // Mensagem principal no HTML
                async () => {
                    const modalInstance = document.querySelector('.modal-container.active');
                    const reasonInput = modalInstance.querySelector('#cancellation-reason');
                    const errorEl = modalInstance.querySelector('#reason-error');
                    const reason = reasonInput.value.trim();

                    if (!reason) {
                        errorEl.style.display = 'block';
                        reasonInput.classList.add('is-invalid');
                        reasonInput.focus();
                        return false; // Não fecha o modal
                    } else {
                        errorEl.style.display = 'none';
                        reasonInput.classList.remove('is-invalid');
                    }

                    try {
                        this.showLoading('Excluindo pedido...');
                        
                        await firebase.firestore().collection('orders').doc(orderId).update({
                            status: 'cancelled',
                            cancellationReason: reason,
                            cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
                            cancelledBy: window.auth.currentUser.name || 'Sistema'
                        });

                        this.hideLoading();
                        this.showNotification(`Pedido #${orderNumber} cancelado com sucesso!`, 'success');
                        
                        document.dispatchEvent(new CustomEvent('orderDeleted', { detail: { orderId } }));
                        
                        resolve(true); // Resolve a promessa principal com sucesso
                        return true; // Fecha o modal

                    } catch (error) {
                        this.hideLoading();
                        console.error("Erro ao cancelar pedido:", error);
                        this.showNotification(`Erro ao cancelar o pedido: ${error.message}`, 'error');
                        resolve(false);
                        return true; // Fecha o modal mesmo em caso de erro no servidor
                    }
                },
                {
                    confirmText: 'Confirmar Exclusão',
                    cancelText: 'Manter Pedido',
                    contentHTML: contentHTML
                }
            );
        });
    }
}

// Será inicializado após carregar a página
