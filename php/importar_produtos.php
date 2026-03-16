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
    $empresa = $_POST['empresa'] ?? '';
    $linha   = $_POST['linha']   ?? '';

    // Validações
    if (empty($empresa)) {
        $mensagem = 'Por favor, selecione a empresa.';
        $tipo_mensagem = 'danger';
    } elseif (!in_array($empresa, ['axxis', 'mattos', 'mt', 'airoh', 'sidi', 'cem'])) {
        $mensagem = 'Empresa inválida.';
        $tipo_mensagem = 'danger';
    } elseif ($_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
        $mensagem = 'Erro no upload do arquivo.';
        $tipo_mensagem = 'danger';
    } else {
        // Salvar arquivo temporariamente
        $arquivo_temp = 'temp_prod_' . uniqid() . '.csv';
        move_uploaded_file($_FILES['csv_file']['tmp_name'], $arquivo_temp);

        // Detectar separador (vírgula ou ponto-e-vírgula)
        $handle = fopen($arquivo_temp, 'r');
        $primeira_linha = fgets($handle);
        rewind($handle);
        $separador = substr_count($primeira_linha, ';') > substr_count($primeira_linha, ',') ? ';' : ',';
        $colunas_csv = fgetcsv($handle, 1000, $separador);
        fclose($handle);

        // Salvar na sessão
        $_SESSION['arquivo_temp']  = $arquivo_temp;
        $_SESSION['empresa']       = $empresa;
        $_SESSION['linha_produto'] = $linha;
        $_SESSION['colunas_csv']   = $colunas_csv;
        $_SESSION['separador']     = $separador;

        // Redirecionar para mapeamento
        header('Location: ?etapa=mapear');
        exit;
    }
}

// ==========================================
// ETAPA 2: Processar Importação com Mapeamento
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $etapa === 'importar') {
    $mapeamento   = $_POST['mapeamento']    ?? [];
    $arquivo_temp = $_SESSION['arquivo_temp']  ?? '';
    $empresa      = $_SESSION['empresa']       ?? '';
    $linha_produto = $_SESSION['linha_produto'] ?? '';
    $separador    = $_SESSION['separador']     ?? ',';

    if (empty($arquivo_temp) || !file_exists($arquivo_temp)) {
        $mensagem = 'Arquivo não encontrado. Faça upload novamente.';
        $tipo_mensagem = 'danger';
    } else {
        try {
            $resultado = importarProdutos($arquivo_temp, $empresa, $linha_produto, $mapeamento, $separador);

            $mensagem     = $resultado['mensagem'];
            $tipo_mensagem = $resultado['sucesso'] ? 'success' : 'warning';

            // Limpar sessão e arquivo temporário
            unlink($arquivo_temp);
            unset($_SESSION['arquivo_temp'], $_SESSION['empresa'], $_SESSION['linha_produto'],
                  $_SESSION['colunas_csv'], $_SESSION['separador']);

        } catch (Exception $e) {
            $mensagem = 'Erro: ' . $e->getMessage();
            $tipo_mensagem = 'danger';
        }
    }
}

// ==========================================
// FUNÇÃO: Importar Produtos (INSERT ou UPDATE)
// ==========================================
function importarProdutos($arquivo, $empresa, $linha_produto, $mapeamento, $separador = ',') {
    $mysqli = getDBConnection();

    $handle = fopen($arquivo, 'r');
    if (!$handle) {
        throw new Exception('Não foi possível abrir o arquivo CSV.');
    }

    // Descartar cabeçalho
    fgetcsv($handle, 1000, $separador);

    $total      = 0;
    $importados = 0;
    $atualizados = 0;
    $erros      = [];

    while (($data = fgetcsv($handle, 1000, $separador)) !== FALSE) {
        $total++;

        // ---- Mapear campos ----
        $nome      = isset($mapeamento['nome'])      && $mapeamento['nome']      !== '' ? mb_strtoupper(trim($data[$mapeamento['nome']]      ?? ''), 'UTF-8') : '';
        $linha_val = isset($mapeamento['linha'])     && $mapeamento['linha']     !== '' ? mb_strtoupper(trim($data[$mapeamento['linha']]     ?? ''), 'UTF-8') : mb_strtoupper($linha_produto, 'UTF-8');
        $preco_raw = isset($mapeamento['preco'])     && $mapeamento['preco']     !== '' ? trim($data[$mapeamento['preco']]     ?? '') : '';
        $ean       = isset($mapeamento['ean'])       && $mapeamento['ean']       !== '' ? trim($data[$mapeamento['ean']]       ?? '') : null;
        $categoria = isset($mapeamento['categoria']) && $mapeamento['categoria'] !== '' ? trim($data[$mapeamento['categoria']] ?? '') : null;

        // Tipo: usa CSV se mapeado, senão detecta automaticamente pelo nome/categoria
        if (isset($mapeamento['tipo']) && $mapeamento['tipo'] !== '' && !empty(trim($data[$mapeamento['tipo']] ?? ''))) {
            $tipo = trim($data[$mapeamento['tipo']]);
        } else {
            $tipo = detectarTipo($nome, $categoria);
        }

        // Normalizar preço: aceita "1.234,56" ou "1234.56" ou "1234,56"
        $preco = normalizarPreco($preco_raw);

        // Validar campos obrigatórios
        if (empty($nome)) {
            $erros[] = "Linha $total: campo NOME está vazio.";
            continue;
        }
        if ($preco === false || $preco < 0) {
            $erros[] = "Linha $total: preço inválido ($preco_raw) para \"$nome\".";
            continue;
        }

        // ---- Verificar se produto já existe (por nome + empresa) ----
        $stmt_check = $mysqli->prepare("SELECT id FROM produtos WHERE nome = ? AND empresa = ?");
        $stmt_check->bind_param('ss', $nome, $empresa);
        $stmt_check->execute();
        $result = $stmt_check->get_result();
        $existente = $result->fetch_assoc();
        $stmt_check->close();

        if ($existente) {
            // ---- UPDATE ----
            $id = $existente['id'];
            $stmt_update = $mysqli->prepare("
                UPDATE produtos
                SET linha = ?, tipo = ?, preco = ?, ean = ?, categoria = ?
                WHERE id = ?
            ");
            $stmt_update->bind_param('sssdsi', $linha_val, $tipo, $preco, $ean, $categoria, $id);

            if ($stmt_update->execute()) {
                $atualizados++;
            } else {
                $erros[] = "Linha $total (UPDATE): " . $stmt_update->error;
            }
            $stmt_update->close();

        } else {
            // ---- INSERT ----
            $stmt_insert = $mysqli->prepare("
                INSERT INTO produtos (empresa, linha, tipo, nome, preco, ean, categoria, ativo)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmt_insert->bind_param('ssssdss', $empresa, $linha_val, $tipo, $nome, $preco, $ean, $categoria);

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

    $mensagem  = "✅ Importação concluída!<br>";
    $mensagem .= "📊 Total de linhas: $total<br>";
    $mensagem .= "🆕 Novos produtos: $importados<br>";
    $mensagem .= "🔄 Atualizados: $atualizados<br>";

    if (count($erros) > 0) {
        $mensagem .= "❌ Erros: " . count($erros) . "<br>";
        $mensagem .= "<small>" . implode('<br>', array_slice($erros, 0, 10)) . "</small>";
    }

    return [
        'sucesso'  => ($importados + $atualizados) > 0,
        'mensagem' => $mensagem
    ];
}

// ==========================================
// FUNÇÃO: Detectar Tipo Automaticamente
// ==========================================
function detectarTipo($nome, $categoria) {
    $vestuario = [
        'bermuda','calça','calca','bretelle','camisa','jaqueta',
        'meia','luva','sapatilha','óculos','oculos','manguito','pernito',
        'camiseta','colete','shorts','tênis','tenis','bota','capacete bike'
    ];
    $acessorio = [
        'viseira','kit','forração','forracao','spoiler','entrada de ar',
        'mecanismo','suporte','pinlock','touca','bolsa','mochila','capa',
        'fixador','presilha','ventilação','ventilacao'
    ];

    $cat = strtolower($categoria ?? '');
    $nom = strtolower($nome);

    foreach ($vestuario as $v) {
        if ($cat !== '' && strpos($cat, $v) !== false) return 'vestuario';
        if (strpos($nom, $v) !== false) return 'vestuario';
    }
    foreach ($acessorio as $a) {
        if ($cat !== '' && strpos($cat, $a) !== false) return 'acessorio';
        if (strpos($nom, $a) !== false) return 'acessorio';
    }
    return 'produto';
}

// ==========================================
// FUNÇÃO: Normalizar Preço
// ==========================================
function normalizarPreco($raw) {
    if ($raw === '' || $raw === null) return 0.00;
    // Remove símbolo de moeda e espaços
    $raw = trim(preg_replace('/[R$\s]/u', '', $raw));
    // Formato brasileiro: 1.234,56
    if (preg_match('/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/', $raw)) {
        $raw = str_replace('.', '', $raw);
        $raw = str_replace(',', '.', $raw);
    } else {
        // Formato inglês ou só vírgula como decimal
        $raw = str_replace(',', '.', $raw);
    }
    return is_numeric($raw) ? (float) $raw : false;
}

// ==========================================
// Campos do banco de dados (para mapeamento)
// ==========================================
$campos_banco = [
    'nome'      => ['label' => 'Nome do Produto',  'obrigatorio' => true],
    'preco'     => ['label' => 'Preço',             'obrigatorio' => true],
    'linha'     => ['label' => 'Linha / Coleção',   'obrigatorio' => false],
    'tipo'      => ['label' => 'Tipo (produto / acessorio / vestuario)', 'obrigatorio' => false],
    'ean'       => ['label' => 'EAN / Código de barras', 'obrigatorio' => false],
    'categoria' => ['label' => 'Categoria',          'obrigatorio' => false],
];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Importar Produtos CSV</title>
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
        .mapping-row:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
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
        .step:first-child::before { left: 50%; width: 50%; }
        .step:last-child::before { width: 50%; }
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
        .step.active .step-number    { background: #0d6efd; color: white; }
        .step.completed .step-number { background: #198754; color: white; }
        .alert-info-custom {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        .empresa-card {
            border: 2px solid #dee2e6;
            border-radius: 8px;
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .empresa-card:has(input:checked) {
            border-color: #0d6efd;
            background: #e7f1ff;
        }
        .empresa-card:hover { border-color: #0d6efd; }
    </style>
</head>
<body>
<div class="container">
    <div class="row justify-content-center">
        <div class="col-lg-10">

            <!-- Header -->
            <div class="text-center mb-4">
                <h1><i class="bi bi-box-seam"></i> Importar Produtos CSV</h1>
                <p class="text-muted">Importe produtos para o banco de dados com mapeamento inteligente de colunas</p>
            </div>

            <!-- Progress Steps -->
            <div class="progress-steps">
                <div class="step <?= $etapa === 'upload' ? 'active' : 'completed' ?>">
                    <div class="step-number">1</div>
                    <div>Upload</div>
                </div>
                <div class="step <?= $etapa === 'mapear' ? 'active' : '' ?> <?= ($etapa === 'upload' && $mensagem && $tipo_mensagem === 'success') ? 'completed' : '' ?>">
                    <div class="step-number">2</div>
                    <div>Mapeamento</div>
                </div>
                <div class="step <?= ($mensagem && $tipo_mensagem === 'success') ? 'active' : '' ?>">
                    <div class="step-number">3</div>
                    <div>Concluído</div>
                </div>
            </div>

            <!-- Mensagem de retorno -->
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

            <!-- ================================ -->
            <!-- ETAPA 1: Upload                  -->
            <!-- ================================ -->
            <?php if ($etapa === 'upload' && !($mensagem && $tipo_mensagem === 'success')): ?>
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bi bi-upload"></i> Etapa 1 — Configurar Importação</h5>
                </div>
                <div class="card-body p-4">

                    <div class="alert-info-custom mb-4">
                        <i class="bi bi-info-circle-fill"></i>
                        <strong>Sistema Inteligente:</strong><br>
                        <small>
                            ✅ Se o produto <strong>JÁ EXISTIR</strong> (mesmo nome + empresa), os dados serão <strong>ATUALIZADOS</strong><br>
                            🆕 Se <strong>NÃO EXISTIR</strong>, um novo registro será criado<br>
                            📄 Aceita separadores <strong>vírgula (,)</strong> ou <strong>ponto-e-vírgula (;)</strong> — detectado automaticamente
                        </small>
                    </div>

                    <form method="POST" enctype="multipart/form-data" action="?etapa=upload">

                        <!-- Empresa -->
                        <div class="mb-4">
                            <label class="form-label fw-bold">1. Selecione a Empresa</label>
                            <div class="row g-2">
                                <?php
                                $empresas = [
                                    'axxis'  => ['label' => 'AXXIS Helmets',  'icon' => 'bi-shield-fill'],
                                    'mattos' => ['label' => 'Mattos Racing',   'icon' => 'bi-bicycle'],
                                    'mt'     => ['label' => 'MT Helmets',      'icon' => 'bi-shield'],
                                    'airoh'  => ['label' => 'AIROH',           'icon' => 'bi-wind'],
                                    'sidi'   => ['label' => 'SIDI',            'icon' => 'bi-boot'],
                                    'cem'    => ['label' => '100%',            'icon' => 'bi-star-fill'],
                                ];
                                foreach ($empresas as $val => $emp): ?>
                                <div class="col-md-4 col-6">
                                    <label class="empresa-card d-flex align-items-center gap-2 w-100">
                                        <input type="radio" name="empresa" value="<?= $val ?>" required class="form-check-input mt-0">
                                        <i class="bi <?= $emp['icon'] ?> fs-5 text-primary"></i>
                                        <strong><?= $emp['label'] ?></strong>
                                    </label>
                                </div>
                                <?php endforeach; ?>
                            </div>
                        </div>

                        <!-- Linha / Coleção (opcional, pode vir do CSV) -->
                        <div class="mb-4">
                            <label class="form-label fw-bold">2. Linha / Coleção <span class="text-muted fw-normal">(opcional — pode ser mapeada pelo CSV)</span></label>
                            <input type="text" name="linha" class="form-control form-control-lg"
                                   placeholder="Ex: BIKE, SEGMENT, PANTHER SV..."
                                   value="<?= htmlspecialchars($_POST['linha'] ?? '') ?>">
                            <small class="text-muted">Se informada aqui, será usada como padrão para todas as linhas sem coluna mapeada.</small>
                        </div>

                        <!-- Upload -->
                        <div class="mb-4">
                            <label class="form-label fw-bold">3. Faça Upload do CSV</label>
                            <div class="drag-area" id="dragArea">
                                <i class="bi bi-cloud-arrow-up fs-1 text-primary mb-3 d-block"></i>
                                <p class="mb-2">Arraste o arquivo CSV aqui ou</p>
                                <input type="file" name="csv_file" id="csv_file" accept=".csv,.txt" required hidden>
                                <button type="button" class="btn btn-primary" onclick="document.getElementById('csv_file').click()">
                                    <i class="bi bi-folder2-open"></i> Selecionar Arquivo
                                </button>
                                <p class="text-muted small mt-2 mb-0" id="fileName"></p>
                            </div>
                        </div>

                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary btn-lg">
                                Continuar <i class="bi bi-arrow-right"></i>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <?php endif; ?>

            <!-- ================================ -->
            <!-- ETAPA 2: Mapeamento de Colunas   -->
            <!-- ================================ -->
            <?php if ($etapa === 'mapear'): ?>
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bi bi-diagram-3"></i> Etapa 2 — Mapeamento de Colunas</h5>
                </div>
                <div class="card-body p-4">

                    <div class="alert alert-info mb-4">
                        <i class="bi bi-info-circle"></i>
                        <strong>Associe as colunas do seu CSV com os campos do banco de dados.</strong><br>
                        <small>
                            Campos marcados com <span class="required-badge">OBRIGATÓRIO</span> precisam ser mapeados.<br>
                            <strong>Empresa:</strong> <?= htmlspecialchars(strtoupper($_SESSION['empresa'] ?? '')) ?>
                            <?php if (!empty($_SESSION['linha_produto'])): ?>
                            &nbsp;|&nbsp; <strong>Linha padrão:</strong> <?= htmlspecialchars($_SESSION['linha_produto']) ?>
                            <?php endif; ?>
                            &nbsp;|&nbsp; <strong>Separador detectado:</strong> "<?= htmlspecialchars($_SESSION['separador'] ?? ',') ?>"
                        </small>
                    </div>

                    <!-- Preview das colunas do CSV -->
                    <div class="mb-3">
                        <small class="text-muted">
                            <i class="bi bi-table"></i>
                            <strong>Colunas encontradas no CSV:</strong>
                            <?= implode(', ', array_map('htmlspecialchars', $_SESSION['colunas_csv'] ?? [])) ?>
                        </small>
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
                                        <?php foreach (($_SESSION['colunas_csv'] ?? []) as $indice => $coluna_csv):
                                            // Auto-selecionar se o nome da coluna bater com o campo
                                            $auto = strtolower(trim($coluna_csv)) === strtolower($campo)
                                                 || strtolower(trim($coluna_csv)) === strtolower($info['label']);
                                        ?>
                                        <option value="<?= $indice ?>" <?= $auto ? 'selected' : '' ?>>
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
                                <i class="bi bi-upload"></i> Importar Produtos
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
    const dragArea  = document.getElementById('dragArea');
    const fileInput = document.getElementById('csv_file');
    const fileName  = document.getElementById('fileName');

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
