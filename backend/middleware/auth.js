const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e anexa os dados do usuário à requisição
 */
const auth = (req, res, next) => {
    try {
        // Pegar token do header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        // Formato esperado: "Bearer TOKEN"
        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ error: 'Formato de token inválido' });
        }

        const token = parts[1];

        // Verificar token
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Token inválido ou expirado' });
            }

            // Anexar dados do usuário à requisição
            req.user = {
                id: decoded.id,
                email: decoded.email,
                nome: decoded.nome,
                nivel: decoded.nivel
            };

            next();
        });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao processar autenticação' });
    }
};

module.exports = auth;
