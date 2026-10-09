-- Dating Sim Lab schema. Idempotent: the API applies it on every start.

CREATE TABLE IF NOT EXISTS players (
  id             serial PRIMARY KEY,
  email          text UNIQUE NOT NULL,
  name           text NOT NULL,
  password_hash  text NOT NULL,
  demo_password  text,                       -- only for demo accounts, shown on the login page
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id               serial PRIMARY KEY,
  player_id        int NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  seed             bigint NOT NULL,
  cast_size        int NOT NULL,
  day              int NOT NULL,
  max_days         int NOT NULL,
  energy           int NOT NULL,
  energy_per_day   int NOT NULL,
  mission_points   int NOT NULL DEFAULT 0,
  next_mission_no  int NOT NULL DEFAULT 1,
  status           text NOT NULL CHECK (status IN ('playing', 'over')),
  perfect          boolean NOT NULL DEFAULT false,
  last_summary     jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz
);
CREATE INDEX IF NOT EXISTS games_player_idx ON games (player_id, created_at DESC);

-- One row per girl per game. Her relationship with the player lives here.
CREATE TABLE IF NOT EXISTS girl_states (
  game_id             int NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  girl_id             text NOT NULL,
  affinity            int NOT NULL,
  mood                text NOT NULL,
  blocked             boolean NOT NULL DEFAULT false,
  blocked_since_day   int,
  apology_day         int,
  careful             boolean NOT NULL DEFAULT false,
  last_talked_day     int,
  talked_today        boolean NOT NULL DEFAULT false,
  day_start_affinity  int NOT NULL DEFAULT 0,
  conversations       int NOT NULL DEFAULT 0,
  recent_lines        jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (game_id, girl_id)
);

-- Each girl's own memory. The key includes girl_id, so one girl can never see another girl's rows.
CREATE TABLE IF NOT EXISTS girl_memories (
  game_id  int NOT NULL,
  girl_id  text NOT NULL,
  kind     text NOT NULL CHECK (kind IN ('he_told_me', 'i_told_him')),
  key      text NOT NULL,
  value    text NOT NULL,
  day      int NOT NULL,
  PRIMARY KEY (game_id, girl_id, kind, key),
  FOREIGN KEY (game_id, girl_id) REFERENCES girl_states (game_id, girl_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS missions (
  game_id        int NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  id             text NOT NULL,
  type           text NOT NULL,
  girl_id        text,
  title          text NOT NULL,
  description    text NOT NULL,
  issued_day     int NOT NULL,
  deadline_day   int NOT NULL,
  reward         int NOT NULL,
  energy_reward  int NOT NULL DEFAULT 0,
  target         int,
  status         text NOT NULL CHECK (status IN ('active', 'done', 'failed')),
  PRIMARY KEY (game_id, id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id          serial PRIMARY KEY,
  game_id     int NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  girl_id     text NOT NULL,
  day         int NOT NULL,
  status      text NOT NULL CHECK (status IN ('active', 'ended')),
  total       int NOT NULL DEFAULT 0,
  state       jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz
);
-- At most one open conversation per game.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_one_active ON conversations (game_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS conversations_girl_idx ON conversations (game_id, girl_id, id DESC);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id               serial PRIMARY KEY,
  conversation_id  int NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  turn             int NOT NULL,
  kind             text NOT NULL,
  her_lines        jsonb NOT NULL,
  option_text      text NOT NULL,
  style            text NOT NULL,
  delta            int NOT NULL,
  outcome          text NOT NULL,
  reaction         text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scores (
  id          serial PRIMARY KEY,
  player_id   int NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id     int UNIQUE NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score       int NOT NULL,
  crushes     int NOT NULL,
  likes       int NOT NULL,
  cast_size   int NOT NULL,
  perfect     boolean NOT NULL,
  day         int NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scores_rank_idx ON scores (score DESC);
