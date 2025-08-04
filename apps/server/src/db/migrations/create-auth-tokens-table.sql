CREATE TABLE IF NOT EXISTS `auth_tokens` (
  `sessionId` varchar(36) NOT NULL,
  `userId` bigint unsigned NOT NULL,
  `accessToken` varchar(512) NOT NULL,
  `refreshToken` varchar(512) DEFAULT NULL,
  `accessTokenExpiresAt` datetime NOT NULL,
  `refreshTokenExpiresAt` datetime DEFAULT NULL,
  `lastActivityAt` datetime NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sessionId`),
  KEY `IDX_auth_tokens_userId` (`userId`),
  KEY `IDX_auth_tokens_accessToken` (`accessToken`),
  KEY `IDX_auth_tokens_refreshToken` (`refreshToken`),
  CONSTRAINT `FK_auth_tokens_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
