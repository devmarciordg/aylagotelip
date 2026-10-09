-- Schema base. Todas as PKs sao CHAR(36) UUIDv4 - zero IDs auto-incrementais (OWASP API BOLA).

CREATE TABLE users (
    id            CHAR(36)     NOT NULL PRIMARY KEY,
    email         VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(120) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pages (
    id         CHAR(36)     NOT NULL PRIMARY KEY,
    slug       VARCHAR(120) NOT NULL UNIQUE,
    title      VARCHAR(200) NOT NULL DEFAULT '',
    blocks     JSON         NOT NULL,
    meta       JSON         NOT NULL,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
    id         CHAR(36)     NOT NULL PRIMARY KEY,
    slug       VARCHAR(160) NOT NULL UNIQUE,
    title      VARCHAR(200) NOT NULL,
    summary    VARCHAR(500) NOT NULL DEFAULT '',
    body_html  MEDIUMTEXT   NOT NULL,
    cover_url  VARCHAR(400) NOT NULL DEFAULT '',
    featured   TINYINT(1)   NOT NULL DEFAULT 0,
    published  TINYINT(1)   NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE posts (
    id           CHAR(36)     NOT NULL PRIMARY KEY,
    slug         VARCHAR(160) NOT NULL UNIQUE,
    title        VARCHAR(200) NOT NULL,
    excerpt      VARCHAR(500) NOT NULL DEFAULT '',
    body_html    MEDIUMTEXT   NOT NULL,
    cover_url    VARCHAR(400) NOT NULL DEFAULT '',
    published    TINYINT(1)   NOT NULL DEFAULT 0,
    published_at TIMESTAMP    NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leads (
    id              CHAR(36)      NOT NULL PRIMARY KEY,
    name_company    VARCHAR(200)  NOT NULL,
    channel         VARCHAR(40)   NOT NULL DEFAULT 'site',
    enterprise      VARCHAR(200)  NOT NULL DEFAULT '',
    demand          VARCHAR(2000) NOT NULL,
    city            VARCHAR(120)  NOT NULL DEFAULT '',
    notes           VARCHAR(2000) NOT NULL DEFAULT '',
    stage           VARCHAR(20)   NOT NULL DEFAULT 'novo',
    deadline        DATE          NULL,
    next_action     VARCHAR(300)  NOT NULL DEFAULT '',
    estimated_value DECIMAL(12,2) NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_leads_stage (stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pixels (
    id         CHAR(36)     NOT NULL PRIMARY KEY,
    provider   VARCHAR(40)  NOT NULL UNIQUE,
    pixel_id   VARCHAR(120) NOT NULL,
    enabled    TINYINT(1)   NOT NULL DEFAULT 0,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
