# GrafSys - Sistema de Gestão para Gráficas

Um sistema web moderno para gerenciamento completo de gráficas, com foco em uma interface reativa e funcionalidades especializadas.

## Características Principais

### Interface Moderna e Reativa
- Design escuro (dark mode) com gradientes e elementos interativos
- Responsivo para desktops e dispositivos móveis
- Notificações e feedback visual em tempo real

### Autenticação e Segurança
- Login por Código de Acesso único para cada funcionário
- Controle de Acesso por Cargo (Roles):
  - **Administrador**: Acesso total a todas as funcionalidades
  - **Vendedor**: Foco em criar pedidos e gerenciar clientes
  - **Designer**: Acesso aos cadastros de produtos e visualização de pedidos
  - **Produção/Impressor**: Visualização de pedidos e marcação de itens concluídos

### Dashboard Inteligente
- Métricas em Tempo Real:
  - Pedidos do Dia
  - Pedidos Pendentes
  - Faturamento do Mês
  - Total de Clientes
- Tabelas de Acesso Rápido:
  - Pedidos Próximos da Entrega
  - Últimos Pedidos

### Gestão de Pedidos
- Criação de Pedidos com formulário inteligente
- Busca rápida de clientes com cadastro em modal
- Itens dinâmicos com cálculo automático (por unidade ou m²)
- Gestão de múltiplos pagamentos por pedido
- Upload de imagem para preview
- Definição de prazos e status
- Filtragem avançada de pedidos
- Geração de Ordem de Serviço para impressão
- Alertas visuais para pedidos atrasados

### Cadastros (Base de Dados)
- Clientes (PF/PJ) com histórico de pedidos
- Produtos com diferentes tipos de precificação
- Funcionários com controle de acesso
- Fornecedores de matéria-prima

### Funcionalidades Especiais
- Atualizações em Tempo Real via Firebase
- Notificações Inteligentes
- Função Desfazer para ações críticas
- Modal de Ações Rápidas

## Estrutura do Projeto

```
grafsys/
├── index.html              # Página principal
├── css/
│   └── style.css           # Estilos CSS do sistema
├── js/
│   ├── config.js           # Configurações e Firebase
│   ├── auth.js             # Sistema de autenticação
│   ├── ui.js               # Interface e componentes reutilizáveis
│   ├── dashboard.js        # Módulo do Dashboard
│   ├── orders.js           # Gestão de Pedidos
│   ├── clients.js          # Gestão de Clientes
│   ├── products.js         # Gestão de Produtos
│   ├── employees.js        # Gestão de Funcionários
│   ├── suppliers.js        # Gestão de Fornecedores
│   └── app.js              # Inicialização e orquestração
└── README.md               # Este arquivo
```

## Tecnologias Utilizadas

- HTML5, CSS3, JavaScript moderno
- Firebase (Auth, Firestore, Storage)
- Responsividade nativa (sem frameworks CSS)
- Font Awesome para ícones

## Códigos de Acesso para Teste

Para testar o sistema, utilize os seguintes códigos de acesso:

- **Administrador**: 123456
- **Vendedor**: 234567
- **Designer**: 345678
- **Produção**: 456789

## Implementação e Melhorias Futuras

- **Relatórios Avançados**: Implementação de gráficos e exportação de dados
- **Integração com APIs**: Envio de orçamentos por WhatsApp/Email
- **Calendário de Produção**: Visualização de pedidos em formato de calendário
- **Aplicativo Mobile**: Versão nativa para Android/iOS
- **Cálculos Avançados**: Estimativa de custos de materiais e tempo de produção 