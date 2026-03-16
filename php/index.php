<?php
session_start();
require_once 'config.php';

// Processar diferentes etapas
$etapa = $_GET['etapa'] ?? 'upload';
$mensagem = '';
$tipo_mensagem = '';

// ==========================================
// ETAPA 1: Upload e Detecção de Colunas
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $etapa === 'upload') {
    $tipo = $_POST['tipo'] ?? '';
    $empresa = $_POST['empresa'] ?? '';
    $unidades_negocio = $_POST['unidades_negocio'] ?? [];
    
    // Validações
    if (empty($tipo)) {
        $mensagem = 'Por favor, selecione o tipo.';
        $tipo_mensagem = 'danger';
    } elseif (!in_array($tipo, ['lojas', 'representantes'])) {
        $mensagem = 'Tipo inválido.';
        $tipo_mensagem = 'danger';
    } elseif (empty($empresa)) {
        $mensagem = 'Por favor, selecione a empresa.';
        $tipo_mensagem = 'danger';
    } elseif (empty($unidades_negocio)) {
        $mensagem = 'Por favor, selecione pelo menos uma unidade de negócio.';
        $tipo_mensagem = 'danger';
    } elseif ($_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
        $mensagem = 'Erro no upload do arquivo.';
        $tipo_mensagem = 'danger';
    } else {
        // Salvar arquivo temporariamente
        $arquivo_temp = 'temp_' . uniqid() . '.csv';
        move_uploaded_file($_FILES['csv_file']['tmp_name'], $arquivo_temp);
        
        // Ler cabeçalho
        $handle = fopen($arquivo_temp, 'r');
        $colunas_csv = fgetcsv($handle, 1000, ',');
        fclose($handle);
        
        // Salvar na sessão
        $_SESSION['arquivo_temp'] = $arquivo_temp;
        $_SESSION['tipo'] = $tipo;
        $_SESSION['empresa'] = $empresa;
        $_SESSION['unidades_negocio'] = $unidades_negocio;
        $_SESSION['colunas_csv'] = $colunas_csv;
        
        // Redirecionar para mapeamento
        header('Location: ?etapa=mapear');
        exit;
    }
}

// ==========================================
// ETAPA 2: Processar Importação com Mapeamento
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $etapa === 'importar') {
    $mapeamento = $_POST['mapeamento'] ?? [];
    $arquivo_temp = $_SESSION['arquivo_temp'] ?? '';
    $tipo = $_SESSION['tipo'] ?? '';
    $empresa = $_SESSION['empresa'] ?? '';
    $unidades_negocio = $_SESSION['unidades_negocio'] ?? [];
    
    if (empty($arquivo_temp) || !file_exists($arquivo_temp)) {
        $mensagem = 'Arquivo não encontrado. Faça upload novamente.';
        $tipo_mensagem = 'danger';
    } else {
        try {
            if ($tipo === 'lojas') {
                $resultado = importarLojas($arquivo_temp, $empresa, $unidades_negocio, $mapeamento);
            } else {
                $resultado = importarRepresentantes($arquivo_temp, $empresa, $unidades_negocio, $mapeamento);
            }
            
            $mensagem = $resultado['mensagem'];
            $tipo_mensagem = $resultado['sucesso'] ? 'success' : 'warning';
            
            // Limpar arquivo temporário
            unlink($arquivo_temp);
            unset($_SESSION['arquivo_temp']);
            unset($_SESSION['tipo']);
            unset($_SESSION['empresa']);
            unset($_SESSION['unidades_negocio']);
            unset($_SESSION['colunas_csv']);
            
        } catch (Exception $e) {
            $mensagem = 'Erro: ' . $e->getMessage();
            $tipo_mensagem = 'danger';
        }
    }
}

// ==========================================
// FUNÇÃO: Importar Lojas (com UPDATE inteligente)
// ==========================================
function importarLojas($arquivo, $empresa, $unidades_negocio, $mapeamento) {
    $mysqli = getDBConnection();
    
    $handle = fopen($arquivo, 'r');
    if (!$handle) {
        throw new Exception('Não foi possível abrir o arquivo CSV.');
    }
    
    // Ler e descartar cabeçalho
    fgetcsv($handle, 1000, ',');
    
    $total = 0;
    $importados = 0;
    $atualizados = 0;
    $erros = [];
    
    while (($data = fgetcsv($handle, 1000, ',')) !== FALSE) {
        $total++;
        
        // Mapear dados
        $nome = isset($mapeamento['nome']) && $mapeamento['nome'] !== '' ? trim($data[$mapeamento['nome']] ?? '') : '';
        $endereco = isset($mapeamento['endereco']) && $mapeamento['endereco'] !== '' ? trim($data[$mapeamento['endereco']] ?? '') : '';
        $bairro = isset($mapeamento['bairro']) && $mapeamento['bairro'] !== '' ? trim($data[$mapeamento['bairro']] ?? '') : '';
        $cidade = isset($mapeamento['cidade']) && $mapeamento['cidade'] !== '' ? trim($data[$mapeamento['cidade']] ?? '') : '';
        $uf = isset($mapeamento['uf']) && $mapeamento['uf'] !== '' ? strtoupper(trim($data[$mapeamento['uf']] ?? '')) : '';
        $cep = isset($mapeamento['cep']) && $mapeamento['cep'] !== '' ? preg_replace('/[^0-9]/', '', $data[$mapeamento['cep']] ?? '') : '';
        $telefone = isset($mapeamento['telefone']) && $mapeamento['telefone'] !== '' ? limparTelefone($data[$mapeamento['telefone']] ?? '') : '';
        $whatsapp = isset($mapeamento['whatsapp']) && $mapeamento['whatsapp'] !== '' ? limparTelefone($data[$mapeamento['whatsapp']] ?? '') : '';
        $email = isset($mapeamento['email']) && $mapeamento['email'] !== '' ? trim($data[$mapeamento['email']] ?? '') : '';
        
        // Validar campos obrigatórios
        if (empty($nome)) {
            $erros[] = "Linha $total: faltam campos obrigatórios (nome)";
            continue;
        }
        
        // ========================================
        // VERIFICAR SE LOJA JÁ EXISTE (por nome)
        // ========================================
        $stmt_check = $mysqli->prepare("SELECT id, unidades_negocio FROM lojas WHERE nome = ? AND empresa = ?");
        $stmt_check->bind_param('ss', $nome, $empresa);
        $stmt_check->execute();
        $result = $stmt_check->get_result();
        $loja_existente = $result->fetch_assoc();
        $stmt_check->close();
        
        if ($loja_existente) {
            // ========================================
            // LOJA EXISTE → UPDATE (adicionar unidades)
            // ========================================
            $id_loja = $loja_existente['id'];
            $unidades_existentes = json_decode($loja_existente['unidades_negocio'] ?? '[]', true) ?: [];
            
            // Mesclar unidades (sem duplicar)
            $unidades_merged = array_unique(array_merge($unidades_existentes, $unidades_negocio));
            $unidades_json = json_encode(array_values($unidades_merged));
            
            // Atualizar loja (adiciona novas unidades + atualiza dados)
            $stmt_update = $mysqli->prepare("
                UPDATE lojas 
                SET endereco = ?, 
                    bairro = ?, 
                    cidade = ?, 
                    uf = ?, 
                    cep = ?, 
                    telefone = ?, 
                    whatsapp = ?, 
                    email = ?,
                    unidades_negocio = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt_update->bind_param('sssssssssi', 
                $endereco, $bairro, $cidade, $uf, $cep, $telefone, $whatsapp, $email, $unidades_json, $id_loja
            );
            
            if ($stmt_update->execute()) {
                $atualizados++;
            } else {
                $erros[] = "Linha $total (UPDATE): " . $stmt_update->error;
            }
            $stmt_update->close();
            
        } else {
            // ========================================
            // LOJA NÃO EXISTE → INSERT
            // ========================================
            $unidades_json = json_encode($unidades_negocio);
            
            $stmt_insert = $mysqli->prepare("
                INSERT INTO lojas (empresa, nome, endereco, bairro, cidade, uf, cep, telefone, whatsapp, email, unidades_negocio)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt_insert->bind_param('sssssssssss', 
                $empresa, $nome, $endereco, $bairro, $cidade, $uf, $cep, $telefone, $whatsapp, $email, $unidades_json
            );
            
            if ($stmt_insert->execute()) {
                $importados++;
            } else {
                $erros[] = "Linha $total (INSERT): " . $stmt_insert->error;
            }
            $stmt_insert->close();
        }
    }
    
    fclose($handle);
    $mysqli->close();
    
    $mensagem = "✅ Importação concluída!<br>";
    $mensagem .= "📊 Total de linhas: $total<br>";
    $mensagem .= "🆕 Novos registros: $importados<br>";
    $mensagem .= "🔄 Atualizados: $atualizados<br>";
    $mensagem .= "🏷️ Unidades adicionadas: " . implode(', ', array_map('formatarUnidade', $unidades_negocio)) . "<br>";
    
    if (count($erros) > 0) {
        $mensagem .= "❌ Erros: " . count($erros) . "<br>";
        $mensagem .= "<small>" . implode('<br>', array_slice($erros, 0, 5)) . "</small>";
    }
    
    return [
        'sucesso' => ($importados + $atualizados) > 0,
        'mensagem' => $mensagem
    ];
}

// ==========================================
// FUNÇÃO: Importar Representantes (com UPDATE inteligente)
// ==========================================
function importarRepresentantes($arquivo, $empresa, $unidades_negocio, $mapeamento) {
    $mysqli = getDBConnection();
    
    $handle = fopen($arquivo, 'r');
    if (!$handle) {
        throw new Exception('Não foi possível abrir o arquivo CSV.');
    }
    
    // Ler e descartar cabeçalho
    fgetcsv($handle, 1000, ',');
    
    $total = 0;
    $importados = 0;
    $atualizados = 0;
    $erros = [];
    
    while (($data = fgetcsv($handle, 1000, ',')) !== FALSE) {
        $total++;
        
        // Mapear dados
        $nome = isset($mapeamento['nome']) && $mapeamento['nome'] !== '' ? trim($data[$mapeamento['nome']] ?? '') : '';
        $telefone = isset($mapeamento['telefone']) && $mapeamento['telefone'] !== '' ? limparTelefone($data[$mapeamento['telefone']] ?? '') : '';
        $whatsapp = isset($mapeamento['whatsapp']) && $mapeamento['whatsapp'] !== '' ? limparTelefone($data[$mapeamento['whatsapp']] ?? '') : '';
        $email = isset($mapeamento['email']) && $mapeamento['email'] !== '' ? trim($data[$mapeamento['email']] ?? '') : '';
        $uf = isset($mapeamento['uf']) && $mapeamento['uf'] !== '' ? strtoupper(trim($data[$mapeamento['uf']] ?? '')) : '';
        $cidades = isset($mapeamento['cidades_atendidas']) && $mapeamento['cidades_atendidas'] !== '' ? trim($data[$mapeamento['cidades_atendidas']] ?? '') : '';
        
        // Processar cidades
        $cidades_array = preg_split('/[,;|]/', $cidades);
        $cidades_array = array_map('trim', $cidades_array);
        $cidades_array = array_filter($cidades_array);
        $cidades_json = json_encode($cidades_array, JSON_UNESCAPED_UNICODE);
        
        // Validar campos obrigatórios
        if (empty($nome) || empty($telefone)) {
            $erros[] = "Linha $total: faltam campos obrigatórios (nome/telefone/uf)";
            continue;
        }
        
        // ========================================
        // VERIFICAR SE REPRESENTANTE JÁ EXISTE (por nome)
        // ========================================
        $stmt_check = $mysqli->prepare("SELECT id, unidades_negocio FROM representantes WHERE nome = ? AND empresa = ?");
        $stmt_check->bind_param('ss', $nome, $empresa);
        $stmt_check->execute();
        $result = $stmt_check->get_result();
        $rep_existente = $result->fetch_assoc();
        $stmt_check->close();
        
        if ($rep_existente) {
            // ========================================
            // REPRESENTANTE EXISTE → UPDATE (adicionar unidades)
            // ========================================
            $id_rep = $rep_existente['id'];
            $unidades_existentes = json_decode($rep_existente['unidades_negocio'] ?? '[]', true) ?: [];
            
            // Mesclar unidades (sem duplicar)
            $unidades_merged = array_unique(array_merge($unidades_existentes, $unidades_negocio));
            $unidades_json = json_encode(array_values($unidades_merged));
            
            // Atualizar representante
            $stmt_update = $mysqli->prepare("
                UPDATE representantes 
                SET telefone = ?, 
                    whatsapp = ?, 
                    email = ?, 
                    uf = ?, 
                    cidades_atendidas = ?,
                    unidades_negocio = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt_update->bind_param('ssssssi', 
                $telefone, $whatsapp, $email, $uf, $cidades_json, $unidades_json, $id_rep
            );
            
            if ($stmt_update->execute()) {
                $atualizados++;
            } else {
                $erros[] = "Linha $total (UPDATE): " . $stmt_update->error;
            }
            $stmt_update->close();
            
        } else {
            // ========================================
            // REPRESENTANTE NÃO EXISTE → INSERT
            // ========================================
            $unidades_json = json_encode($unidades_negocio);
            
            $stmt_insert = $mysqli->prepare("
                INSERT INTO representantes (empresa, nome, telefone, whatsapp, email, uf, cidades_atendidas, unidades_negocio)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt_insert->bind_param('ssssssss', 
                $empresa, $nome, $telefone, $whatsapp, $email, $uf, $cidades_json, $unidades_json
            );
            
            if ($stmt_insert->execute()) {
                $importados++;
            } else {
                $erros[] = "Linha $total (INSERT): " . $stmt_insert->error;
            }
            $stmt_insert->close();
        }
    }
    
    fclose($handle);
    $mysqli->close();
    
    $mensagem = "✅ Importação concluída!<br>";
    $mensagem .= "📊 Total de linhas: $total<br>";
    $mensagem .= "🆕 Novos registros: $importados<br>";
    $mensagem .= "🔄 Atualizados: $atualizados<br>";
    $mensagem .= "🏷️ Unidades adicionadas: " . implode(', ', array_map('formatarUnidade', $unidades_negocio)) . "<br>";
    
    if (count($erros) > 0) {
        $mensagem .= "❌ Erros: " . count($erros) . "<br>";
        $mensagem .= "<small>" . implode('<br>', array_slice($erros, 0, 5)) . "</small>";
    }
    
    return [
        'sucesso' => ($importados + $atualizados) > 0,
        'mensagem' => $mensagem
    ];
}

// ==========================================
// FUNÇÃO: Limpar Telefone
// ==========================================
function limparTelefone($tel) {
    if (empty($tel)) return '';
    $tel = preg_replace('/[^0-9]/', '', $tel);
    
    if (strlen($tel) === 11) {
        return '(' . substr($tel, 0, 2) . ') ' . substr($tel, 2, 5) . '-' . substr($tel, 7);
    } elseif (strlen($tel) === 10) {
        return '(' . substr($tel, 0, 2) . ') ' . substr($tel, 2, 4) . '-' . substr($tel, 6);
    }
    
    return $tel;
}

// ==========================================
// FUNÇÃO: Formatar Unidade
// ==========================================
function formatarUnidade($unidade) {
    $map = [
        'moto_offroad' => 'Moto Off-Road',
        'moto_onroad' => 'Moto On-Road',
        'ciclismo' => 'Ciclismo'
    ];
    return $map[$unidade] ?? $unidade;
}

// ==========================================
// Definir campos do banco
// ==========================================
$campos_lojas = [
    'nome' => ['label' => 'Nome da Loja', 'obrigatorio' => true],
    'endereco' => ['label' => 'Endereço', 'obrigatorio' => true],
    'bairro' => ['label' => 'Bairro', 'obrigatorio' => false],
    'cidade' => ['label' => 'Cidade', 'obrigatorio' => true],
    'uf' => ['label' => 'UF', 'obrigatorio' => false],
    'cep' => ['label' => 'CEP', 'obrigatorio' => false],
    'telefone' => ['label' => 'Telefone', 'obrigatorio' => false],
    'whatsapp' => ['label' => 'WhatsApp', 'obrigatorio' => false],
    'email' => ['label' => 'E-mail', 'obrigatorio' => false]
];

$campos_representantes = [
    'nome' => ['label' => 'Nome do Representante', 'obrigatorio' => true],
    'telefone' => ['label' => 'Telefone', 'obrigatorio' => true],
    'whatsapp' => ['label' => 'WhatsApp', 'obrigatorio' => false],
    'email' => ['label' => 'E-mail', 'obrigatorio' => false],
    'uf' => ['label' => 'UF', 'obrigatorio' => false],
    'cidades_atendidas' => ['label' => 'Cidades Atendidas', 'obrigatorio' => false]
];

$campos_banco = ($_SESSION['tipo'] ?? '') === 'lojas' ? $campos_lojas : $campos_representantes;
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Importar CSV - <?= ucfirst($etapa) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body { background: #f8f9fa; padding-top: 2rem; padding-bottom: 2rem; }
        .card { box-shadow: 0 0 15px rgba(0,0,0,0.1); }
        .drag-area { 
            border: 2px dashed #dee2e6; 
            border-radius: 8px; 
            padding: 2rem; 
            text-align: center;
            background: #fff;
            transition: all 0.3s;
        }
        .drag-area.highlight { 
            border-color: #0d6efd; 
            background: #e7f1ff; 
        }
        .mapping-row {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            transition: all 0.2s;
        }
        .mapping-row:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .required-badge {
            background: #dc3545;
            color: white;
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            margin-left: 0.5rem;
        }
        .progress-steps {
            display: flex;
            justify-content: center;
            margin-bottom: 2rem;
        }
        .step {
            flex: 1;
            text-align: center;
            position: relative;
            padding-bottom: 2rem;
        }
        .step::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 50%;
            width: 100%;
            height: 2px;
            background: #dee2e6;
            z-index: -1;
        }
        .step:first-child::before {
            left: 50%;
            width: 50%;
        }
        .step:last-child::before {
            width: 50%;
        }
        .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #dee2e6;
            color: #6c757d;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        .step.active .step-number {
            background: #0d6efd;
            color: white;
        }
        .step.completed .step-number {
            background: #198754;
            color: white;
        }
        .unidade-checkbox {
            border: 2px solid #dee2e6;
            border-radius: 8px;
            padding: 1rem;
            transition: all 0.2s;
            cursor: pointer;
        }
        .unidade-checkbox:has(input:checked) {
            border-color: #0d6efd;
            background: #e7f1ff;
        }
        .unidade-checkbox:hover {
            border-color: #0d6efd;
        }
        .alert-info-custom {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 1rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-lg-10">
                
                <!-- Header -->
                <div class="text-center mb-4">
                    <h1><i class="bi bi-file-earmark-arrow-up"></i> Importar CSV</h1>
                    <p class="text-muted">Sistema de importação de Lojas e Representantes com atualização inteligente</p>
                </div>

                <!-- Progress Steps -->
                <div class="progress-steps">
                    <div class="step <?= $etapa === 'upload' ? 'active' : 'completed' ?>">
                        <div class="step-number">1</div>
                        <div>Upload</div>
                    </div>
                    <div class="step <?= $etapa === 'mapear' ? 'active' : '' ?> <?= $etapa === 'importar' || ($etapa === 'upload' && $mensagem && $tipo_mensagem === 'success') ? 'completed' : '' ?>">
                        <div class="step-number">2</div>
                        <div>Mapeamento</div>
                    </div>
                    <div class="step <?= ($etapa === 'upload' || $etapa === 'mapear') && $mensagem && $tipo_mensagem === 'success' ? 'active' : '' ?>">
                        <div class="step-number">3</div>
                        <div>Concluído</div>
                    </div>
                </div>

                <!-- Mensagem -->
                <?php if ($mensagem): ?>
                <div class="alert alert-<?= $tipo_mensagem ?> alert-dismissible fade show" role="alert">
                    <?= $mensagem ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
                <?php if ($tipo_mensagem === 'success'): ?>
                <div class="text-center mb-4">
                    <a href="?" class="btn btn-primary btn-lg"><i class="bi bi-plus-circle"></i> Nova Importação</a>
                </div>
                <?php endif; ?>
                <?php endif; ?>

                <?php if ($etapa === 'upload' && !($mensagem && $tipo_mensagem === 'success')): ?>
                <!-- ETAPA 1: Upload -->
                <div class="card">
                    <div class="card-body p-4">
                        
                        <!-- Info sobre UPDATE -->
                        <div class="alert-info-custom mb-4">
                            <i class="bi bi-info-circle-fill"></i>
                            <strong>Sistema Inteligente:</strong><br>
                            <small>
                                ✅ Se a loja/representante <strong>JÁ EXISTIR</strong> (mesmo nome), o sistema <strong>ADICIONA</strong> as novas unidades de negócio<br>
                                🆕 Se <strong>NÃO EXISTIR</strong>, cria um novo registro
                            </small>
                        </div>

                        <form method="POST" enctype="multipart/form-data" action="?etapa=upload">
                            
                            <!-- Tipo -->
                            <div class="mb-4">
                                <label class="form-label fw-bold">1. Selecione o Tipo</label>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <input type="radio" class="btn-check" name="tipo" id="tipo_lojas" value="lojas" required>
                                        <label class="btn btn-outline-primary w-100 py-3" for="tipo_lojas">
                                            <i class="bi bi-shop fs-3 d-block mb-2"></i>
                                            <strong>Lojas</strong>
                                        </label>
                                    </div>
                                    <div class="col-md-6">
                                        <input type="radio" class="btn-check" name="tipo" id="tipo_representantes" value="representantes" required>
                                        <label class="btn btn-outline-primary w-100 py-3" for="tipo_representantes">
                                            <i class="bi bi-person-badge fs-3 d-block mb-2"></i>
                                            <strong>Representantes</strong>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Empresa -->
                            <div class="mb-4">
                                <label class="form-label fw-bold">2. Selecione a Empresa</label>
                                <select class="form-select form-select-lg" name="empresa" required>
                                    <option value="">Escolha...</option>
                                    <option value="cem">100%</option>
                                     <option value="mattos">Mattos Racing</option>
                                    <option value="axxis">AXXIS Helmets</option>
                                    <option value="mt">MT Helmets</option>
                                    <option value="airoh">AIROH</option>
                                     <option value="sidi">SIDI</option>
                                      <option value="todas">Todas</option>
                                </select>
                            </div>

                            <!-- Unidades de Negócio -->
                            <div class="mb-4">
                                <label class="form-label fw-bold">3. Selecione as Unidades de Negócio</label>
                                <small class="text-muted d-block mb-2">As unidades marcadas serão <strong>adicionadas</strong> às lojas/representantes (não substituídas)</small>
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <div class="unidade-checkbox">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" name="unidades_negocio[]" value="moto_offroad" id="un_moto_off">
                                                <label class="form-check-label w-100" for="un_moto_off">
                                                    <i class="bi bi-bicycle fs-4 d-block mb-2"></i>
                                                    <strong>Moto Off-Road</strong>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="unidade-checkbox">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" name="unidades_negocio[]" value="moto_onroad" id="un_moto_on">
                                                <label class="form-check-label w-100" for="un_moto_on">
                                                    <i class="bi bi-scooter fs-4 d-block mb-2"></i>
                                                    <strong>Moto On-Road</strong>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="unidade-checkbox">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" name="unidades_negocio[]" value="ciclismo" id="un_ciclismo">
                                                <label class="form-check-label w-100" for="un_ciclismo">
                                                    <i class="bi bi-bicycle fs-4 d-block mb-2"></i>
                                                    <strong>Ciclismo</strong>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Upload -->
                            <div class="mb-4">
                                <label class="form-label fw-bold">4. Faça Upload do CSV</label>
                                <div class="drag-area" id="dragArea">
                                    <i class="bi bi-cloud-arrow-up fs-1 text-primary mb-3 d-block"></i>
                                    <p class="mb-2">Arraste o arquivo CSV aqui ou</p>
                                    <input type="file" name="csv_file" id="csv_file" accept=".csv" required hidden>
                                    <button type="button" class="btn btn-primary" onclick="document.getElementById('csv_file').click()">
                                        <i class="bi bi-folder2-open"></i> Selecionar Arquivo
                                    </button>
                                    <p class="text-muted small mt-2 mb-0" id="fileName"></p>
                                </div>
                            </div>

                            <!-- Botão Submit -->
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary btn-lg">
                                    Continuar <i class="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                <?php endif; ?>

                <?php if ($etapa === 'mapear'): ?>
                <!-- ETAPA 2: Mapeamento -->
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="bi bi-diagram-3"></i> Mapeamento de Colunas</h5>
                    </div>
                    <div class="card-body p-4">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i> 
                            <strong>Associe as colunas do seu CSV com os campos do banco de dados.</strong><br>
                            <small>Campos marcados com <span class="required-badge">OBRIGATÓRIO</span> precisam ser mapeados.</small>
                        </div>

                        <form method="POST" action="?etapa=importar">
                            <?php foreach ($campos_banco as $campo => $info): ?>
                            <div class="mapping-row">
                                <div class="row align-items-center">
                                    <div class="col-md-5">
                                        <label class="form-label mb-0 fw-bold">
                                            <i class="bi bi-database"></i> <?= $info['label'] ?>
                                            <?php if ($info['obrigatorio']): ?>
                                            <span class="required-badge">OBRIGATÓRIO</span>
                                            <?php endif; ?>
                                        </label>
                                    </div>
                                    <div class="col-md-2 text-center">
                                        <i class="bi bi-arrow-left-right text-muted"></i>
                                    </div>
                                    <div class="col-md-5">
                                        <select name="mapeamento[<?= $campo ?>]" class="form-select" <?= $info['obrigatorio'] ? 'required' : '' ?>>
                                            <option value="">-- Não mapear --</option>
                                            <?php foreach ($_SESSION['colunas_csv'] as $indice => $coluna_csv): ?>
                                            <option value="<?= $indice ?>" <?= strtolower(trim($coluna_csv)) === $campo ? 'selected' : '' ?>>
                                                <?= htmlspecialchars($coluna_csv) ?>
                                            </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <?php endforeach; ?>

                            <div class="d-grid gap-2 mt-4">
                                <button type="submit" class="btn btn-success btn-lg">
                                    <i class="bi bi-upload"></i> Importar Dados
                                </button>
                                <a href="?" class="btn btn-outline-secondary">
                                    <i class="bi bi-arrow-left"></i> Cancelar
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
                <?php endif; ?>

            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Drag & Drop
        const dragArea = document.getElementById('dragArea');
        const fileInput = document.getElementById('csv_file');
        const fileName = document.getElementById('fileName');

        if (dragArea) {
            dragArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dragArea.classList.add('highlight');
            });

            dragArea.addEventListener('dragleave', () => {
                dragArea.classList.remove('highlight');
            });

            dragArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dragArea.classList.remove('highlight');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    fileName.textContent = '📄 ' + files[0].name;
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    fileName.textContent = '📄 ' + fileInput.files[0].name;
                }
            });
        }
    </script>
</body>
</html>