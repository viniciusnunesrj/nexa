-- Validation-only foundation. Never invokes legacy combat or economic functions.
-- Requires existing user_cards, card_templates and marketplace V2 migrations.
-- Catalog/arenas below are a frozen export of the current TypeScript V2 rules.
BEGIN;

CREATE SCHEMA riftbattle_v2_private;
REVOKE ALL ON SCHEMA riftbattle_v2_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA riftbattle_v2_private TO authenticated;

CREATE TABLE riftbattle_v2_private.rules (
  version text PRIMARY KEY,
  arenas jsonb NOT NULL CHECK (jsonb_typeof(arenas) = 'array'),
  cards jsonb NOT NULL CHECK (jsonb_typeof(cards) = 'array')
);
CREATE TABLE riftbattle_v2_private.validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  request_id text NOT NULL CHECK (
    length(request_id) BETWEEN 1 AND 200
    AND request_id COLLATE "C" ~ '^[A-Za-z0-9]'
    AND request_id COLLATE "C" !~ '[^A-Za-z0-9._:-]'
  ),
  rules_version text NOT NULL REFERENCES riftbattle_v2_private.rules(version),
  arena_id text NOT NULL,
  instance_ids text[] NOT NULL,
  response jsonb NOT NULL,
  reward_applied boolean NOT NULL DEFAULT false CHECK (reward_applied = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, request_id)
);
CREATE INDEX validations_owner_created_idx
  ON riftbattle_v2_private.validations(owner_id, created_at DESC);
ALTER TABLE riftbattle_v2_private.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE riftbattle_v2_private.validations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA riftbattle_v2_private FROM PUBLIC, anon, authenticated;

INSERT INTO riftbattle_v2_private.rules(version, arenas, cards) VALUES (
'riftbattle-v2-preview-20260922.1',
$arenas$[
  {
    "id": "rift-standard",
    "name": "Rift Padrão",
    "teamSize": 4,
    "activeSlots": 2,
    "abilitiesEnabled": true,
    "energyByTurn": [
      3,
      4,
      5,
      6
    ],
    "ruleset": "STANDARD"
  },
  {
    "id": "rift-pure",
    "name": "Rift Puro",
    "teamSize": 4,
    "activeSlots": 2,
    "abilitiesEnabled": false,
    "energyByTurn": [
      3,
      4,
      5,
      6
    ],
    "ruleset": "PURE"
  },
  {
    "id": "rift-expansion",
    "name": "Rift Expansão",
    "teamSize": 6,
    "activeSlots": 3,
    "abilitiesEnabled": true,
    "energyByTurn": [
      4,
      5,
      6,
      7
    ],
    "ruleset": "STANDARD"
  },
  {
    "id": "rift-war",
    "name": "Rift Guerra",
    "teamSize": 8,
    "activeSlots": 4,
    "abilitiesEnabled": true,
    "energyByTurn": [
      5,
      6,
      7,
      8
    ],
    "ruleset": "STANDARD"
  }
]$arenas$::jsonb,
$cards$[
  {
    "id": "card-flame-guardian",
    "name": "Guardião da Chama",
    "rarity": "Incomum",
    "archetype": "TANK",
    "stats": {
      "hp": 14,
      "attack": 4,
      "defense": 4,
      "speed": 2
    },
    "deployCost": 3,
    "ability": {
      "id": "ESCUDO",
      "name": "ESCUDO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-ice-guardian",
    "name": "Guardião do Gelo",
    "rarity": "Raro",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 11,
      "attack": 4,
      "defense": 3,
      "speed": 4
    },
    "deployCost": 3,
    "ability": {
      "id": "BARREIRA",
      "name": "BARREIRA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-storm-guardian",
    "name": "Guardião da Tempestade",
    "rarity": "Épico",
    "archetype": "SPEED",
    "stats": {
      "hp": 9,
      "attack": 5,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 3,
    "ability": {
      "id": "IMPULSO",
      "name": "IMPULSO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-guardian",
    "name": "Guardião do Abismo",
    "rarity": "Lendário",
    "archetype": "TANK",
    "stats": {
      "hp": 17,
      "attack": 4,
      "defense": 5,
      "speed": 1
    },
    "deployCost": 5,
    "ability": {
      "id": "PROTECAO",
      "name": "PROTECAO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-dragon-red",
    "name": "Dragão Rubro",
    "rarity": "Incomum",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 8,
      "attack": 7,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 2,
    "ability": {
      "id": "SOBRECARGA",
      "name": "SOBRECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-dragon-frost",
    "name": "Dragão Glacial",
    "rarity": "Raro",
    "archetype": "TANK",
    "stats": {
      "hp": 16,
      "attack": 4,
      "defense": 4,
      "speed": 1
    },
    "deployCost": 4,
    "ability": {
      "id": "BARREIRA",
      "name": "BARREIRA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-dragon-emerald",
    "name": "Dragão Esmeralda",
    "rarity": "Incomum",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 11,
      "attack": 4,
      "defense": 3,
      "speed": 3
    },
    "deployCost": 2,
    "ability": {
      "id": "PROTECAO",
      "name": "PROTECAO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-dragon-shadow",
    "name": "Dragão Sombrio",
    "rarity": "Raro",
    "archetype": "SPEED",
    "stats": {
      "hp": 8,
      "attack": 5,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 2,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-dragon-gold",
    "name": "Dragão Dourado",
    "rarity": "Épico",
    "archetype": "BALANCED",
    "stats": {
      "hp": 11,
      "attack": 5,
      "defense": 3,
      "speed": 3
    },
    "deployCost": 3,
    "ability": {
      "id": "RECARGA",
      "name": "RECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-dragon-astral",
    "name": "Dragão Astral",
    "rarity": "Épico",
    "archetype": "SPEED",
    "stats": {
      "hp": 11,
      "attack": 5,
      "defense": 2,
      "speed": 5
    },
    "deployCost": 4,
    "ability": {
      "id": "IMPULSO",
      "name": "IMPULSO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-dragon-volcanic",
    "name": "Dragão Vulcânico",
    "rarity": "Lendário",
    "archetype": "TANK",
    "stats": {
      "hp": 17,
      "attack": 5,
      "defense": 5,
      "speed": 1
    },
    "deployCost": 5,
    "ability": {
      "id": "SOBRECARGA",
      "name": "SOBRECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-dragon-celestial",
    "name": "Dragão Celestial",
    "rarity": "Mítico",
    "archetype": "BALANCED",
    "stats": {
      "hp": 12,
      "attack": 5,
      "defense": 3,
      "speed": 4
    },
    "deployCost": 4,
    "ability": {
      "id": "RECARGA",
      "name": "RECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-knight-blade",
    "name": "Cavaleiro da Lâmina",
    "rarity": "Comum",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 8,
      "attack": 7,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 2,
    "ability": {
      "id": "INVESTIDA",
      "name": "INVESTIDA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-knight-black",
    "name": "Cavaleiro Negro",
    "rarity": "Incomum",
    "archetype": "TANK",
    "stats": {
      "hp": 14,
      "attack": 4,
      "defense": 5,
      "speed": 1
    },
    "deployCost": 3,
    "ability": {
      "id": "ESCUDO",
      "name": "ESCUDO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-knight-royal",
    "name": "Cavaleiro Real",
    "rarity": "Incomum",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 10,
      "attack": 3,
      "defense": 2,
      "speed": 4
    },
    "deployCost": 1,
    "ability": {
      "id": "PROTECAO",
      "name": "PROTECAO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-knight-arcane",
    "name": "Cavaleiro Arcano",
    "rarity": "Raro",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 10,
      "attack": 4,
      "defense": 3,
      "speed": 4
    },
    "deployCost": 2,
    "ability": {
      "id": "RUPTURA",
      "name": "RUPTURA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-knight-scarlet",
    "name": "Cavaleiro Escarlate",
    "rarity": "Raro",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 9,
      "attack": 8,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 3,
    "ability": {
      "id": "SOBRECARGA",
      "name": "SOBRECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-knight-lunar",
    "name": "Cavaleiro Lunar",
    "rarity": "Épico",
    "archetype": "SPEED",
    "stats": {
      "hp": 9,
      "attack": 5,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 3,
    "ability": {
      "id": "IMPULSO",
      "name": "IMPULSO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-knight-imperial",
    "name": "Cavaleiro Imperial",
    "rarity": "Lendário",
    "archetype": "TANK",
    "stats": {
      "hp": 16,
      "attack": 5,
      "defense": 5,
      "speed": 2
    },
    "deployCost": 4,
    "ability": {
      "id": "PROTECAO",
      "name": "PROTECAO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-knight-celestial",
    "name": "Cavaleiro Celestial",
    "rarity": "Mítico",
    "archetype": "BALANCED",
    "stats": {
      "hp": 14,
      "attack": 6,
      "defense": 4,
      "speed": 4
    },
    "deployCost": 5,
    "ability": {
      "id": "BARREIRA",
      "name": "BARREIRA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-devourer",
    "name": "Devorador",
    "rarity": "Comum",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 8,
      "attack": 7,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 2,
    "ability": {
      "id": "REPARO",
      "name": "REPARO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-colossus",
    "name": "Colosso Abissal",
    "rarity": "Incomum",
    "archetype": "TANK",
    "stats": {
      "hp": 15,
      "attack": 4,
      "defense": 5,
      "speed": 1
    },
    "deployCost": 3,
    "ability": {
      "id": "ESCUDO",
      "name": "ESCUDO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-serpent",
    "name": "Serpente Sombria",
    "rarity": "Incomum",
    "archetype": "SPEED",
    "stats": {
      "hp": 8,
      "attack": 4,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 1,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-demon",
    "name": "Demônio do Vazio",
    "rarity": "Raro",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 8,
      "attack": 8,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 3,
    "ability": {
      "id": "RUPTURA",
      "name": "RUPTURA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-kraken",
    "name": "Kraken",
    "rarity": "Raro",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 9,
      "attack": 7,
      "defense": 2,
      "speed": 2
    },
    "deployCost": 3,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-leviathan",
    "name": "Leviatã",
    "rarity": "Épico",
    "archetype": "TANK",
    "stats": {
      "hp": 17,
      "attack": 4,
      "defense": 5,
      "speed": 1
    },
    "deployCost": 4,
    "ability": {
      "id": "BARREIRA",
      "name": "BARREIRA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-hydra",
    "name": "Hidra Negra",
    "rarity": "Lendário",
    "archetype": "TANK",
    "stats": {
      "hp": 17,
      "attack": 4,
      "defense": 5,
      "speed": 1
    },
    "deployCost": 5,
    "ability": {
      "id": "REPARO",
      "name": "REPARO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-abyss-king",
    "name": "Rei do Abismo",
    "rarity": "Mítico",
    "archetype": "BALANCED",
    "stats": {
      "hp": 15,
      "attack": 6,
      "defense": 4,
      "speed": 3
    },
    "deployCost": 5,
    "ability": {
      "id": "REPARO",
      "name": "REPARO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-mage-fire",
    "name": "Mago do Fogo",
    "rarity": "Comum",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 8,
      "attack": 6,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 2,
    "ability": {
      "id": "SOBRECARGA",
      "name": "SOBRECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-mage-ice",
    "name": "Mago do Gelo",
    "rarity": "Comum",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 10,
      "attack": 3,
      "defense": 2,
      "speed": 4
    },
    "deployCost": 1,
    "ability": {
      "id": "BARREIRA",
      "name": "BARREIRA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-mage-earth",
    "name": "Mago da Terra",
    "rarity": "Incomum",
    "archetype": "TANK",
    "stats": {
      "hp": 14,
      "attack": 4,
      "defense": 4,
      "speed": 1
    },
    "deployCost": 3,
    "ability": {
      "id": "PROTECAO",
      "name": "PROTECAO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-mage-wind",
    "name": "Mago do Ar",
    "rarity": "Incomum",
    "archetype": "SPEED",
    "stats": {
      "hp": 8,
      "attack": 4,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 1,
    "ability": {
      "id": "IMPULSO",
      "name": "IMPULSO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-mage-light",
    "name": "Mago da Luz",
    "rarity": "Raro",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 10,
      "attack": 4,
      "defense": 3,
      "speed": 4
    },
    "deployCost": 3,
    "ability": {
      "id": "RUPTURA",
      "name": "RUPTURA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-mage-shadow",
    "name": "Mago das Sombras",
    "rarity": "Raro",
    "archetype": "SPEED",
    "stats": {
      "hp": 8,
      "attack": 5,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 2,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-mage-arcane",
    "name": "Mago Arcano",
    "rarity": "Épico",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 11,
      "attack": 3,
      "defense": 3,
      "speed": 4
    },
    "deployCost": 3,
    "ability": {
      "id": "RECARGA",
      "name": "RECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-mage-archmage",
    "name": "Arquimago",
    "rarity": "Lendário",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 13,
      "attack": 4,
      "defense": 3,
      "speed": 5
    },
    "deployCost": 4,
    "ability": {
      "id": "RECARGA",
      "name": "RECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-god-war",
    "name": "Deus da Guerra",
    "rarity": "Raro",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 8,
      "attack": 8,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 3,
    "ability": {
      "id": "SOBRECARGA",
      "name": "SOBRECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-god-moon",
    "name": "Deusa da Lua",
    "rarity": "Raro",
    "archetype": "SPEED",
    "stats": {
      "hp": 9,
      "attack": 4,
      "defense": 2,
      "speed": 5
    },
    "deployCost": 2,
    "ability": {
      "id": "IMPULSO",
      "name": "IMPULSO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-god-thunder",
    "name": "Deus do Trovão",
    "rarity": "Épico",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 10,
      "attack": 8,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 4,
    "ability": {
      "id": "SOBRECARGA",
      "name": "SOBRECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-god-sea",
    "name": "Deus do Mar",
    "rarity": "Épico",
    "archetype": "TANK",
    "stats": {
      "hp": 17,
      "attack": 4,
      "defense": 5,
      "speed": 1
    },
    "deployCost": 4,
    "ability": {
      "id": "PROTECAO",
      "name": "PROTECAO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-god-death",
    "name": "Deus da Morte",
    "rarity": "Épico",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 9,
      "attack": 8,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 4,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-god-light",
    "name": "Deusa da Luz",
    "rarity": "Lendário",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 13,
      "attack": 3,
      "defense": 4,
      "speed": 5
    },
    "deployCost": 4,
    "ability": {
      "id": "PROTECAO",
      "name": "PROTECAO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-god-chaos",
    "name": "Deus do Caos",
    "rarity": "Lendário",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 11,
      "attack": 8,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 5,
    "ability": {
      "id": "SOBRECARGA",
      "name": "SOBRECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-god-supreme",
    "name": "Deus Supremo",
    "rarity": "Mítico",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 13,
      "attack": 4,
      "defense": 3,
      "speed": 4
    },
    "deployCost": 4,
    "ability": {
      "id": "RECARGA",
      "name": "RECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-cosmic-guardian",
    "name": "Guardião Estelar",
    "rarity": "Incomum",
    "archetype": "TANK",
    "stats": {
      "hp": 14,
      "attack": 4,
      "defense": 4,
      "speed": 2
    },
    "deployCost": 3,
    "ability": {
      "id": "ESCUDO",
      "name": "ESCUDO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-cosmic-comet",
    "name": "Cometa Vivo",
    "rarity": "Raro",
    "archetype": "SPEED",
    "stats": {
      "hp": 8,
      "attack": 4,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 1,
    "ability": {
      "id": "IMPULSO",
      "name": "IMPULSO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-cosmic-solar",
    "name": "Entidade Solar",
    "rarity": "Raro",
    "archetype": "BALANCED",
    "stats": {
      "hp": 10,
      "attack": 5,
      "defense": 3,
      "speed": 4
    },
    "deployCost": 2,
    "ability": {
      "id": "RECARGA",
      "name": "RECARGA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-cosmic-lunar",
    "name": "Entidade Lunar",
    "rarity": "Épico",
    "archetype": "SUPPORT",
    "stats": {
      "hp": 11,
      "attack": 3,
      "defense": 3,
      "speed": 4
    },
    "deployCost": 3,
    "ability": {
      "id": "PROTECAO",
      "name": "PROTECAO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-cosmic-devourer",
    "name": "Devorador de Mundos",
    "rarity": "Épico",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 11,
      "attack": 8,
      "defense": 1,
      "speed": 2
    },
    "deployCost": 4,
    "ability": {
      "id": "RUPTURA",
      "name": "RUPTURA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-cosmic-voidlord",
    "name": "Senhor do Vazio",
    "rarity": "Lendário",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 10,
      "attack": 8,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 4,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-cosmic-being",
    "name": "Ser Cósmico",
    "rarity": "Lendário",
    "archetype": "BALANCED",
    "stats": {
      "hp": 14,
      "attack": 6,
      "defense": 3,
      "speed": 3
    },
    "deployCost": 5,
    "ability": {
      "id": "BARREIRA",
      "name": "BARREIRA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-cosmic-primordial",
    "name": "Entidade Primordial",
    "rarity": "Mítico",
    "archetype": "TANK",
    "stats": {
      "hp": 17,
      "attack": 4,
      "defense": 5,
      "speed": 1
    },
    "deployCost": 5,
    "ability": {
      "id": "REPARO",
      "name": "REPARO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-hunter-novice",
    "name": "Caçador Novato",
    "rarity": "Comum",
    "archetype": "SPEED",
    "stats": {
      "hp": 8,
      "attack": 4,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 1,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-hunter-shadow",
    "name": "Caçador Sombrio",
    "rarity": "Comum",
    "archetype": "SPEED",
    "stats": {
      "hp": 8,
      "attack": 4,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 1,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-hunter-arcane",
    "name": "Caçador Arcano",
    "rarity": "Incomum",
    "archetype": "SPEED",
    "stats": {
      "hp": 9,
      "attack": 4,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 2,
    "ability": {
      "id": "RUPTURA",
      "name": "RUPTURA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-hunter-dragonslayer",
    "name": "Caçador de Dragões",
    "rarity": "Incomum",
    "archetype": "ASSAULT",
    "stats": {
      "hp": 8,
      "attack": 7,
      "defense": 1,
      "speed": 3
    },
    "deployCost": 2,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-hunter-lunar",
    "name": "Caçador Lunar",
    "rarity": "Raro",
    "archetype": "SPEED",
    "stats": {
      "hp": 8,
      "attack": 5,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 2,
    "ability": {
      "id": "IMPULSO",
      "name": "IMPULSO",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-hunter-royal",
    "name": "Caçador Real",
    "rarity": "Raro",
    "archetype": "BALANCED",
    "stats": {
      "hp": 10,
      "attack": 5,
      "defense": 3,
      "speed": 3
    },
    "deployCost": 3,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-hunter-ghost",
    "name": "Caçador Fantasma",
    "rarity": "Épico",
    "archetype": "SPEED",
    "stats": {
      "hp": 9,
      "attack": 5,
      "defense": 1,
      "speed": 5
    },
    "deployCost": 3,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  },
  {
    "id": "card-hunter-master",
    "name": "Mestre Caçador",
    "rarity": "Lendário",
    "archetype": "SPEED",
    "stats": {
      "hp": 11,
      "attack": 6,
      "defense": 2,
      "speed": 5
    },
    "deployCost": 4,
    "ability": {
      "id": "MARCA",
      "name": "MARCA",
      "description": "Efeito provisório do RiftBattle V2."
    }
  }
]$cards$::jsonb
);

CREATE FUNCTION riftbattle_v2_private.validate_squad(
  p_request_id text, p_arena_id text, p_rules_version text, p_instance_ids text[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner text := auth.uid()::text;
  v_rules riftbattle_v2_private.rules%ROWTYPE;
  v_existing riftbattle_v2_private.validations%ROWTYPE;
  v_arena jsonb;
  v_cards jsonb;
  v_response jsonb;
  v_id uuid := gen_random_uuid();
  v_count integer;
  v_total bigint;
  v_minute bigint;
  v_day bigint;
  v_created timestamptz := now();
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 1 AND 200
     OR p_request_id COLLATE "C" !~ '^[A-Za-z0-9]'
     OR p_request_id COLLATE "C" ~ '[^A-Za-z0-9._:-]' THEN
    RAISE EXCEPTION 'Invalid request_id' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_rules FROM riftbattle_v2_private.rules WHERE version = p_rules_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unsupported rules_version' USING ERRCODE = '22023'; END IF;
  SELECT a INTO v_arena FROM jsonb_array_elements(v_rules.arenas) a WHERE a->>'id' = p_arena_id;
  IF v_arena IS NULL THEN RAISE EXCEPTION 'Unknown arena_id' USING ERRCODE = '22023'; END IF;
  IF p_instance_ids IS NULL OR array_ndims(p_instance_ids) IS DISTINCT FROM 1
     OR cardinality(p_instance_ids) <> (v_arena->>'teamSize')::integer
     OR EXISTS (SELECT 1 FROM unnest(p_instance_ids) x WHERE x IS NULL OR btrim(x) = '' OR x <> btrim(x) OR length(x) > 200)
     OR (SELECT count(DISTINCT x) FROM unnest(p_instance_ids) x) <> cardinality(p_instance_ids) THEN
    RAISE EXCEPTION 'Invalid instance IDs or team size' USING ERRCODE = '22023';
  END IF;

  -- Serialize only this user's V2 validations, independent of the old battle flow.
  IF NOT pg_try_advisory_xact_lock(hashtextextended('nexa:riftbattle:v2:' || v_owner, 0)) THEN
    RAISE EXCEPTION 'Validação em andamento; repita o mesmo request_id' USING ERRCODE = '55P03';
  END IF;
  SELECT * INTO v_existing FROM riftbattle_v2_private.validations
    WHERE owner_id = v_owner AND request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.rules_version <> p_rules_version OR v_existing.arena_id <> p_arena_id
       OR v_existing.instance_ids <> p_instance_ids THEN
      RAISE EXCEPTION 'request_id already used with another payload' USING ERRCODE = '22023';
    END IF;
    -- Historical receipt, NOT fresh authorization or a persistent inventory lock.
    RETURN v_existing.response || jsonb_build_object('idempotent', true);
  END IF;

  -- Count only NEW receipts, after idempotent replay. No deletion/expiry of keys.
  -- Preview ceilings per owner: 30/minute, 500/24h, 10000 total.
  -- The V2-only advisory lock makes count + insert atomic for this owner.
  v_created := clock_timestamp();
  SELECT count(*),
    count(*) FILTER (WHERE created_at >= v_created - interval '1 minute'),
    count(*) FILTER (WHERE created_at >= v_created - interval '24 hours')
  INTO v_total, v_minute, v_day
  FROM riftbattle_v2_private.validations WHERE owner_id = v_owner;
  IF v_total >= 10000 OR v_minute >= 30 OR v_day >= 500 THEN
    RAISE EXCEPTION 'Limite de validações V2 atingido; tente mais tarde ou contate o suporte do preview'
      USING ERRCODE = '54000';
  END IF;

  -- One MVCC statement validates ownership, eligibility, templates and marketplace
  -- together. No inventory row lock: this is a historical receipt, NOT a lease.
  -- A concurrent transfer may commit after this snapshot; no reward/session is authorized.
  SELECT count(*), jsonb_agg(
    d.card || jsonb_build_object('id', c.id, 'sourceInstanceId', c.id, 'templateId', c.template_id)
    ORDER BY x.ord
  ) INTO v_count, v_cards
  FROM unnest(p_instance_ids) WITH ORDINALITY x(id, ord)
  JOIN public.user_cards c ON c.id = x.id
  JOIN public.card_templates t ON t.template_id = c.template_id AND t.active
  JOIN LATERAL jsonb_array_elements(v_rules.cards) d(card) ON d.card->>'id' = c.template_id
  WHERE c.owner_id = v_owner
    AND c.state = 'FREE' AND c.card_status = 'FREE' AND c.status = 'IDLE'
    AND c.synthesized_at IS NULL AND c.last_accrual_at IS NULL AND c.exhausted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.marketplace_reservations_v2 r WHERE r.card_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.item_id = c.id AND l.status = 'ACTIVE');
  IF v_count <> cardinality(p_instance_ids) THEN
    RAISE EXCEPTION 'Card missing, not owned, inactive, reserved or ineligible' USING ERRCODE = '22023';
  END IF;

  v_response := jsonb_build_object(
    'success', true, 'validation_id', v_id, 'request_id', p_request_id,
    'rules_version', p_rules_version, 'arena', v_arena, 'cards', v_cards,
    'mode', 'VALIDATION_ONLY', 'authoritative', false, 'reward_applied', false,
    'idempotent', false, 'validated_at', v_created
  );
  INSERT INTO riftbattle_v2_private.validations
    (id, owner_id, request_id, rules_version, arena_id, instance_ids, response, created_at)
  VALUES (v_id, v_owner, p_request_id, p_rules_version, p_arena_id, p_instance_ids, v_response, v_created);
  RETURN v_response;
END;
$$;
REVOKE ALL ON FUNCTION riftbattle_v2_private.validate_squad(text,text,text,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION riftbattle_v2_private.validate_squad(text,text,text,text[]) TO authenticated;

-- Public entry point is invoker; privilege elevation stays in an unexposed schema.
CREATE FUNCTION public.validate_riftbattle_v2_squad(
  p_request_id text, p_arena_id text, p_rules_version text, p_instance_ids text[]
) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT riftbattle_v2_private.validate_squad(p_request_id, p_arena_id, p_rules_version, p_instance_ids);
$$;
REVOKE ALL ON FUNCTION public.validate_riftbattle_v2_squad(text,text,text,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_riftbattle_v2_squad(text,text,text,text[]) TO authenticated;
COMMIT;
