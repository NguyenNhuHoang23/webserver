-- EMS local database for XAMPP / MariaDB 10.4+
-- Safe to run repeatedly: objects use IF NOT EXISTS and seeds use INSERT IGNORE.

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

-- Seed data mirrors the prototype's current demo data.

INSERT IGNORE INTO accounts (id, username, email, role, password_hash, created_at) VALUES
  ('acc-1', 'admin_system', 'admin@ems-precision.com', 'Quản trị viên', SHA2('123456', 256), '2024-01-01'),
  ('acc-2', 'kisu_vanhanh', 'operator01@sunergy.com', 'Kỹ sư vận hành', SHA2('123456', 256), '2023-06-15'),
  ('acc-3', 'quanly_duan', 'manager.pro@fujikin.vn', 'Quản lý dự án', SHA2('123456', 256), '2023-10-01'),
  ('acc-4', 'nhanvien_kythuat', 'tech.support@ems.com', 'Nhân viên kỹ thuật', SHA2('123456', 256), '2023-12-20'),
  ('acc-5', 'admin_chinhanh', 'admin.hn@ems.com', 'Quản trị viên', SHA2('123456', 256), '2024-02-05'),
  ('acc-6', 'kisu_baotri', 'maintenance@sunergy.com', 'Kỹ sư vận hành', SHA2('123456', 256), '2024-03-12'),
  ('acc-7', 'quanly_nangluong', 'energy.lead@fujikin.vn', 'Quản lý dự án', SHA2('123456', 256), '2023-11-08'),
  ('acc-8', 'kythuat_hotro', 'helpdesk@ems.com', 'Nhân viên kỹ thuật', SHA2('123456', 256), '2024-01-22'),
  ('acc-9', 'operator_shift2', 'operator02@sunergy.com', 'Kỹ sư vận hành', SHA2('123456', 256), '2023-07-18'),
  ('acc-10', 'pm_thainguyen', 'pm.tn@fujikin.vn', 'Quản lý dự án', SHA2('123456', 256), '2024-04-04'),
  ('acc-11', 'tech_field', 'field.tech@ems.com', 'Nhân viên kỹ thuật', SHA2('123456', 256), '2023-09-29'),
  ('acc-12', 'auditor_ghg', 'auditor@ems-precision.com', 'Quản trị viên', SHA2('123456', 256), '2024-05-11');

INSERT IGNORE INTO projects (id, initials, accent, name, customer, status, start_date) VALUES
  ('PRJ-2401', 'SN', '#1a73e8', 'Sunrise Bắc Ninh Factory', 'Sunrise Group', 'active', '2023-03-12'),
  ('PRJ-2402', 'VM', '#0f9d58', 'Vinamilk Bình Dương Plant', 'Vinamilk', 'active', '2024-01-08'),
  ('PRJ-2403', 'SS', '#7c3aed', 'Samsung Thái Nguyên Campus', 'Samsung Vietnam', 'maintenance', '2022-11-21'),
  ('PRJ-2404', 'TH', '#ea580c', 'TH True Milk Nghệ An', 'TH Group', 'active', '2023-06-03'),
  ('PRJ-2405', 'FT', '#0284c7', 'Formosa Hà Tĩnh Steel', 'Formosa', 'paused', '2021-09-15'),
  ('PRJ-2406', 'HV', '#1a73e8', 'Hòa Phát Dung Quất', 'Hòa Phát', 'active', '2023-04-19'),
  ('PRJ-2407', 'UN', '#0d9488', 'Unilever Củ Chi Factory', 'Unilever', 'active', '2024-02-02'),
  ('PRJ-2408', 'PN', '#dc2626', 'PouYuen Đồng Nai', 'PouYuen', 'maintenance', '2022-08-11'),
  ('PRJ-2409', 'NS', '#2563eb', 'Nestlé Trị An Plant', 'Nestlé', 'active', '2023-07-27'),
  ('PRJ-2410', 'LG', '#a21caf', 'LG Display Hải Phòng', 'LG Vietnam', 'active', '2023-05-14');

INSERT IGNORE INTO meter_types (name, description, icon, builtin) VALUES
  ('Điện', 'Điện năng, công suất, chất lượng điện', 'bolt', 1),
  ('Nước', 'Lưu lượng và sản lượng nước', 'drop', 1),
  ('Nhiệt', 'Nhiệt độ và năng lượng nhiệt', 'thermo', 1),
  ('Hơi', 'Áp suất và lưu lượng hơi', 'steam', 1),
  ('Khí nén', 'Lưu lượng và áp suất khí nén', 'air', 0);

INSERT IGNORE INTO project_meter_types (project_id, meter_type_name) VALUES
  ('PRJ-2401', 'Điện'), ('PRJ-2401', 'Nước'), ('PRJ-2401', 'Nhiệt'), ('PRJ-2401', 'Hơi'), ('PRJ-2401', 'Khí nén'),
  ('PRJ-2402', 'Điện'), ('PRJ-2402', 'Nước'), ('PRJ-2402', 'Nhiệt'), ('PRJ-2402', 'Hơi'),
  ('PRJ-2403', 'Điện'), ('PRJ-2403', 'Nước'), ('PRJ-2403', 'Nhiệt'), ('PRJ-2403', 'Hơi'),
  ('PRJ-2404', 'Điện'), ('PRJ-2404', 'Nước'), ('PRJ-2404', 'Nhiệt'), ('PRJ-2404', 'Hơi'),
  ('PRJ-2405', 'Điện'), ('PRJ-2405', 'Nước'), ('PRJ-2405', 'Nhiệt'), ('PRJ-2405', 'Hơi'),
  ('PRJ-2406', 'Điện'), ('PRJ-2406', 'Nước'), ('PRJ-2406', 'Nhiệt'), ('PRJ-2406', 'Hơi'),
  ('PRJ-2407', 'Điện'), ('PRJ-2407', 'Nước'), ('PRJ-2407', 'Nhiệt'), ('PRJ-2407', 'Hơi'),
  ('PRJ-2408', 'Điện'), ('PRJ-2408', 'Nước'), ('PRJ-2408', 'Nhiệt'), ('PRJ-2408', 'Hơi'),
  ('PRJ-2409', 'Điện'), ('PRJ-2409', 'Nước'), ('PRJ-2409', 'Nhiệt'), ('PRJ-2409', 'Hơi'),
  ('PRJ-2410', 'Điện'), ('PRJ-2410', 'Nước'), ('PRJ-2410', 'Nhiệt'), ('PRJ-2410', 'Hơi');

INSERT IGNORE INTO customer_accounts (id, username, email, display_name, project_id, password_hash) VALUES
  ('cus-1', 'khachhang', 'khachhang@sunrise.com', 'Sunrise Group', 'PRJ-2401', SHA2('123456', 256)),
  ('cus-2', 'vinamilk', 'ems@vinamilk.com.vn', 'Vinamilk', 'PRJ-2402', SHA2('123456', 256));

INSERT IGNORE INTO devices
  (id, name, serial_number, brand_model, brand, device_type, kind, status, last_sync_label, protocol)
VALUES
  ('dev-1', 'Power Meter Main-01', 'SN: EM-992834-A', 'Schneider iEM3000', 'Schneider', 'Power Meter', 'power', 'active', '10:45:22 24/05/2024', 'Modbus RTU'),
  ('dev-2', 'Water Flow Sensor-B2', 'SN: WF-112093-X', 'Siemens SITRANS F', 'Siemens', 'Flow Meter', 'flow', 'active', '10:42:15 24/05/2024', 'Modbus TCP'),
  ('dev-3', 'Temp Probe Line-C', 'SN: TP-445021-Z', 'ABB SensyTemp', 'ABB', 'Temperature', 'temp', 'maintenance', '09:12:01 24/05/2024', 'M-Bus'),
  ('dev-4', 'Steam Gauge High-P', 'SN: SG-778120-K', 'Yokogawa EJX', 'Yokogawa', 'Steam Meter', 'steam', 'active', 'Vừa xong', 'Modbus TCP'),
  ('dev-5', 'Power Meter Sub-02', 'SN: EM-883401-B', 'Schneider PM5100', 'Schneider', 'Power Meter', 'power', 'offline', '18:20:44 23/05/2024', 'Modbus TCP'),
  ('dev-6', 'Cooling Water Meter-01', 'SN: WF-220184-Y', 'Siemens MAG 5100', 'Siemens', 'Flow Meter', 'flow', 'active', '10:44:02 24/05/2024', 'Modbus TCP');

INSERT IGNORE INTO meter_points
  (id, project_id, name, code, device_type, parent_id, utility, device_id)
VALUES
  ('m1', 'PRJ-2401', 'Main Panel Tổng tầng 1', 'MP-001', 'Đồng hồ tổng 3 pha', NULL, 'Điện', 'dev-1'),
  ('m2', 'PRJ-2401', 'Phòng Server', 'PS-001', 'Smart Meter V3', 'm1', 'Điện', 'dev-5'),
  ('m3', 'PRJ-2401', 'Chiller Unit 1', 'CHU-01', 'Sub-meter Modbus', 'm1', 'Điện', NULL),
  ('m4', 'PRJ-2401', 'HVAC System', 'HVAC-01', 'Power Analyzer', 'm1', 'Điện', NULL),
  ('m5', 'PRJ-2401', 'Đồng hồ nước đầu nguồn', 'WTR-01', 'Đồng hồ lưu lượng', NULL, 'Nước', 'dev-2'),
  ('m6', 'PRJ-2401', 'Lò hơi trung tâm', 'STM-01', 'Cảm biến hơi', NULL, 'Hơi', 'dev-4'),
  ('m7', 'PRJ-2401', 'Cảm biến nhiệt dàn', 'HT-01', 'Nhiệt kế IoT', NULL, 'Nhiệt', 'dev-3');

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

INSERT IGNORE INTO ghg_emission_sources
  (id, project_id, scope_id, name, input_method, factor_group_id, gas_key, factor_value, formula, applied_at, tons_co2e)
VALUES
  ('src-1', 'PRJ-2401', 1, 'Khí Gas (LPG)', 'manual', 'do-industry', 'co2', 74100, '{Giá trị thủ công} * {Hệ số phát thải}', '2024-01-01', 850.2),
  ('src-2', 'PRJ-2401', 1, 'Nhiên liệu phương tiện', 'manual', 'do-road', 'co2', 74100, '{Giá trị thủ công} * {Hệ số phát thải}', '2024-01-01', 170.0),
  ('src-3', 'PRJ-2401', 1, 'Phát thải rò rỉ (Gas lạnh)', 'manual', 'do-industry', 'co2', 74100, '{Giá trị thủ công} * {Hệ số phát thải}', '2024-01-01', 42.5),
  ('src-4', 'PRJ-2401', 2, 'Sử dụng điện năng', 'meter', 'natural-gas', 'co2', 56100, '{Giá trị điểm đo} * {Hệ số phát thải}', '2024-03-01', 3188.1),
  ('src-5', 'PRJ-2401', 2, 'Phát thải mua hơi nước', 'meter', 'natural-gas', 'co2', 56100, '{Giá trị điểm đo} * {Hệ số phát thải}', '2024-03-01', 212.0),
  ('src-6', 'PRJ-2401', 3, 'Vận tải hàng hóa đầu vào', 'file', 'gasoline-road', 'co2', 69300, '{Giá trị điểm đo} * {Hệ số phát thải}', '2024-02-15', 95.4);

INSERT IGNORE INTO alert_events
  (id, project_id, meter_point_id, occurred_at, parameter_name, value, unit, severity, status,
   category, message, threshold_value)
VALUES
  ('alert-1', 'PRJ-2401', 'm1', '2026-07-19 07:38:48', 'F_avg', 49.79, 'Hz', 'warning', 'open', 'frequency', 'Tần số lưới thấp hơn ngưỡng vận hành', 49.5),
  ('alert-2', 'PRJ-2401', 'm1', '2026-07-19 07:38:38', 'F_avg', 50.42, 'Hz', 'warning', 'open', 'frequency', 'Tần số lưới vượt ngưỡng vận hành', 50.5),
  ('alert-3', 'PRJ-2401', 'm3', '2026-07-19 07:22:11', 'U_unb', 2.14, '%', 'critical', 'open', 'unbalance', 'Mất cân bằng điện áp giữa các pha', 2),
  ('alert-4', 'PRJ-2401', 'm3', '2026-07-19 06:51:03', 'I_rms', 612.4, 'A', 'warning', 'open', 'current', 'Dòng điện RMS vượt ngưỡng thiết bị', 600),
  ('alert-5', 'PRJ-2401', 'm1', '2026-07-19 06:18:40', 'P_sum', 186.2, 'kW', 'info', 'open', 'power', 'Công suất hữu công tăng cao trong giờ vận hành', 180);

UPDATE alert_events SET category = 'frequency', message = 'Tần số lưới thấp hơn ngưỡng vận hành', threshold_value = 49.5
 WHERE id = 'alert-1' AND category IS NULL;
UPDATE alert_events SET category = 'frequency', message = 'Tần số lưới vượt ngưỡng vận hành', threshold_value = 50.5
 WHERE id = 'alert-2' AND category IS NULL;
UPDATE alert_events SET category = 'unbalance', message = 'Mất cân bằng điện áp giữa các pha', threshold_value = 2
 WHERE id = 'alert-3' AND category IS NULL;
UPDATE alert_events SET category = 'current', message = 'Dòng điện RMS vượt ngưỡng thiết bị', threshold_value = 600
 WHERE id = 'alert-4' AND category IS NULL;
UPDATE alert_events SET category = 'power', message = 'Công suất hữu công tăng cao trong giờ vận hành', threshold_value = 180
 WHERE id = 'alert-5' AND category IS NULL;

INSERT IGNORE INTO meter_readings (meter_point_id, recorded_at, metric, value, unit, quality) VALUES
  ('m1', '2026-07-01 12:00:00', 'energy', 198.4, 'kWh', 'good'),
  ('m1', '2026-07-02 12:00:00', 'energy', 186.2, 'kWh', 'good'),
  ('m1', '2026-07-03 12:00:00', 'energy', 172.8, 'kWh', 'good'),
  ('m1', '2026-07-04 12:00:00', 'energy', 96.5, 'kWh', 'good'),
  ('m1', '2026-07-05 12:00:00', 'energy', 210.6, 'kWh', 'good'),
  ('m1', '2026-07-06 12:00:00', 'energy', 148.3, 'kWh', 'good'),
  ('m1', '2026-07-07 12:00:00', 'energy', 88.1, 'kWh', 'good'),
  ('m1', '2026-07-08 12:00:00', 'energy', 205.9, 'kWh', 'good'),
  ('m1', '2026-07-09 12:00:00', 'energy', 168.4, 'kWh', 'good'),
  ('m1', '2026-07-10 12:00:00', 'energy', 46.4, 'kWh', 'good'),
  ('m1', '2026-07-11 12:00:00', 'energy', 194.7, 'kWh', 'good'),
  ('m1', '2026-07-12 12:00:00', 'energy', 221.5, 'kWh', 'good'),
  ('m1', '2026-07-13 12:00:00', 'energy', 158.2, 'kWh', 'good'),
  ('m1', '2026-07-14 12:00:00', 'energy', 74.6, 'kWh', 'good'),
  ('m1', '2026-07-15 12:00:00', 'energy', 236.8, 'kWh', 'good'),
  ('m1', '2026-07-16 12:00:00', 'energy', 182.3, 'kWh', 'good'),
  ('m1', '2026-07-17 12:00:00', 'energy', 129.7, 'kWh', 'good'),
  ('m1', '2026-07-18 12:00:00', 'energy', 214.1, 'kWh', 'good'),
  ('m1', '2026-07-19 12:00:00', 'energy', 216.9, 'kWh', 'good'),
  ('m1', '2026-07-19 07:38:48', 'frequency', 49.79, 'Hz', 'good'),
  ('m1', '2026-07-19 07:38:48', 'power', 186.2, 'kW', 'good'),
  ('m1', '2026-07-19 07:38:48', 'voltage', 400.2, 'V', 'good'),
  ('m1', '2026-07-19 07:38:48', 'current', 42.1, 'A', 'good'),
  ('m3', '2026-07-19 07:22:11', 'unbalance', 2.14, '%', 'good'),
  ('m3', '2026-07-19 06:51:03', 'current', 612.4, 'A', 'good');

INSERT IGNORE INTO schema_migrations (version) VALUES ('2026-09-14-ems-initial-schema');
