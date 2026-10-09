-- Hospedagem compartilhada nao oferece Redis. Sessao BFF, allowlist de jti e rate
-- limiting passam para o MySQL, que e o unico armazenamento garantido no plano.
-- O contrato de seguranca nao muda: o JWT continua invisivel ao JavaScript e o
-- rate limit continua sliding window.

CREATE TABLE sessions (
    id         CHAR(64)  NOT NULL PRIMARY KEY,   -- o `sid` do cookie opaco
    user_id    CHAR(36)  NOT NULL,
    jti        CHAR(36)  NOT NULL,
    jwt        TEXT      NOT NULL,
    expires_at DATETIME  NOT NULL,
    INDEX idx_sessions_jti (jti),
    INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uma linha por requisicao contada. E o que permite janela deslizante de verdade,
-- em vez do contador de janela fixa que libera o dobro na virada.
CREATE TABLE rate_hits (
    id      CHAR(36)     NOT NULL PRIMARY KEY,
    bucket  VARCHAR(40)  NOT NULL,
    ident   VARCHAR(64)  NOT NULL,
    hit_at  DATETIME(3)  NOT NULL,
    INDEX idx_rate_window (bucket, ident, hit_at),
    INDEX idx_rate_cleanup (hit_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
