# Instruções para Implementação dos Índices Compostos no Firebase

## O que fizemos até agora?

Modificamos o código da aplicação para utilizar índices compostos que melhorarão significativamente a performance das consultas ao Firestore. Os índices estão definidos no arquivo `firestore-indexes.json`.

## Por que precisamos de índices compostos?

Os índices compostos permitem que o Firestore execute consultas complexas (com filtros e ordenação) de maneira muito mais eficiente. Sem índices adequados, o Firestore precisa verificar todos os documentos da coleção, o que pode ser muito lento quando há muitos dados.

## Como implementar os índices no Firebase

Siga os passos abaixo para implementar os índices no seu projeto Firebase:

### 1. Instalar ou Atualizar a Firebase CLI

Caso ainda não tenha a Firebase CLI instalada:

```bash
npm install -g firebase-tools
```

### 2. Fazer login na sua conta Firebase

```bash
firebase login
```

### 3. Inicializar o projeto Firebase na pasta do projeto (se ainda não estiver inicializado)

```bash
firebase init
```
- Selecione apenas "Firestore" quando perguntado quais recursos você deseja usar
- Selecione seu projeto Firebase
- Aceite as opções padrão para as regras do Firestore

### 4. Fazer deploy dos índices definidos no arquivo firestore-indexes.json

```bash
firebase deploy --only firestore:indexes
```

### 5. Verificar se os índices foram criados corretamente

1. Acesse o [console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá para Firestore Database > Índices
4. Verifique se todos os índices estão sendo criados (pode levar alguns minutos)

## Índices implementados:

1. **orders (status + createdAt)** - Otimiza consultas de pedidos filtrados por status e ordenados por data de criação
2. **orders (clientId + createdAt)** - Otimiza consultas de pedidos de um cliente específico ordenados por data
3. **orders (sellerId + createdAt)** - Otimiza consultas de pedidos de um vendedor específico ordenados por data
4. **orders (status + deliveryDate)** - Otimiza consultas para o fluxo de trabalho (workflow)
5. **products (active + name)** - Otimiza consultas de produtos ativos ordenados por nome
6. **employees (active + name)** - Otimiza consultas de funcionários ativos ordenados por nome

## Observação importante:

A criação dos índices pode levar alguns minutos para ser concluída. Durante esse período, as consultas que dependem desses índices podem falhar ou ter performance reduzida. Aguarde até que todos os índices estejam com o status "Habilitado" no console do Firebase antes de testar as otimizações. 