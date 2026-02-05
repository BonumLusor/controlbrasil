# Documentação da API - Control Brasil

## Base URL
```
/api.php
```

## Endpoints Disponíveis

### 1. Listar Todos os Produtos
**Método:** `GET`  
**Rota:** `/api.php` ou `/api.php/produtos`

**Descrição:** Retorna uma lista de todos os produtos ativos.

**Exemplo de Requisição:**
```bash
curl -X GET /api.php
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "total": 5,
  "dados": [
    {
      "id": 1,
      "name": "Inversor de Frequência",
      "description": "Inversor 10HP",
      "price": "2500.00",
      "quantity": 15,
      "minQuantity": 5,
      "sku": "INV-001",
      "imageUrl": "https://exemplo.com/imagem.jpg",
      "createdAt": "2026-01-15 10:30:00",
      "updatedAt": "2026-01-15 10:30:00",
      "active": true
    },
    ...
  ]
}
```

---

### 2. Obter Produto por ID
**Método:** `GET`  
**Rota:** `/api.php/produtos/{id}`

**Descrição:** Retorna um produto específico pelo ID.

**Parâmetros:**
- `id` (obrigatório): ID do produto

**Exemplo de Requisição:**
```bash
curl -X GET /api.php/produtos/1
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "dados": {
    "id": 1,
    "name": "Inversor de Frequência",
    "description": "Inversor 10HP",
    "price": "2500.00",
    "quantity": 15,
    "minQuantity": 5,
    "sku": "INV-001",
    "imageUrl": "https://exemplo.com/imagem.jpg",
    "createdAt": "2026-01-15 10:30:00",
    "updatedAt": "2026-01-15 10:30:00",
    "active": true
  }
}
```

**Resposta de Erro (404):**
```json
{
  "erro": "Produto não encontrado"
}
```

---

### 3. Atualizar Produto
**Método:** `PUT`  
**Rota:** `/api.php/produtos/{id}`

**Descrição:** Atualiza as informações de um produto existente.

**Parâmetros:**
- `id` (obrigatório): ID do produto

**Body (JSON):**
```json
{
  "name": "Novo Nome",
  "description": "Nova descrição",
  "price": 3000.00,
  "quantity": 20,
  "minQuantity": 5,
  "sku": "INV-002",
  "imageUrl": "https://exemplo.com/nova-imagem.jpg",
  "active": true
}
```

**Exemplo de Requisição:**
```bash
curl -X PUT /api.php/produtos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 3000.00,
    "quantity": 20
  }'
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Produto atualizado com sucesso",
  "dados": {
    "id": 1,
    "name": "Inversor de Frequência",
    "description": "Inversor 10HP",
    "price": "3000.00",
    "quantity": 20,
    "minQuantity": 5,
    "sku": "INV-001",
    "imageUrl": "https://exemplo.com/imagem.jpg",
    "createdAt": "2026-01-15 10:30:00",
    "updatedAt": "2026-02-01 14:25:30",
    "active": true
  }
}
```

**Resposta de Erro (404):**
```json
{
  "erro": "Produto não encontrado"
}
```

---

## Campos da Tabela Produtos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | serial | ID único do produto (auto-incremento) |
| `name` | varchar(255) | Nome do produto (obrigatório) |
| `description` | text | Descrição detalhada do produto |
| `price` | numeric(10,2) | Preço unitário (padrão: 0.00) |
| `quantity` | integer | Quantidade em estoque |
| `minQuantity` | integer | Quantidade mínima para reordenação |
| `sku` | varchar(100) | Código SKU único (opcional) |
| `imageUrl` | text | URL da imagem do produto |
| `createdAt` | timestamp | Data/hora de criação |
| `updatedAt` | timestamp | Data/hora da última atualização |
| `active` | boolean | Status do produto (ativo/inativo) |

---

## Códigos de Resposta HTTP

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso - Requisição processada |
| `201` | Criado - Recurso criado com sucesso |
| `400` | Requisição inválida - Dados ausentes ou incorretos |
| `404` | Não encontrado - Recurso não existe |
| `405` | Método não permitido - Operação não disponível |
| `500` | Erro interno do servidor |

---

## Exemplos de Uso com JavaScript

### Listar Produtos
```javascript
fetch('/api.php')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Erro:', error));
```

### Obter Produto Específico
```javascript
fetch('/api.php/produtos/1')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Erro:', error));
```

### Atualizar Produto
```javascript
fetch('/api.php/produtos/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    price: 3500.00,
    quantity: 25
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));
```

---

## Notas Importantes

- ✅ A API retorna apenas produtos com `active = true`
- ✅ O campo `updatedAt` é atualizado automaticamente em operações PUT
- ✅ CORS está habilitado para todas as origens
- ✅ Conecta automaticamente ao PostgreSQL via Docker
- ✅ Todas as respostas estão em JSON com UTF-8

---

## Troubleshooting

**Erro de Conexão com Banco de Dados:**
- Verifique se o container `db` está rodando: `docker ps`
- Confirme as credenciais em `docker-stack.yml`

**Erro 405 - Método não permitido:**
- Apenas GET e PUT são permitidos
- POST e DELETE não estão disponíveis

**Erro 404 - Produto não encontrado:**
- Verifique o ID do produto
- Confirme se o produto está ativo (`active = true`)
