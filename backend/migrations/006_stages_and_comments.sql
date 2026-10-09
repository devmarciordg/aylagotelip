-- As etapas do funil saem do codigo e viram dado.
--
-- Eram uma constante PHP (LEAD_STAGES) espelhada numa constante TypeScript
-- (api.ts, STAGES/STAGE_LABEL/STAGE_COLOR): mudar o funil exigia editar dois
-- arquivos e publicar. `leads.stage` ja guardava o slug, entao a tabela e o
-- registro do que aquele slug significa -- nao ha migracao de dado a fazer.
--
-- `locked` marca as tres etapas que a operacao nao pode mexer:
--   novo    - e o destino padrao de todo lead captado (leads.stage DEFAULT);
--   ganho   - fecha o funil por cima e alimenta a taxa de conversao;
--   perdido - fecha por baixo.
-- Sem elas o CRM perde a entrada, o resultado ou as duas.
CREATE TABLE lead_stages (
    id       CHAR(36)    NOT NULL PRIMARY KEY,
    slug     VARCHAR(40) NOT NULL UNIQUE,
    label    VARCHAR(60) NOT NULL,
    color    CHAR(7)     NOT NULL DEFAULT '#7f8c8d',
    position SMALLINT    NOT NULL DEFAULT 0,
    locked   TINYINT(1)  NOT NULL DEFAULT 0,
    INDEX idx_stages_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- As sete atuais, com os mesmos slugs, rotulos e cores que o painel ja usava:
-- um lead existente continua na coluna onde estava.
INSERT INTO lead_stages (id, slug, label, color, position, locked) VALUES
    (UUID(), 'novo',         'Novo',          '#3d9bd8', 10, 1),
    (UUID(), 'qualificacao', 'Qualificação',  '#d4a017', 20, 0),
    (UUID(), 'diagnostico',  'Diagnóstico',   '#e07b39', 30, 0),
    (UUID(), 'proposta',     'Proposta',      '#d45c4e', 40, 0),
    (UUID(), 'follow_up',    'Follow-Up',     '#a56fd4', 50, 0),
    (UUID(), 'ganho',        'Ganho',         '#33b26e', 90, 1),
    (UUID(), 'perdido',      'Perdido',       '#7f8c8d', 99, 1);

-- Comentarios do lead: o historico que a ficha nao tem.
--
-- `notes` e um campo unico e sobrescrevivel -- serve para o que o lead informou,
-- nao para o que a operacao foi descobrindo. Cada conversa, cada visita e cada
-- exigencia do CBMMG vira uma linha aqui, com autor e data.
--
-- `author_name` e denormalizado de proposito: o comentario e registro do que foi
-- dito e quando, e precisa continuar legivel depois de o usuario sair da equipe.
-- `ON DELETE CASCADE` no lead porque o comentario nao existe sem ele.
CREATE TABLE lead_comments (
    id          CHAR(36)      NOT NULL PRIMARY KEY,
    lead_id     CHAR(36)      NOT NULL,
    user_id     CHAR(36)      NULL,
    author_name VARCHAR(120)  NOT NULL DEFAULT '',
    body        VARCHAR(4000) NOT NULL,
    edited_at   TIMESTAMP     NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comments_lead (lead_id, created_at),
    CONSTRAINT fk_comments_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
