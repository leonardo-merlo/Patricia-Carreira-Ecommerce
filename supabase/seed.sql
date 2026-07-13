-- Seed: Products and Product Variants
-- UUIDs follow the same pattern as lib/mock-data.ts:
--   uuid(n) = '00000000-0000-0000-0000-{n zero-padded to 12 digits}'

-- ─── BOLSAS ──────────────────────────────────────────────────────────────────

INSERT INTO public.products (id, name, slug, description, category, subcategory, base_price, wholesale_price, is_active, images, weight_grams, length_cm, width_cm, height_cm, measurements, created_at)
VALUES

('00000000-0000-0000-0000-000000000101', 'Bolsa Briana', 'bolsa-briana',
 'A Bolsa Briana combina praticidade e elegância. Feita de lona com detalhes e alça em couro legítimo, destaca-se pela durabilidade e sofisticação. Design tiracolo com alça ajustável, permite que seja usada de diferentes formas. Compacta, mas surpreendentemente espaçosa, com bolsos interno e externo.',
 'bolsas', NULL, 479, 287, true,
 ARRAY['/images/refs3/bolsa-briana.jpeg','/images/products/imagens/bolsa_briana_azul_turquesa_0.jpeg','/images/products/imagens/bolsa_briana_mostarda_0.jpeg','/images/products/imagens/bolsa_briana_vinho_0.jpeg'],
 420, 26, 8, 20, NULL, now() - interval '20 days'),

('00000000-0000-0000-0000-000000000102', 'Bolsa Flora', 'bolsa-flora',
 'A Bolsa Flora combina a rusticidade da lona com a elegância do couro. Alças resistentes em couro legítimo e bordado delicado que a torna única. Interior forrado com bolso externo e três bolsos internos, sendo um com zíper. Une charme e funcionalidade em design exclusivo.',
 'bolsas', NULL, 599, 359, false,
 ARRAY['/images/products/imagens/bolsa_flora_cáqui_0.jpeg','/images/products/imagens/bolsa_flora_marinho_0.jpeg','/images/products/imagens/bolsa_flora_mostarda_0.jpeg'],
 520, 30, 10, 24, NULL, now() - interval '15 days'),

('00000000-0000-0000-0000-000000000103', 'Bolsa Liberty', 'bolsa-liberty',
 'A Bolsa Liberty combina praticidade, durabilidade e estilo. Feita de lona com detalhes em couro legítimo, possui alça ajustável que permite diferentes formas de uso. Formato amplo e estruturado com aplicações de couro e bordados geométricos. Paleta de cores harmoniosa que reflete elegância e exclusividade.',
 'bolsas', NULL, 579, 347, true,
 ARRAY['/images/products/imagens/bolsa_liberty__0.jpeg','/images/products/imagens/bolsa_liberty__0.png'],
 550, 34, 12, 26, NULL, now() - interval '25 days'),

('00000000-0000-0000-0000-000000000104', 'Bolsa Lyra', 'bolsa-lyra',
 'A Bolsa Lyra é a combinação perfeita de amplitude e leveza. Projetada para quem precisa de espaço sem abrir mão do estilo, ela proporciona conforto ao carregá-la mesmo quando cheia. Bolso interno para organizar itens essenciais com facilidade. Bordados delicados e coloridos com aplicações em couro.',
 'bolsas', NULL, 469, 281, false,
 ARRAY['/images/products/imagens/bolsa_lyra_cáqui_0.jpeg','/images/products/imagens/bolsa_lyra_marinho_0.jpeg','/images/products/imagens/bolsa_lyra_mostarda_0.jpeg'],
 460, 36, 10, 28, NULL, now() - interval '30 days'),

('00000000-0000-0000-0000-000000000105', 'Bolsa Mandala', 'bolsa-mandala',
 'A Bolsa Mandala é perfeita para quem busca estilo e versatilidade em um único acessório. Grande e espaçosa, ideal tanto para o dia a dia quanto para pequenas viagens. Confeccionada em lona com detalhes em couro. O delicado bordado confere exclusividade, enquanto o bolso externo e os bolsos internos garantem praticidade.',
 'bolsas', NULL, 629, 377, true,
 ARRAY['/images/products/imagens/bolsa_mandala_verde_musgo_0.jpeg','/images/products/imagens/bolsa_mandala_marinho_0.jpeg','/images/products/imagens/bolsa_mandala_vinho_0.jpeg'],
 600, 38, 14, 30, NULL, now() - interval '18 days'),

('00000000-0000-0000-0000-000000000106', 'Bolsa Nirvana', 'bolsa-nirvana',
 'A Bolsa Nirvana é uma celebração de estilo e versatilidade. Bolsos estrategicamente posicionados interna e externamente garantem praticidade e organização. Seu destaque está no belíssimo bordado frontal, que combina cores vibrantes e formas harmônicas. Personalidade única que reflete autenticidade e sofisticação.',
 'bolsas', NULL, 569, 341, true,
 ARRAY['/images/refs3/bolsa-nirvana.jpeg','/images/products/imagens/bolsa_nirvana_azul_turquesa_0.jpeg','/images/products/imagens/bolsa_nirvana_marinho_0.jpeg','/images/products/imagens/bolsa_nirvana_mostarda_0.jpeg'],
 490, 30, 10, 22, NULL, now() - interval '10 days'),

('00000000-0000-0000-0000-000000000107', 'Bolsa Romana', 'bolsa-romana',
 'A Bolsa Romana é a combinação ideal de charme e praticidade. Confeccionada em lona com detalhes em couro legítimo, seu bordado dá vida a desenhos que encantam pelo cuidado e expressão artística. Fechamento com mosquetões internos e ímã. Alça com regulagem e bolso interno.',
 'bolsas', NULL, 469, 281, true,
 ARRAY['/images/refs3/bolsa-romana.jpeg','/images/products/imagens/produto_pagina_37_romana_0.jpeg'],
 430, 28, 9, 22, NULL, now() - interval '40 days'),

('00000000-0000-0000-0000-000000000108', 'Bolsa Sempre à Mão', 'bolsa-sempre-a-mao',
 'A Bolsa Sempre à Mão é a companheira ideal para o cotidiano. Confeccionada em lona com detalhes em couro legítimo bordado. Fecho seguro com mosquetões internos e ímã. Alças reguláveis e bolsos organizadores internos para manter seus itens sempre acessíveis.',
 'bolsas', NULL, 499, 299, false,
 ARRAY['/images/products/imagens/produto_pagina_38_sempre_à_mão_0.png','/images/products/imagens/produto_pagina_38_sempre_à_mão_1.jpeg'],
 580, 32, 12, 26, NULL, now() - interval '35 days'),

('00000000-0000-0000-0000-000000000109', 'Mochila Wood Stock', 'mochila-wood-stock',
 'A Mochila Wood Stock traz o equilíbrio perfeito entre charme artesanal e praticidade. Confeccionada em lona com detalhes em couro legítimo bordado. Fecho de mosquetões internos e ímã, alças reguláveis confortáveis. Interior com bolsos organizadores.',
 'bolsas', NULL, 499, 299, true,
 ARRAY['/images/products/imagens/produto_pagina_39_wood_stock_0.jpeg','/images/products/imagens/produto_pagina_40_wood_stock_0.jpeg'],
 620, 30, 14, 38, NULL, now() - interval '45 days'),

('00000000-0000-0000-0000-000000000110', 'Pochete', 'pochete',
 'A pochete é confeccionada em lona com acabamentos em couro legítimo. Conta com quatro bolsos práticos facilitando a organização de itens essenciais. Alça ajustável permite que seja usada como pochete ou bolsa tiracolo. Funcionalidade e estilo em um design exclusivo.',
 'bolsas', NULL, 399, 239, true,
 ARRAY['/images/refs3/pochetes.jpeg','/images/products/imagens/produto_pagina_41_pochete_0.jpeg','/images/products/imagens/produto_pagina_42_pochete_0.jpeg','/images/products/imagens/produto_pagina_43_pochete_0.jpeg'],
 280, 22, 6, 16, NULL, now() - interval '50 days'),

('00000000-0000-0000-0000-000000000111', 'Bolsa Maia', 'bolsa-maia',
 'A Bolsa Maia é uma peça atemporal que une beleza artesanal e funcionalidade. Confeccionada em lona com detalhes em couro legítimo e bordado delicado, é a escolha perfeita para o dia a dia. Alça ajustável, bolso interno e externo — tudo pensado para quem não abre mão de estilo.',
 'bolsas', NULL, 519, 311, true,
 ARRAY['/images/refs3/bolsa-maya..jpeg','/images/refs3/bolsa-maya2.jpeg','/images/refs3/bolsa-maya3.jpeg','/images/refs3/bolsa-maya4.jpeg','/images/refs3/bolsa-maya5.jpeg'],
 440, 28, 9, 21, NULL, now() - interval '3 days')

ON CONFLICT (id) DO NOTHING;

-- ─── VESTIDOS ─────────────────────────────────────────────────────────────────

INSERT INTO public.products (id, name, slug, description, category, subcategory, base_price, wholesale_price, is_active, images, weight_grams, length_cm, width_cm, height_cm, measurements, created_at)
VALUES

('00000000-0000-0000-0000-000000000201', 'Vestido Havana', 'vestido-havana',
 'Vestido midi em algodão com bordado artesanal e estampas exclusivas inspiradas na vibrante cultura caribenha. Caimento fluido e versátil, perfeito para o dia a dia ou ocasiões especiais. Disponível em três estampas distintas.',
 'roupas', 'vestidos', 549, 329, true,
 ARRAY['/images/products/imagens/produto_pagina_45_vestido_havana_0.jpeg','/images/products/imagens/produto_pagina_46_vestido_havana_0.jpeg','/images/products/imagens/produto_pagina_47_vestido_havana_0.jpeg'],
 320, 35, 5, 30,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 108cm","M":"Busto 90cm · Cintura 70cm · Comprimento 109cm","G":"Busto 96cm · Cintura 76cm · Comprimento 110cm"}'::jsonb,
 now() - interval '20 days'),

('00000000-0000-0000-0000-000000000202', 'Vestido Dani', 'vestido-dani',
 'Vestido leve e despojado com bordado floral delicado. Silhueta feminina e moderna, ideal para o verão. Tecido suave que acompanha cada movimento com leveza e elegância.',
 'roupas', 'vestidos', 419, 251, true,
 ARRAY['/images/products/imagens/produto_pagina_48_vestido_dani_0.jpeg','/images/products/imagens/produto_pagina_49_vestido_dani_0.jpeg','/images/products/imagens/produto_pagina_50_vestido_dani_0.jpeg'],
 280, 32, 5, 28,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 100cm","M":"Busto 90cm · Cintura 70cm · Comprimento 101cm","G":"Busto 96cm · Cintura 76cm · Comprimento 102cm"}'::jsonb,
 now() - interval '25 days'),

('00000000-0000-0000-0000-000000000203', 'Vestido Fiji', 'vestido-fiji',
 'Vestido em linho lavado com bordado artesanal que remete às paisagens tropicais do Pacífico. Silhueta ampla e confortável, perfeito para o calor. Disponível em seis estampas distintas.',
 'roupas', 'vestidos', 529, 317, true,
 ARRAY['/images/products/imagens/produto_pagina_57_vestido_fiji_0.jpeg','/images/products/imagens/produto_pagina_58_vestido_fiji_0.jpeg','/images/products/imagens/produto_pagina_59_vestido_fiji_0.jpeg'],
 300, 34, 5, 30,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 105cm","M":"Busto 90cm · Cintura 70cm · Comprimento 106cm","G":"Busto 96cm · Cintura 76cm · Comprimento 107cm"}'::jsonb,
 now() - interval '18 days'),

('00000000-0000-0000-0000-000000000204', 'Vestido Mônaco', 'vestido-monaco',
 'Vestido evasê em algodão com bordado artesanal refinado. Elegante e versátil, combina com sandálias rasteiras na praia ou salto para uma ocasião especial.',
 'roupas', 'vestidos', 469, 281, false,
 ARRAY['/images/products/imagens/produto_pagina_63_vestido_mônaco_0.jpeg','/images/products/imagens/produto_pagina_64_vestido_mônaco_0.jpeg'],
 290, 33, 5, 28,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 102cm","M":"Busto 90cm · Cintura 70cm · Comprimento 103cm","G":"Busto 96cm · Cintura 76cm · Comprimento 104cm"}'::jsonb,
 now() - interval '22 days'),

('00000000-0000-0000-0000-000000000205', 'Vestido Verona', 'vestido-verona',
 'Vestido midi em linho natural com bordado geométrico exclusivo. Corte estruturado que valoriza a silhueta com sofisticação e autenticidade artesanal.',
 'roupas', 'vestidos', 479, 287, true,
 ARRAY['/images/products/imagens/produto_pagina_65_vestido_verona_0.jpeg','/images/products/imagens/produto_pagina_65_vestido_verona_1.jpeg'],
 310, 35, 5, 30,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 110cm","M":"Busto 90cm · Cintura 70cm · Comprimento 111cm","G":"Busto 96cm · Cintura 76cm · Comprimento 112cm"}'::jsonb,
 now() - interval '30 days'),

('00000000-0000-0000-0000-000000000206', 'Vestido Maia', 'vestido-maia',
 'Vestido curto e alegre com bordado artesanal inspirado na exuberância da natureza brasileira. Leveza e frescor para o dia a dia, perfeito para o verão.',
 'roupas', 'vestidos', 389, 233, true,
 ARRAY['/images/products/imagens/produto_pagina_66_vestido_maia_0.jpeg','/images/products/imagens/produto_pagina_67_vestido_maia_0.jpeg'],
 260, 30, 5, 25,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 92cm","M":"Busto 90cm · Cintura 70cm · Comprimento 93cm","G":"Busto 96cm · Cintura 76cm · Comprimento 94cm"}'::jsonb,
 now() - interval '15 days'),

('00000000-0000-0000-0000-000000000207', 'Vestido Viena', 'vestido-viena',
 'Vestido longo em algodão com rendas artesanais e bordado delicado. Elegância clássica com toque contemporâneo. Perfeito para eventos ao ar livre e celebrações.',
 'roupas', 'vestidos', 479, 287, true,
 ARRAY['/images/products/imagens/produto_pagina_68_vestido_viena_0.jpeg','/images/products/imagens/produto_pagina_69_vestido_viena_0.jpeg','/images/products/imagens/produto_pagina_70_vestido_viena_0.jpeg'],
 380, 40, 5, 36,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 138cm","M":"Busto 90cm · Cintura 70cm · Comprimento 139cm","G":"Busto 96cm · Cintura 76cm · Comprimento 140cm"}'::jsonb,
 now() - interval '28 days'),

('00000000-0000-0000-0000-000000000208', 'Vestido Cancún', 'vestido-cancun',
 'Vestido de praia em tecido levíssimo com bordado colorido e alegre. Espírito tropical e descontraído, ideal para passeios à beira-mar e tardes ensolaradas.',
 'roupas', 'vestidos', 489, 293, false,
 ARRAY['/images/products/imagens/produto_pagina_72_vestido_cancún_0.jpeg','/images/products/imagens/produto_pagina_73_vestido_cancún_0.jpeg','/images/products/imagens/produto_pagina_74_vestido_cancún_0.jpeg'],
 270, 32, 5, 28,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 106cm","M":"Busto 90cm · Cintura 70cm · Comprimento 107cm","G":"Busto 96cm · Cintura 76cm · Comprimento 108cm"}'::jsonb,
 now() - interval '12 days'),

('00000000-0000-0000-0000-000000000209', 'Vestido Inca', 'vestido-inca',
 'Vestido midi com bordado geométrico inspirado na rica arte pré-colombiana. Cores terrosas e formas simbólicas que contam histórias. Uma peça autêntica e cultural.',
 'roupas', 'vestidos', 399, 239, true,
 ARRAY['/images/products/imagens/produto_pagina_75_vestido_inca_0.jpeg','/images/products/imagens/produto_pagina_76_vestido_inca_0.jpeg'],
 300, 34, 5, 30,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 108cm","M":"Busto 90cm · Cintura 70cm · Comprimento 109cm","G":"Busto 96cm · Cintura 76cm · Comprimento 110cm"}'::jsonb,
 now() - interval '35 days'),

('00000000-0000-0000-0000-000000000210', 'Vestido Bali', 'vestido-bali',
 'Vestido inspirado nas estampas e bordados da ilha de Bali. Tecido leve com detalhes manuais que capturam a essência do artesanato balinês. Livre, feminino e cheio de personalidade.',
 'roupas', 'vestidos', 499, 299, true,
 ARRAY['/images/products/imagens/produto_pagina_77_vestido_bali_0.jpeg','/images/products/imagens/produto_pagina_78_vestido_bali_0.jpeg'],
 310, 34, 5, 30,
 '{"P":"Busto 86cm · Cintura 66cm · Comprimento 106cm","M":"Busto 90cm · Cintura 70cm · Comprimento 107cm","G":"Busto 96cm · Cintura 76cm · Comprimento 108cm"}'::jsonb,
 now() - interval '8 days')

ON CONFLICT (id) DO NOTHING;

-- ─── BATAS ────────────────────────────────────────────────────────────────────

INSERT INTO public.products (id, name, slug, description, category, subcategory, base_price, wholesale_price, is_active, images, weight_grams, length_cm, width_cm, height_cm, measurements, created_at)
VALUES

('00000000-0000-0000-0000-000000000301', 'Bata Asteca', 'bata-asteca',
 'Bata ampla em linho natural com bordado geométrico inspirado na arte asteca. Corte reto e tamanho único generoso. Cada peça carrega a riqueza de uma cultura milenar.',
 'roupas', 'batas', 279, 167, true,
 ARRAY['/images/products/imagens/produto_pagina_79_bata_asteca_0.jpeg','/images/products/imagens/produto_pagina_80_bata_asteca_0.jpeg'],
 260, 32, 4, 26,
 '{"Único":"Busto até 106cm · Comprimento 72cm"}'::jsonb,
 now() - interval '30 days'),

('00000000-0000-0000-0000-000000000302', 'Bata Yoko', 'bata-yoko',
 'Bata em algodão com bordado artesanal de motivos orientais. Corte reto e fluido que traz conforto e estilo ao mesmo tempo. Versátil para diferentes ocasiões.',
 'roupas', 'batas', 369, 221, true,
 ARRAY['/images/products/imagens/produto_pagina_81_bata_yoko_0.jpeg','/images/products/imagens/produto_pagina_82_bata_yoko_0.jpeg'],
 280, 33, 4, 28,
 '{"Único":"Busto até 106cm · Comprimento 74cm"}'::jsonb,
 now() - interval '22 days'),

('00000000-0000-0000-0000-000000000303', 'Bata Maia', 'bata-maia',
 'Bata em voile de algodão com bordado floral manual delicado. Levíssima e translúcida, ideal para o calor. Cada bordado é único, feito à mão com carinho.',
 'roupas', 'batas', 289, 173, true,
 ARRAY['/images/products/imagens/produto_pagina_83_bata_maia_0.jpeg','/images/products/imagens/produto_pagina_84_bata_maia_0.jpeg','/images/products/imagens/produto_pagina_85_bata_maia_0.png'],
 200, 30, 3, 24,
 '{"Único":"Busto até 106cm · Comprimento 70cm"}'::jsonb,
 now() - interval '18 days'),

('00000000-0000-0000-0000-000000000304', 'Bata Heló', 'bata-helo',
 'Bata em linho lavado com acabamento em crochê artesanal nas bordas. Elegância natural que combina tradição e modernidade. Perfeita como saída de praia ou look casual.',
 'roupas', 'batas', 359, 215, false,
 ARRAY['/images/products/imagens/produto_pagina_89_bata_helô_0.jpeg','/images/products/imagens/produto_pagina_90_bata_helô_0.jpeg','/images/products/imagens/produto_pagina_91_bata_helô_0.jpeg'],
 240, 31, 4, 26,
 '{"Único":"Busto até 106cm · Comprimento 72cm"}'::jsonb,
 now() - interval '14 days'),

('00000000-0000-0000-0000-000000000305', 'Bata Inca', 'bata-inca',
 'Bata com bordado geométrico em cores terrosas, inspirado na arte pré-colombiana. Peça de identidade cultural forte, feita para mulheres que valorizam história e autenticidade.',
 'roupas', 'batas', 289, 173, true,
 ARRAY['/images/products/imagens/produto_pagina_92_bata_inca_0.jpeg','/images/products/imagens/produto_pagina_93_bata_inca_0.jpeg'],
 260, 32, 4, 26,
 '{"Único":"Busto até 106cm · Comprimento 72cm"}'::jsonb,
 now() - interval '35 days'),

('00000000-0000-0000-0000-000000000306', 'Bata Malu', 'bata-malu',
 'Bata em algodão cru com aplicações bordadas em ponto cheio. Design atemporal que nunca sai de moda. Versátil e confortável para o dia a dia.',
 'roupas', 'batas', 279, 167, true,
 ARRAY['/images/products/imagens/produto_pagina_94_bata_malu_0.jpeg','/images/products/imagens/produto_pagina_95_bata_malu_0.jpeg'],
 250, 31, 4, 25,
 '{"Único":"Busto até 106cm · Comprimento 70cm"}'::jsonb,
 now() - interval '40 days'),

('00000000-0000-0000-0000-000000000307', 'Bata Jú', 'bata-ju',
 'Bata em linho com bordado botânico delicado. Frescor e leveza em uma peça que funciona tanto como saída de praia quanto em look casual urbano.',
 'roupas', 'batas', 289, 173, false,
 ARRAY['/images/products/imagens/produto_pagina_96_bata_jú_0.jpeg','/images/products/imagens/produto_pagina_97_bata_jú_0.jpeg'],
 220, 30, 4, 24,
 '{"Único":"Busto até 106cm · Comprimento 70cm"}'::jsonb,
 now() - interval '25 days'),

('00000000-0000-0000-0000-000000000308', 'Bata Sino', 'bata-sino',
 'Bata com manga sino em algodão leve e bordado artesanal nas mangas. Elegante e feminina, ideal para valorizar o movimento dos braços. Uma peça especial para ocasiões que merecem destaque.',
 'roupas', 'batas', 339, 203, true,
 ARRAY['/images/products/imagens/produto_pagina_98_bata_sino_0.jpeg','/images/products/imagens/produto_pagina_98_bata_sino_1.jpeg'],
 240, 32, 4, 26,
 '{"Único":"Busto até 106cm · Comprimento 72cm"}'::jsonb,
 now() - interval '10 days'),

('00000000-0000-0000-0000-000000000309', 'Bata Bia', 'bata-bia',
 'Bata em algodão artesanal com bordado colorido e alegre. Um toque de alegria e autenticidade para o look do dia. Leve, confortável e com personalidade marcante.',
 'roupas', 'batas', 329, 197, true,
 ARRAY['/images/products/imagens/produto_pagina_99_bata_bia_0.jpeg','/images/products/imagens/produto_pagina_100_bata_bia_0.jpeg'],
 250, 31, 4, 26,
 '{"Único":"Busto até 106cm · Comprimento 72cm"}'::jsonb,
 now() - interval '6 days')

ON CONFLICT (id) DO NOTHING;

-- ─── BAZAR ────────────────────────────────────────────────────────────────────

INSERT INTO public.products (id, name, slug, description, category, subcategory, base_price, wholesale_price, is_active, images, weight_grams, length_cm, width_cm, height_cm, measurements, created_at)
VALUES

('00000000-0000-0000-0000-000000000350', 'Bata Especial I', 'bazar-bata-especial-i',
 'Peça de coleção anterior com bordado artesanal exclusivo. Oportunidade única de adquirir uma peça Patrícia Carreira com preço especial. Quantidade limitada.',
 'bazar', NULL, 189, NULL, true,
 ARRAY['/images/products/imagens/produto_pagina_86__0.jpeg','/images/products/imagens/produto_pagina_86__1.png'],
 240, 32, 4, 26,
 '{"Único":"Busto até 106cm · Comprimento 72cm"}'::jsonb,
 now() - interval '5 days'),

('00000000-0000-0000-0000-000000000351', 'Bata Especial II', 'bazar-bata-especial-ii',
 'Bata artesanal de coleção anterior com bordado manual. Peça única com desconto especial — quando acabar, não repõe.',
 'bazar', NULL, 169, NULL, true,
 ARRAY['/images/products/imagens/produto_pagina_87__0.png','/images/products/imagens/produto_pagina_87__1.jpeg'],
 220, 30, 4, 24,
 '{"Único":"Busto até 106cm · Comprimento 70cm"}'::jsonb,
 now() - interval '5 days'),

('00000000-0000-0000-0000-000000000352', 'Bata Especial III', 'bazar-bata-especial-iii',
 'Bata artesanal de edição limitada com bordado exclusivo. Peça do bazar com preço especial — quantidade limitadíssima.',
 'bazar', NULL, 179, NULL, true,
 ARRAY['/images/products/imagens/produto_pagina_88__0.jpeg','/images/products/imagens/produto_pagina_88__1.jpeg'],
 230, 31, 4, 25,
 '{"Único":"Busto até 106cm · Comprimento 70cm"}'::jsonb,
 now() - interval '5 days')

ON CONFLICT (id) DO NOTHING;

-- ─── VARIANTES — BOLSAS ───────────────────────────────────────────────────────

INSERT INTO public.product_variants (id, product_id, sku, size, color, stock_quantity, created_at)
VALUES
-- Briana
('00000000-0000-0000-0000-000000001001','00000000-0000-0000-0000-000000000101','BOL-BRIA-TURQ-UNICO','Único','Azul Turquesa',4,now() - interval '20 days'),
('00000000-0000-0000-0000-000000001002','00000000-0000-0000-0000-000000000101','BOL-BRIA-CAQUI-UNICO','Único','Cáqui',5,now() - interval '20 days'),
('00000000-0000-0000-0000-000000001003','00000000-0000-0000-0000-000000000101','BOL-BRIA-LAR-UNICO','Único','Laranja',3,now() - interval '20 days'),
('00000000-0000-0000-0000-000000001004','00000000-0000-0000-0000-000000000101','BOL-BRIA-MAR-UNICO','Único','Marinho',6,now() - interval '20 days'),
('00000000-0000-0000-0000-000000001005','00000000-0000-0000-0000-000000000101','BOL-BRIA-MOS-UNICO','Único','Mostarda',4,now() - interval '20 days'),
('00000000-0000-0000-0000-000000001006','00000000-0000-0000-0000-000000000101','BOL-BRIA-VMUS-UNICO','Único','Verde Musgo',3,now() - interval '20 days'),
('00000000-0000-0000-0000-000000001007','00000000-0000-0000-0000-000000000101','BOL-BRIA-VERM-UNICO','Único','Vermelha',2,now() - interval '20 days'),
('00000000-0000-0000-0000-000000001008','00000000-0000-0000-0000-000000000101','BOL-BRIA-VINH-UNICO','Único','Vinho',5,now() - interval '20 days'),
-- Flora
('00000000-0000-0000-0000-000000001011','00000000-0000-0000-0000-000000000102','BOL-FLOR-TURQ-UNICO','Único','Azul Turquesa',3,now() - interval '15 days'),
('00000000-0000-0000-0000-000000001012','00000000-0000-0000-0000-000000000102','BOL-FLOR-CAQUI-UNICO','Único','Cáqui',5,now() - interval '15 days'),
('00000000-0000-0000-0000-000000001013','00000000-0000-0000-0000-000000000102','BOL-FLOR-LAR-UNICO','Único','Laranja',2,now() - interval '15 days'),
('00000000-0000-0000-0000-000000001014','00000000-0000-0000-0000-000000000102','BOL-FLOR-MAR-UNICO','Único','Marinho',4,now() - interval '15 days'),
('00000000-0000-0000-0000-000000001015','00000000-0000-0000-0000-000000000102','BOL-FLOR-MOS-UNICO','Único','Mostarda',6,now() - interval '15 days'),
('00000000-0000-0000-0000-000000001016','00000000-0000-0000-0000-000000000102','BOL-FLOR-VMUS-UNICO','Único','Verde Musgo',3,now() - interval '15 days'),
('00000000-0000-0000-0000-000000001017','00000000-0000-0000-0000-000000000102','BOL-FLOR-VINH-UNICO','Único','Vinho',4,now() - interval '15 days'),
-- Liberty
('00000000-0000-0000-0000-000000001021','00000000-0000-0000-0000-000000000103','BOL-LIB-NAT-UNICO','Único','Natural',3,now() - interval '25 days'),
-- Lyra
('00000000-0000-0000-0000-000000001031','00000000-0000-0000-0000-000000000104','BOL-LYRA-CAQUI-UNICO','Único','Cáqui',4,now() - interval '30 days'),
('00000000-0000-0000-0000-000000001032','00000000-0000-0000-0000-000000000104','BOL-LYRA-MAR-UNICO','Único','Marinho',3,now() - interval '30 days'),
('00000000-0000-0000-0000-000000001033','00000000-0000-0000-0000-000000000104','BOL-LYRA-MOS-UNICO','Único','Mostarda',5,now() - interval '30 days'),
('00000000-0000-0000-0000-000000001034','00000000-0000-0000-0000-000000000104','BOL-LYRA-VMUS-UNICO','Único','Verde Musgo',2,now() - interval '30 days'),
('00000000-0000-0000-0000-000000001035','00000000-0000-0000-0000-000000000104','BOL-LYRA-VERM-UNICO','Único','Vermelho',3,now() - interval '30 days'),
-- Mandala
('00000000-0000-0000-0000-000000001041','00000000-0000-0000-0000-000000000105','BOL-MAND-CAQUI-UNICO','Único','Cáqui',3,now() - interval '18 days'),
('00000000-0000-0000-0000-000000001042','00000000-0000-0000-0000-000000000105','BOL-MAND-MAR-UNICO','Único','Marinho',4,now() - interval '18 days'),
('00000000-0000-0000-0000-000000001043','00000000-0000-0000-0000-000000000105','BOL-MAND-MOS-UNICO','Único','Mostarda',2,now() - interval '18 days'),
('00000000-0000-0000-0000-000000001044','00000000-0000-0000-0000-000000000105','BOL-MAND-VMUS-UNICO','Único','Verde Musgo',5,now() - interval '18 days'),
('00000000-0000-0000-0000-000000001045','00000000-0000-0000-0000-000000000105','BOL-MAND-VINH-UNICO','Único','Vinho',3,now() - interval '18 days'),
-- Nirvana
('00000000-0000-0000-0000-000000001051','00000000-0000-0000-0000-000000000106','BOL-NIRV-TURQ-UNICO','Único','Azul Turquesa',3,now() - interval '10 days'),
('00000000-0000-0000-0000-000000001052','00000000-0000-0000-0000-000000000106','BOL-NIRV-CAQUI-UNICO','Único','Cáqui',4,now() - interval '10 days'),
('00000000-0000-0000-0000-000000001053','00000000-0000-0000-0000-000000000106','BOL-NIRV-MAR-UNICO','Único','Marinho',2,now() - interval '10 days'),
('00000000-0000-0000-0000-000000001054','00000000-0000-0000-0000-000000000106','BOL-NIRV-MOS-UNICO','Único','Mostarda',5,now() - interval '10 days'),
('00000000-0000-0000-0000-000000001055','00000000-0000-0000-0000-000000000106','BOL-NIRV-VMUS-UNICO','Único','Verde Musgo',3,now() - interval '10 days'),
-- Romana
('00000000-0000-0000-0000-000000001061','00000000-0000-0000-0000-000000000107','BOL-ROMA-NAT-UNICO','Único','Natural',0,now() - interval '40 days'),
-- Sempre à Mão
('00000000-0000-0000-0000-000000001071','00000000-0000-0000-0000-000000000108','BOL-SEMP-NAT-UNICO','Único','Natural',2,now() - interval '35 days'),
-- Mochila Wood Stock
('00000000-0000-0000-0000-000000001081','00000000-0000-0000-0000-000000000109','MOC-WOOD-V1-UNICO','Único','Variante 1',3,now() - interval '45 days'),
('00000000-0000-0000-0000-000000001082','00000000-0000-0000-0000-000000000109','MOC-WOOD-V2-UNICO','Único','Variante 2',2,now() - interval '45 days'),
-- Pochete
('00000000-0000-0000-0000-000000001091','00000000-0000-0000-0000-000000000110','POCH-V1-UNICO','Único','Variante 1',4,now() - interval '50 days'),
('00000000-0000-0000-0000-000000001092','00000000-0000-0000-0000-000000000110','POCH-V2-UNICO','Único','Variante 2',3,now() - interval '50 days'),
('00000000-0000-0000-0000-000000001093','00000000-0000-0000-0000-000000000110','POCH-V3-UNICO','Único','Variante 3',5,now() - interval '50 days'),
('00000000-0000-0000-0000-000000001094','00000000-0000-0000-0000-000000000110','POCH-V4-UNICO','Único','Variante 4',2,now() - interval '50 days'),
-- Bolsa Maia
('00000000-0000-0000-0000-000000001101','00000000-0000-0000-0000-000000000111','BOL-MAIA-V1-UNICO','Único','Variante 1',5,now() - interval '3 days'),
('00000000-0000-0000-0000-000000001102','00000000-0000-0000-0000-000000000111','BOL-MAIA-V2-UNICO','Único','Variante 2',4,now() - interval '3 days'),
('00000000-0000-0000-0000-000000001103','00000000-0000-0000-0000-000000000111','BOL-MAIA-V3-UNICO','Único','Variante 3',3,now() - interval '3 days')

ON CONFLICT (sku) DO NOTHING;

-- ─── VARIANTES — VESTIDOS ─────────────────────────────────────────────────────

INSERT INTO public.product_variants (id, product_id, sku, size, color, stock_quantity, created_at)
VALUES
-- Havana
('00000000-0000-0000-0000-000000002001','00000000-0000-0000-0000-000000000201','VES-HAVA-P','P',NULL,3,now() - interval '20 days'),
('00000000-0000-0000-0000-000000002002','00000000-0000-0000-0000-000000000201','VES-HAVA-M','M',NULL,5,now() - interval '20 days'),
('00000000-0000-0000-0000-000000002003','00000000-0000-0000-0000-000000000201','VES-HAVA-G','G',NULL,2,now() - interval '20 days'),
-- Dani
('00000000-0000-0000-0000-000000002011','00000000-0000-0000-0000-000000000202','VES-DANI-P','P',NULL,4,now() - interval '25 days'),
('00000000-0000-0000-0000-000000002012','00000000-0000-0000-0000-000000000202','VES-DANI-M','M',NULL,6,now() - interval '25 days'),
('00000000-0000-0000-0000-000000002013','00000000-0000-0000-0000-000000000202','VES-DANI-G','G',NULL,3,now() - interval '25 days'),
-- Fiji
('00000000-0000-0000-0000-000000002021','00000000-0000-0000-0000-000000000203','VES-FIJI-P','P',NULL,3,now() - interval '18 days'),
('00000000-0000-0000-0000-000000002022','00000000-0000-0000-0000-000000000203','VES-FIJI-M','M',NULL,4,now() - interval '18 days'),
('00000000-0000-0000-0000-000000002023','00000000-0000-0000-0000-000000000203','VES-FIJI-G','G',NULL,2,now() - interval '18 days'),
-- Monaco
('00000000-0000-0000-0000-000000002031','00000000-0000-0000-0000-000000000204','VES-MONA-P','P',NULL,3,now() - interval '22 days'),
('00000000-0000-0000-0000-000000002032','00000000-0000-0000-0000-000000000204','VES-MONA-M','M',NULL,5,now() - interval '22 days'),
('00000000-0000-0000-0000-000000002033','00000000-0000-0000-0000-000000000204','VES-MONA-G','G',NULL,2,now() - interval '22 days'),
-- Verona
('00000000-0000-0000-0000-000000002041','00000000-0000-0000-0000-000000000205','VES-VERO-P','P',NULL,2,now() - interval '30 days'),
('00000000-0000-0000-0000-000000002042','00000000-0000-0000-0000-000000000205','VES-VERO-M','M',NULL,4,now() - interval '30 days'),
('00000000-0000-0000-0000-000000002043','00000000-0000-0000-0000-000000000205','VES-VERO-G','G',NULL,3,now() - interval '30 days'),
-- Maia vestido
('00000000-0000-0000-0000-000000002051','00000000-0000-0000-0000-000000000206','VES-MAIA-P','P',NULL,4,now() - interval '15 days'),
('00000000-0000-0000-0000-000000002052','00000000-0000-0000-0000-000000000206','VES-MAIA-M','M',NULL,7,now() - interval '15 days'),
('00000000-0000-0000-0000-000000002053','00000000-0000-0000-0000-000000000206','VES-MAIA-G','G',NULL,3,now() - interval '15 days'),
-- Viena
('00000000-0000-0000-0000-000000002061','00000000-0000-0000-0000-000000000207','VES-VIEN-P','P',NULL,3,now() - interval '28 days'),
('00000000-0000-0000-0000-000000002062','00000000-0000-0000-0000-000000000207','VES-VIEN-M','M',NULL,5,now() - interval '28 days'),
('00000000-0000-0000-0000-000000002063','00000000-0000-0000-0000-000000000207','VES-VIEN-G','G',NULL,2,now() - interval '28 days'),
-- Cancun
('00000000-0000-0000-0000-000000002071','00000000-0000-0000-0000-000000000208','VES-CANC-P','P',NULL,3,now() - interval '12 days'),
('00000000-0000-0000-0000-000000002072','00000000-0000-0000-0000-000000000208','VES-CANC-M','M',NULL,6,now() - interval '12 days'),
('00000000-0000-0000-0000-000000002073','00000000-0000-0000-0000-000000000208','VES-CANC-G','G',NULL,2,now() - interval '12 days'),
-- Inca vestido
('00000000-0000-0000-0000-000000002081','00000000-0000-0000-0000-000000000209','VES-INCA-P','P',NULL,2,now() - interval '35 days'),
('00000000-0000-0000-0000-000000002082','00000000-0000-0000-0000-000000000209','VES-INCA-M','M',NULL,4,now() - interval '35 days'),
('00000000-0000-0000-0000-000000002083','00000000-0000-0000-0000-000000000209','VES-INCA-G','G',NULL,3,now() - interval '35 days'),
-- Bali
('00000000-0000-0000-0000-000000002091','00000000-0000-0000-0000-000000000210','VES-BALI-P','P',NULL,3,now() - interval '8 days'),
('00000000-0000-0000-0000-000000002092','00000000-0000-0000-0000-000000000210','VES-BALI-M','M',NULL,5,now() - interval '8 days'),
('00000000-0000-0000-0000-000000002093','00000000-0000-0000-0000-000000000210','VES-BALI-G','G',NULL,2,now() - interval '8 days')

ON CONFLICT (sku) DO NOTHING;

-- ─── VARIANTES — BATAS ────────────────────────────────────────────────────────

INSERT INTO public.product_variants (id, product_id, sku, size, color, stock_quantity, created_at)
VALUES
-- Asteca
('00000000-0000-0000-0000-000000003001','00000000-0000-0000-0000-000000000301','BAT-ASTE-V1-UNICO','Único','Variante 1',5,now() - interval '30 days'),
('00000000-0000-0000-0000-000000003002','00000000-0000-0000-0000-000000000301','BAT-ASTE-V2-UNICO','Único','Variante 2',4,now() - interval '30 days'),
-- Yoko
('00000000-0000-0000-0000-000000003011','00000000-0000-0000-0000-000000000302','BAT-YOKO-V1-UNICO','Único','Variante 1',4,now() - interval '22 days'),
('00000000-0000-0000-0000-000000003012','00000000-0000-0000-0000-000000000302','BAT-YOKO-V2-UNICO','Único','Variante 2',3,now() - interval '22 days'),
-- Maia bata
('00000000-0000-0000-0000-000000003021','00000000-0000-0000-0000-000000000303','BAT-MAIB-V1-UNICO','Único','Variante 1',6,now() - interval '18 days'),
('00000000-0000-0000-0000-000000003022','00000000-0000-0000-0000-000000000303','BAT-MAIB-V2-UNICO','Único','Variante 2',4,now() - interval '18 days'),
('00000000-0000-0000-0000-000000003023','00000000-0000-0000-0000-000000000303','BAT-MAIB-V3-UNICO','Único','Variante 3',3,now() - interval '18 days'),
-- Helo
('00000000-0000-0000-0000-000000003031','00000000-0000-0000-0000-000000000304','BAT-HELO-V1-UNICO','Único','Variante 1',4,now() - interval '14 days'),
('00000000-0000-0000-0000-000000003032','00000000-0000-0000-0000-000000000304','BAT-HELO-V2-UNICO','Único','Variante 2',3,now() - interval '14 days'),
('00000000-0000-0000-0000-000000003033','00000000-0000-0000-0000-000000000304','BAT-HELO-V3-UNICO','Único','Variante 3',2,now() - interval '14 days'),
-- Inca bata
('00000000-0000-0000-0000-000000003041','00000000-0000-0000-0000-000000000305','BAT-INCC-V1-UNICO','Único','Variante 1',5,now() - interval '35 days'),
('00000000-0000-0000-0000-000000003042','00000000-0000-0000-0000-000000000305','BAT-INCC-V2-UNICO','Único','Variante 2',4,now() - interval '35 days'),
-- Malu
('00000000-0000-0000-0000-000000003051','00000000-0000-0000-0000-000000000306','BAT-MALU-V1-UNICO','Único','Variante 1',6,now() - interval '40 days'),
('00000000-0000-0000-0000-000000003052','00000000-0000-0000-0000-000000000306','BAT-MALU-V2-UNICO','Único','Variante 2',5,now() - interval '40 days'),
-- Ju
('00000000-0000-0000-0000-000000003061','00000000-0000-0000-0000-000000000307','BAT-JU-V1-UNICO','Único','Variante 1',5,now() - interval '25 days'),
('00000000-0000-0000-0000-000000003062','00000000-0000-0000-0000-000000000307','BAT-JU-V2-UNICO','Único','Variante 2',3,now() - interval '25 days'),
-- Sino
('00000000-0000-0000-0000-000000003071','00000000-0000-0000-0000-000000000308','BAT-SINO-NAT-UNICO','Único','Natural',4,now() - interval '10 days'),
-- Bia
('00000000-0000-0000-0000-000000003081','00000000-0000-0000-0000-000000000309','BAT-BIA-V1-UNICO','Único','Variante 1',4,now() - interval '6 days'),
('00000000-0000-0000-0000-000000003082','00000000-0000-0000-0000-000000000309','BAT-BIA-V2-UNICO','Único','Variante 2',3,now() - interval '6 days')

ON CONFLICT (sku) DO NOTHING;

-- ─── VARIANTES — BAZAR ────────────────────────────────────────────────────────

INSERT INTO public.product_variants (id, product_id, sku, size, color, stock_quantity, created_at)
VALUES
('00000000-0000-0000-0000-000000003500','00000000-0000-0000-0000-000000000350','BAZ-BATA1-UNICO','Único','Natural',2,now() - interval '5 days'),
('00000000-0000-0000-0000-000000003501','00000000-0000-0000-0000-000000000351','BAZ-BATA2-UNICO','Único','Natural',1,now() - interval '5 days'),
('00000000-0000-0000-0000-000000003502','00000000-0000-0000-0000-000000000352','BAZ-BATA3-UNICO','Único','Natural',1,now() - interval '5 days')

ON CONFLICT (sku) DO NOTHING;

-- ─── Fotos por variante (espelha o backfill da migration 025) ────────────────
-- Variantes recém-criadas ainda não têm fotos próprias — herdam do produto.
UPDATE public.product_variants v
SET images = p.images
FROM public.products p
WHERE v.product_id = p.id
  AND v.images = '{}'
  AND p.images <> '{}';
