-- ============================================================
-- DUXITER — DEV SEED DATA
-- Run AFTER schema.sql. Safe to re-run (on conflict do nothing).
-- Images are Unsplash URLs for local development only.
-- ============================================================

-- ---------------- CITIES ----------------
insert into cities (id, slug, name, description, country, cover_image_url, is_active) values
(
  '11111111-1111-1111-1111-111111111101', 'lisbon',
  '{"pt":"Lisboa","en":"Lisbon","es":"Lisboa"}',
  '{"pt":"Colinas, elétricos e miradouros sobre o Tejo.","en":"Hills, trams and viewpoints over the Tagus.","es":"Colinas, tranvías y miradores sobre el Tajo."}',
  'Portugal',
  'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1200&q=80',
  true
),
(
  '11111111-1111-1111-1111-111111111102', 'porto',
  '{"pt":"Porto","en":"Porto","es":"Oporto"}',
  '{"pt":"Vinho do Porto, azulejos e a Ribeira do Douro.","en":"Port wine, tiles and the Douro riverside.","es":"Vino de Oporto, azulejos y la ribera del Duero."}',
  'Portugal',
  'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80',
  true
),
(
  '11111111-1111-1111-1111-111111111103', 'barcelona',
  '{"pt":"Barcelona","en":"Barcelona","es":"Barcelona"}',
  '{"pt":"Modernismo, mar e o bairro Gótico.","en":"Modernisme, sea and the Gothic Quarter.","es":"Modernismo, mar y el Barrio Gótico."}',
  'España',
  'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=80',
  true
)
on conflict (id) do nothing;

-- ---------------- TOURS ----------------
insert into tours (id, city_id, title, short_description, description, type, cover_image_url,
  difficulty, estimated_duration_minutes, distance_km, price_usd, status, is_active, tags) values
(
  '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101',
  '{"pt":"Alfama a pé","en":"Alfama on foot","es":"Alfama a pie"}',
  '{"pt":"O bairro mais antigo de Lisboa, do Castelo ao Tejo.","en":"Lisbon''s oldest quarter, from the Castle to the Tagus.","es":"El barrio más antiguo de Lisboa, del Castillo al Tajo."}',
  '{"pt":"Um passeio pelas vielas de Alfama passando por miradouros, a Sé, o Panteão e o Museu do Fado. Descubra a história do bairro que resistiu ao terramoto de 1755.","en":"A walk through Alfama''s alleys past viewpoints, the Cathedral, the Pantheon and the Fado Museum. Discover the story of the quarter that survived the 1755 earthquake.","es":"Un paseo por las callejuelas de Alfama pasando por miradores, la Catedral, el Panteón y el Museo del Fado."}',
  'street', 'https://images.unsplash.com/photo-1580323956606-3d1a1b6d0e0b?w=1200&q=80',
  'easy', 75, 2.10, 0, 'approved', true, '{history,architecture,viewpoints}'
),
(
  '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101',
  '{"pt":"Museu Nacional do Azulejo","en":"National Tile Museum","es":"Museo Nacional del Azulejo"}',
  '{"pt":"Cinco séculos de azulejo português num antigo convento.","en":"Five centuries of Portuguese tile in a former convent.","es":"Cinco siglos de azulejo portugués en un antiguo convento."}',
  '{"pt":"Guia sala a sala do Museu do Azulejo, instalado no Convento da Madre de Deus. Inclui a Grande Vista de Lisboa e a igreja barroca.","en":"A room-by-room guide to the Tile Museum, housed in the Madre de Deus Convent. Includes the Great Panorama of Lisbon and the baroque church.","es":"Guía sala por sala del Museo del Azulejo, en el Convento de Madre de Deus."}',
  'museum', 'https://images.unsplash.com/photo-1600431521340-491eca880813?w=1200&q=80',
  'easy', 60, null, 6.90, 'approved', true, '{art,history}'
),
(
  '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102',
  '{"pt":"Ribeira e as pontes","en":"Ribeira and the bridges","es":"Ribeira y los puentes"}',
  '{"pt":"Da Sé à Ponte Luís I, com o Douro sempre à vista.","en":"From the Cathedral to the Luís I Bridge, the Douro always in view.","es":"De la Catedral al Puente Luís I, con el Duero siempre a la vista."}',
  '{"pt":"Desça da Sé do Porto até à Ribeira, atravesse a Ponte Luís I e termine em Gaia entre as caves de vinho do Porto. Vistas, história e o rio.","en":"Descend from Porto Cathedral to the Ribeira, cross the Luís I Bridge and finish in Gaia among the Port wine cellars.","es":"Baja de la Catedral de Oporto a la Ribeira, cruza el Puente Luís I y termina en Gaia entre las bodegas."}',
  'street', 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=1200&q=80',
  'medium', 90, 3.40, 5.90, 'approved', true, '{history,viewpoints,food}'
),
(
  '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111102',
  '{"pt":"Clérigos e a Livraria Lello","en":"Clérigos and Lello Bookshop","es":"Clérigos y la Librería Lello"}',
  '{"pt":"A torre barroca e a livraria mais famosa do mundo.","en":"The baroque tower and the world''s most famous bookshop.","es":"La torre barroca y la librería más famosa del mundo."}',
  '{"pt":"Um passeio curto pelo centro do Porto: a Torre dos Clérigos, a Livraria Lello, a Praça dos Leões e a Universidade. Ideal para uma primeira tarde na cidade.","en":"A short walk through central Porto: the Clérigos Tower, Lello Bookshop, Leões Square and the University. Perfect for a first afternoon.","es":"Un paseo corto por el centro de Oporto: la Torre de los Clérigos, la Librería Lello y la Universidad."}',
  'street', 'https://images.unsplash.com/photo-1591792447862-6d1b4a0a1a76?w=1200&q=80',
  'easy', 45, 1.30, 0, 'approved', true, '{architecture,literature}'
),
(
  '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111103',
  '{"pt":"Bairro Gótico essencial","en":"Essential Gothic Quarter","es":"Barrio Gótico esencial"}',
  '{"pt":"Da Catedral à Praça Reial pelo coração medieval.","en":"From the Cathedral to Plaça Reial through the medieval core.","es":"De la Catedral a la Plaça Reial por el corazón medieval."}',
  '{"pt":"O labirinto medieval de Barcelona: a Catedral, o Pont del Bisbe, a Plaça Sant Felip Neri marcada pela Guerra Civil, e a Plaça Reial de Gaudí.","en":"Barcelona''s medieval maze: the Cathedral, the Bishop''s Bridge, Plaça Sant Felip Neri scarred by the Civil War, and Gaudí''s Plaça Reial.","es":"El laberinto medieval de Barcelona: la Catedral, el Pont del Bisbe y la Plaça Reial de Gaudí."}',
  'street', 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1200&q=80',
  'easy', 70, 1.90, 0, 'approved', true, '{history,architecture,photography}'
),
(
  '22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111103',
  '{"pt":"Sagrada Família por dentro","en":"Sagrada Família inside","es":"Sagrada Família por dentro"}',
  '{"pt":"A basílica de Gaudí, das fachadas à floresta de colunas.","en":"Gaudí''s basilica, from the façades to the forest of columns.","es":"La basílica de Gaudí, de las fachadas al bosque de columnas."}',
  '{"pt":"Guia da Sagrada Família: a Fachada do Nascimento, a Fachada da Paixão, a nave central e o simbolismo das cores da luz. Percurso de dentro para fora.","en":"A guide to the Sagrada Família: the Nativity Façade, the Passion Façade, the central nave and the symbolism of the coloured light.","es":"Guía de la Sagrada Família: la Fachada del Nacimiento, la de la Pasión y la nave central."}',
  'museum', 'https://images.unsplash.com/photo-1583779457094-ab6f77f7bf57?w=1200&q=80',
  'easy', 80, null, 7.90, 'approved', true, '{architecture,art,religious}'
)
on conflict (id) do nothing;

-- ---------------- TOUR STOPS ----------------
insert into tour_stops (id, tour_id, order_index, title, description, latitude, longitude, audio_duration_seconds) values
-- Alfama (street)
('33333333-3333-3333-3333-333333330101','22222222-2222-2222-2222-222222222201',0,
 '{"pt":"Miradouro das Portas do Sol","en":"Portas do Sol Viewpoint","es":"Mirador Portas do Sol"}',
 '{"pt":"O ponto de partida, com Alfama descendo em telhados até ao rio.","en":"The starting point, with Alfama tumbling in rooftops down to the river.","es":"El punto de partida, con Alfama cayendo en tejados hasta el río."}',
 38.71163, -9.13037, 210),
('33333333-3333-3333-3333-333333330102','22222222-2222-2222-2222-222222222201',1,
 '{"pt":"Sé de Lisboa","en":"Lisbon Cathedral","es":"Catedral de Lisboa"}',
 '{"pt":"A catedral românica de 1147, fortaleza e igreja ao mesmo tempo.","en":"The Romanesque cathedral of 1147, fortress and church at once.","es":"La catedral románica de 1147, fortaleza e iglesia a la vez."}',
 38.70988, -9.13327, 240),
('33333333-3333-3333-3333-333333330103','22222222-2222-2222-2222-222222222201',2,
 '{"pt":"Largo de São Miguel","en":"São Miguel Square","es":"Plaza de São Miguel"}',
 '{"pt":"O coração de Alfama, onde as vielas se cruzam sob a roupa estendida.","en":"The heart of Alfama, where the alleys cross under the hanging laundry.","es":"El corazón de Alfama, donde los callejones se cruzan bajo la ropa tendida."}',
 38.71148, -9.12879, 180),
('33333333-3333-3333-3333-333333330104','22222222-2222-2222-2222-222222222201',3,
 '{"pt":"Panteão Nacional","en":"National Pantheon","es":"Panteón Nacional"}',
 '{"pt":"A cúpula branca de Santa Engrácia, que demorou 284 anos a terminar.","en":"The white dome of Santa Engrácia, which took 284 years to finish.","es":"La cúpula blanca de Santa Engrácia, que tardó 284 años en terminarse."}',
 38.71520, -9.12470, 200),
('33333333-3333-3333-3333-333333330105','22222222-2222-2222-2222-222222222201',4,
 '{"pt":"Museu do Fado","en":"Fado Museum","es":"Museo del Fado"}',
 '{"pt":"O fim do percurso, junto ao Chafariz d''El Rei, onde nasceu o fado.","en":"The end of the walk, by the Chafariz d''El Rei, where fado was born.","es":"El final del paseo, junto al Chafariz d''El Rei, donde nació el fado."}',
 38.71169, -9.12525, 160),
-- Azulejo (museum — no coords)
('33333333-3333-3333-3333-333333330201','22222222-2222-2222-2222-222222222202',0,
 '{"pt":"Claustro do Convento","en":"Convent Cloister","es":"Claustro del Convento"}',
 '{"pt":"O claustro manuelino do antigo Convento da Madre de Deus.","en":"The Manueline cloister of the former Madre de Deus Convent.","es":"El claustro manuelino del antiguo Convento de Madre de Deus."}',
 null, null, 190),
('33333333-3333-3333-3333-333333330202','22222222-2222-2222-2222-222222222202',1,
 '{"pt":"Nossa Senhora da Vida","en":"Our Lady of Life","es":"Nuestra Señora de la Vida"}',
 '{"pt":"O grande painel renascentista de 1580, com mais de 1400 azulejos.","en":"The great Renaissance panel of 1580, with over 1,400 tiles.","es":"El gran panel renacentista de 1580, con más de 1.400 azulejos."}',
 null, null, 230),
('33333333-3333-3333-3333-333333330203','22222222-2222-2222-2222-222222222202',2,
 '{"pt":"Grande Vista de Lisboa","en":"Great Panorama of Lisbon","es":"Gran Vista de Lisboa"}',
 '{"pt":"23 metros de azulejo azul e branco retratando a cidade antes de 1755.","en":"23 metres of blue-and-white tile portraying the city before 1755.","es":"23 metros de azulejo azul y blanco retratando la ciudad antes de 1755."}',
 null, null, 260),
('33333333-3333-3333-3333-333333330204','22222222-2222-2222-2222-222222222202',3,
 '{"pt":"Igreja da Madre de Deus","en":"Madre de Deus Church","es":"Iglesia de Madre de Deus"}',
 '{"pt":"O interior barroco dourado, talha, pintura e azulejo juntos.","en":"The gilded baroque interior — woodwork, painting and tile together.","es":"El interior barroco dorado — talla, pintura y azulejo juntos."}',
 null, null, 175),
-- Ribeira (street)
('33333333-3333-3333-3333-333333330301','22222222-2222-2222-2222-222222222203',0,
 '{"pt":"Sé do Porto","en":"Porto Cathedral","es":"Catedral de Oporto"}',
 '{"pt":"A catedral-fortaleza no ponto mais alto da cidade velha.","en":"The fortress-cathedral at the highest point of the old town.","es":"La catedral-fortaleza en el punto más alto del casco viejo."}',
 41.14295, -8.61133, 200),
('33333333-3333-3333-3333-333333330302','22222222-2222-2222-2222-222222222203',1,
 '{"pt":"Rua das Flores","en":"Rua das Flores","es":"Rua das Flores"}',
 '{"pt":"A rua dos ourives do século XVI, hoje cheia de cafés e lojas.","en":"The 16th-century goldsmiths street, now full of cafes and shops.","es":"La calle de los orfebres del siglo XVI, hoy llena de cafes."}',
 41.14487, -8.61329, 160),
('33333333-3333-3333-3333-333333330303','22222222-2222-2222-2222-222222222203',2,
 '{"pt":"Praça da Ribeira","en":"Ribeira Square","es":"Plaza de la Ribeira"}',
 '{"pt":"O terreiro medieval à beira-rio, sob os arcos e as casas coloridas.","en":"The medieval riverside square, under the arches and coloured houses.","es":"La plaza medieval junto al río, bajo los arcos y las casas de colores."}',
 41.14060, -8.61336, 185),
('33333333-3333-3333-3333-333333330304','22222222-2222-2222-2222-222222222203',3,
 '{"pt":"Ponte Luís I","en":"Luís I Bridge","es":"Puente Luís I"}',
 '{"pt":"O tabuleiro superior, obra de um discípulo de Eiffel, 1886.","en":"The upper deck, built by a disciple of Eiffel, 1886.","es":"El tablero superior, obra de un discípulo de Eiffel, 1886."}',
 41.13985, -8.60937, 220),
('33333333-3333-3333-3333-333333330305','22222222-2222-2222-2222-222222222203',4,
 '{"pt":"Cais de Gaia","en":"Gaia Quay","es":"Muelle de Gaia"}',
 '{"pt":"O fim do percurso, frente às caves e aos barcos rabelo.","en":"The end of the walk, facing the cellars and the rabelo boats.","es":"El final del paseo, frente a las bodegas y los barcos rabelo."}',
 41.13845, -8.61099, 150),
-- Clérigos (street)
('33333333-3333-3333-3333-333333330401','22222222-2222-2222-2222-222222222204',0,
 '{"pt":"Torre dos Clérigos","en":"Clérigos Tower","es":"Torre de los Clérigos"}',
 '{"pt":"75 metros de granito barroco por Nicolau Nasoni, 1763.","en":"75 metres of baroque granite by Nicolau Nasoni, 1763.","es":"75 metros de granito barroco de Nicolau Nasoni, 1763."}',
 41.14570, -8.61436, 195),
('33333333-3333-3333-3333-333333330402','22222222-2222-2222-2222-222222222204',1,
 '{"pt":"Livraria Lello","en":"Lello Bookshop","es":"Librería Lello"}',
 '{"pt":"A escadaria vermelha de 1906 e o vitral com o lema Decus in Labore.","en":"The 1906 red staircase and the stained glass reading Decus in Labore.","es":"La escalera roja de 1906 y la vidriera con el lema Decus in Labore."}',
 41.14676, -8.61492, 210),
('33333333-3333-3333-3333-333333330403','22222222-2222-2222-2222-222222222204',2,
 '{"pt":"Praça de Gomes Teixeira","en":"Gomes Teixeira Square","es":"Plaza Gomes Teixeira"}',
 '{"pt":"A Fonte dos Leões e a fachada da Universidade do Porto.","en":"The Lions Fountain and the façade of the University of Porto.","es":"La Fuente de los Leones y la fachada de la Universidad de Oporto."}',
 41.14712, -8.61549, 140),
-- Gòtic (street)
('33333333-3333-3333-3333-333333330501','22222222-2222-2222-2222-222222222205',0,
 '{"pt":"Catedral de Barcelona","en":"Barcelona Cathedral","es":"Catedral de Barcelona"}',
 '{"pt":"A catedral gótica e o seu claustro com treze gansos brancos.","en":"The Gothic cathedral and its cloister with thirteen white geese.","es":"La catedral gótica y su claustro con trece ocas blancas."}',
 41.38394, 2.17610, 205),
('33333333-3333-3333-3333-333333330502','22222222-2222-2222-2222-222222222205',1,
 '{"pt":"Pont del Bisbe","en":"Bishop''s Bridge","es":"Pont del Bisbe"}',
 '{"pt":"A passagem neogótica de 1928 — e a caveira escondida que a segura.","en":"The 1928 neo-Gothic passage — and the hidden skull that holds it up.","es":"El paso neogótico de 1928 — y la calavera oculta que lo sostiene."}',
 41.38345, 2.17636, 150),
('33333333-3333-3333-3333-333333330503','22222222-2222-2222-2222-222222222205',2,
 '{"pt":"Plaça Sant Felip Neri","en":"Plaça Sant Felip Neri","es":"Plaça Sant Felip Neri"}',
 '{"pt":"A praça silenciosa cuja igreja ainda mostra as marcas de uma bomba de 1938.","en":"The silent square whose church still bears the marks of a 1938 bombing.","es":"La plaza silenciosa cuya iglesia aún muestra las marcas de una bomba de 1938."}',
 41.38318, 2.17540, 170),
('33333333-3333-3333-3333-333333330504','22222222-2222-2222-2222-222222222205',3,
 '{"pt":"Plaça Reial","en":"Plaça Reial","es":"Plaça Reial"}',
 '{"pt":"As palmeiras, os candeeiros do jovem Gaudí e a vida nocturna.","en":"The palm trees, the young Gaudí''s lamp-posts and the nightlife.","es":"Las palmeras, las farolas del joven Gaudí y la vida nocturna."}',
 41.37991, 2.17517, 160),
-- Sagrada (museum)
('33333333-3333-3333-3333-333333330601','22222222-2222-2222-2222-222222222206',0,
 '{"pt":"Fachada do Nascimento","en":"Nativity Façade","es":"Fachada del Nacimiento"}',
 '{"pt":"A única fachada concluída em vida de Gaudí, esculpida como pedra viva.","en":"The only façade finished in Gaudí''s lifetime, carved like living stone.","es":"La única fachada terminada en vida de Gaudí, tallada como piedra viva."}',
 null, null, 240),
('33333333-3333-3333-3333-333333330602','22222222-2222-2222-2222-222222222206',1,
 '{"pt":"Fachada da Paixão","en":"Passion Façade","es":"Fachada de la Pasión"}',
 '{"pt":"As figuras angulares de Subirachs, o oposto duro do Nascimento.","en":"Subirachs''s angular figures, the hard opposite of the Nativity.","es":"Las figuras angulares de Subirachs, el opuesto duro del Nacimiento."}',
 null, null, 225),
('33333333-3333-3333-3333-333333330603','22222222-2222-2222-2222-222222222206',2,
 '{"pt":"Nave central","en":"Central Nave","es":"Nave central"}',
 '{"pt":"A floresta de colunas ramificadas e a luz que muda de cor ao longo do dia.","en":"The forest of branching columns and light that changes colour through the day.","es":"El bosque de columnas ramificadas y la luz que cambia de color durante el día."}',
 null, null, 260),
('33333333-3333-3333-3333-333333330604','22222222-2222-2222-2222-222222222206',3,
 '{"pt":"Cripta e museu","en":"Crypt and museum","es":"Cripta y museo"}',
 '{"pt":"O túmulo de Gaudí e as maquetas invertidas que explicam a estrutura.","en":"Gaudí''s tomb and the upside-down models that explain the structure.","es":"La tumba de Gaudí y las maquetas invertidas que explican la estructura."}',
 null, null, 200)
on conflict (id) do nothing;

-- ---------------- STOP IMAGES (one hero image per stop) ----------------
insert into stop_images (stop_id, image_url, order_index) values
('33333333-3333-3333-3333-333333330101','https://images.unsplash.com/photo-1562195835-98a9d2f5f8b8?w=900&q=80',0),
('33333333-3333-3333-3333-333333330102','https://images.unsplash.com/photo-1592862628646-e9f0fdc4b3f0?w=900&q=80',0),
('33333333-3333-3333-3333-333333330301','https://images.unsplash.com/photo-1585156737645-4c9f6f5f2d95?w=900&q=80',0),
('33333333-3333-3333-3333-333333330304','https://images.unsplash.com/photo-1518533954129-7774297db60f?w=900&q=80',0),
('33333333-3333-3333-3333-333333330501','https://images.unsplash.com/photo-1583779457094-ab6f77f7bf57?w=900&q=80',0),
('33333333-3333-3333-3333-333333330603','https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=900&q=80',0)
on conflict do nothing;
