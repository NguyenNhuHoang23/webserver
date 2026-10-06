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
