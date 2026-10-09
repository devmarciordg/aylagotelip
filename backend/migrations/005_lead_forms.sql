-- Cada serviço tem o seu questionário. As respostas variam demais para virarem
-- coluna: o que é fixo (nome, e-mail, telefone, cidade) continua em coluna, o resto
-- vai em JSON, e o schema mora em shared/forms.json.
ALTER TABLE leads
    ADD COLUMN form    VARCHAR(40) NOT NULL DEFAULT '' AFTER channel,
    ADD COLUMN answers JSON        NULL              AFTER notes
