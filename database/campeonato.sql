-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: localhost    Database: gestion_campeonato
-- ------------------------------------------------------
-- Server version	8.0.43-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alineaciones`
--

DROP TABLE IF EXISTS `alineaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alineaciones` (
  `id_alineacion` int NOT NULL AUTO_INCREMENT,
  `id_partido` int NOT NULL,
  `id_equipo` int NOT NULL,
  `id_jugador` int NOT NULL,
  `titular` tinyint(1) DEFAULT '1',
  `minuto_entrada` int DEFAULT '0',
  `minuto_salida` int DEFAULT NULL,
  PRIMARY KEY (`id_alineacion`),
  UNIQUE KEY `unique_jugador_partido` (`id_partido`,`id_jugador`),
  KEY `id_equipo` (`id_equipo`),
  KEY `id_jugador` (`id_jugador`),
  KEY `idx_partido` (`id_partido`),
  CONSTRAINT `alineaciones_ibfk_1` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id_partido`) ON DELETE CASCADE,
  CONSTRAINT `alineaciones_ibfk_2` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id_equipo`) ON DELETE CASCADE,
  CONSTRAINT `alineaciones_ibfk_3` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id_jugador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alineaciones`
--

LOCK TABLES `alineaciones` WRITE;
/*!40000 ALTER TABLE `alineaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `alineaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campeonatos`
--

DROP TABLE IF EXISTS `campeonatos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campeonatos` (
  `id_campeonato` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` enum('planificacion','en_curso','finalizado') DEFAULT 'planificacion',
  `creado_por` int NOT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_campeonato`),
  KEY `creado_por` (`creado_por`),
  KEY `idx_estado` (`estado`),
  CONSTRAINT `campeonatos_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campeonatos`
--

LOCK TABLES `campeonatos` WRITE;
/*!40000 ALTER TABLE `campeonatos` DISABLE KEYS */;
/*!40000 ALTER TABLE `campeonatos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipos`
--

DROP TABLE IF EXISTS `equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipos` (
  `id_equipo` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `id_lider` int NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_aprobacion` timestamp NULL DEFAULT NULL,
  `estado` enum('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
  `observaciones` text,
  `aprobado_por` int DEFAULT NULL,
  PRIMARY KEY (`id_equipo`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `aprobado_por` (`aprobado_por`),
  KEY `idx_estado` (`estado`),
  KEY `idx_lider` (`id_lider`),
  CONSTRAINT `equipos_ibfk_1` FOREIGN KEY (`id_lider`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `equipos_ibfk_2` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipos`
--

LOCK TABLES `equipos` WRITE;
/*!40000 ALTER TABLE `equipos` DISABLE KEYS */;
/*!40000 ALTER TABLE `equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goles`
--

DROP TABLE IF EXISTS `goles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goles` (
  `id_gol` int NOT NULL AUTO_INCREMENT,
  `id_partido` int NOT NULL,
  `id_jugador` int NOT NULL,
  `minuto` int NOT NULL,
  `tipo` enum('normal','penal','autogol','tiro_libre') DEFAULT 'normal',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_gol`),
  KEY `idx_partido` (`id_partido`),
  KEY `idx_jugador` (`id_jugador`),
  CONSTRAINT `goles_ibfk_1` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id_partido`) ON DELETE CASCADE,
  CONSTRAINT `goles_ibfk_2` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id_jugador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goles`
--

LOCK TABLES `goles` WRITE;
/*!40000 ALTER TABLE `goles` DISABLE KEYS */;
/*!40000 ALTER TABLE `goles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jugadores`
--

DROP TABLE IF EXISTS `jugadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jugadores` (
  `id_jugador` int NOT NULL AUTO_INCREMENT,
  `id_equipo` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `documento` varchar(20) NOT NULL,
  `dorsal` int NOT NULL,
  `documento_pdf` varchar(255) DEFAULT NULL,
  `posicion` enum('portero','defensa','mediocampista','delantero') DEFAULT 'delantero',
  `fecha_nacimiento` date DEFAULT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_jugador`),
  UNIQUE KEY `documento` (`documento`),
  UNIQUE KEY `unique_dorsal_equipo` (`id_equipo`,`dorsal`),
  KEY `idx_equipo` (`id_equipo`),
  KEY `idx_documento` (`documento`),
  CONSTRAINT `jugadores_ibfk_1` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id_equipo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jugadores`
--

LOCK TABLES `jugadores` WRITE;
/*!40000 ALTER TABLE `jugadores` DISABLE KEYS */;
/*!40000 ALTER TABLE `jugadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id_notificacion` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `mensaje` text NOT NULL,
  `tipo` enum('info','warning','success','error') DEFAULT 'info',
  `leida` tinyint(1) DEFAULT '0',
  `fecha_envio` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `idx_usuario_leida` (`id_usuario`,`leida`),
  KEY `idx_fecha` (`fecha_envio`),
  CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidos`
--

DROP TABLE IF EXISTS `partidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partidos` (
  `id_partido` int NOT NULL AUTO_INCREMENT,
  `id_campeonato` int NOT NULL,
  `id_equipo_local` int NOT NULL,
  `id_equipo_visitante` int NOT NULL,
  `fecha_partido` datetime NOT NULL,
  `lugar` varchar(100) DEFAULT NULL,
  `jornada` int DEFAULT '1',
  `goles_local` int DEFAULT '0',
  `goles_visitante` int DEFAULT '0',
  `estado` enum('programado','en_juego','finalizado','cancelado') DEFAULT 'programado',
  `observaciones` text,
  PRIMARY KEY (`id_partido`),
  KEY `id_campeonato` (`id_campeonato`),
  KEY `id_equipo_local` (`id_equipo_local`),
  KEY `id_equipo_visitante` (`id_equipo_visitante`),
  KEY `idx_fecha` (`fecha_partido`),
  KEY `idx_estado` (`estado`),
  KEY `idx_jornada` (`jornada`),
  CONSTRAINT `partidos_ibfk_1` FOREIGN KEY (`id_campeonato`) REFERENCES `campeonatos` (`id_campeonato`) ON DELETE CASCADE,
  CONSTRAINT `partidos_ibfk_2` FOREIGN KEY (`id_equipo_local`) REFERENCES `equipos` (`id_equipo`) ON DELETE CASCADE,
  CONSTRAINT `partidos_ibfk_3` FOREIGN KEY (`id_equipo_visitante`) REFERENCES `equipos` (`id_equipo`) ON DELETE CASCADE,
  CONSTRAINT `partidos_chk_1` CHECK ((`id_equipo_local` <> `id_equipo_visitante`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidos`
--

LOCK TABLES `partidos` WRITE;
/*!40000 ALTER TABLE `partidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_equipo`
--

DROP TABLE IF EXISTS `solicitudes_equipo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_equipo` (
  `id_solicitud` int NOT NULL AUTO_INCREMENT,
  `id_equipo` int NOT NULL,
  `id_lider` int NOT NULL,
  `fecha_solicitud` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('pendiente','aprobada','rechazada') DEFAULT 'pendiente',
  `observaciones` text,
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_solicitud`),
  KEY `id_equipo` (`id_equipo`),
  KEY `id_lider` (`id_lider`),
  KEY `revisado_por` (`revisado_por`),
  KEY `idx_estado` (`estado`),
  CONSTRAINT `solicitudes_equipo_ibfk_1` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id_equipo`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_equipo_ibfk_2` FOREIGN KEY (`id_lider`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_equipo_ibfk_3` FOREIGN KEY (`revisado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_equipo`
--

LOCK TABLES `solicitudes_equipo` WRITE;
/*!40000 ALTER TABLE `solicitudes_equipo` DISABLE KEYS */;
/*!40000 ALTER TABLE `solicitudes_equipo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tarjetas`
--

DROP TABLE IF EXISTS `tarjetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tarjetas` (
  `id_tarjeta` int NOT NULL AUTO_INCREMENT,
  `id_partido` int NOT NULL,
  `id_jugador` int NOT NULL,
  `tipo` enum('amarilla','roja') NOT NULL,
  `minuto` int NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tarjeta`),
  KEY `idx_partido` (`id_partido`),
  KEY `idx_jugador` (`id_jugador`),
  CONSTRAINT `tarjetas_ibfk_1` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id_partido`) ON DELETE CASCADE,
  CONSTRAINT `tarjetas_ibfk_2` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id_jugador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tarjetas`
--

LOCK TABLES `tarjetas` WRITE;
/*!40000 ALTER TABLE `tarjetas` DISABLE KEYS */;
/*!40000 ALTER TABLE `tarjetas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `rol` enum('admin','lider','espectador') DEFAULT 'lider',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_rol` (`rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vista_goleadores`
--

DROP TABLE IF EXISTS `vista_goleadores`;
/*!50001 DROP VIEW IF EXISTS `vista_goleadores`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_goleadores` AS SELECT 
 1 AS `id_jugador`,
 1 AS `nombre`,
 1 AS `apellido`,
 1 AS `equipo`,
 1 AS `total_goles`,
 1 AS `penales`,
 1 AS `tiros_libres`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_tabla_posiciones`
--

DROP TABLE IF EXISTS `vista_tabla_posiciones`;
/*!50001 DROP VIEW IF EXISTS `vista_tabla_posiciones`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_tabla_posiciones` AS SELECT 
 1 AS `id_equipo`,
 1 AS `equipo`,
 1 AS `partidos_jugados`,
 1 AS `ganados`,
 1 AS `empatados`,
 1 AS `perdidos`,
 1 AS `goles_favor`,
 1 AS `goles_contra`,
 1 AS `diferencia_goles`,
 1 AS `puntos`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vista_goleadores`
--

/*!50001 DROP VIEW IF EXISTS `vista_goleadores`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_goleadores` AS select `j`.`id_jugador` AS `id_jugador`,`j`.`nombre` AS `nombre`,`j`.`apellido` AS `apellido`,`e`.`nombre` AS `equipo`,count(`g`.`id_gol`) AS `total_goles`,sum((case when (`g`.`tipo` = 'penal') then 1 else 0 end)) AS `penales`,sum((case when (`g`.`tipo` = 'tiro_libre') then 1 else 0 end)) AS `tiros_libres` from ((`jugadores` `j` join `equipos` `e` on((`j`.`id_equipo` = `e`.`id_equipo`))) left join `goles` `g` on(((`j`.`id_jugador` = `g`.`id_jugador`) and (`g`.`tipo` <> 'autogol')))) group by `j`.`id_jugador`,`j`.`nombre`,`j`.`apellido`,`e`.`nombre` having (`total_goles` > 0) order by `total_goles` desc,`j`.`apellido` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_tabla_posiciones`
--

/*!50001 DROP VIEW IF EXISTS `vista_tabla_posiciones`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_tabla_posiciones` AS select `e`.`id_equipo` AS `id_equipo`,`e`.`nombre` AS `equipo`,count(distinct `p`.`id_partido`) AS `partidos_jugados`,sum((case when (((`p`.`id_equipo_local` = `e`.`id_equipo`) and (`p`.`goles_local` > `p`.`goles_visitante`)) or ((`p`.`id_equipo_visitante` = `e`.`id_equipo`) and (`p`.`goles_visitante` > `p`.`goles_local`))) then 1 else 0 end)) AS `ganados`,sum((case when ((`p`.`goles_local` = `p`.`goles_visitante`) and (`p`.`estado` = 'finalizado')) then 1 else 0 end)) AS `empatados`,sum((case when (((`p`.`id_equipo_local` = `e`.`id_equipo`) and (`p`.`goles_local` < `p`.`goles_visitante`)) or ((`p`.`id_equipo_visitante` = `e`.`id_equipo`) and (`p`.`goles_visitante` < `p`.`goles_local`))) then 1 else 0 end)) AS `perdidos`,sum((case when (`p`.`id_equipo_local` = `e`.`id_equipo`) then `p`.`goles_local` when (`p`.`id_equipo_visitante` = `e`.`id_equipo`) then `p`.`goles_visitante` else 0 end)) AS `goles_favor`,sum((case when (`p`.`id_equipo_local` = `e`.`id_equipo`) then `p`.`goles_visitante` when (`p`.`id_equipo_visitante` = `e`.`id_equipo`) then `p`.`goles_local` else 0 end)) AS `goles_contra`,(sum((case when (`p`.`id_equipo_local` = `e`.`id_equipo`) then `p`.`goles_local` when (`p`.`id_equipo_visitante` = `e`.`id_equipo`) then `p`.`goles_visitante` else 0 end)) - sum((case when (`p`.`id_equipo_local` = `e`.`id_equipo`) then `p`.`goles_visitante` when (`p`.`id_equipo_visitante` = `e`.`id_equipo`) then `p`.`goles_local` else 0 end))) AS `diferencia_goles`,sum((case when (((`p`.`id_equipo_local` = `e`.`id_equipo`) and (`p`.`goles_local` > `p`.`goles_visitante`)) or ((`p`.`id_equipo_visitante` = `e`.`id_equipo`) and (`p`.`goles_visitante` > `p`.`goles_local`))) then 3 when ((`p`.`goles_local` = `p`.`goles_visitante`) and (`p`.`estado` = 'finalizado')) then 1 else 0 end)) AS `puntos` from (`equipos` `e` left join `partidos` `p` on((((`e`.`id_equipo` = `p`.`id_equipo_local`) or (`e`.`id_equipo` = `p`.`id_equipo_visitante`)) and (`p`.`estado` = 'finalizado')))) where (`e`.`estado` = 'aprobado') group by `e`.`id_equipo`,`e`.`nombre` order by `puntos` desc,`diferencia_goles` desc,`goles_favor` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-10  8:46:49
