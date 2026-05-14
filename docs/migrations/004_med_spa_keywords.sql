-- Update Med Spa / Aesthetics default_keywords with full device list
UPDATE industry_templates
SET default_keywords = ARRAY[
  'Morpheus8', 'RF Microneedling', 'Fillers', 'Botox', 'Laser Resurfacing',
  'CoolSculpting', 'EmSculpt', 'Ultherapy', 'Kybella', 'PRP',
  'Sylfirm X', 'AviClear', 'Skinvive', 'Profhilo', 'Polynucleotides',
  'InstaLift', 'Sculptra', 'Renuvion', 'J-Plasma', 'Emface',
  'Exion', 'FaceTite', 'Thermage FLX', 'Sofwave', 'Genius RF',
  'Profound RF', 'Scarlet RF', 'Potenza RF Microneedling'
]
WHERE slug = 'med_spa';
