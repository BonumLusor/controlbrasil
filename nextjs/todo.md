# Sistema de Gestão de Ordens de Serviço - TODO

## Banco de Dados
- [x] Criar tabela de funcionários (employees)
- [x] Criar tabela de clientes (customers)
- [x] Criar tabela de componentes eletrônicos (components)
- [x] Criar tabela de pedidos de compra (purchase_orders)
- [x] Criar tabela de itens do pedido (purchase_order_items)
- [x] Criar tabela de ordens de serviço (service_orders)
- [x] Criar tabela de transações financeiras (transactions)
- [x] Criar tabela de comissões (commissions)
- [x] Executar migração do banco de dados

## Design e Layout
- [x] Configurar tema escuro profissional no index.css
- [x] Criar DashboardLayout com navegação lateral
- [x] Configurar paleta de cores noturna
- [x] Adicionar ícones e tipografia adequada

## Autenticação
- [x] Implementar login com senha criptografada
- [x] Criar tela de login
- [x] Adicionar validação de sessão
- [x] Implementar logout

## Gestão de Funcionários
- [x] Criar procedimentos tRPC para funcionários
- [x] Implementar CRUD de funcionários
- [x] Criar interface de listagem de funcionários
- [x] Criar formulário de cadastro/edição de funcionários

## Controle de Estoque
- [x] Criar procedimentos tRPC para componentes
- [x] Implementar CRUD de componentes eletrônic- [x] Criar interface de listagem de ordensoque
- [x] Criar formulário de cadastro de componentes
- [x] Adicionar filtros por tipo de componente

## Pedidos de Compra
- [x] Criar procedimentos tRPC para pedidos de compra
- [x] Implementar criação de pedidos com múltiplos itens
- [x] Criar interface de listagem de pedidos
- [x] Criar formulário de novo pedido
- [x] Registrar recebimento de pedidos
- [x] Atualizar estoque ao receber pedido

## Gestão de Clientes
- [x] Criar procedimentos tRPC para clientes
- [x] Implementar CRUD de clientes
- [x] Criar interface de listagem de clientes
- [x] Criar formulário de cadastro/edição de clientes

## Ordens de Serviço
- [x] Criar procedimentos tRPC para ordens de serviço
- [x] Implementar CRUD de ordens de serviço
- [x] Criar interface de listagem com filtros de status
- [x] Criar formulário de nova ordem de serviço
- [ ] Implementar mudança de sta- [x] Vincular funcionários às ordens (recebedor e técnico) Vincular cliente à ordem
- [x] Adicionar tipo de serviço (manutenção industrial, fitness/refrigeração, automação)

## Comissões
- [x] Criar lógica de cálculo de comissões
- [x] Criar procedimentos tRPC para comissões
- [ ] Criar interface de visualização de comissões por funcionário
- [ ] Implementar relatório de comissões

## Relatórios Financeiros
- [x] Criar procedimentos tRPC para transações
- [x] Implementar registro de entradas e saídas
- [x] Criar interface de relatório mensal
- [x] Adicionar filtros por período
- [x] Exibir totais de entrada, saída e saldo

## Testes
- [ ] Criar testes para autenticação
- [ ] Criar testes para funcionários
- [ ] Criar testes para componentes
- [ ] Criar testes para pedidos de compra
- [ ] Criar testes para clientes
- [ ] Criar testes para ordens de serviço
- [ ] Criar testes para comissões
- [ ] Criar testes para relatórios financeiros
