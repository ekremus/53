CREATE TABLE `match_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`data` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text
);
