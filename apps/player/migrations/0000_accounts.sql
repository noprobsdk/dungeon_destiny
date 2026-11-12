CREATE TABLE `account_sign_ins` (
	`provider` text NOT NULL,
	`provider_player_id` text NOT NULL,
	`account_id` text NOT NULL,
	`created_at` text NOT NULL,
	`last_sign_in_at` text NOT NULL,
	PRIMARY KEY(`provider`, `provider_player_id`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`account_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "account_sign_ins_provider_check" CHECK("account_sign_ins"."provider" IN ('google_play_games', 'apple_game_center'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_sign_ins_account_provider_unique` ON `account_sign_ins` (`account_id`,`provider`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`account_id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`chain_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`replaced_at` text,
	`revoked_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`account_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_hash_unique` ON `refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_chain_id_idx` ON `refresh_tokens` (`chain_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_account_id_idx` ON `refresh_tokens` (`account_id`);