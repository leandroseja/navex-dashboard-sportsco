ALTER TABLE produtos ADD COLUMN categoria VARCHAR(100);
create index idx_produtos_categoria on produtos(categoria);
