-- EMS local database for XAMPP / MariaDB 10.4+
-- Safe to run repeatedly: objects use IF NOT EXISTS and reference rows use INSERT IGNORE.

CREATE DATABASE IF NOT EXISTS ems_local
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ems_local;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(64) NOT NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(80) NOT NULL,
  password_hash CHAR(64) NOT NULL,
  created_at DATE NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accounts_username (username),
  UNIQUE KEY uq_accounts_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) NOT NULL,
  initials VARCHAR(8) NOT NULL,
  accent CHAR(7) NOT NULL,
  name VARCHAR(255) NOT NULL,
  customer VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL,
  start_date DATE NOT NULL,
  contact_name VARCHAR(150) NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(255) NULL,
  address VARCHAR(500) NULL,
  logo_url MEDIUMTEXT NULL,
  PRIMARY KEY (id),
  KEY idx_projects_status (status),
  KEY idx_projects_customer (customer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS logo_url MEDIUMTEXT NULL AFTER address;

CREATE TABLE IF NOT EXISTS meter_types (
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon VARCHAR(30) NOT NULL,
  builtin TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_meter_types (
  project_id VARCHAR(64) NOT NULL,
  meter_type_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (project_id, meter_type_name),
  CONSTRAINT fk_project_meter_types_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_project_meter_types_type
    FOREIGN KEY (meter_type_name) REFERENCES meter_types (name)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_accounts (
  id VARCHAR(64) NOT NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  password_hash CHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_accounts_username (username),
  UNIQUE KEY uq_customer_accounts_email (email),
  UNIQUE KEY uq_customer_accounts_project (project_id),
  CONSTRAINT fk_customer_accounts_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(150) NOT NULL,
  brand_model VARCHAR(255) NOT NULL,
  brand VARCHAR(120) NOT NULL,
  device_type VARCHAR(120) NOT NULL,
  category VARCHAR(120) NULL,
  kind VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL,
  last_sync_label VARCHAR(80) NOT NULL,
  protocol VARCHAR(80) NULL,
  notes TEXT NULL,
  image VARCHAR(500) NULL,
  extra_fields JSON NULL,
  registers JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_devices_serial_number (serial_number),
  KEY idx_devices_status (status),
  KEY idx_devices_kind (kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS category VARCHAR(120) NULL AFTER device_type;

CREATE TABLE IF NOT EXISTS meter_points (
  id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  device_type VARCHAR(150) NOT NULL,
  parent_id VARCHAR(64) NULL,
  utility VARCHAR(100) NOT NULL,
  device_id VARCHAR(64) NULL,
  serial_number VARCHAR(150) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_meter_points_project_code (project_id, code),
  KEY idx_meter_points_parent (parent_id),
  KEY idx_meter_points_utility (project_id, utility),
  KEY idx_meter_points_serial (serial_number),
  CONSTRAINT fk_meter_points_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_meter_points_parent
    FOREIGN KEY (parent_id) REFERENCES meter_points (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_meter_points_device
    FOREIGN KEY (device_id) REFERENCES devices (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE meter_points
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(150) NULL AFTER device_id;
ALTER TABLE meter_points
  ADD INDEX IF NOT EXISTS idx_meter_points_serial (serial_number);

CREATE TABLE IF NOT EXISTS emission_factor_groups (
  id VARCHAR(100) NOT NULL,
  name VARCHAR(500) NOT NULL,
  source VARCHAR(500) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emission_factor_gases (
  group_id VARCHAR(100) NOT NULL,
  gas_key VARCHAR(10) NOT NULL,
  gas_label VARCHAR(20) NOT NULL,
  factor_value DECIMAL(18,6) NOT NULL,
  unit VARCHAR(80) NOT NULL,
  PRIMARY KEY (group_id, gas_key),
  CONSTRAINT fk_emission_factor_gases_group
    FOREIGN KEY (group_id) REFERENCES emission_factor_groups (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ghg_emission_sources (
  id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  scope_id TINYINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  input_method VARCHAR(30) NOT NULL,
  factor_group_id VARCHAR(100) NOT NULL,
  gas_key VARCHAR(10) NOT NULL,
  factor_value DECIMAL(18,6) NOT NULL,
  formula VARCHAR(500) NOT NULL,
  applied_at DATE NOT NULL,
  meter_point_id VARCHAR(64) NULL,
  tons_co2e DECIMAL(18,6) NULL,
  PRIMARY KEY (id),
  KEY idx_ghg_sources_project_scope (project_id, scope_id),
  CONSTRAINT fk_ghg_sources_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ghg_sources_factor
    FOREIGN KEY (factor_group_id, gas_key)
    REFERENCES emission_factor_gases (group_id, gas_key)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ghg_emission_sources
  ADD COLUMN IF NOT EXISTS meter_point_id VARCHAR(64) NULL AFTER applied_at;

CREATE TABLE IF NOT EXISTS alert_recipients (
  id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_alert_recipients_project (project_id),
  CONSTRAINT fk_alert_recipients_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alert_events (
  id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  meter_point_id VARCHAR(64) NULL,
  occurred_at DATETIME NOT NULL,
  parameter_name VARCHAR(100) NOT NULL,
  value DECIMAL(18,6) NOT NULL,
  unit VARCHAR(40) NULL,
  severity VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  note TEXT NULL,
  category VARCHAR(40) NULL,
  message VARCHAR(500) NULL,
  threshold_value DECIMAL(18,6) NULL,
  acknowledged_by VARCHAR(150) NULL,
  acknowledged_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_alert_events_project_time (project_id, occurred_at),
  CONSTRAINT fk_alert_events_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_alert_events_meter_point
    FOREIGN KEY (meter_point_id) REFERENCES meter_points (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS category VARCHAR(40) NULL AFTER note;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS message VARCHAR(500) NULL AFTER category;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS threshold_value DECIMAL(18,6) NULL AFTER message;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(150) NULL AFTER threshold_value;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS acknowledged_at DATETIME NULL AFTER acknowledged_by;

CREATE TABLE IF NOT EXISTS meter_readings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meter_point_id VARCHAR(64) NOT NULL,
  recorded_at DATETIME NOT NULL,
  metric VARCHAR(80) NOT NULL,
  value DECIMAL(20,8) NOT NULL,
  unit VARCHAR(40) NULL,
  quality VARCHAR(30) NOT NULL DEFAULT 'good',
  PRIMARY KEY (id),
  UNIQUE KEY uq_meter_readings_sample (meter_point_id, recorded_at, metric),
  KEY idx_meter_readings_time (meter_point_id, recorded_at),
  CONSTRAINT fk_meter_readings_meter_point
    FOREIGN KEY (meter_point_id) REFERENCES meter_points (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diagram_states (
  project_id VARCHAR(64) NOT NULL,
  utility VARCHAR(100) NOT NULL,
  positions JSON NOT NULL,
  viewport JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, utility),
  CONSTRAINT fk_diagram_states_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_settings (
  project_id VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id),
  CONSTRAINT fk_project_settings_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) NOT NULL,
  portal VARCHAR(20) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_auth_sessions_expiry (expires_at),
  KEY idx_auth_sessions_user (portal, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reference rows only. Demo projects, devices, accounts, and telemetry are not seeded.

INSERT IGNORE INTO meter_types (name, description, icon, builtin) VALUES
  ('Điện', 'Điện năng, công suất, chất lượng điện', 'bolt', 1),
  ('Nước', 'Lưu lượng và sản lượng nước', 'drop', 1),
  ('Nhiệt', 'Nhiệt độ và năng lượng nhiệt', 'thermo', 1),
  ('Hơi', 'Áp suất và lưu lượng hơi', 'steam', 1),
  ('Khí nén', 'Lưu lượng và áp suất khí nén', 'air', 0);

INSERT IGNORE INTO emission_factor_groups (id, name, source) VALUES
  ('do-industry', 'Hệ số phát thải của DO trong công nghiệp sản xuất và xây dựng*', 'Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),
  ('do-road', 'Hệ số phát thải của dầu DO trong phương tiện vận chuyển đường bộ*', 'Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),
  ('gasoline-road', 'Hệ số phát thải của xăng trong phương tiện vận chuyển đường bộ*', 'Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),
  ('lpg-industry', 'Hệ số phát thải của LPG trong công nghiệp*', 'Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),
  ('natural-gas', 'Hệ số phát thải của khí tự nhiên*', 'Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),
  ('anthracite', 'Hệ số phát thải của than antraxit*', 'Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I');

INSERT IGNORE INTO emission_factor_gases (group_id, gas_key, gas_label, factor_value, unit) VALUES
  ('do-industry', 'co2', 'CO₂', 74100, 'kg CO₂/TJ'), ('do-industry', 'ch4', 'CH₄', 3, 'kg CH₄/TJ'), ('do-industry', 'n2o', 'N₂O', 0.6, 'kg N₂O/TJ'),
  ('do-road', 'co2', 'CO₂', 74100, 'kg CO₂/TJ'), ('do-road', 'ch4', 'CH₄', 3.9, 'kg CH₄/TJ'), ('do-road', 'n2o', 'N₂O', 3.9, 'kg N₂O/TJ'),
  ('gasoline-road', 'co2', 'CO₂', 69300, 'kg CO₂/TJ'), ('gasoline-road', 'ch4', 'CH₄', 33, 'kg CH₄/TJ'), ('gasoline-road', 'n2o', 'N₂O', 3.2, 'kg N₂O/TJ'),
  ('lpg-industry', 'co2', 'CO₂', 63100, 'kg CO₂/TJ'), ('lpg-industry', 'ch4', 'CH₄', 1, 'kg CH₄/TJ'), ('lpg-industry', 'n2o', 'N₂O', 0.1, 'kg N₂O/TJ'),
  ('natural-gas', 'co2', 'CO₂', 56100, 'kg CO₂/TJ'), ('natural-gas', 'ch4', 'CH₄', 1, 'kg CH₄/TJ'), ('natural-gas', 'n2o', 'N₂O', 0.1, 'kg N₂O/TJ'),
  ('anthracite', 'co2', 'CO₂', 98300, 'kg CO₂/TJ'), ('anthracite', 'ch4', 'CH₄', 1, 'kg CH₄/TJ'), ('anthracite', 'n2o', 'N₂O', 1.5, 'kg N₂O/TJ');

INSERT IGNORE INTO schema_migrations (version) VALUES ('2026-09-14-ems-initial-schema');

CREATE TABLE IF NOT EXISTS gateway_devices (
  gateway_id VARCHAR(64) NOT NULL,
  protocol_version VARCHAR(20) NULL,
  internet CHAR(1) NULL,
  gateway_temperature VARCHAR(64) NULL,
  gateway_humidity VARCHAR(64) NULL,
  packet_number VARCHAR(64) NULL,
  meter_type CHAR(1) NULL,
  meter_model VARCHAR(191) NULL,
  meter_id VARCHAR(191) NULL,
  last_reading_time VARCHAR(64) NULL,
  last_is_replay TINYINT(1) NULL,
  last_error INT NULL,
  last_values JSON NULL,
  last_disposition VARCHAR(32) NULL,
  last_seen_at VARCHAR(40) NULL,
  wifi_ssid VARCHAR(191) NULL,
  wifi_password VARCHAR(191) NULL,
  time_update_seconds INT NOT NULL DEFAULT 30,
  PRIMARY KEY (gateway_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gateway_reading_keys (
  meter_model VARCHAR(191) NOT NULL,
  meter_id VARCHAR(191) NOT NULL,
  reading_time_raw VARCHAR(64) NOT NULL,
  PRIMARY KEY (meter_model, meter_id, reading_time_raw)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gateway_packets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  received_at VARCHAR(40) NOT NULL,
  disposition VARCHAR(32) NOT NULL,
  protocol_version VARCHAR(20) NOT NULL,
  internet CHAR(1) NOT NULL,
  packet_number VARCHAR(64) NOT NULL,
  gateway_id VARCHAR(64) NOT NULL,
  gateway_temperature VARCHAR(64) NULL,
  gateway_humidity VARCHAR(64) NULL,
  meter_type CHAR(1) NOT NULL,
  meter_model VARCHAR(191) NOT NULL,
  meter_id VARCHAR(191) NOT NULL,
  reading_time_raw VARCHAR(64) NOT NULL,
  is_replay TINYINT(1) NOT NULL,
  error_code INT NOT NULL,
  values_json JSON NOT NULL,
  date_time_alarm VARCHAR(64) NULL,
  id_alarm INT NULL,
  value_alarm DECIMAL(20,6) NULL,
  checksum VARCHAR(64) NOT NULL,
  raw_text MEDIUMTEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_gateway_packets_received (received_at),
  KEY idx_gateway_packets_gateway (gateway_id, received_at),
  KEY idx_gateway_packets_identity (meter_model, meter_id, reading_time_raw)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gateway_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  received_at VARCHAR(40) NOT NULL,
  level VARCHAR(20) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  gateway_id VARCHAR(64) NULL,
  meter_model VARCHAR(191) NULL,
  meter_id VARCHAR(191) NULL,
  reading_time_raw VARCHAR(64) NULL,
  packet_number VARCHAR(64) NULL,
  raw_text MEDIUMTEXT NULL,
  PRIMARY KEY (id),
  KEY idx_gateway_logs_received (received_at),
  KEY idx_gateway_logs_gateway (gateway_id, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gateway_alarms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source VARCHAR(20) NOT NULL,
  gateway_id VARCHAR(64) NOT NULL,
  meter_model VARCHAR(191) NULL,
  meter_id VARCHAR(191) NULL,
  occurred_at VARCHAR(64) NULL,
  alarm_code INT NULL,
  alarm_name VARCHAR(120) NULL,
  alarm_value DECIMAL(20,6) NULL,
  parameter_name VARCHAR(120) NULL,
  parameter_value DECIMAL(20,6) NULL,
  min_value DECIMAL(20,6) NULL,
  max_value DECIMAL(20,6) NULL,
  packet_id BIGINT UNSIGNED NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_gateway_alarms_created (created_at),
  KEY idx_gateway_alarms_gateway (gateway_id, created_at),
  KEY idx_gateway_alarms_source (source, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gateway_thresholds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gateway_id VARCHAR(64) NOT NULL DEFAULT '',
  meter_model VARCHAR(191) NOT NULL DEFAULT '',
  meter_id VARCHAR(191) NOT NULL DEFAULT '',
  parameter_name VARCHAR(120) NOT NULL,
  min_value DECIMAL(20,6) NULL,
  max_value DECIMAL(20,6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gateway_threshold (gateway_id, meter_model, meter_id, parameter_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('2026-09-23-gateway-server-1');

CREATE TABLE IF NOT EXISTS gateway_samples (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gateway_id INT UNSIGNED NOT NULL,
  meter_type TINYINT UNSIGNED NOT NULL,
  meter_model SMALLINT UNSIGNED NOT NULL,
  meter_id BIGINT UNSIGNED NOT NULL,
  packet_number INT UNSIGNED NOT NULL,
  received_at DATETIME(3) NOT NULL,
  sampled_unix INT UNSIGNED NULL,
  is_replay TINYINT(1) NOT NULL,
  error_code SMALLINT NOT NULL,
  crc_ok TINYINT(1) NOT NULL,
  values_json JSON NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gateway_sample (gateway_id, meter_id, packet_number),
  KEY idx_gateway_sample_meter (meter_model, meter_id, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gateway_meter_latest (
  meter_model SMALLINT UNSIGNED NOT NULL,
  meter_id BIGINT UNSIGNED NOT NULL,
  gateway_id INT UNSIGNED NOT NULL,
  meter_type TINYINT UNSIGNED NOT NULL,
  packet_number INT UNSIGNED NOT NULL,
  received_at DATETIME(3) NOT NULL,
  sampled_unix INT UNSIGNED NULL,
  error_code SMALLINT NOT NULL,
  values_json JSON NOT NULL,
  PRIMARY KEY (meter_model, meter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('2026-10-04-gateway-samples');
