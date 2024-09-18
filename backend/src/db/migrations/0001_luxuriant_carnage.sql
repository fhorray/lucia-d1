ALTER TABLE `posts` ADD `author_id` text REFERENCES users(id);
