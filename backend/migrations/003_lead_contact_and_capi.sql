-- Contato do lead: sem isto a operacao nao consegue retornar, e a Conversions API
-- da Meta fica sem identificador de correspondencia (so IP e user agent).
ALTER TABLE leads
    ADD COLUMN email VARCHAR(190) NOT NULL DEFAULT '' AFTER name_company,
    ADD COLUMN phone VARCHAR(40)  NOT NULL DEFAULT '' AFTER email;

-- Token da Conversions API. Nunca sai pelo endpoint publico e o painel so recebe
-- os 4 ultimos caracteres.
ALTER TABLE pixels
    ADD COLUMN capi_token VARCHAR(255) NOT NULL DEFAULT '' AFTER pixel_id
