-- NEXA - Rebalanceamento de caixas V1 para testes
-- Mantém IDs existentes e altera somente preço/pesos autoritativos.
BEGIN;

UPDATE public.box_catalog_v1
SET price_nex = v.price_nex,
    weights = v.weights
FROM (VALUES
  ('BASIC', 1000, ARRAY[55,30,12,3,0,0]::integer[]),
  ('ADVANCED', 2500, ARRAY[35,30,22,10,3,0]::integer[]),
  ('EPIC', 10000, ARRAY[10,20,30,30,9,1]::integer[]),
  ('PREMIUM', 10000, ARRAY[10,20,30,30,9,1]::integer[]),
  ('LEGENDARY', 25000, ARRAY[0,5,15,35,40,5]::integer[]),
  ('GUARDIANS', 3000, ARRAY[0,45,30,20,5,0]::integer[]),
  ('COLLECTION_HUNTERS', 4000, ARRAY[35,30,25,8,2,0]::integer[]),
  ('COLLECTION_MAGES', 4500, ARRAY[35,30,25,8,2,0]::integer[]),
  ('COLLECTION_ABYSS', 5500, ARRAY[25,30,25,14,5,1]::integer[]),
  ('COLLECTION_KNIGHTS', 5500, ARRAY[25,30,25,14,5,1]::integer[]),
  ('COLLECTION_DRAGONS', 6000, ARRAY[0,30,35,25,9,1]::integer[]),
  ('COLLECTION_COSMIC', 7500, ARRAY[0,20,35,30,14,1]::integer[]),
  ('COLLECTION_GODS', 7500, ARRAY[0,0,35,45,19,1]::integer[])
) AS v(box_type, price_nex, weights)
WHERE box_catalog_v1.box_type = v.box_type;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM public.box_catalog_v1
  WHERE box_type IN (
    'BASIC','ADVANCED','EPIC','PREMIUM','LEGENDARY','GUARDIANS',
    'COLLECTION_HUNTERS','COLLECTION_MAGES','COLLECTION_ABYSS',
    'COLLECTION_KNIGHTS','COLLECTION_DRAGONS','COLLECTION_COSMIC','COLLECTION_GODS'
  );

  IF n <> 13 THEN
    RAISE EXCEPTION 'Catálogo incompleto: esperado 13 caixas, encontrado %', n;
  END IF;
END $$;

COMMIT;