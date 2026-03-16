<?php
// ==========================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ==========================================

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', 'root');
define('DB_NAME', 'navex');
define('DB_CHARSET', 'utf8mb4');

// Conectar ao banco
function getDBConnection() {
    $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($mysqli->connect_error) {
        die('Erro de conexão (' . $mysqli->connect_errno . ') ' . $mysqli->connect_error);
    }
    
    $mysqli->set_charset(DB_CHARSET);
    
    return $mysqli;
}
