CREATE TABLE IF NOT EXISTS site_configs (
    config_key VARCHAR(100) PRIMARY KEY,
    config_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
