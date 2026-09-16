-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: ems_local
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts` (
  `id` varchar(64) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(80) NOT NULL,
  `password_hash` char(64) NOT NULL,
  `created_at` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_username` (`username`),
  UNIQUE KEY `uq_accounts_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES ('acc-1','admin_system','admin@ems-precision.com','Quản trị viên','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2024-01-01'),('acc-10','pm_thainguyen','pm.tn@fujikin.vn','Quản lý dự án','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2024-04-04'),('acc-11','tech_field','field.tech@ems.com','Nhân viên kỹ thuật','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2023-09-29'),('acc-12','auditor_ghg','auditor@ems-precision.com','Quản trị viên','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2024-05-11'),('acc-2','kisu_vanhanh','operator01@sunergy.com','Kỹ sư vận hành','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2023-06-15'),('acc-3','quanly_duan','manager.pro@fujikin.vn','Quản lý dự án','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2023-10-01'),('acc-4','nhanvien_kythuat','tech.support@ems.com','Nhân viên kỹ thuật','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2023-12-20'),('acc-5','admin_chinhanh','admin.hn@ems.com','Quản trị viên','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2024-02-05'),('acc-6','kisu_baotri','maintenance@sunergy.com','Kỹ sư vận hành','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2024-03-12'),('acc-7','quanly_nangluong','energy.lead@fujikin.vn','Quản lý dự án','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2023-11-08'),('acc-8','kythuat_hotro','helpdesk@ems.com','Nhân viên kỹ thuật','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2024-01-22'),('acc-9','operator_shift2','operator02@sunergy.com','Kỹ sư vận hành','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','2023-07-18');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_events`
--

DROP TABLE IF EXISTS `alert_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alert_events` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `meter_point_id` varchar(64) DEFAULT NULL,
  `occurred_at` datetime NOT NULL,
  `parameter_name` varchar(100) NOT NULL,
  `value` decimal(18,6) NOT NULL,
  `unit` varchar(40) DEFAULT NULL,
  `severity` varchar(30) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'open',
  `note` text DEFAULT NULL,
  `category` varchar(40) DEFAULT NULL,
  `message` varchar(500) DEFAULT NULL,
  `threshold_value` decimal(18,6) DEFAULT NULL,
  `acknowledged_by` varchar(150) DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_alert_events_project_time` (`project_id`,`occurred_at`),
  KEY `fk_alert_events_meter_point` (`meter_point_id`),
  CONSTRAINT `fk_alert_events_meter_point` FOREIGN KEY (`meter_point_id`) REFERENCES `meter_points` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_alert_events_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_events`
--

LOCK TABLES `alert_events` WRITE;
/*!40000 ALTER TABLE `alert_events` DISABLE KEYS */;
INSERT INTO `alert_events` VALUES ('alert-1','PRJ-2401','m1','2026-07-19 07:38:48','F_avg',49.790000,'Hz','warning','open',NULL,'frequency','Tần số lưới thấp hơn ngưỡng vận hành',49.500000,NULL,NULL),('alert-2','PRJ-2401','m1','2026-07-19 07:38:38','F_avg',50.420000,'Hz','warning','open',NULL,'frequency','Tần số lưới vượt ngưỡng vận hành',50.500000,NULL,NULL),('alert-3','PRJ-2401','m3','2026-07-19 07:22:11','U_unb',2.140000,'%','critical','open',NULL,'unbalance','Mất cân bằng điện áp giữa các pha',2.000000,NULL,NULL),('alert-4','PRJ-2401','m3','2026-07-19 06:51:03','I_rms',612.400000,'A','warning','open',NULL,'current','Dòng điện RMS vượt ngưỡng thiết bị',600.000000,NULL,NULL),('alert-5','PRJ-2401','m1','2026-07-19 06:18:40','P_sum',186.200000,'kW','info','open',NULL,'power','Công suất hữu công tăng cao trong giờ vận hành',180.000000,NULL,NULL);
/*!40000 ALTER TABLE `alert_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_recipients`
--

DROP TABLE IF EXISTS `alert_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alert_recipients` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_alert_recipients_project` (`project_id`),
  CONSTRAINT `fk_alert_recipients_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_recipients`
--

LOCK TABLES `alert_recipients` WRITE;
/*!40000 ALTER TABLE `alert_recipients` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_recipients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_sessions`
--

DROP TABLE IF EXISTS `auth_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_sessions` (
  `token_hash` char(64) NOT NULL,
  `portal` varchar(20) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `project_id` varchar(64) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`token_hash`),
  KEY `idx_auth_sessions_expiry` (`expires_at`),
  KEY `idx_auth_sessions_user` (`portal`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_sessions`
--

LOCK TABLES `auth_sessions` WRITE;
/*!40000 ALTER TABLE `auth_sessions` DISABLE KEYS */;
INSERT INTO `auth_sessions` VALUES ('12b6b11a84870abef47e1246103c5219f4f789749704fa3a5c53c8b24b174a66','admin','acc-1',NULL,'2026-10-14 16:28:04','2026-09-14 09:28:04'),('5aaced85b720a6d44c8494254ba8c46b7a4a7b8c76aee73dd89f1da92935a6f8','admin','acc-1',NULL,'2026-10-16 11:16:59','2026-09-16 04:16:59'),('6a4eaeb69d3671fced16083796a59d6fcbd075a6347d3eca7d157c419061efd5','admin','acc-1',NULL,'2026-10-15 18:13:40','2026-09-15 11:13:40'),('6fb8739f9cf647a9e1fb74609f7c5edd43898f37a1b5ed9315561fd4dd0defe3','admin','acc-1',NULL,'2026-10-14 16:09:52','2026-09-14 09:09:52'),('751f4112ac09218e349cc6e9c98ca2d00a57d25f29041a08414c8608c723829d','admin','acc-1',NULL,'2026-10-16 11:17:14','2026-09-16 04:17:14');
/*!40000 ALTER TABLE `auth_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_accounts`
--

DROP TABLE IF EXISTS `customer_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_accounts` (
  `id` varchar(64) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `password_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_accounts_username` (`username`),
  UNIQUE KEY `uq_customer_accounts_email` (`email`),
  UNIQUE KEY `uq_customer_accounts_project` (`project_id`),
  CONSTRAINT `fk_customer_accounts_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_accounts`
--

LOCK TABLES `customer_accounts` WRITE;
/*!40000 ALTER TABLE `customer_accounts` DISABLE KEYS */;
INSERT INTO `customer_accounts` VALUES ('cus-1','khachhang','khachhang@sunrise.com','Sunrise Group','PRJ-2401','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'),('cus-2','vinamilk','ems@vinamilk.com.vn','Vinamilk','PRJ-2402','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'),('cus-PRJ-2411','prj-2411','prj-2411@ems.local','Công ty ABC','PRJ-2411','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'),('cus-PRJ-2413','prj-2413','prj-2413@ems.local','Công ty aa','PRJ-2413','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92');
/*!40000 ALTER TABLE `customer_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `devices` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `serial_number` varchar(150) NOT NULL,
  `brand_model` varchar(255) NOT NULL,
  `brand` varchar(120) NOT NULL,
  `device_type` varchar(120) NOT NULL,
  `kind` varchar(30) NOT NULL,
  `status` varchar(30) NOT NULL,
  `last_sync_label` varchar(80) NOT NULL,
  `protocol` varchar(80) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `extra_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`extra_fields`)),
  `registers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`registers`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_devices_serial_number` (`serial_number`),
  KEY `idx_devices_status` (`status`),
  KEY `idx_devices_kind` (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devices`
--

LOCK TABLES `devices` WRITE;
/*!40000 ALTER TABLE `devices` DISABLE KEYS */;
INSERT INTO `devices` VALUES ('dev-1','Power Meter Main-01','SN: EM-992834-A','Schneider iEM3000','Schneider','Power Meter','power','active','10:45:22 24/05/2024','Modbus RTU',NULL,NULL,NULL,NULL),('dev-2','Water Flow Sensor-B2','SN: WF-112093-X','Siemens SITRANS F','Siemens','Flow Meter','flow','active','10:42:15 24/05/2024','Modbus TCP',NULL,NULL,NULL,NULL),('dev-3','Temp Probe Line-C','SN: TP-445021-Z','ABB SensyTemp','ABB','Temperature','temp','maintenance','09:12:01 24/05/2024','M-Bus',NULL,NULL,NULL,NULL),('dev-4','Steam Gauge High-P','SN: SG-778120-K','Yokogawa EJX','Yokogawa','Steam Meter','steam','active','Vừa xong','Modbus TCP',NULL,NULL,NULL,NULL),('dev-5','Power Meter Sub-02','SN: EM-883401-B','Schneider PM5100','Schneider','Power Meter','power','offline','18:20:44 23/05/2024','Modbus TCP',NULL,NULL,NULL,NULL),('dev-6','Cooling Water Meter-01','SN: WF-220184-Y','Siemens MAG 5100','Siemens','Flow Meter','flow','active','10:44:02 24/05/2024','Modbus TCP',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `diagram_states`
--

DROP TABLE IF EXISTS `diagram_states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagram_states` (
  `project_id` varchar(64) NOT NULL,
  `utility` varchar(100) NOT NULL,
  `positions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`positions`)),
  `viewport` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`viewport`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`project_id`,`utility`),
  CONSTRAINT `fk_diagram_states_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `diagram_states`
--

LOCK TABLES `diagram_states` WRITE;
/*!40000 ALTER TABLE `diagram_states` DISABLE KEYS */;
INSERT INTO `diagram_states` VALUES ('PRJ-2401','Điện','{}','{\"x\":14,\"y\":61,\"zoom\":0.342}','2026-09-14 09:47:08'),('PRJ-2411','Điện','{}','{\"x\":208,\"y\":85,\"zoom\":0.506}','2026-09-14 09:21:17'),('PRJ-2412','Điện','{}','{\"x\":37,\"y\":36,\"zoom\":1.012}','2026-09-14 09:30:49'),('PRJ-2413','Điện','{\"m1\":{\"x\":400,\"y\":-97}}','{\"x\":253,\"y\":113,\"zoom\":1}','2026-09-16 05:17:36');
/*!40000 ALTER TABLE `diagram_states` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emission_factor_gases`
--

DROP TABLE IF EXISTS `emission_factor_gases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `emission_factor_gases` (
  `group_id` varchar(100) NOT NULL,
  `gas_key` varchar(10) NOT NULL,
  `gas_label` varchar(20) NOT NULL,
  `factor_value` decimal(18,6) NOT NULL,
  `unit` varchar(80) NOT NULL,
  PRIMARY KEY (`group_id`,`gas_key`),
  CONSTRAINT `fk_emission_factor_gases_group` FOREIGN KEY (`group_id`) REFERENCES `emission_factor_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emission_factor_gases`
--

LOCK TABLES `emission_factor_gases` WRITE;
/*!40000 ALTER TABLE `emission_factor_gases` DISABLE KEYS */;
INSERT INTO `emission_factor_gases` VALUES ('anthracite','ch4','CH₄',1.000000,'kg CH₄/TJ'),('anthracite','co2','CO₂',98300.000000,'kg CO₂/TJ'),('anthracite','n2o','N₂O',1.500000,'kg N₂O/TJ'),('do-industry','ch4','CH₄',3.000000,'kg CH₄/TJ'),('do-industry','co2','CO₂',74100.000000,'kg CO₂/TJ'),('do-industry','n2o','N₂O',0.600000,'kg N₂O/TJ'),('do-road','ch4','CH₄',3.900000,'kg CH₄/TJ'),('do-road','co2','CO₂',74100.000000,'kg CO₂/TJ'),('do-road','n2o','N₂O',3.900000,'kg N₂O/TJ'),('gasoline-road','ch4','CH₄',33.000000,'kg CH₄/TJ'),('gasoline-road','co2','CO₂',69300.000000,'kg CO₂/TJ'),('gasoline-road','n2o','N₂O',3.200000,'kg N₂O/TJ'),('lpg-industry','ch4','CH₄',1.000000,'kg CH₄/TJ'),('lpg-industry','co2','CO₂',63100.000000,'kg CO₂/TJ'),('lpg-industry','n2o','N₂O',0.100000,'kg N₂O/TJ'),('natural-gas','ch4','CH₄',1.000000,'kg CH₄/TJ'),('natural-gas','co2','CO₂',56100.000000,'kg CO₂/TJ'),('natural-gas','n2o','N₂O',0.100000,'kg N₂O/TJ');
/*!40000 ALTER TABLE `emission_factor_gases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emission_factor_groups`
--

DROP TABLE IF EXISTS `emission_factor_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `emission_factor_groups` (
  `id` varchar(100) NOT NULL,
  `name` varchar(500) NOT NULL,
  `source` varchar(500) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emission_factor_groups`
--

LOCK TABLES `emission_factor_groups` WRITE;
/*!40000 ALTER TABLE `emission_factor_groups` DISABLE KEYS */;
INSERT INTO `emission_factor_groups` VALUES ('anthracite','Hệ số phát thải của than antraxit*','Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),('do-industry','Hệ số phát thải của DO trong công nghiệp sản xuất và xây dựng*','Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),('do-road','Hệ số phát thải của dầu DO trong phương tiện vận chuyển đường bộ*','Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),('gasoline-road','Hệ số phát thải của xăng trong phương tiện vận chuyển đường bộ*','Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),('lpg-industry','Hệ số phát thải của LPG trong công nghiệp*','Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I'),('natural-gas','Hệ số phát thải của khí tự nhiên*','Quyết định số 2626/QĐ-BTNMT ngày 10/10/2022, Phụ lục I');
/*!40000 ALTER TABLE `emission_factor_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ghg_emission_sources`
--

DROP TABLE IF EXISTS `ghg_emission_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ghg_emission_sources` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `scope_id` tinyint(3) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `input_method` varchar(30) NOT NULL,
  `factor_group_id` varchar(100) NOT NULL,
  `gas_key` varchar(10) NOT NULL,
  `factor_value` decimal(18,6) NOT NULL,
  `formula` varchar(500) NOT NULL,
  `applied_at` date NOT NULL,
  `meter_point_id` varchar(64) DEFAULT NULL,
  `tons_co2e` decimal(18,6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ghg_sources_project_scope` (`project_id`,`scope_id`),
  KEY `fk_ghg_sources_factor` (`factor_group_id`,`gas_key`),
  CONSTRAINT `fk_ghg_sources_factor` FOREIGN KEY (`factor_group_id`, `gas_key`) REFERENCES `emission_factor_gases` (`group_id`, `gas_key`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ghg_sources_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ghg_emission_sources`
--

LOCK TABLES `ghg_emission_sources` WRITE;
/*!40000 ALTER TABLE `ghg_emission_sources` DISABLE KEYS */;
INSERT INTO `ghg_emission_sources` VALUES ('src-1','PRJ-2401',1,'Khí Gas (LPG)','manual','do-industry','co2',74100.000000,'{Giá trị thủ công} * {Hệ số phát thải}','2024-01-01',NULL,850.200000),('src-1789532447691','PRJ-2413',1,'Main Panel Tổng tầng 1','meter','anthracite','ch4',1.000000,'{Giá trị điểm đo} * {Hệ số phát thải}','2024-01-01','m1',NULL),('src-2','PRJ-2401',1,'Nhiên liệu phương tiện','manual','do-road','co2',74100.000000,'{Giá trị thủ công} * {Hệ số phát thải}','2024-01-01',NULL,170.000000),('src-3','PRJ-2401',1,'Phát thải rò rỉ (Gas lạnh)','manual','do-industry','co2',74100.000000,'{Giá trị thủ công} * {Hệ số phát thải}','2024-01-01',NULL,42.500000),('src-4','PRJ-2401',2,'Sử dụng điện năng','meter','natural-gas','co2',56100.000000,'{Giá trị điểm đo} * {Hệ số phát thải}','2024-03-01',NULL,3188.100000),('src-5','PRJ-2401',2,'Phát thải mua hơi nước','meter','natural-gas','co2',56100.000000,'{Giá trị điểm đo} * {Hệ số phát thải}','2024-03-01',NULL,212.000000),('src-6','PRJ-2401',3,'Vận tải hàng hóa đầu vào','file','gasoline-road','co2',69300.000000,'{Giá trị điểm đo} * {Hệ số phát thải}','2024-02-15',NULL,95.400000);
/*!40000 ALTER TABLE `ghg_emission_sources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meter_points`
--

DROP TABLE IF EXISTS `meter_points`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meter_points` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `device_type` varchar(150) NOT NULL,
  `parent_id` varchar(64) DEFAULT NULL,
  `utility` varchar(100) NOT NULL,
  `device_id` varchar(64) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_meter_points_project_code` (`project_id`,`code`),
  KEY `idx_meter_points_parent` (`parent_id`),
  KEY `idx_meter_points_utility` (`project_id`,`utility`),
  KEY `fk_meter_points_device` (`device_id`),
  KEY `idx_meter_points_serial` (`serial_number`),
  CONSTRAINT `fk_meter_points_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_meter_points_parent` FOREIGN KEY (`parent_id`) REFERENCES `meter_points` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_meter_points_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meter_points`
--

LOCK TABLES `meter_points` WRITE;
/*!40000 ALTER TABLE `meter_points` DISABLE KEYS */;
INSERT INTO `meter_points` VALUES ('m-1789535089112','PRJ-2413','Power Meter Main-01','DEV-1','Schneider iEM3000',NULL,'Điện','dev-1','SN: EM-992834-A'),('m1','PRJ-2401','Main Panel Tổng tầng 1','MP-001','Đồng hồ tổng 3 pha',NULL,'Điện','dev-1',NULL),('m2','PRJ-2401','Phòng Server','PS-001','Smart Meter V3','m1','Điện','dev-5',NULL),('m3','PRJ-2401','Chiller Unit 1','CHU-01','Sub-meter Modbus','m1','Điện',NULL,NULL),('m4','PRJ-2401','HVAC System','HVAC-01','Power Analyzer','m1','Điện',NULL,NULL),('m5','PRJ-2401','Đồng hồ nước đầu nguồn','WTR-01','Đồng hồ lưu lượng',NULL,'Nước','dev-2',NULL),('m6','PRJ-2401','Lò hơi trung tâm','STM-01','Cảm biến hơi',NULL,'Hơi','dev-4',NULL),('m7','PRJ-2401','Cảm biến nhiệt dàn','HT-01','Nhiệt kế IoT',NULL,'Nhiệt','dev-3',NULL);
/*!40000 ALTER TABLE `meter_points` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meter_readings`
--

DROP TABLE IF EXISTS `meter_readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meter_readings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `meter_point_id` varchar(64) NOT NULL,
  `recorded_at` datetime NOT NULL,
  `metric` varchar(80) NOT NULL,
  `value` decimal(20,8) NOT NULL,
  `unit` varchar(40) DEFAULT NULL,
  `quality` varchar(30) NOT NULL DEFAULT 'good',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_meter_readings_sample` (`meter_point_id`,`recorded_at`,`metric`),
  KEY `idx_meter_readings_time` (`meter_point_id`,`recorded_at`),
  CONSTRAINT `fk_meter_readings_meter_point` FOREIGN KEY (`meter_point_id`) REFERENCES `meter_points` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meter_readings`
--

LOCK TABLES `meter_readings` WRITE;
/*!40000 ALTER TABLE `meter_readings` DISABLE KEYS */;
INSERT INTO `meter_readings` VALUES (1,'m1','2026-07-01 12:00:00','energy',198.40000000,'kWh','good'),(2,'m1','2026-07-02 12:00:00','energy',186.20000000,'kWh','good'),(3,'m1','2026-07-03 12:00:00','energy',172.80000000,'kWh','good'),(4,'m1','2026-07-04 12:00:00','energy',96.50000000,'kWh','good'),(5,'m1','2026-07-05 12:00:00','energy',210.60000000,'kWh','good'),(6,'m1','2026-07-06 12:00:00','energy',148.30000000,'kWh','good'),(7,'m1','2026-07-07 12:00:00','energy',88.10000000,'kWh','good'),(8,'m1','2026-07-08 12:00:00','energy',205.90000000,'kWh','good'),(9,'m1','2026-07-09 12:00:00','energy',168.40000000,'kWh','good'),(10,'m1','2026-07-10 12:00:00','energy',46.40000000,'kWh','good'),(11,'m1','2026-07-11 12:00:00','energy',194.70000000,'kWh','good'),(12,'m1','2026-07-12 12:00:00','energy',221.50000000,'kWh','good'),(13,'m1','2026-07-13 12:00:00','energy',158.20000000,'kWh','good'),(14,'m1','2026-07-14 12:00:00','energy',74.60000000,'kWh','good'),(15,'m1','2026-07-15 12:00:00','energy',236.80000000,'kWh','good'),(16,'m1','2026-07-16 12:00:00','energy',182.30000000,'kWh','good'),(17,'m1','2026-07-17 12:00:00','energy',129.70000000,'kWh','good'),(18,'m1','2026-07-18 12:00:00','energy',214.10000000,'kWh','good'),(19,'m1','2026-07-19 12:00:00','energy',216.90000000,'kWh','good'),(20,'m1','2026-07-19 07:38:48','frequency',49.79000000,'Hz','good'),(21,'m1','2026-07-19 07:38:48','power',186.20000000,'kW','good'),(22,'m1','2026-07-19 07:38:48','voltage',400.20000000,'V','good'),(23,'m1','2026-07-19 07:38:48','current',42.10000000,'A','good'),(24,'m3','2026-07-19 07:22:11','unbalance',2.14000000,'%','good'),(25,'m3','2026-07-19 06:51:03','current',612.40000000,'A','good');
/*!40000 ALTER TABLE `meter_readings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meter_types`
--

DROP TABLE IF EXISTS `meter_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meter_types` (
  `name` varchar(100) NOT NULL,
  `description` varchar(255) NOT NULL,
  `icon` varchar(30) NOT NULL,
  `builtin` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meter_types`
--

LOCK TABLES `meter_types` WRITE;
/*!40000 ALTER TABLE `meter_types` DISABLE KEYS */;
INSERT INTO `meter_types` VALUES ('Điện','Điện năng, công suất, chất lượng điện','bolt',1),('Hơi','Áp suất và lưu lượng hơi','steam',1),('khí','Loại điểm đo tùy chỉnh','air',0),('Khí nén','Lưu lượng và áp suất khí nén','air',0),('Nhiệt','Nhiệt độ và năng lượng nhiệt','thermo',1),('Nước','Lưu lượng và sản lượng nước','drop',1);
/*!40000 ALTER TABLE `meter_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_meter_types`
--

DROP TABLE IF EXISTS `project_meter_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_meter_types` (
  `project_id` varchar(64) NOT NULL,
  `meter_type_name` varchar(100) NOT NULL,
  PRIMARY KEY (`project_id`,`meter_type_name`),
  KEY `fk_project_meter_types_type` (`meter_type_name`),
  CONSTRAINT `fk_project_meter_types_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_meter_types_type` FOREIGN KEY (`meter_type_name`) REFERENCES `meter_types` (`name`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_meter_types`
--

LOCK TABLES `project_meter_types` WRITE;
/*!40000 ALTER TABLE `project_meter_types` DISABLE KEYS */;
INSERT INTO `project_meter_types` VALUES ('PRJ-2401','Điện'),('PRJ-2401','Hơi'),('PRJ-2401','Khí nén'),('PRJ-2401','Nhiệt'),('PRJ-2401','Nước'),('PRJ-2402','Điện'),('PRJ-2402','Hơi'),('PRJ-2402','Nhiệt'),('PRJ-2402','Nước'),('PRJ-2403','Điện'),('PRJ-2403','Hơi'),('PRJ-2403','Nhiệt'),('PRJ-2403','Nước'),('PRJ-2404','Điện'),('PRJ-2404','Hơi'),('PRJ-2404','Nhiệt'),('PRJ-2404','Nước'),('PRJ-2405','Điện'),('PRJ-2405','Hơi'),('PRJ-2405','Nhiệt'),('PRJ-2405','Nước'),('PRJ-2406','Điện'),('PRJ-2406','Hơi'),('PRJ-2406','Nhiệt'),('PRJ-2406','Nước'),('PRJ-2407','Điện'),('PRJ-2407','Hơi'),('PRJ-2407','Nhiệt'),('PRJ-2407','Nước'),('PRJ-2408','Điện'),('PRJ-2408','Hơi'),('PRJ-2408','Nhiệt'),('PRJ-2408','Nước'),('PRJ-2409','Điện'),('PRJ-2409','Hơi'),('PRJ-2409','Nhiệt'),('PRJ-2409','Nước'),('PRJ-2410','Điện'),('PRJ-2410','Hơi'),('PRJ-2410','Nhiệt'),('PRJ-2410','Nước'),('PRJ-2411','Điện'),('PRJ-2411','Hơi'),('PRJ-2412','Điện'),('PRJ-2413','Điện');
/*!40000 ALTER TABLE `project_meter_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_settings`
--

DROP TABLE IF EXISTS `project_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_settings` (
  `project_id` varchar(64) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`project_id`),
  CONSTRAINT `fk_project_settings_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_settings`
--

LOCK TABLES `project_settings` WRITE;
/*!40000 ALTER TABLE `project_settings` DISABLE KEYS */;
INSERT INTO `project_settings` VALUES ('PRJ-2401','{\"alertConfig\":{\"categoriesByUtility\":{\"Điện\":[{\"id\":\"energy\",\"label\":\"Energy\"},{\"id\":\"ui\",\"label\":\"U/I\"},{\"id\":\"frequency\",\"label\":\"Tần số\"},{\"id\":\"power\",\"label\":\"Công suất\"},{\"id\":\"harmonics\",\"label\":\"Sóng hài\"},{\"id\":\"imbalance\",\"label\":\"Mất cân bằng pha\"}],\"Hơi\":[{\"id\":\"steam\",\"label\":\"Hơi\"}],\"Khí nén\":[{\"id\":\"utility-khí-nén\",\"label\":\"Khí nén\"}],\"Nhiệt\":[{\"id\":\"temperature\",\"label\":\"Nhiệt độ\"}],\"Nước\":[{\"id\":\"water\",\"label\":\"Nước\"}]},\"activeUtility\":\"Điện\",\"activeId\":\"energy\",\"alarmsByCategory\":{\"energy\":[{\"id\":\"e1\",\"alarmId\":\"1\",\"name\":\"Quá áp (Over-voltage)\",\"description\":\"Cảnh báo khi điện áp vượt ngưỡng an toàn vận hành\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"250.1 V\"},{\"id\":\"e2\",\"alarmId\":\"2\",\"name\":\"Thấp áp (Under-voltage)\",\"description\":\"Cảnh báo khi điện áp giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"215.4 V\"},{\"id\":\"e3\",\"alarmId\":\"3\",\"name\":\"Quá dòng (Over-current)\",\"description\":\"Cảnh báo khi dòng điện vượt định mức thiết bị\",\"threshold\":\"100\",\"unit\":\"A\",\"current\":\"45.2 A\"},{\"id\":\"e4\",\"alarmId\":\"4\",\"name\":\"Hệ số công suất (Power Factor)\",\"description\":\"Cảnh báo khi cosφ thấp hơn hệ số yêu cầu\",\"threshold\":\"0.85\",\"unit\":\"φ\",\"current\":\"0.92 φ\"}],\"ui\":[{\"id\":\"u1\",\"alarmId\":\"1\",\"name\":\"Quá áp pha\",\"description\":\"Cảnh báo khi điện áp pha vượt ngưỡng an toàn\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u2\",\"alarmId\":\"2\",\"name\":\"Thấp áp pha\",\"description\":\"Cảnh báo khi điện áp pha giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u3\",\"alarmId\":\"3\",\"name\":\"Dòng điện pha A\",\"description\":\"Ngưỡng theo dõi dòng pha L1\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"41.8 A\"},{\"id\":\"u4\",\"alarmId\":\"4\",\"name\":\"Dòng điện pha B\",\"description\":\"Ngưỡng theo dõi dòng pha L2\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"39.6 A\"},{\"id\":\"u5\",\"alarmId\":\"5\",\"name\":\"Dòng điện pha C\",\"description\":\"Ngưỡng theo dõi dòng pha L3\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"42.1 A\"}],\"frequency\":[{\"id\":\"f1\",\"alarmId\":\"1\",\"name\":\"Tần số cao\",\"description\":\"Cảnh báo khi tần số lưới vượt ngưỡng\",\"threshold\":\"50.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"},{\"id\":\"f2\",\"alarmId\":\"2\",\"name\":\"Tần số thấp\",\"description\":\"Cảnh báo khi tần số lưới tụt dưới ngưỡng\",\"threshold\":\"49.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"}],\"power\":[{\"id\":\"p1\",\"alarmId\":\"1\",\"name\":\"Công suất đỉnh\",\"description\":\"Cảnh báo khi công suất hữu công vượt định mức\",\"threshold\":\"250\",\"unit\":\"kW\",\"current\":\"184.7 kW\"},{\"id\":\"p2\",\"alarmId\":\"2\",\"name\":\"Công suất phản kháng\",\"description\":\"Cảnh báo khi Q vượt ngưỡng bù\",\"threshold\":\"40\",\"unit\":\"kVAr\",\"current\":\"18.4 kVAr\"}],\"harmonics\":[{\"id\":\"h1\",\"alarmId\":\"1\",\"name\":\"THD điện áp\",\"description\":\"Tổng méo hài điện áp vượt tiêu chuẩn\",\"threshold\":\"8\",\"unit\":\"%\",\"current\":\"3.2 %\"},{\"id\":\"h2\",\"alarmId\":\"2\",\"name\":\"THD dòng điện\",\"description\":\"Tổng méo hài dòng điện vượt tiêu chuẩn\",\"threshold\":\"15\",\"unit\":\"%\",\"current\":\"6.8 %\"}],\"imbalance\":[{\"id\":\"i1\",\"alarmId\":\"1\",\"name\":\"Mất cân bằng điện áp\",\"description\":\"Độ lệch điện áp giữa các pha vượt ngưỡng\",\"threshold\":\"2\",\"unit\":\"%\",\"current\":\"0.8 %\"},{\"id\":\"i2\",\"alarmId\":\"2\",\"name\":\"Mất cân bằng dòng\",\"description\":\"Độ lệch dòng giữa các pha vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"4.1 %\"}],\"temperature\":[{\"id\":\"t1\",\"alarmId\":\"1\",\"name\":\"Nhiệt độ cao\",\"description\":\"Cảnh báo khi nhiệt độ thiết bị/môi trường vượt ngưỡng\",\"threshold\":\"80\",\"unit\":\"°C\",\"current\":\"46.2 °C\"},{\"id\":\"t2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ thấp\",\"description\":\"Cảnh báo khi nhiệt độ giảm dưới mức vận hành\",\"threshold\":\"5\",\"unit\":\"°C\",\"current\":\"46.2 °C\"}],\"quality\":[{\"id\":\"q1\",\"alarmId\":\"1\",\"name\":\"Sụt áp (Voltage sag)\",\"description\":\"Cảnh báo khi điện áp sụt đột ngột dưới ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"2.4 %\"},{\"id\":\"q2\",\"alarmId\":\"2\",\"name\":\"Tăng áp (Voltage swell)\",\"description\":\"Cảnh báo khi điện áp tăng đột ngột vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"1.1 %\"},{\"id\":\"q3\",\"alarmId\":\"3\",\"name\":\"Flicker\",\"description\":\"Cảnh báo khi độ nhấp nháy điện áp vượt tiêu chuẩn\",\"threshold\":\"1\",\"unit\":\"Pst\",\"current\":\"0.32 Pst\"}],\"water\":[{\"id\":\"w1\",\"alarmId\":\"1\",\"name\":\"Áp lực thấp\",\"description\":\"Cảnh báo khi áp lực nước giảm dưới mức cấp\",\"threshold\":\"2.0\",\"unit\":\"bar\",\"current\":\"3.1 bar\"},{\"id\":\"w2\",\"alarmId\":\"2\",\"name\":\"Lưu lượng vượt ngưỡng\",\"description\":\"Cảnh báo khi lưu lượng nước vượt định mức\",\"threshold\":\"50\",\"unit\":\"m³/h\",\"current\":\"18.4 m³/h\"}],\"steam\":[{\"id\":\"s1\",\"alarmId\":\"1\",\"name\":\"Áp suất hơi cao\",\"description\":\"Cảnh báo khi áp suất hơi vượt ngưỡng an toàn\",\"threshold\":\"10\",\"unit\":\"bar\",\"current\":\"6.8 bar\"},{\"id\":\"s2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ hơi thấp\",\"description\":\"Cảnh báo khi nhiệt độ hơi giảm dưới mức công nghệ\",\"threshold\":\"160\",\"unit\":\"°C\",\"current\":\"178 °C\"}]}}}','2026-09-14 09:55:16'),('PRJ-2410','{\"alertConfig\":{\"categories\":[{\"id\":\"energy\",\"label\":\"Energy\"},{\"id\":\"ui\",\"label\":\"U/I\"},{\"id\":\"frequency\",\"label\":\"Tần số\"},{\"id\":\"power\",\"label\":\"Công suất\"},{\"id\":\"harmonics\",\"label\":\"Sóng hài\"},{\"id\":\"imbalance\",\"label\":\"Mất cân bằng pha\"}],\"activeId\":\"energy\",\"alarmsByCategory\":{\"energy\":[{\"id\":\"e1\",\"alarmId\":\"1\",\"name\":\"Quá áp (Over-voltage)\",\"description\":\"Cảnh báo khi điện áp vượt ngưỡng an toàn vận hành\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"250.1 V\"},{\"id\":\"e2\",\"alarmId\":\"2\",\"name\":\"Thấp áp (Under-voltage)\",\"description\":\"Cảnh báo khi điện áp giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"215.4 V\"},{\"id\":\"e3\",\"alarmId\":\"3\",\"name\":\"Quá dòng (Over-current)\",\"description\":\"Cảnh báo khi dòng điện vượt định mức thiết bị\",\"threshold\":\"100\",\"unit\":\"A\",\"current\":\"45.2 A\"},{\"id\":\"e4\",\"alarmId\":\"4\",\"name\":\"Hệ số công suất (Power Factor)\",\"description\":\"Cảnh báo khi cosφ thấp hơn hệ số yêu cầu\",\"threshold\":\"0.85\",\"unit\":\"φ\",\"current\":\"0.92 φ\"}],\"ui\":[{\"id\":\"u1\",\"alarmId\":\"1\",\"name\":\"Quá áp pha\",\"description\":\"Cảnh báo khi điện áp pha vượt ngưỡng an toàn\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u2\",\"alarmId\":\"2\",\"name\":\"Thấp áp pha\",\"description\":\"Cảnh báo khi điện áp pha giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u3\",\"alarmId\":\"3\",\"name\":\"Dòng điện pha A\",\"description\":\"Ngưỡng theo dõi dòng pha L1\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"41.8 A\"},{\"id\":\"u4\",\"alarmId\":\"4\",\"name\":\"Dòng điện pha B\",\"description\":\"Ngưỡng theo dõi dòng pha L2\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"39.6 A\"},{\"id\":\"u5\",\"alarmId\":\"5\",\"name\":\"Dòng điện pha C\",\"description\":\"Ngưỡng theo dõi dòng pha L3\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"42.1 A\"}],\"frequency\":[{\"id\":\"f1\",\"alarmId\":\"1\",\"name\":\"Tần số cao\",\"description\":\"Cảnh báo khi tần số lưới vượt ngưỡng\",\"threshold\":\"50.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"},{\"id\":\"f2\",\"alarmId\":\"2\",\"name\":\"Tần số thấp\",\"description\":\"Cảnh báo khi tần số lưới tụt dưới ngưỡng\",\"threshold\":\"49.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"}],\"power\":[{\"id\":\"p1\",\"alarmId\":\"1\",\"name\":\"Công suất đỉnh\",\"description\":\"Cảnh báo khi công suất hữu công vượt định mức\",\"threshold\":\"250\",\"unit\":\"kW\",\"current\":\"184.7 kW\"},{\"id\":\"p2\",\"alarmId\":\"2\",\"name\":\"Công suất phản kháng\",\"description\":\"Cảnh báo khi Q vượt ngưỡng bù\",\"threshold\":\"40\",\"unit\":\"kVAr\",\"current\":\"18.4 kVAr\"}],\"harmonics\":[{\"id\":\"h1\",\"alarmId\":\"1\",\"name\":\"THD điện áp\",\"description\":\"Tổng méo hài điện áp vượt tiêu chuẩn\",\"threshold\":\"8\",\"unit\":\"%\",\"current\":\"3.2 %\"},{\"id\":\"h2\",\"alarmId\":\"2\",\"name\":\"THD dòng điện\",\"description\":\"Tổng méo hài dòng điện vượt tiêu chuẩn\",\"threshold\":\"15\",\"unit\":\"%\",\"current\":\"6.8 %\"}],\"imbalance\":[{\"id\":\"i1\",\"alarmId\":\"1\",\"name\":\"Mất cân bằng điện áp\",\"description\":\"Độ lệch điện áp giữa các pha vượt ngưỡng\",\"threshold\":\"2\",\"unit\":\"%\",\"current\":\"0.8 %\"},{\"id\":\"i2\",\"alarmId\":\"2\",\"name\":\"Mất cân bằng dòng\",\"description\":\"Độ lệch dòng giữa các pha vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"4.1 %\"}],\"temperature\":[{\"id\":\"t1\",\"alarmId\":\"1\",\"name\":\"Nhiệt độ cao\",\"description\":\"Cảnh báo khi nhiệt độ thiết bị/môi trường vượt ngưỡng\",\"threshold\":\"80\",\"unit\":\"°C\",\"current\":\"46.2 °C\"},{\"id\":\"t2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ thấp\",\"description\":\"Cảnh báo khi nhiệt độ giảm dưới mức vận hành\",\"threshold\":\"5\",\"unit\":\"°C\",\"current\":\"46.2 °C\"}],\"quality\":[{\"id\":\"q1\",\"alarmId\":\"1\",\"name\":\"Sụt áp (Voltage sag)\",\"description\":\"Cảnh báo khi điện áp sụt đột ngột dưới ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"2.4 %\"},{\"id\":\"q2\",\"alarmId\":\"2\",\"name\":\"Tăng áp (Voltage swell)\",\"description\":\"Cảnh báo khi điện áp tăng đột ngột vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"1.1 %\"},{\"id\":\"q3\",\"alarmId\":\"3\",\"name\":\"Flicker\",\"description\":\"Cảnh báo khi độ nhấp nháy điện áp vượt tiêu chuẩn\",\"threshold\":\"1\",\"unit\":\"Pst\",\"current\":\"0.32 Pst\"}],\"water\":[{\"id\":\"w1\",\"alarmId\":\"1\",\"name\":\"Áp lực thấp\",\"description\":\"Cảnh báo khi áp lực nước giảm dưới mức cấp\",\"threshold\":\"2.0\",\"unit\":\"bar\",\"current\":\"3.1 bar\"},{\"id\":\"w2\",\"alarmId\":\"2\",\"name\":\"Lưu lượng vượt ngưỡng\",\"description\":\"Cảnh báo khi lưu lượng nước vượt định mức\",\"threshold\":\"50\",\"unit\":\"m³/h\",\"current\":\"18.4 m³/h\"}],\"steam\":[{\"id\":\"s1\",\"alarmId\":\"1\",\"name\":\"Áp suất hơi cao\",\"description\":\"Cảnh báo khi áp suất hơi vượt ngưỡng an toàn\",\"threshold\":\"10\",\"unit\":\"bar\",\"current\":\"6.8 bar\"},{\"id\":\"s2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ hơi thấp\",\"description\":\"Cảnh báo khi nhiệt độ hơi giảm dưới mức công nghệ\",\"threshold\":\"160\",\"unit\":\"°C\",\"current\":\"178 °C\"}]}}}','2026-09-14 09:29:44'),('PRJ-2411','{\"alertConfig\":{\"categories\":[{\"id\":\"energy\",\"label\":\"Energy\"},{\"id\":\"ui\",\"label\":\"U/I\"},{\"id\":\"frequency\",\"label\":\"Tần số\"},{\"id\":\"power\",\"label\":\"Công suất\"},{\"id\":\"harmonics\",\"label\":\"Sóng hài\"},{\"id\":\"imbalance\",\"label\":\"Mất cân bằng pha\"}],\"activeId\":\"energy\",\"alarmsByCategory\":{\"energy\":[{\"id\":\"e1\",\"alarmId\":\"1\",\"name\":\"Quá áp (Over-voltage)\",\"description\":\"Cảnh báo khi điện áp vượt ngưỡng an toàn vận hành\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"250.1 V\"},{\"id\":\"e2\",\"alarmId\":\"2\",\"name\":\"Thấp áp (Under-voltage)\",\"description\":\"Cảnh báo khi điện áp giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"215.4 V\"},{\"id\":\"e3\",\"alarmId\":\"3\",\"name\":\"Quá dòng (Over-current)\",\"description\":\"Cảnh báo khi dòng điện vượt định mức thiết bị\",\"threshold\":\"100\",\"unit\":\"A\",\"current\":\"45.2 A\"},{\"id\":\"e4\",\"alarmId\":\"4\",\"name\":\"Hệ số công suất (Power Factor)\",\"description\":\"Cảnh báo khi cosφ thấp hơn hệ số yêu cầu\",\"threshold\":\"0.85\",\"unit\":\"φ\",\"current\":\"0.92 φ\"}],\"ui\":[{\"id\":\"u1\",\"alarmId\":\"1\",\"name\":\"Quá áp pha\",\"description\":\"Cảnh báo khi điện áp pha vượt ngưỡng an toàn\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u2\",\"alarmId\":\"2\",\"name\":\"Thấp áp pha\",\"description\":\"Cảnh báo khi điện áp pha giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u3\",\"alarmId\":\"3\",\"name\":\"Dòng điện pha A\",\"description\":\"Ngưỡng theo dõi dòng pha L1\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"41.8 A\"},{\"id\":\"u4\",\"alarmId\":\"4\",\"name\":\"Dòng điện pha B\",\"description\":\"Ngưỡng theo dõi dòng pha L2\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"39.6 A\"},{\"id\":\"u5\",\"alarmId\":\"5\",\"name\":\"Dòng điện pha C\",\"description\":\"Ngưỡng theo dõi dòng pha L3\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"42.1 A\"}],\"frequency\":[{\"id\":\"f1\",\"alarmId\":\"1\",\"name\":\"Tần số cao\",\"description\":\"Cảnh báo khi tần số lưới vượt ngưỡng\",\"threshold\":\"50.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"},{\"id\":\"f2\",\"alarmId\":\"2\",\"name\":\"Tần số thấp\",\"description\":\"Cảnh báo khi tần số lưới tụt dưới ngưỡng\",\"threshold\":\"49.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"}],\"power\":[{\"id\":\"p1\",\"alarmId\":\"1\",\"name\":\"Công suất đỉnh\",\"description\":\"Cảnh báo khi công suất hữu công vượt định mức\",\"threshold\":\"250\",\"unit\":\"kW\",\"current\":\"184.7 kW\"},{\"id\":\"p2\",\"alarmId\":\"2\",\"name\":\"Công suất phản kháng\",\"description\":\"Cảnh báo khi Q vượt ngưỡng bù\",\"threshold\":\"40\",\"unit\":\"kVAr\",\"current\":\"18.4 kVAr\"}],\"harmonics\":[{\"id\":\"h1\",\"alarmId\":\"1\",\"name\":\"THD điện áp\",\"description\":\"Tổng méo hài điện áp vượt tiêu chuẩn\",\"threshold\":\"8\",\"unit\":\"%\",\"current\":\"3.2 %\"},{\"id\":\"h2\",\"alarmId\":\"2\",\"name\":\"THD dòng điện\",\"description\":\"Tổng méo hài dòng điện vượt tiêu chuẩn\",\"threshold\":\"15\",\"unit\":\"%\",\"current\":\"6.8 %\"}],\"imbalance\":[{\"id\":\"i1\",\"alarmId\":\"1\",\"name\":\"Mất cân bằng điện áp\",\"description\":\"Độ lệch điện áp giữa các pha vượt ngưỡng\",\"threshold\":\"2\",\"unit\":\"%\",\"current\":\"0.8 %\"},{\"id\":\"i2\",\"alarmId\":\"2\",\"name\":\"Mất cân bằng dòng\",\"description\":\"Độ lệch dòng giữa các pha vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"4.1 %\"}],\"temperature\":[{\"id\":\"t1\",\"alarmId\":\"1\",\"name\":\"Nhiệt độ cao\",\"description\":\"Cảnh báo khi nhiệt độ thiết bị/môi trường vượt ngưỡng\",\"threshold\":\"80\",\"unit\":\"°C\",\"current\":\"46.2 °C\"},{\"id\":\"t2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ thấp\",\"description\":\"Cảnh báo khi nhiệt độ giảm dưới mức vận hành\",\"threshold\":\"5\",\"unit\":\"°C\",\"current\":\"46.2 °C\"}],\"quality\":[{\"id\":\"q1\",\"alarmId\":\"1\",\"name\":\"Sụt áp (Voltage sag)\",\"description\":\"Cảnh báo khi điện áp sụt đột ngột dưới ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"2.4 %\"},{\"id\":\"q2\",\"alarmId\":\"2\",\"name\":\"Tăng áp (Voltage swell)\",\"description\":\"Cảnh báo khi điện áp tăng đột ngột vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"1.1 %\"},{\"id\":\"q3\",\"alarmId\":\"3\",\"name\":\"Flicker\",\"description\":\"Cảnh báo khi độ nhấp nháy điện áp vượt tiêu chuẩn\",\"threshold\":\"1\",\"unit\":\"Pst\",\"current\":\"0.32 Pst\"}],\"water\":[{\"id\":\"w1\",\"alarmId\":\"1\",\"name\":\"Áp lực thấp\",\"description\":\"Cảnh báo khi áp lực nước giảm dưới mức cấp\",\"threshold\":\"2.0\",\"unit\":\"bar\",\"current\":\"3.1 bar\"},{\"id\":\"w2\",\"alarmId\":\"2\",\"name\":\"Lưu lượng vượt ngưỡng\",\"description\":\"Cảnh báo khi lưu lượng nước vượt định mức\",\"threshold\":\"50\",\"unit\":\"m³/h\",\"current\":\"18.4 m³/h\"}],\"steam\":[{\"id\":\"s1\",\"alarmId\":\"1\",\"name\":\"Áp suất hơi cao\",\"description\":\"Cảnh báo khi áp suất hơi vượt ngưỡng an toàn\",\"threshold\":\"10\",\"unit\":\"bar\",\"current\":\"6.8 bar\"},{\"id\":\"s2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ hơi thấp\",\"description\":\"Cảnh báo khi nhiệt độ hơi giảm dưới mức công nghệ\",\"threshold\":\"160\",\"unit\":\"°C\",\"current\":\"178 °C\"}]}}}','2026-09-14 09:30:07'),('PRJ-2412','{\"alertConfig\":{\"categories\":[{\"id\":\"energy\",\"label\":\"Energy\"},{\"id\":\"ui\",\"label\":\"U/I\"},{\"id\":\"frequency\",\"label\":\"Tần số\"},{\"id\":\"power\",\"label\":\"Công suất\"},{\"id\":\"harmonics\",\"label\":\"Sóng hài\"},{\"id\":\"imbalance\",\"label\":\"Mất cân bằng pha\"}],\"activeId\":\"energy\",\"alarmsByCategory\":{\"energy\":[{\"id\":\"e1\",\"alarmId\":\"1\",\"name\":\"Quá áp (Over-voltage)\",\"description\":\"Cảnh báo khi điện áp vượt ngưỡng an toàn vận hành\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"250.1 V\"},{\"id\":\"e2\",\"alarmId\":\"2\",\"name\":\"Thấp áp (Under-voltage)\",\"description\":\"Cảnh báo khi điện áp giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"215.4 V\"},{\"id\":\"e3\",\"alarmId\":\"3\",\"name\":\"Quá dòng (Over-current)\",\"description\":\"Cảnh báo khi dòng điện vượt định mức thiết bị\",\"threshold\":\"100\",\"unit\":\"A\",\"current\":\"45.2 A\"},{\"id\":\"e4\",\"alarmId\":\"4\",\"name\":\"Hệ số công suất (Power Factor)\",\"description\":\"Cảnh báo khi cosφ thấp hơn hệ số yêu cầu\",\"threshold\":\"0.85\",\"unit\":\"φ\",\"current\":\"0.92 φ\"}],\"ui\":[{\"id\":\"u1\",\"alarmId\":\"1\",\"name\":\"Quá áp pha\",\"description\":\"Cảnh báo khi điện áp pha vượt ngưỡng an toàn\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u2\",\"alarmId\":\"2\",\"name\":\"Thấp áp pha\",\"description\":\"Cảnh báo khi điện áp pha giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u3\",\"alarmId\":\"3\",\"name\":\"Dòng điện pha A\",\"description\":\"Ngưỡng theo dõi dòng pha L1\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"41.8 A\"},{\"id\":\"u4\",\"alarmId\":\"4\",\"name\":\"Dòng điện pha B\",\"description\":\"Ngưỡng theo dõi dòng pha L2\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"39.6 A\"},{\"id\":\"u5\",\"alarmId\":\"5\",\"name\":\"Dòng điện pha C\",\"description\":\"Ngưỡng theo dõi dòng pha L3\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"42.1 A\"}],\"frequency\":[{\"id\":\"f1\",\"alarmId\":\"1\",\"name\":\"Tần số cao\",\"description\":\"Cảnh báo khi tần số lưới vượt ngưỡng\",\"threshold\":\"50.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"},{\"id\":\"f2\",\"alarmId\":\"2\",\"name\":\"Tần số thấp\",\"description\":\"Cảnh báo khi tần số lưới tụt dưới ngưỡng\",\"threshold\":\"49.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"}],\"power\":[{\"id\":\"p1\",\"alarmId\":\"1\",\"name\":\"Công suất đỉnh\",\"description\":\"Cảnh báo khi công suất hữu công vượt định mức\",\"threshold\":\"250\",\"unit\":\"kW\",\"current\":\"184.7 kW\"},{\"id\":\"p2\",\"alarmId\":\"2\",\"name\":\"Công suất phản kháng\",\"description\":\"Cảnh báo khi Q vượt ngưỡng bù\",\"threshold\":\"40\",\"unit\":\"kVAr\",\"current\":\"18.4 kVAr\"}],\"harmonics\":[{\"id\":\"h1\",\"alarmId\":\"1\",\"name\":\"THD điện áp\",\"description\":\"Tổng méo hài điện áp vượt tiêu chuẩn\",\"threshold\":\"8\",\"unit\":\"%\",\"current\":\"3.2 %\"},{\"id\":\"h2\",\"alarmId\":\"2\",\"name\":\"THD dòng điện\",\"description\":\"Tổng méo hài dòng điện vượt tiêu chuẩn\",\"threshold\":\"15\",\"unit\":\"%\",\"current\":\"6.8 %\"}],\"imbalance\":[{\"id\":\"i1\",\"alarmId\":\"1\",\"name\":\"Mất cân bằng điện áp\",\"description\":\"Độ lệch điện áp giữa các pha vượt ngưỡng\",\"threshold\":\"2\",\"unit\":\"%\",\"current\":\"0.8 %\"},{\"id\":\"i2\",\"alarmId\":\"2\",\"name\":\"Mất cân bằng dòng\",\"description\":\"Độ lệch dòng giữa các pha vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"4.1 %\"}],\"temperature\":[{\"id\":\"t1\",\"alarmId\":\"1\",\"name\":\"Nhiệt độ cao\",\"description\":\"Cảnh báo khi nhiệt độ thiết bị/môi trường vượt ngưỡng\",\"threshold\":\"80\",\"unit\":\"°C\",\"current\":\"46.2 °C\"},{\"id\":\"t2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ thấp\",\"description\":\"Cảnh báo khi nhiệt độ giảm dưới mức vận hành\",\"threshold\":\"5\",\"unit\":\"°C\",\"current\":\"46.2 °C\"}],\"quality\":[{\"id\":\"q1\",\"alarmId\":\"1\",\"name\":\"Sụt áp (Voltage sag)\",\"description\":\"Cảnh báo khi điện áp sụt đột ngột dưới ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"2.4 %\"},{\"id\":\"q2\",\"alarmId\":\"2\",\"name\":\"Tăng áp (Voltage swell)\",\"description\":\"Cảnh báo khi điện áp tăng đột ngột vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"1.1 %\"},{\"id\":\"q3\",\"alarmId\":\"3\",\"name\":\"Flicker\",\"description\":\"Cảnh báo khi độ nhấp nháy điện áp vượt tiêu chuẩn\",\"threshold\":\"1\",\"unit\":\"Pst\",\"current\":\"0.32 Pst\"}],\"water\":[{\"id\":\"w1\",\"alarmId\":\"1\",\"name\":\"Áp lực thấp\",\"description\":\"Cảnh báo khi áp lực nước giảm dưới mức cấp\",\"threshold\":\"2.0\",\"unit\":\"bar\",\"current\":\"3.1 bar\"},{\"id\":\"w2\",\"alarmId\":\"2\",\"name\":\"Lưu lượng vượt ngưỡng\",\"description\":\"Cảnh báo khi lưu lượng nước vượt định mức\",\"threshold\":\"50\",\"unit\":\"m³/h\",\"current\":\"18.4 m³/h\"}],\"steam\":[{\"id\":\"s1\",\"alarmId\":\"1\",\"name\":\"Áp suất hơi cao\",\"description\":\"Cảnh báo khi áp suất hơi vượt ngưỡng an toàn\",\"threshold\":\"10\",\"unit\":\"bar\",\"current\":\"6.8 bar\"},{\"id\":\"s2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ hơi thấp\",\"description\":\"Cảnh báo khi nhiệt độ hơi giảm dưới mức công nghệ\",\"threshold\":\"160\",\"unit\":\"°C\",\"current\":\"178 °C\"}]}}}','2026-09-14 09:29:24'),('PRJ-2413','{\"alertConfig\":{\"categoriesByUtility\":{\"Điện\":[{\"id\":\"energy\",\"label\":\"Energy\"},{\"id\":\"ui\",\"label\":\"U/I\"},{\"id\":\"frequency\",\"label\":\"Tần số\"},{\"id\":\"power\",\"label\":\"Công suất\"},{\"id\":\"harmonics\",\"label\":\"Sóng hài\"},{\"id\":\"imbalance\",\"label\":\"Mất cân bằng pha\"}]},\"activeUtility\":\"Điện\",\"activeId\":\"imbalance\",\"alarmsByCategory\":{\"energy\":[{\"id\":\"e1\",\"alarmId\":\"1\",\"name\":\"Quá áp (Over-voltage)\",\"description\":\"Cảnh báo khi điện áp vượt ngưỡng an toàn vận hành\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"250.1 V\"},{\"id\":\"e2\",\"alarmId\":\"2\",\"name\":\"Thấp áp (Under-voltage)\",\"description\":\"Cảnh báo khi điện áp giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"215.4 V\"},{\"id\":\"e3\",\"alarmId\":\"3\",\"name\":\"Quá dòng (Over-current)\",\"description\":\"Cảnh báo khi dòng điện vượt định mức thiết bị\",\"threshold\":\"100\",\"unit\":\"A\",\"current\":\"45.2 A\"},{\"id\":\"e4\",\"alarmId\":\"4\",\"name\":\"Hệ số công suất (Power Factor)\",\"description\":\"Cảnh báo khi cosφ thấp hơn hệ số yêu cầu\",\"threshold\":\"0.85\",\"unit\":\"φ\",\"current\":\"0.92 φ\"}],\"ui\":[{\"id\":\"u1\",\"alarmId\":\"1\",\"name\":\"Quá áp pha\",\"description\":\"Cảnh báo khi điện áp pha vượt ngưỡng an toàn\",\"threshold\":\"240\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u2\",\"alarmId\":\"2\",\"name\":\"Thấp áp pha\",\"description\":\"Cảnh báo khi điện áp pha giảm dưới mức cho phép\",\"threshold\":\"200\",\"unit\":\"V\",\"current\":\"228.6 V\"},{\"id\":\"u3\",\"alarmId\":\"3\",\"name\":\"Dòng điện pha A\",\"description\":\"Ngưỡng theo dõi dòng pha L1\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"41.8 A\"},{\"id\":\"u4\",\"alarmId\":\"4\",\"name\":\"Dòng điện pha B\",\"description\":\"Ngưỡng theo dõi dòng pha L2\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"39.6 A\"},{\"id\":\"u5\",\"alarmId\":\"5\",\"name\":\"Dòng điện pha C\",\"description\":\"Ngưỡng theo dõi dòng pha L3\",\"threshold\":\"80\",\"unit\":\"A\",\"current\":\"42.1 A\"}],\"frequency\":[{\"id\":\"f1\",\"alarmId\":\"1\",\"name\":\"Tần số cao\",\"description\":\"Cảnh báo khi tần số lưới vượt ngưỡng\",\"threshold\":\"50.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"},{\"id\":\"f2\",\"alarmId\":\"2\",\"name\":\"Tần số thấp\",\"description\":\"Cảnh báo khi tần số lưới tụt dưới ngưỡng\",\"threshold\":\"49.5\",\"unit\":\"Hz\",\"current\":\"50.02 Hz\"}],\"power\":[{\"id\":\"p1\",\"alarmId\":\"1\",\"name\":\"Công suất đỉnh\",\"description\":\"Cảnh báo khi công suất hữu công vượt định mức\",\"threshold\":\"250\",\"unit\":\"kW\",\"current\":\"184.7 kW\"},{\"id\":\"p2\",\"alarmId\":\"2\",\"name\":\"Công suất phản kháng\",\"description\":\"Cảnh báo khi Q vượt ngưỡng bù\",\"threshold\":\"40\",\"unit\":\"kVAr\",\"current\":\"18.4 kVAr\"}],\"harmonics\":[{\"id\":\"h1\",\"alarmId\":\"1\",\"name\":\"THD điện áp\",\"description\":\"Tổng méo hài điện áp vượt tiêu chuẩn\",\"threshold\":\"8\",\"unit\":\"%\",\"current\":\"3.2 %\"},{\"id\":\"h2\",\"alarmId\":\"2\",\"name\":\"THD dòng điện\",\"description\":\"Tổng méo hài dòng điện vượt tiêu chuẩn\",\"threshold\":\"15\",\"unit\":\"%\",\"current\":\"6.8 %\"}],\"imbalance\":[{\"id\":\"i1\",\"alarmId\":\"1\",\"name\":\"Mất cân bằng điện áp\",\"description\":\"Độ lệch điện áp giữa các pha vượt ngưỡng\",\"threshold\":\"2\",\"unit\":\"%\",\"current\":\"0.8 %\"},{\"id\":\"i2\",\"alarmId\":\"2\",\"name\":\"Mất cân bằng dòng\",\"description\":\"Độ lệch dòng giữa các pha vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"4.1 %\"}],\"temperature\":[{\"id\":\"t1\",\"alarmId\":\"1\",\"name\":\"Nhiệt độ cao\",\"description\":\"Cảnh báo khi nhiệt độ thiết bị/môi trường vượt ngưỡng\",\"threshold\":\"80\",\"unit\":\"°C\",\"current\":\"46.2 °C\"},{\"id\":\"t2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ thấp\",\"description\":\"Cảnh báo khi nhiệt độ giảm dưới mức vận hành\",\"threshold\":\"5\",\"unit\":\"°C\",\"current\":\"46.2 °C\"}],\"quality\":[{\"id\":\"q1\",\"alarmId\":\"1\",\"name\":\"Sụt áp (Voltage sag)\",\"description\":\"Cảnh báo khi điện áp sụt đột ngột dưới ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"2.4 %\"},{\"id\":\"q2\",\"alarmId\":\"2\",\"name\":\"Tăng áp (Voltage swell)\",\"description\":\"Cảnh báo khi điện áp tăng đột ngột vượt ngưỡng\",\"threshold\":\"10\",\"unit\":\"%\",\"current\":\"1.1 %\"},{\"id\":\"q3\",\"alarmId\":\"3\",\"name\":\"Flicker\",\"description\":\"Cảnh báo khi độ nhấp nháy điện áp vượt tiêu chuẩn\",\"threshold\":\"1\",\"unit\":\"Pst\",\"current\":\"0.32 Pst\"}],\"water\":[{\"id\":\"w1\",\"alarmId\":\"1\",\"name\":\"Áp lực thấp\",\"description\":\"Cảnh báo khi áp lực nước giảm dưới mức cấp\",\"threshold\":\"2.0\",\"unit\":\"bar\",\"current\":\"3.1 bar\"},{\"id\":\"w2\",\"alarmId\":\"2\",\"name\":\"Lưu lượng vượt ngưỡng\",\"description\":\"Cảnh báo khi lưu lượng nước vượt định mức\",\"threshold\":\"50\",\"unit\":\"m³/h\",\"current\":\"18.4 m³/h\"}],\"steam\":[{\"id\":\"s1\",\"alarmId\":\"1\",\"name\":\"Áp suất hơi cao\",\"description\":\"Cảnh báo khi áp suất hơi vượt ngưỡng an toàn\",\"threshold\":\"10\",\"unit\":\"bar\",\"current\":\"6.8 bar\"},{\"id\":\"s2\",\"alarmId\":\"2\",\"name\":\"Nhiệt độ hơi thấp\",\"description\":\"Cảnh báo khi nhiệt độ hơi giảm dưới mức công nghệ\",\"threshold\":\"160\",\"unit\":\"°C\",\"current\":\"178 °C\"}]}}}','2026-09-14 09:55:36');
/*!40000 ALTER TABLE `project_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `projects` (
  `id` varchar(64) NOT NULL,
  `initials` varchar(8) NOT NULL,
  `accent` char(7) NOT NULL,
  `name` varchar(255) NOT NULL,
  `customer` varchar(255) NOT NULL,
  `status` varchar(30) NOT NULL,
  `start_date` date NOT NULL,
  `contact_name` varchar(150) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `logo_url` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_projects_status` (`status`),
  KEY `idx_projects_customer` (`customer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES ('PRJ-2401','SN','#1a73e8','Sunrise Bắc Ninh Factory','Sunrise Group','active','2023-03-12',NULL,NULL,NULL,NULL,NULL),('PRJ-2402','VM','#0f9d58','Vinamilk Bình Dương Plant','Vinamilk','active','2024-01-08',NULL,NULL,NULL,NULL,NULL),('PRJ-2403','SS','#7c3aed','Samsung Thái Nguyên Campus','Samsung Vietnam','maintenance','2022-11-21',NULL,NULL,NULL,NULL,NULL),('PRJ-2404','TH','#ea580c','TH True Milk Nghệ An','TH Group','active','2023-06-03',NULL,NULL,NULL,NULL,NULL),('PRJ-2405','FT','#0284c7','Formosa Hà Tĩnh Steel','Formosa','paused','2021-09-15',NULL,NULL,NULL,NULL,NULL),('PRJ-2406','HV','#1a73e8','Hòa Phát Dung Quất','Hòa Phát','active','2023-04-19',NULL,NULL,NULL,NULL,NULL),('PRJ-2407','UN','#0d9488','Unilever Củ Chi Factory','Unilever','active','2024-02-02',NULL,NULL,NULL,NULL,NULL),('PRJ-2408','PN','#dc2626','PouYuen Đồng Nai','PouYuen','maintenance','2022-08-11',NULL,NULL,NULL,NULL,NULL),('PRJ-2409','NS','#2563eb','Nestlé Trị An Plant','Nestlé','active','2023-07-27',NULL,NULL,NULL,NULL,NULL),('PRJ-2410','LG','#a21caf','LG Display Hải Phòng','LG Vietnam','active','2023-05-14',NULL,NULL,NULL,NULL,NULL),('PRJ-2411','CT','#0f9d58','Công ty ABC','Công ty ABC','active','2026-09-14','Nguyen Van A','09123456789','a@gmail.com',NULL,NULL),('PRJ-2412','A','#7c3aed','A','A','active','2026-09-14','A',NULL,NULL,NULL,NULL),('PRJ-2413','CT','#ea580c','Công ty aa','Công ty aa','active','2026-09-14','Nguyen Van A',NULL,'a@gmail.com',NULL,NULL);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schema_migrations` (
  `version` varchar(100) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schema_migrations`
--

LOCK TABLES `schema_migrations` WRITE;
/*!40000 ALTER TABLE `schema_migrations` DISABLE KEYS */;
INSERT INTO `schema_migrations` VALUES ('2026-09-14-ems-initial-schema','2026-09-14 07:55:07');
/*!40000 ALTER TABLE `schema_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'ems_local'
--

--
-- Dumping routines for database 'ems_local'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-16 14:06:52
