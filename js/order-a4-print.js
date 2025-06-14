// Estilos CSS para impressão de pedidos no formato A4
const OrderA4PrintStyles = `
    @media print {
        body * {
            visibility: hidden;
        }
        .order-print-container, .order-print-container * {
            visibility: visible;
        }
        .order-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 10mm;
            box-sizing: border-box;
            page-break-after: always;
        }
        .no-print {
            display: none !important;
        }
    }
    
    .order-print-container {
        width: 210mm;
        min-height: 297mm;
        padding: 10mm;
        margin: 0 auto;
        background-color: white;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
        font-family: Arial, sans-serif;
        color: #333;
        position: relative;
    }
    
    .order-header {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid #ddd;
        padding-bottom: 10px;
        margin-bottom: 15px;
    }
    
    .company-info {
        flex: 1;
    }
    
    .company-info h1 {
        margin: 0;
        font-size: 24px;
        color: #333;
    }
    
    .company-info p {
        margin: 3px 0;
        font-size: 11px;
        color: #666;
    }
    
    .order-info {
        text-align: right;
    }
    
    .order-info h2 {
        margin: 0;
        font-size: 18px;
        color: #333;
    }
    
    .order-info p {
        margin: 3px 0;
        font-size: 11px;
    }
    
    .status-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: bold;
        margin-top: 3px;
    }
    
    .client-section {
        display: flex;
        margin-bottom: 15px;
    }
    
    .client-info {
        flex: 1;
        padding-right: 10px;
    }
    
    .delivery-info {
        flex: 1;
        padding-left: 10px;
        border-left: 1px solid #ddd;
    }
    
    .section-title {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 5px;
        color: #333;
        border-bottom: 1px solid #eee;
        padding-bottom: 3px;
    }
    
    .info-row {
        display: flex;
        margin-bottom: 2px;
        font-size: 10px;
    }
    
    .info-label {
        font-weight: bold;
        width: 80px;
        color: #666;
    }
    
    .info-value {
        flex: 1;
    }
    
    .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        font-size: 10px;
    }
    
    .items-table th {
        background-color: #f5f5f5;
        text-align: left;
        padding: 6px;
        border-bottom: 1px solid #ddd;
        font-size: 10px;
    }
    
    .items-table td {
        padding: 6px;
        border-bottom: 1px solid #eee;
        vertical-align: middle;
    }
    
    .item-row {
        display: flex;
        align-items: center;
        font-size: 10px;
    }
    
    .item-name {
        font-weight: bold;
        flex: 2;
    }
    
    .item-specs {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        flex: 3;
        font-size: 10px;
        color: #666;
    }
    
    .item-spec {
        white-space: nowrap;
    }
    
    .item-quantity {
        flex: 1;
        text-align: center;
    }
    
    .item-price {
        flex: 1;
        text-align: right;
    }
    
    .item-total {
        flex: 1;
        text-align: right;
        font-weight: bold;
    }
    
    .item-description {
        font-style: italic;
        color: #666;
        font-size: 9px;
    }
    
    .payment-section {
        margin-bottom: 15px;
    }
    
    .payment-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
    }
    
    .payment-table th {
        background-color: #f5f5f5;
        text-align: left;
        padding: 6px;
        border-bottom: 1px solid #ddd;
    }
    
    .payment-table td {
        padding: 6px;
        border-bottom: 1px solid #eee;
    }
    
    .totals-section {
        width: 100%;
        margin-top: 15px;
        margin-bottom: 15px;
    }
    
    .totals-row {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 15px;
        font-size: 12px;
        margin-bottom: 5px;
    }
    
    .total-item {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .total-label {
        font-weight: bold;
        color: #666;
    }
    
    .total-value {
        min-width: 80px;
        text-align: right;
    }
    
    .grand-total {
        font-weight: bold;
        font-size: 14px;
    }
    
    .notes-section {
        margin-top: 15px;
        padding: 8px;
        background-color: #f9f9f9;
        border-radius: 4px;
        font-size: 10px;
    }
    
    .image-section {
        margin-top: 15px;
        text-align: center;
    }
    
    .image-section img {
        max-width: 100%;
        max-height: 150px;
        border: 1px solid #ddd;
    }
    
    .footer {
        margin-top: 20px;
        padding-top: 8px;
        border-top: 1px solid #ddd;
        font-size: 9px;
        color: #999;
        text-align: center;
        position: absolute;
        bottom: 10mm;
        left: 10mm;
        right: 10mm;
    }
    
    .signature-section {
        margin-top: 30px;
        display: flex;
        justify-content: space-between;
    }
    
    .signature-box {
        width: 45%;
        text-align: center;
    }
    
    .signature-line {
        margin-top: 20px;
        border-top: 1px solid #333;
        padding-top: 5px;
        font-size: 10px;
    }
    
    /* Status colors */
    .status-pending { background-color: #f0ad4e; color: white; }
    .status-progress { background-color: #5bc0de; color: white; }
    .status-completed { background-color: #5cb85c; color: white; }
    .status-cancelled { background-color: #d9534f; color: white; }
    
    /* Print button */
    .print-button {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }
    
    .print-button:hover {
        background-color: #0069d9;
    }
    
    @media screen {
        body {
            background-color: #f0f0f0;
            padding: 20px;
        }
    }
`;

// Função para adicionar os estilos ao documento
function addOrderA4PrintStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = OrderA4PrintStyles;
    document.head.appendChild(styleElement);
}

// Função para criar um botão de impressão
function createPrintButton() {
    // Remove qualquer botão de impressão existente para evitar duplicação
    const existingButtons = document.querySelectorAll('.print-button');
    existingButtons.forEach(btn => btn.remove());
    
    // Verifica se estamos na página de detalhes do pedido
    const orderDetailContainer = document.querySelector('.order-print-container');
    if (!orderDetailContainer) return;
    
    // Cria o botão de impressão
    const printButton = document.createElement('button');
    printButton.className = 'print-button no-print';
    printButton.innerHTML = '<i class="fas fa-print"></i> Imprimir';
    printButton.onclick = () => window.print();
    
    // Adiciona o botão à página
    document.body.appendChild(printButton);
}

// Exporta as funções
window.OrderA4Print = {
    addStyles: addOrderA4PrintStyles,
    createPrintButton: createPrintButton
}; 