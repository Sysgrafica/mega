// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBjMzUlOw4LfIS0kTmm0z4UjEI5fcOvXbo",
    authDomain: "projetog-32446.firebaseapp.com",
    projectId: "projetog-32446",
    storageBucket: "projetog-32446.firebasestorage.app",
    messagingSenderId: "301778798043",
    appId: "1:301778798043:web:d4b46faf5ba727f572d3fe"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências para os serviços do Firebase
const firebaseAuth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configuração do Firestore (usando merge: true para evitar o aviso)
db.settings({ merge: true });

// Configurações do sistema
const SYSTEM_CONFIG = {
    companyName: "GrafSys",
    version: "1.0.0",
    dateFormat: "DD/MM/YYYY",
    dateTimeFormat: "DD/MM/YYYY HH:mm",
    currency: "R$",
    roles: {
        admin: {
            name: "Administrador",
            level: 4,
            menuAccess: ["dashboard", "workflow", "orders", "clients", "products", "employees", "suppliers", "reports", "permissions"]
        },
        seller: {
            name: "Vendedor",
            level: 3,
            menuAccess: ["dashboard", "workflow", "orders", "clients", "products"]
        },
        designer: {
            name: "Designer",
            level: 2,
            menuAccess: ["dashboard", "workflow", "orders", "products"]
        },
        production: {
            name: "Produção",
            level: 1,
            menuAccess: ["dashboard", "workflow", "orders"]
        },
        impressor: {
            name: "Impressor",
            level: 1,
            menuAccess: ["dashboard", "workflow", "orders"]
        },
        acabamento: {
            name: "Acabamento",
            level: 1,
            menuAccess: ["dashboard", "workflow", "orders"]
        },
        cortesEspeciais: {
            name: "Cortes Especiais",
            level: 1,
            menuAccess: ["dashboard", "workflow", "orders"]
        },
        aplicador: {
            name: "Aplicador",
            level: 1,
            menuAccess: ["dashboard", "workflow", "orders"]
        }
    },
    // Lista de todas as páginas do sistema
    pages: [
        { id: "dashboard", name: "Dashboard" },
        { id: "workflow", name: "Fluxo de Trabalho" },
        { id: "orders", name: "Pedidos" },
        { id: "clients", name: "Clientes" },
        { id: "products", name: "Produtos" },
        { id: "employees", name: "Funcionários" },
        { id: "suppliers", name: "Fornecedores" },
        { id: "reports", name: "Relatórios" },
        { id: "permissions", name: "Gerenciar Permissões" }
    ],
    // Lista de todas as funcionalidades do sistema
    features: [
        // Funcionalidades gerais
        { id: "view_dashboard", name: "Ver Dashboard", category: "geral" },
        { id: "view_workflow", name: "Ver Fluxo de Trabalho", category: "geral" },
        
        // Funcionalidades de Pedidos
        { id: "view_orders", name: "Ver Pedidos", category: "pedidos" },
        { id: "create_order", name: "Criar Pedido", category: "pedidos" },
        { id: "edit_order", name: "Editar Pedido", category: "pedidos" },
        { id: "delete_order", name: "Excluir Pedido", category: "pedidos" },
        { id: "change_order_status", name: "Alterar Status de Pedido", category: "pedidos" },
        { id: "view_order_details", name: "Ver Detalhes do Pedido", category: "pedidos" },
        { id: "print_order", name: "Imprimir Pedido", category: "pedidos" },
        
        // Funcionalidades de Clientes
        { id: "view_clients", name: "Ver Clientes", category: "clientes" },
        { id: "create_client", name: "Criar Cliente", category: "clientes" },
        { id: "edit_client", name: "Editar Cliente", category: "clientes" },
        { id: "delete_client", name: "Excluir Cliente", category: "clientes" },
        
        // Funcionalidades de Produtos
        { id: "view_products", name: "Ver Produtos", category: "produtos" },
        { id: "create_product", name: "Criar Produto", category: "produtos" },
        { id: "edit_product", name: "Editar Produto", category: "produtos" },
        { id: "delete_product", name: "Excluir Produto", category: "produtos" },
        
        // Funcionalidades de Funcionários
        { id: "view_employees", name: "Ver Funcionários", category: "funcionarios" },
        { id: "create_employee", name: "Criar Funcionário", category: "funcionarios" },
        { id: "edit_employee", name: "Editar Funcionário", category: "funcionarios" },
        { id: "delete_employee", name: "Excluir Funcionário", category: "funcionarios" },
        
        // Funcionalidades de Fornecedores
        { id: "view_suppliers", name: "Ver Fornecedores", category: "fornecedores" },
        { id: "create_supplier", name: "Criar Fornecedor", category: "fornecedores" },
        { id: "edit_supplier", name: "Editar Fornecedor", category: "fornecedores" },
        { id: "delete_supplier", name: "Excluir Fornecedor", category: "fornecedores" },
        
        // Funcionalidades de Relatórios
        { id: "view_reports", name: "Ver Relatórios", category: "relatorios" },
        { id: "generate_report", name: "Gerar Relatório", category: "relatorios" },
        { id: "export_report", name: "Exportar Relatório", category: "relatorios" },
        
        // Funcionalidades de Permissões
        { id: "manage_permissions", name: "Gerenciar Permissões", category: "sistema" }
    ],
    // Definição das categorias de funcionalidades para organização na tela
    featureCategories: [
        { id: "geral", name: "Geral" },
        { id: "pedidos", name: "Pedidos" },
        { id: "clientes", name: "Clientes" },
        { id: "produtos", name: "Produtos" },
        { id: "funcionarios", name: "Funcionários" },
        { id: "fornecedores", name: "Fornecedores" },
        { id: "relatorios", name: "Relatórios" },
        { id: "sistema", name: "Sistema" }
    ],
    orderStatus: [
        { id: "budget", name: "Orçamento", color: "status-pending" },
        { id: "pending", name: "Aguardando", color: "status-pending" },
        { id: "printing", name: "Impressão", color: "status-processing" },
        { id: "cutting", name: "Cortes Especiais", color: "status-processing" },
        { id: "finishing", name: "Acabamento", color: "status-processing" },
        { id: "application", name: "Aplicação", color: "status-processing" },
        { id: "ready", name: "Pronto na entrega", color: "status-completed" },
        { id: "delivered", name: "Entregue", color: "status-completed" },
        { id: "cancelled", name: "Cancelado", color: "status-cancelled" }
    ],
    paymentMethods: [
        { id: "cash", name: "Dinheiro" },
        { id: "credit", name: "Cartão de Crédito" },
        { id: "debit", name: "Cartão de Débito" },
        { id: "pix", name: "PIX" },
        { id: "transfer", name: "Transferência Bancária" },
        { id: "check", name: "Cheque" },
        { id: "other", name: "Outro" }
    ]
}; 