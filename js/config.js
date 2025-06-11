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
            menuAccess: ["dashboard", "orders", "clients", "products", "employees", "suppliers", "reports"]
        },
        seller: {
            name: "Vendedor",
            level: 3,
            menuAccess: ["dashboard", "orders", "clients", "products"]
        },
        designer: {
            name: "Designer",
            level: 2,
            menuAccess: ["dashboard", "orders", "products"]
        },
        production: {
            name: "Produção",
            level: 1,
            menuAccess: ["dashboard", "orders"]
        }
    },
    orderStatus: [
        { id: "pending", name: "Aguardando Aprovação", color: "status-pending" },
        { id: "approved", name: "Aprovado", color: "status-pending" },
        { id: "production", name: "Em Produção", color: "status-processing" },
        { id: "ready", name: "Pronto para Retirada", color: "status-completed" },
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