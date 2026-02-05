<?php

// Configurar headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Conexão com PostgreSQL
    $dsn = 'pgsql:host=db;port=5432;dbname=service_db';
    $username = 'user_admin';
    $password = 'password_secure';
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Obter método da requisição
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    // Remover /api.php do path
    $path = str_replace('/api.php', '', $path);
    $path = trim($path, '/');

    // Rotas
    if (empty($path) || $path === 'produtos') {
        if ($method === 'GET') {
            getProdutos($pdo);
        } else {
            http_response_code(405);
            echo json_encode(['erro' => 'Método não permitido']);
        }
    } elseif (preg_match('/^produtos\/(\d+)$/', $path, $matches)) {
        $id = $matches[1];
        if ($method === 'GET') {
            getProdutoId($pdo, $id);
        } elseif ($method === 'PUT') {
            atualizarProduto($pdo, $id);
        } else {
            http_response_code(405);
            echo json_encode(['erro' => 'Método não permitido']);
        }
    } else {
        http_response_code(404);
        echo json_encode(['erro' => 'Rota não encontrada']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['erro' => 'Erro na conexão com o banco: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['erro' => 'Erro: ' . $e->getMessage()]);
}

// ==================== FUNÇÕES ====================

function getProdutos($pdo) {
    try {
        // Agora o campo importante é o imageUrl que contém o caminho/URL da imagem
        $sql = 'SELECT id, name, description, price, quantity, "minQuantity", sku, "imageUrl", "createdAt", active 
                FROM public.products 
                WHERE active = true 
                ORDER BY id ASC';
        
        $stmt = $pdo->query($sql);
        $produtos = $stmt->fetchAll();
        
        // Se o imageUrl for um caminho relativo (ex: products/img.jpg), 
        // você pode prefixar com a URL do seu servidor aqui se desejar
        foreach ($produtos as &$p) {
            if ($p['imageUrl'] && !str_starts_with($p['imageUrl'], 'http')) {
                // $p['imageUrl'] = 'https://seu-dominio.com/uploads/' . $p['imageUrl'];
            }
        }

        http_response_code(200);
        echo json_encode([
            'sucesso' => true,
            'dados' => $produtos
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['erro' => $e->getMessage()]);
    }
}

function getProdutoId($pdo, $id) {
    try {
        $sql = 'SELECT * FROM public.products WHERE id = :id AND active = true';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $produto = $stmt->fetch();
        
        if (!$produto) {
            http_response_code(404);
            echo json_encode(['erro' => 'Produto não encontrado']);
            return;
        }
        
        http_response_code(200);
        echo json_encode([
            'sucesso' => true,
            'dados' => $produto
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['erro' => $e->getMessage()]);
    }
}



function atualizarProduto($pdo, $id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Verificar se existe
        $checkSql = 'SELECT id FROM public.products WHERE id = :id';
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([':id' => $id]);
        
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['erro' => 'Produto não encontrado']);
            return;
        }
        
        // Montar UPDATE dinamicamente
        $updates = [];
        $params = [':id' => $id];
        
        foreach ($input as $key => $value) {
            $updates[] = "\"$key\" = :$key";
            $params[":$key"] = $value;
        }
        
        $updates[] = '"updatedAt" = now()';
        
        $sql = 'UPDATE public.products SET ' . implode(', ', $updates) . ' WHERE id = :id RETURNING *';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $produto = $stmt->fetch();
        
        http_response_code(200);
        echo json_encode([
            'sucesso' => true,
            'mensagem' => 'Produto atualizado com sucesso',
            'dados' => $produto
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['erro' => $e->getMessage()]);
    }
}


?>
