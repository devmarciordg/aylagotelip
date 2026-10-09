-- `projects` e `posts` nunca foram usadas: nenhum endpoint, nenhuma query, nenhuma
-- referencia no site. Projetos e posts vivem em `pages.blocks` (`slots[]` e `posts[]`),
-- que o build do site ja consome e o painel ja edita. Duas mecanicas de CMS para o
-- mesmo conteudo so criam divergencia.
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS posts
