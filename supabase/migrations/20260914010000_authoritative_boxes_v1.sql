-- SETOR 7B1. Requires the existing v2 card_templates schema. No SQL executed by this task.
CREATE TABLE public.box_catalog_v1 (
 box_type text PRIMARY KEY, name text NOT NULL, price_nex numeric NOT NULL CHECK(price_nex>=0 AND price_nex<'Infinity'::numeric),
 purchasable boolean NOT NULL, collection_id text,
 weights integer[] NOT NULL, version integer NOT NULL DEFAULT 1,
 CHECK(box_type<>'RECRUIT' OR NOT purchasable),
 CHECK(array_ndims(weights)=1 AND array_lower(weights,1)=1 AND cardinality(weights)=6
   AND array_position(weights,NULL) IS NULL AND 0<=ALL(weights)),
 CHECK(weights[1]::bigint+weights[2]+weights[3]+weights[4]+weights[5]+weights[6]>0),
 CHECK(collection_id IS NULL OR btrim(collection_id)<>'')
);
CREATE TABLE public.box_template_metadata_v1 (
 template_id text PRIMARY KEY REFERENCES public.card_templates(template_id),
 collection_id text NOT NULL CHECK(btrim(collection_id)<>''), collection_name text NOT NULL, element text NOT NULL,
 element_icon text NOT NULL, image text NOT NULL, description text NOT NULL,
 synthesis_cap numeric NOT NULL CHECK(synthesis_cap>=0),
 pool_order integer NOT NULL UNIQUE CHECK(pool_order>0)
);
CREATE TABLE public.card_fragments (
 owner_id text NOT NULL REFERENCES public.profiles(id), template_id text NOT NULL REFERENCES public.card_templates(template_id),
 quantity bigint NOT NULL DEFAULT 0 CHECK(quantity>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,template_id)
);
CREATE TABLE public.box_operations_v1 (
 owner_id text NOT NULL REFERENCES public.profiles(id), request_id text NOT NULL,
 operation text NOT NULL CHECK(operation IN ('PURCHASE','OPEN')), subject text NOT NULL,
 box_id text NOT NULL, result jsonb NOT NULL, request_aliases text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,request_id), UNIQUE(operation,box_id)
);
ALTER TABLE public.box_catalog_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_template_metadata_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_operations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.box_catalog_v1,public.box_template_metadata_v1,public.card_fragments,public.box_operations_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.card_fragments TO authenticated;
-- History UI only needs these columns, with owner-only RLS.
GRANT SELECT(owner_id,request_id,operation,result,created_at) ON public.box_operations_v1 TO authenticated;
DROP POLICY IF EXISTS card_fragments_owner_read ON public.card_fragments;
CREATE POLICY card_fragments_owner_read ON public.card_fragments FOR SELECT TO authenticated USING(owner_id=auth.uid()::text);
DROP POLICY IF EXISTS box_operations_owner_read ON public.box_operations_v1;
CREATE POLICY box_operations_owner_read ON public.box_operations_v1 FOR SELECT TO authenticated USING(owner_id=auth.uid()::text);
INSERT INTO public.box_catalog_v1(box_type,name,price_nex,purchasable,collection_id,weights) VALUES
('RECRUIT','Caixa de Recruta',0,false,NULL,ARRAY[75,25,0,0,0,0]),
('BASIC','Caixa Básica',100,true,NULL,ARRAY[55,30,12,3,0,0]),
('ADVANCED','Caixa Avançada',300,true,NULL,ARRAY[35,30,22,10,3,0]),
('EPIC','Caixa Épica',750,true,NULL,ARRAY[15,20,30,25,9,1]),
('LEGENDARY','Caixa Lendária',2000,true,NULL,ARRAY[5,10,20,30,30,5]),
('GUARDIANS','Caixa dos Quatro Guardiões',500,true,'guardians',ARRAY[0,40,30,20,10,0]),
('COLLECTION_DRAGONS','Caixa Dragões Ancestrais',600,true,'dragons',ARRAY[0,25,30,25,15,5]),
('COLLECTION_KNIGHTS','Caixa Cavaleiros de Eldoria',600,true,'knights',ARRAY[20,30,25,15,8,2]),
('COLLECTION_ABYSS','Caixa Criaturas do Abismo',600,true,'abyss',ARRAY[20,30,25,15,8,2]),
('COLLECTION_MAGES','Caixa Magos Elementais',600,true,'mages',ARRAY[30,30,25,10,5,0]),
('COLLECTION_GODS','Caixa Deuses Antigos',700,true,'gods',ARRAY[0,0,30,45,20,5]),
('COLLECTION_COSMIC','Caixa Entidades Cósmicas',700,true,'cosmic',ARRAY[0,20,30,30,15,5]),
('COLLECTION_HUNTERS','Caixa Caçadores',600,true,'hunters',ARRAY[30,25,25,15,5,0]),
('PREMIUM','Caixa Épica',750,true,NULL,ARRAY[15,20,30,25,9,1]);
INSERT INTO public.box_template_metadata_v1 VALUES
('card-flame-guardian','guardians','Os Quatro Guardiões','fire','🔥','https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&auto=format&fit=crop&q=80','Manifestação viva do fogo primordial que forjou as primeiras defesas cibernéticas da Cidadela.',8000,1),
('card-ice-guardian','guardians','Os Quatro Guardiões','ice','❄️','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','Entidade de zero absoluto que congela o fluxo temporal para preservar relíquias esquecidas.',10000,2),
('card-storm-guardian','guardians','Os Quatro Guardiões','lightning','⚡','https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80','Comandante de relâmpagos quânticos, acelera a sintetização através de pulso iônico concentrado.',15000,3),
('card-abyss-guardian','guardians','Os Quatro Guardiões','abyss','🌑','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','O arauto da matéria escura. Extrai energia diretamente do vácuo quântico em rendimento sem precedentes.',22000,4),
('card-dragon-red','dragons','Dragões Ancestrais','fire','🔥','https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80','Criação vulcânica ancestral cujas escamas emanam calor perpétuo capaz de fundir ligas de titânio.',8000,5),
('card-dragon-frost','dragons','Dragões Ancestrais','ice','❄️','https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&auto=format&fit=crop&q=80','Habitante das fendas criogênicas das cordilheiras de gelo eterno em Neo-Himalaia.',11000,6),
('card-dragon-emerald','dragons','Dragões Ancestrais','nature','🌿','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','Ser protetor dos biomas cibernéticos sintéticos, revitaliza canais de dados corrompidos.',8000,7),
('card-dragon-shadow','dragons','Dragões Ancestrais','dark','🌑','https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80','Camufla-se nas sombras da sub-rede gerando distorções quânticas silenciosas.',12000,8),
('card-dragon-gold','dragons','Dragões Ancestrais','light','✨','https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&auto=format&fit=crop&q=80','Símbolo supremo de prosperidade no império de Eldoria, amplifica o fluxo de tokens NEX.',16000,9),
('card-dragon-astral','dragons','Dragões Ancestrais','astral','🌌','https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop&q=80','Tecido a partir de poeira nebular e frequências cósmicas, viaja além da barreira da realidade.',17000,10),
('card-dragon-volcanic','dragons','Dragões Ancestrais','fire','🌋','https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80','Titã encouraçado nascido do magma central do planeta NEXA-Prime.',24000,11),
('card-dragon-celestial','dragons','Dragões Ancestrais','celestial','⭐','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','O dragão alfa do cosmo, soberano de todas as eras draconianas com capacidade máxima de síntese.',32000,12),
('card-knight-blade','knights','Cavaleiros de Eldoria','light','⚔️','https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80','Soldado de infantaria da guarda de Eldoria, treinado em combates de precisão com sabres laser.',5000,13),
('card-knight-black','knights','Cavaleiros de Eldoria','dark','🛡️','https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80','Sentinela impiedoso que patrulha as muralhas externas envolto em armadura de grafeno negro.',7000,14),
('card-knight-royal','knights','Cavaleiros de Eldoria','light','👑','https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80','Protetor jurado da linhagem imperial, empunha uma espada de plasma dourado.',8000,15),
('card-knight-arcane','knights','Cavaleiros de Eldoria','arcane','🔮','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','Mescla esgrima cibernética com runas arcanas digitais para romper barreiras.',10000,16),
('card-knight-scarlet','knights','Cavaleiros de Eldoria','fire','🩸','https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80','Vanguardista lendário da Ordem da Fênix, imune a pulsos térmicos.',11000,17),
('card-knight-lunar','knights','Cavaleiros de Eldoria','lunar','🌙','https://images.unsplash.com/photo-1532767153582-b1a0e5145009?w=800&auto=format&fit=crop&q=80','Guerreiro silencioso que canaliza a luminosidade das três luas de Eldoria.',15000,18),
('card-knight-imperial','knights','Cavaleiros de Eldoria','light','⚜️','https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80','Supremo marechal do império eldoriano, comanda as legiões de cavaleiros autômatos.',23000,19),
('card-knight-celestial','knights','Cavaleiros de Eldoria','celestial','✨','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','Entidade lendária que descende das estrelas para intervir apenas no colapso de impérios.',31000,20),
('card-abyss-devourer','abyss','Criaturas do Abismo','abyss','👾','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','Monstruosidade voraz que consome dados brutos nas camadas mais profundas da rede.',5000,21),
('card-abyss-colossus','abyss','Criaturas do Abismo','abyss','🗿','https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80','Gigante petrificado de matéria escura que resiste a bombardeios energéticos pesados.',7000,22),
('card-abyss-serpent','abyss','Criaturas do Abismo','dark','🐍','https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80','Criatura serpentina que nada pelos oceanos de óleo criogênico dos reatores abissais.',8000,23),
('card-abyss-demon','abyss','Criaturas do Abismo','void','👁️','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','Entidade consciente que sussurra falhas lógicas nos sistemas operacionais da Cidadela.',11000,24),
('card-abyss-kraken','abyss','Criaturas do Abismo','water','🦑','https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80','Terror oceânico com tentáculos cibernéticos capazes de arrastar naves inteiras para a fossa abissal.',12000,25),
('card-abyss-leviathan','abyss','Criaturas do Abismo','water','🌊','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','O maior predador dos mares sombrios de NEXA, gera maremotos iônicos com sua barbatana colossal.',16000,26),
('card-abyss-hydra','abyss','Criaturas do Abismo','dark','🐉','https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80','Besta de sete cabeças regenerativas forjadas no vácuo radioativo.',24000,27),
('card-abyss-king','abyss','Criaturas do Abismo','abyss','👑','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','O soberano do desconhecido absoluto, domina todos os seres que rastejam na escuridão eterna.',33000,28),
('card-mage-fire','mages','Magos Elementais','fire','🔥','https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&auto=format&fit=crop&q=80','Invocador de tempestades de chamas que alimenta reatores com piromancia digital.',5000,29),
('card-mage-ice','mages','Magos Elementais','ice','❄️','https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&auto=format&fit=crop&q=80','Manipulador de fluxos térmicos negativos, resfria supercomputadores em combate.',5000,30),
('card-mage-earth','mages','Magos Elementais','earth','⛰️','https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80','Ergue barreiras de silício e ferro cristalizado capazes de deter projéteis cinéticos.',7000,31),
('card-mage-wind','mages','Magos Elementais','wind','💨','https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80','Canalizador de tempestades atmosféricas e ventos supersônicos em campos de força.',7000,32),
('card-mage-light','mages','Magos Elementais','light','✨','https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&auto=format&fit=crop&q=80','Emite fótons ultra-concentrados capazes de cegar matrizes de sensores inimigos.',10000,33),
('card-mage-shadow','mages','Magos Elementais','dark','🌑','https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80','Tecelão de ilusões espectrais que dissolve vestígios de transações na rede de Eldoria.',11000,34),
('card-mage-arcane','mages','Magos Elementais','arcane','🔮','https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop&q=80','Mestre supremo das equações secretas que regem o código primordial do universo NEXA.',16000,35),
('card-mage-archmage','mages','Magos Elementais','arcane','⚡','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','O líder do conclave dos magos elementais. Comanda todos os seis elementos em sinergia perfeita.',25000,36),
('card-god-war','gods','Deuses Antigos','fire','⚔️','https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80','Entidade titânica de conflito cujas lâminas energéticas infligem terror em qualquer arena.',11000,37),
('card-god-moon','gods','Deuses Antigos','lunar','🌙','https://images.unsplash.com/photo-1532767153582-b1a0e5145009?w=800&auto=format&fit=crop&q=80','Divindade etérea que vela pelas noites cósmicas, curando guerreiros com névoa estelar.',12000,38),
('card-god-thunder','gods','Deuses Antigos','lightning','⚡','https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80','Comandante dos céus turbulentos, seus relâmpagos reiniciam servidores planetários.',16000,39),
('card-god-sea','gods','Deuses Antigos','water','🌊','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','Senhor dos mares e abismos líquidos, comanda correntes gravitacionais de planetas oceânicos.',16000,40),
('card-god-death','gods','Deuses Antigos','dark','💀','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','O guardião do fim inevitável de processos. Encaminha memórias descartadas para o vácuo.',17000,41),
('card-god-light','gods','Deuses Antigos','light','☀️','https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&auto=format&fit=crop&q=80','A encarnação do amanhecer galáctico, ilumina setores esquecidos com energia radiante pura.',24000,42),
('card-god-chaos','gods','Deuses Antigos','void','🌀','https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop&q=80','Força primordial entrópica que quebra simetrias e engendra novas probabilidades quânticas.',26000,43),
('card-god-supreme','gods','Deuses Antigos','celestial','👑','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','A consciência suprema do cosmos NEXA. Criador da matriz original e guardião de todas as leis.',35000,44),
('card-cosmic-guardian','cosmic','Entidades Cósmicas','cosmic','⭐','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','Patrulheiro de órbitas estelares encarregado de desviar meteoros de cidades satélites.',8000,45),
('card-cosmic-comet','cosmic','Entidades Cósmicas','cosmic','☄️','https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop&q=80','Corpo celeste autoconsciente que cruza constelações semeando elementos raros no espaço.',11000,46),
('card-cosmic-solar','cosmic','Entidades Cósmicas','solar','☀️','https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&auto=format&fit=crop&q=80','Filamento de plasma coronário inteligente que alimenta megassistemas de energia de fusão.',12000,47),
('card-cosmic-lunar','cosmic','Entidades Cósmicas','lunar','🌙','https://images.unsplash.com/photo-1532767153582-b1a0e5145009?w=800&auto=format&fit=crop&q=80','Espírito prateado que harmoniza as marés energéticas das estações espaciais periféricas.',15000,48),
('card-cosmic-devourer','cosmic','Entidades Cósmicas','void','🪐','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','Abominação de massa gravitacional hiperdensa que atrai asteroides para seu núcleo escuro.',17000,49),
('card-cosmic-voidlord','cosmic','Entidades Cósmicas','void','🕳️','https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80','Comandante das regiões de gravidade zero onde a luz e as transmissões não conseguem escapar.',25000,50),
('card-cosmic-being','cosmic','Entidades Cósmicas','cosmic','🌌','https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80','Constelação viva sintetizada a partir de milhões de estrelas mortas.',26000,51),
('card-cosmic-primordial','cosmic','Entidades Cósmicas','celestial','✨','https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop&q=80','A faísca do Big Bang contida em um vaso de cristal cibernético inviolável.',35000,52),
('card-hunter-novice','hunters','Caçadores','nature','🏹','https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80','Rastreador iniciante equipado com arco de pulso eletromagnético e óculos de visão térmica.',5000,53),
('card-hunter-shadow','hunters','Caçadores','dark','🗡️','https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80','Especialista em emboscadas na selva cibernética, usa camuflagem ativa refratária.',5000,54),
('card-hunter-arcane','hunters','Caçadores','arcane','🔮','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','Combina munições impregnadas de éter com rastreamento espectral de relíquias.',7000,55),
('card-hunter-dragonslayer','hunters','Caçadores','fire','🐉','https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80','Veterano couraçado com escamas de dragão rubro, imune a baforadas de plasma de 5000°C.',8000,56),
('card-hunter-lunar','hunters','Caçadores','lunar','🌙','https://images.unsplash.com/photo-1532767153582-b1a0e5145009?w=800&auto=format&fit=crop&q=80','Franco-atirador que opera em condições de gravidade lunar com rifle de disparo táquion.',10000,57),
('card-hunter-royal','hunters','Caçadores','light','👑','https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80','Guardião da fauna nobre dos jardins imperiais de Eldoria, treinado para caçar nobres corrompidos.',11000,58),
('card-hunter-ghost','hunters','Caçadores','void','👻','https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80','Atravessa obstáculos físicos sem deixar assinaturas térmicas, caçando alvos através de paredes.',15000,59),
('card-hunter-master','hunters','Caçadores','nature','🦅','https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80','O lendário líder de todas as guildas de caça de NEXA. Nunca errou um disparo de plasma.',23000,60);


CREATE OR REPLACE FUNCTION public.purchase_box_v2(p_box_type text,p_request_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
 u text:=auth.uid()::text; op public.box_operations_v1; cfg public.box_catalog_v1;
 profile public.profiles; box public.user_boxes; result jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 1 AND 200 OR btrim(p_request_id)<>p_request_id THEN RAISE EXCEPTION 'Invalid request_id'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('nexa:boxes:'||u,0));
 SELECT * INTO op FROM public.box_operations_v1 WHERE owner_id=u AND (request_id=p_request_id OR p_request_id=ANY(request_aliases));
 IF FOUND THEN
  IF op.operation<>'PURCHASE' OR op.subject IS DISTINCT FROM p_box_type THEN RAISE EXCEPTION 'Request reused with different intent'; END IF;
  RETURN op.result;
 END IF;
 SELECT * INTO cfg FROM public.box_catalog_v1 WHERE box_type=p_box_type AND purchasable AND price_nex>0;
 IF NOT FOUND THEN RAISE EXCEPTION 'Box is not purchasable'; END IF;
 SELECT * INTO profile FROM public.profiles WHERE id=u FOR UPDATE;
 IF NOT FOUND OR profile.balance_nex='NaN'::numeric OR profile.balance_nex<cfg.price_nex THEN RAISE EXCEPTION 'Insufficient or invalid balance'; END IF;
 UPDATE public.profiles SET balance_nex=balance_nex-cfg.price_nex,updated_at=now() WHERE id=u RETURNING * INTO profile;
 INSERT INTO public.user_boxes(id,owner_id,box_type,name,source)
 VALUES('box-'||gen_random_uuid()::text,u,cfg.box_type,cfg.name,'SHOP_PURCHASE') RETURNING * INTO box;
 INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
 VALUES('tx-'||gen_random_uuid()::text,u,profile.username,'NEX',-cfg.price_nex,profile.balance_nex,'BOX_PURCHASE',cfg.name,jsonb_build_object('boxId',box.id,'requestId',p_request_id));
 result:=jsonb_build_object('success',true,'box',to_jsonb(box),'new_balance',profile.balance_nex);
 INSERT INTO public.box_operations_v1(owner_id,request_id,operation,subject,box_id,result,created_at) VALUES(u,p_request_id,'PURCHASE',p_box_type,box.id,result,now());
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.open_box_v2(p_box_id text,p_request_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
 u text:=auth.uid()::text; op public.box_operations_v1; cfg public.box_catalog_v1;
 profile public.profiles; box public.user_boxes; tpl public.card_templates; meta public.box_template_metadata_v1;
 card public.user_cards; fragment public.card_fragments; result jsonb; reward jsonb;
 tiers text[]:=ARRAY['Comum','Incomum','Raro','Épico','Lendário','Mítico'];
 r text; roll double precision; acc bigint:=0; total bigint; i integer; qty integer; duplicate boolean;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 1 AND 200 OR btrim(p_request_id)<>p_request_id OR p_box_id IS NULL THEN RAISE EXCEPTION 'Invalid identifiers'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('nexa:boxes:'||u,0));
 SELECT * INTO op FROM public.box_operations_v1 WHERE owner_id=u AND (request_id=p_request_id OR p_request_id=ANY(request_aliases));
 IF FOUND THEN
  IF op.operation<>'OPEN' OR op.subject IS DISTINCT FROM p_box_id THEN RAISE EXCEPTION 'Request reused with different intent'; END IF;
  RETURN op.result;
 END IF;
 SELECT * INTO op FROM public.box_operations_v1 WHERE owner_id=u AND operation='OPEN' AND box_id=p_box_id;
 IF FOUND THEN
  -- Bind alternate retries too: the same request cannot later become a purchase.
  IF cardinality(op.request_aliases)>=20 THEN RAISE EXCEPTION 'Too many distinct retries; reuse the original request'; END IF;
  UPDATE public.box_operations_v1 SET request_aliases=array_append(request_aliases,p_request_id)
   WHERE owner_id=u AND request_id=op.request_id;
  RETURN op.result;
 END IF;
 -- Acquire the profile before the card-table write lock, matching marketplace writes.
 SELECT * INTO profile FROM public.profiles WHERE id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;
 -- Legacy INSERT writers do not share the per-user advisory lock in phase 1.
 -- Keep duplicate detection serialized with those writers. ROW SHARE from synthesis
 -- SELECT FOR UPDATE is compatible; this function does not lock existing card rows.
 LOCK TABLE public.user_cards IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO box FROM public.user_boxes WHERE id=p_box_id AND owner_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Box missing or not owned'; END IF;
 SELECT * INTO cfg FROM public.box_catalog_v1 WHERE box_type=box.box_type;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unrecognized existing box type'; END IF;
 SELECT sum(w) INTO total FROM unnest(cfg.weights) w;
 IF total IS NULL OR total<=0 THEN RAISE EXCEPTION 'Invalid weights'; END IF;
 -- No client input or request-derived seed enters randomness.
 roll:=random()*total;
 FOR i IN REVERSE 6..1 LOOP
  acc:=acc+cfg.weights[i];
  IF roll<=acc AND cfg.weights[i]>0 THEN r:=tiers[i]; EXIT; END IF;
 END LOOP;
 SELECT t.* INTO tpl FROM public.card_templates t
 JOIN public.box_template_metadata_v1 m USING(template_id)
 WHERE t.active AND t.rarity=r AND (cfg.collection_id IS NULL OR m.collection_id=cfg.collection_id)
 ORDER BY random() LIMIT 1;
 -- Stable JS sort breaks distance ties by first occurrence in the original pool.
 -- pool_order records ALL_CARD_TEMPLATES order (collection pools preserve it).
 IF NOT FOUND THEN
  SELECT t.rarity INTO r FROM public.card_templates t
  JOIN public.box_template_metadata_v1 m USING(template_id)
  WHERE t.active AND t.rarity=ANY(tiers)
    AND (cfg.collection_id IS NULL OR m.collection_id=cfg.collection_id)
  GROUP BY t.rarity
  ORDER BY abs(array_position(tiers,t.rarity)-array_position(tiers,r)),min(m.pool_order)
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward pool empty'; END IF;
  SELECT t.* INTO tpl FROM public.card_templates t
  JOIN public.box_template_metadata_v1 m USING(template_id)
  WHERE t.active AND t.rarity=r AND (cfg.collection_id IS NULL OR m.collection_id=cfg.collection_id)
  ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward pool empty'; END IF;
 END IF;
 SELECT * INTO meta FROM public.box_template_metadata_v1 WHERE template_id=tpl.template_id;
 SELECT EXISTS(SELECT 1 FROM public.user_cards WHERE owner_id=u AND template_id=tpl.template_id) INTO duplicate;
 IF duplicate THEN
  qty:=CASE tpl.rarity WHEN 'Comum' THEN 10 WHEN 'Incomum' THEN 15 WHEN 'Raro' THEN 25 WHEN 'Épico' THEN 35 WHEN 'Lendário' THEN 50 WHEN 'Mítico' THEN 75 END;
  IF qty IS NULL THEN RAISE EXCEPTION 'Unknown rarity'; END IF;
  INSERT INTO public.card_fragments(owner_id,template_id,quantity) VALUES(u,tpl.template_id,qty)
  ON CONFLICT(owner_id,template_id) DO UPDATE SET quantity=public.card_fragments.quantity+EXCLUDED.quantity,updated_at=now()
  RETURNING * INTO fragment;
 ELSE
  INSERT INTO public.user_cards(id,owner_id,owner_name,template_id,name,rarity,collection_id,collection_name,element,element_icon,image,description,synthesis_rate,synthesis_cap,market_value,state,card_status,status)
  VALUES('card-'||gen_random_uuid()::text,u,profile.username,tpl.template_id,tpl.name,tpl.rarity,meta.collection_id,meta.collection_name,meta.element,meta.element_icon,meta.image,meta.description,tpl.synthesis_rate,meta.synthesis_cap,tpl.market_value,'FREE','FREE','IDLE')
  RETURNING * INTO card;
 END IF;
 reward:=jsonb_build_object('templateId',tpl.template_id,'name',tpl.name,'rarity',tpl.rarity,'image',meta.image);
 INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
 VALUES('tx-'||gen_random_uuid()::text,u,profile.username,'NEX',0,profile.balance_nex,'BOX_OPEN',cfg.name,
 jsonb_build_object('boxId',box.id,'requestId',p_request_id,'templateId',tpl.template_id,'fragments',COALESCE(qty,0)));
 result:=jsonb_build_object('success',true,'box_id',box.id,'box_type',box.box_type,'box_name',cfg.name,'opened_at',now(),
 'reward',reward,'card',CASE WHEN duplicate THEN NULL ELSE to_jsonb(card) END,
 'fragment',CASE WHEN duplicate THEN to_jsonb(fragment) ELSE NULL END,'fragments_awarded',COALESCE(qty,0));
 INSERT INTO public.box_operations_v1(owner_id,request_id,operation,subject,box_id,result,created_at) VALUES(u,p_request_id,'OPEN',box.id,box.id,result,now());
 DELETE FROM public.user_boxes WHERE id=box.id AND owner_id=u;
 RETURN result;
END $$;
REVOKE EXECUTE ON FUNCTION public.purchase_box_v2(text,text),public.open_box_v2(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.purchase_box_v2(text,text),public.open_box_v2(text,text) TO authenticated;
-- Phase 1 is additive: legacy RPC definitions, grants and user_cards protections
-- remain unchanged. Legacy risks are accepted temporarily for compatibility.
-- Apply phase 2 separately only after v2 production validation and client retirement.
