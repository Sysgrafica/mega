// Módulo de Relatórios de Vendas
const SalesReports = (function() {
    // Variáveis privadas
    let currentTab = 'overview';
    let ordersData = [];
    let productsData = [];
    let clientsData = [];
    let filtersActive = false;
    let charts = {};

    // Elementos DOM
    let reportsContainer, filtersForm, tabsContainer, reportContent;
    let dateStart, dateEnd, productFilter, clientFilter, statusFilter, minValueFilter, maxValueFilter;
    let applyFiltersBtn, clearFiltersBtn, exportPdfBtn, exportExcelBtn;

    // Inicialização do módulo
    function init() {
        console.log('Inicializando módulo de relatórios de vendas...');
        
        // Capturar elementos DOM
        reportsContainer = document.getElementById('reports-container');
        filtersForm = document.querySelector('.filters-form');
        tabsContainer = document.getElementById('reports-tabs');
        reportContent = document.getElementById('report-content');
        
        // Campos de filtro
        dateStart = document.getElementById('filter-date-start');
        dateEnd = document.getElementById('filter-date-end');
        productFilter = document.getElementById('filter-product');
        clientFilter = document.getElementById('filter-client');
        statusFilter = document.getElementById('filter-status');
        minValueFilter = document.getElementById('filter-min-value');
        maxValueFilter = document.getElementById('filter-max-value');
        
        // Botões
        applyFiltersBtn = document.getElementById('apply-filters');
        clearFiltersBtn = document.getElementById('clear-filters');
        exportPdfBtn = document.getElementById('export-pdf');
        exportExcelBtn = document.getElementById('export-excel');
        
        // Definir datas padrão (último mês)
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        
        if (dateEnd) dateEnd.value = formatDateForInput(today);
        if (dateStart) dateStart.value = formatDateForInput(lastMonth);
        
        // Adicionar event listeners
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
        if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPdf);
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);
        
        // Inicializar abas
        initTabs();
        
        // Carregar dados iniciais
        loadInitialData();
    }

    // Formatar data para input
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Inicializar abas
    function initTabs() {
        const tabs = [
            { id: 'overview', name: 'Visão Geral', icon: 'chart-pie' },
            { id: 'by-product', name: 'Por Produto', icon: 'box' },
            { id: 'by-client', name: 'Por Cliente', icon: 'user' },
            { id: 'by-period', name: 'Por Período', icon: 'calendar' },
            { id: 'trends', name: 'Tendências', icon: 'chart-line' }
        ];
        
        let tabsHTML = '';
        tabs.forEach(tab => {
            tabsHTML += `
                <button class="reports-tab ${tab.id === currentTab ? 'active' : ''}" data-tab="${tab.id}">
                    <i class="fas fa-${tab.icon}"></i> ${tab.name}
                </button>
            `;
        });
        
        if (tabsContainer) {
            tabsContainer.innerHTML = tabsHTML;
            
            // Adicionar event listeners para as abas
            const tabButtons = tabsContainer.querySelectorAll('.reports-tab');
            tabButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    switchTab(tabId);
                });
            });
        }
    }

    // Trocar de aba
    function switchTab(tabId) {
        // Atualizar aba ativa
        currentTab = tabId;
        
        // Atualizar classes das abas
        const tabs = document.querySelectorAll('.reports-tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Mostrar loading
        showLoading();
        
        // Atualizar conteúdo da aba
        setTimeout(() => {
            updateReportContent();
        }, 300);
    }

    // Mostrar indicador de carregamento
    function showLoading() {
        if (reportContent) {
            reportContent.innerHTML = `
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i> Carregando relatório...
                </div>
            `;
        }
    }

    // Carregar dados iniciais
    function loadInitialData() {
        showLoading();
        
        // Carregar pedidos
        loadOrders()
            .then(() => loadProducts())
            .then(() => loadClients())
            .then(() => {
                // Preencher opções de filtro
                populateFilterOptions();
                
                // Atualizar conteúdo do relatório
                updateReportContent();
            })
            .catch(error => {
                console.error('Erro ao carregar dados iniciais:', error);
                showError('Não foi possível carregar os dados do relatório.');
            });
    }

    // Carregar pedidos do Firestore
    function loadOrders() {
        return new Promise((resolve, reject) => {
            const db = firebase.firestore();
            
            db.collection('orders')
                .get()
                .then(snapshot => {
                    ordersData = [];
                    snapshot.forEach(doc => {
                        const order = {
                            id: doc.id,
                            ...doc.data()
                        };
                        ordersData.push(order);
                    });
                    console.log(`Carregados ${ordersData.length} pedidos`);
                    resolve();
                })
                .catch(error => {
                    console.error('Erro ao carregar pedidos:', error);
                    reject(error);
                });
        });
    }

    // Carregar produtos do Firestore
    function loadProducts() {
        return new Promise((resolve, reject) => {
            const db = firebase.firestore();
            
            db.collection('products')
                .get()
                .then(snapshot => {
                    productsData = [];
                    snapshot.forEach(doc => {
                        const product = {
                            id: doc.id,
                            ...doc.data()
                        };
                        productsData.push(product);
                    });
                    console.log(`Carregados ${productsData.length} produtos`);
                    resolve();
                })
                .catch(error => {
                    console.error('Erro ao carregar produtos:', error);
                    reject(error);
                });
        });
    }

    // Carregar clientes do Firestore
    function loadClients() {
        return new Promise((resolve, reject) => {
            const db = firebase.firestore();
            
            db.collection('clients')
                .get()
                .then(snapshot => {
                    clientsData = [];
                    snapshot.forEach(doc => {
                        const client = {
                            id: doc.id,
                            ...doc.data()
                        };
                        clientsData.push(client);
                    });
                    console.log(`Carregados ${clientsData.length} clientes`);
                    resolve();
                })
                .catch(error => {
                    console.error('Erro ao carregar clientes:', error);
                    reject(error);
                });
        });
    }

    // Preencher opções de filtro
    function populateFilterOptions() {
        // Preencher produtos
        if (productFilter && productsData.length > 0) {
            let options = '<option value="todos">Todos os produtos</option>';
            productsData.forEach(product => {
                options += `<option value="${product.id}">${product.name}</option>`;
            });
            productFilter.innerHTML = options;
        }
        
        // Preencher clientes
        if (clientFilter && clientsData.length > 0) {
            let options = '<option value="todos">Todos os clientes</option>';
            clientsData.forEach(client => {
                options += `<option value="${client.id}">${client.name}</option>`;
            });
            clientFilter.innerHTML = options;
        }
    }

    // Aplicar filtros
    function applyFilters() {
        filtersActive = true;
        updateReportContent();
    }

    // Limpar filtros
    function clearFilters() {
        // Resetar campos de filtro
        if (dateStart) {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            dateStart.value = formatDateForInput(lastMonth);
        }
        
        if (dateEnd) {
            dateEnd.value = formatDateForInput(new Date());
        }
        
        if (productFilter) productFilter.value = 'todos';
        if (clientFilter) clientFilter.value = 'todos';
        if (statusFilter) statusFilter.value = 'todos';
        if (minValueFilter) minValueFilter.value = '';
        if (maxValueFilter) maxValueFilter.value = '';
        
        filtersActive = false;
        updateReportContent();
    }

    // Atualizar conteúdo do relatório
    function updateReportContent() {
        if (!reportContent) return;
        
        // Filtrar dados de acordo com os filtros aplicados
        const filteredData = filterOrdersData();
        
        // Renderizar conteúdo de acordo com a aba atual
        switch (currentTab) {
            case 'overview':
                renderOverviewReport(filteredData);
                break;
            case 'by-product':
                renderProductReport(filteredData);
                break;
            case 'by-client':
                renderClientReport(filteredData);
                break;
            case 'by-period':
                renderPeriodReport(filteredData);
                break;
            case 'trends':
                renderTrendsReport(filteredData);
                break;
            default:
                renderOverviewReport(filteredData);
        }
    }

    // Filtrar dados de pedidos de acordo com os filtros aplicados
    function filterOrdersData() {
        if (!filtersActive) return ordersData;
        
        return ordersData.filter(order => {
            // Filtro por data
            if (dateStart && dateStart.value) {
                const startDate = new Date(dateStart.value);
                const orderDate = order.date ? new Date(order.date.toDate ? order.date.toDate() : order.date) : null;
                
                if (orderDate && orderDate < startDate) return false;
            }
            
            if (dateEnd && dateEnd.value) {
                const endDate = new Date(dateEnd.value);
                endDate.setHours(23, 59, 59, 999); // Fim do dia
                
                const orderDate = order.date ? new Date(order.date.toDate ? order.date.toDate() : order.date) : null;
                
                if (orderDate && orderDate > endDate) return false;
            }
            
            // Filtro por produto
            if (productFilter && productFilter.value !== 'todos') {
                if (!order.items || !order.items.some(item => item.productId === productFilter.value)) {
                    return false;
                }
            }
            
            // Filtro por cliente
            if (clientFilter && clientFilter.value !== 'todos') {
                if (order.clientId !== clientFilter.value) return false;
            }
            
            // Filtro por status
            if (statusFilter && statusFilter.value !== 'todos') {
                if (order.status !== statusFilter.value) return false;
            }
            
            // Filtro por valor mínimo
            if (minValueFilter && minValueFilter.value) {
                const minValue = parseFloat(minValueFilter.value);
                if (!isNaN(minValue) && order.totalValue < minValue) return false;
            }
            
            // Filtro por valor máximo
            if (maxValueFilter && maxValueFilter.value) {
                const maxValue = parseFloat(maxValueFilter.value);
                if (!isNaN(maxValue) && order.totalValue > maxValue) return false;
            }
            
            return true;
        });
    }

    // Renderizar relatório de visão geral
    function renderOverviewReport(data) {
        if (!reportContent) return;
        
        // Calcular estatísticas
        const totalOrders = data.length;
        const totalValue = data.reduce((sum, order) => sum + (order.totalValue || 0), 0);
        const averageValue = totalOrders > 0 ? totalValue / totalOrders : 0;
        
        const statusCounts = {};
        data.forEach(order => {
            const status = order.status || 'sem_status';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // Agrupar por mês
        const monthlyData = {};
        data.forEach(order => {
            if (!order.date) return;
            
            const orderDate = new Date(order.date.toDate ? order.date.toDate() : order.date);
            const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    count: 0,
                    value: 0,
                    month: orderDate.toLocaleString('pt-BR', { month: 'long' }),
                    year: orderDate.getFullYear()
                };
            }
            
            monthlyData[monthKey].count += 1;
            monthlyData[monthKey].value += order.totalValue || 0;
        });
        
        // Preparar dados para o gráfico
        const chartLabels = Object.keys(monthlyData).sort().map(key => {
            const { month, year } = monthlyData[key];
            return `${month[0].toUpperCase() + month.slice(1)} ${year}`;
        });
        
        const chartValues = Object.keys(monthlyData).sort().map(key => monthlyData[key].value);
        
        // Renderizar HTML
        let html = `
            <div class="report-summary">
                <div class="summary-item">
                    <div class="summary-item-label">Total de Pedidos</div>
                    <div class="summary-item-value">${totalOrders}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-item-label">Valor Total</div>
                    <div class="summary-item-value">R$ ${totalValue.toFixed(2).replace('.', ',')}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-item-label">Valor Médio</div>
                    <div class="summary-item-value">R$ ${averageValue.toFixed(2).replace('.', ',')}</div>
                </div>
            </div>
            
            <div class="charts-container">
                <div class="chart-wrapper">
                    <h3 class="chart-title">Vendas por Mês</h3>
                    <div class="chart-canvas-container">
                        <canvas id="monthly-sales-chart"></canvas>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <h3 class="chart-title">Status dos Pedidos</h3>
                    <div class="chart-canvas-container">
                        <canvas id="status-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <h3 class="section-title">Últimos Pedidos</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Data</th>
                        <th>Cliente</th>
                        <th>Status</th>
                        <th class="align-right">Valor</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Adicionar últimos 10 pedidos
        const latestOrders = [...data].sort((a, b) => {
            const dateA = a.date ? new Date(a.date.toDate ? a.date.toDate() : a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date.toDate ? b.date.toDate() : b.date) : new Date(0);
            return dateB - dateA;
        }).slice(0, 10);
        
        latestOrders.forEach(order => {
            const orderDate = order.date ? new Date(order.date.toDate ? order.date.toDate() : order.date) : null;
            const formattedDate = orderDate ? orderDate.toLocaleDateString('pt-BR') : 'Data não disponível';
            
            // Buscar nome do cliente
            const client = clientsData.find(c => c.id === order.clientId);
            const clientName = client ? client.name : 'Cliente não encontrado';
            
            // Mapear status para exibição
            const statusMap = {
                'novo': 'Novo',
                'aprovado': 'Aprovado',
                'em_producao': 'Em Produção',
                'concluido': 'Concluído',
                'entregue': 'Entregue',
                'cancelado': 'Cancelado'
            };
            
            const statusDisplay = statusMap[order.status] || order.status || 'Status não definido';
            
            html += `
                <tr>
                    <td>${order.orderNumber || order.id.substring(0, 6)}</td>
                    <td>${formattedDate}</td>
                    <td>${clientName}</td>
                    <td>${statusDisplay}</td>
                    <td class="align-right currency">R$ ${(order.totalValue || 0).toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        reportContent.innerHTML = html;
        
        // Renderizar gráficos após o HTML estar pronto
        setTimeout(() => {
            renderMonthlySalesChart(chartLabels, chartValues);
            renderStatusChart(statusCounts);
        }, 100);
    }

    // Renderizar gráfico de vendas mensais
    function renderMonthlySalesChart(labels, values) {
        const ctx = document.getElementById('monthly-sales-chart');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (charts.monthlySales) {
            charts.monthlySales.destroy();
        }
        
        charts.monthlySales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: values,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    // Renderizar gráfico de status
    function renderStatusChart(statusCounts) {
        const ctx = document.getElementById('status-chart');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (charts.status) {
            charts.status.destroy();
        }
        
        // Mapear status para exibição
        const statusMap = {
            'novo': 'Novo',
            'aprovado': 'Aprovado',
            'em_producao': 'Em Produção',
            'concluido': 'Concluído',
            'entregue': 'Entregue',
            'cancelado': 'Cancelado'
        };
        
        // Cores para cada status
        const statusColors = {
            'novo': 'rgba(52, 152, 219, 0.7)',
            'aprovado': 'rgba(155, 89, 182, 0.7)',
            'em_producao': 'rgba(241, 196, 15, 0.7)',
            'concluido': 'rgba(46, 204, 113, 0.7)',
            'entregue': 'rgba(39, 174, 96, 0.7)',
            'cancelado': 'rgba(231, 76, 60, 0.7)'
        };
        
        const labels = Object.keys(statusCounts).map(status => statusMap[status] || status);
        const data = Object.values(statusCounts);
        const backgroundColor = Object.keys(statusCounts).map(status => statusColors[status] || 'rgba(149, 165, 166, 0.7)');
        
        charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    // Renderizar relatório por produto
    function renderProductReport(data) {
        if (!reportContent) return;
        
        // Agrupar vendas por produto
        const productSales = {};
        
        data.forEach(order => {
            if (!order.items) return;
            
            order.items.forEach(item => {
                if (!item.productId) return;
                
                if (!productSales[item.productId]) {
                    // Encontrar informações do produto
                    const product = productsData.find(p => p.id === item.productId);
                    
                    productSales[item.productId] = {
                        id: item.productId,
                        name: product ? product.name : 'Produto não encontrado',
                        quantity: 0,
                        value: 0,
                        orders: 0
                    };
                }
                
                productSales[item.productId].quantity += item.quantity || 0;
                productSales[item.productId].value += (item.price * item.quantity) || 0;
                productSales[item.productId].orders += 1;
            });
        });
        
        // Transformar em array e ordenar por valor total
        const productsArray = Object.values(productSales).sort((a, b) => b.value - a.value);
        
        // Preparar dados para gráfico
        const topProducts = productsArray.slice(0, 10);
        const chartLabels = topProducts.map(product => product.name);
        const chartValues = topProducts.map(product => product.value);
        
        // Renderizar HTML
        let html = `
            <div class="report-summary">
                <div class="summary-item">
                    <div class="summary-item-label">Total de Produtos</div>
                    <div class="summary-item-value">${productsArray.length}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-item-label">Valor Total</div>
                    <div class="summary-item-value">R$ ${productsArray.reduce((sum, p) => sum + p.value, 0).toFixed(2).replace('.', ',')}</div>
                </div>
            </div>
            
            <div class="charts-container">
                <div class="chart-wrapper">
                    <h3 class="chart-title">Top 10 Produtos (por valor)</h3>
                    <div class="chart-canvas-container">
                        <canvas id="top-products-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <h3 class="section-title">Detalhamento por Produto</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th class="align-center">Quantidade</th>
                        <th class="align-center">Pedidos</th>
                        <th class="align-right">Valor Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        productsArray.forEach(product => {
            html += `
                <tr>
                    <td>${product.name}</td>
                    <td class="align-center">${product.quantity}</td>
                    <td class="align-center">${product.orders}</td>
                    <td class="align-right currency">R$ ${product.value.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        reportContent.innerHTML = html;
        
        // Renderizar gráfico
        setTimeout(() => {
            renderTopProductsChart(chartLabels, chartValues);
        }, 100);
    }

    // Renderizar gráfico de top produtos
    function renderTopProductsChart(labels, values) {
        const ctx = document.getElementById('top-products-chart');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (charts.topProducts) {
            charts.topProducts.destroy();
        }
        
        charts.topProducts = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valor (R$)',
                    data: values,
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    // Renderizar relatório por cliente
    function renderClientReport(data) {
        if (!reportContent) return;
        
        // Agrupar vendas por cliente
        const clientSales = {};
        
        data.forEach(order => {
            if (!order.clientId) return;
            
            if (!clientSales[order.clientId]) {
                // Encontrar informações do cliente
                const client = clientsData.find(c => c.id === order.clientId);
                
                clientSales[order.clientId] = {
                    id: order.clientId,
                    name: client ? client.name : 'Cliente não encontrado',
                    orders: 0,
                    value: 0
                };
            }
            
            clientSales[order.clientId].orders += 1;
            clientSales[order.clientId].value += order.totalValue || 0;
        });
        
        // Transformar em array e ordenar por valor total
        const clientsArray = Object.values(clientSales).sort((a, b) => b.value - a.value);
        
        // Preparar dados para gráfico
        const topClients = clientsArray.slice(0, 10);
        const chartLabels = topClients.map(client => client.name);
        const chartValues = topClients.map(client => client.value);
        
        // Renderizar HTML
        let html = `
            <div class="report-summary">
                <div class="summary-item">
                    <div class="summary-item-label">Total de Clientes</div>
                    <div class="summary-item-value">${clientsArray.length}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-item-label">Valor Total</div>
                    <div class="summary-item-value">R$ ${clientsArray.reduce((sum, c) => sum + c.value, 0).toFixed(2).replace('.', ',')}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-item-label">Valor Médio por Cliente</div>
                    <div class="summary-item-value">R$ ${(clientsArray.reduce((sum, c) => sum + c.value, 0) / clientsArray.length || 0).toFixed(2).replace('.', ',')}</div>
                </div>
            </div>
            
            <div class="charts-container">
                <div class="chart-wrapper">
                    <h3 class="chart-title">Top 10 Clientes (por valor)</h3>
                    <div class="chart-canvas-container">
                        <canvas id="top-clients-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <h3 class="section-title">Detalhamento por Cliente</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th class="align-center">Pedidos</th>
                        <th class="align-right">Valor Total</th>
                        <th class="align-right">Valor Médio</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        clientsArray.forEach(client => {
            const averageValue = client.orders > 0 ? client.value / client.orders : 0;
            
            html += `
                <tr>
                    <td>${client.name}</td>
                    <td class="align-center">${client.orders}</td>
                    <td class="align-right currency">R$ ${client.value.toFixed(2).replace('.', ',')}</td>
                    <td class="align-right currency">R$ ${averageValue.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        reportContent.innerHTML = html;
        
        // Renderizar gráfico
        setTimeout(() => {
            renderTopClientsChart(chartLabels, chartValues);
        }, 100);
    }

    // Renderizar gráfico de top clientes
    function renderTopClientsChart(labels, values) {
        const ctx = document.getElementById('top-clients-chart');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (charts.topClients) {
            charts.topClients.destroy();
        }
        
        charts.topClients = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valor (R$)',
                    data: values,
                    backgroundColor: 'rgba(155, 89, 182, 0.7)',
                    borderColor: 'rgba(155, 89, 182, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    // Renderizar relatório por período
    function renderPeriodReport(data) {
        if (!reportContent) return;
        
        // Agrupar vendas por período (dia, semana, mês)
        const dailyData = {};
        const weeklyData = {};
        const monthlyData = {};
        
        data.forEach(order => {
            if (!order.date) return;
            
            const orderDate = new Date(order.date.toDate ? order.date.toDate() : order.date);
            
            // Chave diária: YYYY-MM-DD
            const dayKey = formatDateForInput(orderDate);
            
            // Chave semanal: YYYY-WW (ano-semana)
            const weekNumber = getWeekNumber(orderDate);
            const weekKey = `${orderDate.getFullYear()}-${weekNumber}`;
            
            // Chave mensal: YYYY-MM
            const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Dados diários
            if (!dailyData[dayKey]) {
                dailyData[dayKey] = {
                    date: orderDate,
                    count: 0,
                    value: 0
                };
            }
            
            dailyData[dayKey].count += 1;
            dailyData[dayKey].value += order.totalValue || 0;
            
            // Dados semanais
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    year: orderDate.getFullYear(),
                    week: weekNumber,
                    count: 0,
                    value: 0
                };
            }
            
            weeklyData[weekKey].count += 1;
            weeklyData[weekKey].value += order.totalValue || 0;
            
            // Dados mensais
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    year: orderDate.getFullYear(),
                    month: orderDate.getMonth() + 1,
                    monthName: orderDate.toLocaleString('pt-BR', { month: 'long' }),
                    count: 0,
                    value: 0
                };
            }
            
            monthlyData[monthKey].count += 1;
            monthlyData[monthKey].value += order.totalValue || 0;
        });
        
        // Transformar em arrays e ordenar por data
        const dailyArray = Object.entries(dailyData).map(([key, data]) => ({
            key,
            ...data,
            displayDate: new Date(data.date).toLocaleDateString('pt-BR')
        })).sort((a, b) => new Date(a.key) - new Date(b.key));
        
        const weeklyArray = Object.entries(weeklyData).map(([key, data]) => ({
            key,
            ...data,
            displayWeek: `Semana ${data.week} de ${data.year}`
        })).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.week - b.week;
        });
        
        const monthlyArray = Object.entries(monthlyData).map(([key, data]) => ({
            key,
            ...data,
            displayMonth: `${data.monthName[0].toUpperCase() + data.monthName.slice(1)} ${data.year}`
        })).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
        
        // Preparar dados para gráficos
        const lastDays = dailyArray.slice(-30);
        const dailyLabels = lastDays.map(day => day.displayDate);
        const dailyValues = lastDays.map(day => day.value);
        
        // Renderizar HTML
        let html = `
            <div class="charts-container">
                <div class="chart-wrapper">
                    <h3 class="chart-title">Vendas por Dia (últimos 30 dias)</h3>
                    <div class="chart-canvas-container">
                        <canvas id="daily-sales-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <h3 class="section-title">Detalhamento por Mês</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Mês</th>
                        <th class="align-center">Pedidos</th>
                        <th class="align-right">Valor Total</th>
                        <th class="align-right">Valor Médio</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        monthlyArray.forEach(month => {
            const averageValue = month.count > 0 ? month.value / month.count : 0;
            
            html += `
                <tr>
                    <td>${month.displayMonth}</td>
                    <td class="align-center">${month.count}</td>
                    <td class="align-right currency">R$ ${month.value.toFixed(2).replace('.', ',')}</td>
                    <td class="align-right currency">R$ ${averageValue.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            
            <h3 class="section-title">Detalhamento por Semana</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Semana</th>
                        <th class="align-center">Pedidos</th>
                        <th class="align-right">Valor Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        weeklyArray.forEach(week => {
            html += `
                <tr>
                    <td>${week.displayWeek}</td>
                    <td class="align-center">${week.count}</td>
                    <td class="align-right currency">R$ ${week.value.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        reportContent.innerHTML = html;
        
        // Renderizar gráfico
        setTimeout(() => {
            renderDailySalesChart(dailyLabels, dailyValues);
        }, 100);
    }

    // Obter número da semana do ano
    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // Renderizar gráfico de vendas diárias
    function renderDailySalesChart(labels, values) {
        const ctx = document.getElementById('daily-sales-chart');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (charts.dailySales) {
            charts.dailySales.destroy();
        }
        
        charts.dailySales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valor (R$)',
                    data: values,
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    // Renderizar relatório de tendências
    function renderTrendsReport(data) {
        if (!reportContent) return;
        
        // Calcular crescimento mensal
        const monthlyData = {};
        let previousMonthValue = 0;
        let monthlyGrowth = [];
        
        // Agrupar por mês
        data.forEach(order => {
            if (!order.date) return;
            
            const orderDate = new Date(order.date.toDate ? order.date.toDate() : order.date);
            const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    year: orderDate.getFullYear(),
                    month: orderDate.getMonth() + 1,
                    monthName: orderDate.toLocaleString('pt-BR', { month: 'long' }),
                    value: 0,
                    count: 0
                };
            }
            
            monthlyData[monthKey].value += order.totalValue || 0;
            monthlyData[monthKey].count += 1;
        });
        
        // Transformar em array e ordenar por data
        const monthsArray = Object.entries(monthlyData).map(([key, data]) => ({
            key,
            ...data,
            displayMonth: `${data.monthName[0].toUpperCase() + data.monthName.slice(1)} ${data.year}`
        })).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
        
        // Calcular crescimento mensal
        monthsArray.forEach((month, index) => {
            if (index > 0) {
                const previousMonth = monthsArray[index - 1];
                const growth = previousMonth.value > 0 
                    ? ((month.value - previousMonth.value) / previousMonth.value) * 100
                    : 0;
                
                monthlyGrowth.push({
                    month: month.displayMonth,
                    previousMonth: previousMonth.displayMonth,
                    currentValue: month.value,
                    previousValue: previousMonth.value,
                    growth: growth
                });
            }
        });
        
        // Preparar dados para gráficos
        const growthLabels = monthlyGrowth.map(g => g.month);
        const growthValues = monthlyGrowth.map(g => g.growth);
        
        // Renderizar HTML
        let html = `
            <div class="charts-container">
                <div class="chart-wrapper">
                    <h3 class="chart-title">Crescimento Mensal (%)</h3>
                    <div class="chart-canvas-container">
                        <canvas id="growth-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <h3 class="section-title">Detalhamento de Crescimento</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Mês</th>
                        <th>Mês Anterior</th>
                        <th class="align-right">Valor Atual</th>
                        <th class="align-right">Valor Anterior</th>
                        <th class="align-right">Crescimento</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        monthlyGrowth.forEach(growth => {
            const growthClass = growth.growth >= 0 ? 'positive' : 'negative';
            
            html += `
                <tr>
                    <td>${growth.month}</td>
                    <td>${growth.previousMonth}</td>
                    <td class="align-right currency">R$ ${growth.currentValue.toFixed(2).replace('.', ',')}</td>
                    <td class="align-right currency">R$ ${growth.previousValue.toFixed(2).replace('.', ',')}</td>
                    <td class="align-right ${growthClass}">${growth.growth.toFixed(2).replace('.', ',')}%</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        reportContent.innerHTML = html;
        
        // Renderizar gráfico
        setTimeout(() => {
            renderGrowthChart(growthLabels, growthValues);
        }, 100);
    }

    // Renderizar gráfico de crescimento
    function renderGrowthChart(labels, values) {
        const ctx = document.getElementById('growth-chart');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (charts.growth) {
            charts.growth.destroy();
        }
        
        charts.growth = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Crescimento (%)',
                    data: values,
                    backgroundColor: values.map(v => v >= 0 ? 'rgba(46, 204, 113, 0.7)' : 'rgba(231, 76, 60, 0.7)'),
                    borderColor: values.map(v => v >= 0 ? 'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // Mostrar mensagem de erro
    function showError(message) {
        if (!reportContent) return;
        
        reportContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    // Exportar para PDF
    function exportToPdf() {
        alert('Funcionalidade de exportar para PDF será implementada em breve!');
        // Implementação futura usando html2canvas e jsPDF
    }

    // Exportar para Excel
    function exportToExcel() {
        alert('Funcionalidade de exportar para Excel será implementada em breve!');
        // Implementação futura usando biblioteca como SheetJS
    }

    // API pública
    return {
        init
    };
})();

// Exportar módulo para uso global
window.SalesReports = SalesReports; 