import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1549505380784 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "users" ("address" text PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL, "name" text, "bio" text, "birth_block" integer NOT NULL, "avatar_link" text, "followers_count" integer NOT NULL DEFAULT (0), "following_count" integer NOT NULL DEFAULT (0), "blockers_count" integer NOT NULL DEFAULT (0), "blocking_count" integer NOT NULL DEFAULT (0), "earnings" numeric NOT NULL DEFAULT (0))`);
        await queryRunner.query(`CREATE TABLE "tags" ("name" text PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "transactions" ("txid" text PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL, "nonce" integer NOT NULL, "type" text NOT NULL, "content" text, "fee" numeric NOT NULL, "comments_count" integer NOT NULL DEFAULT (0), "likes_count" integer NOT NULL DEFAULT (0), "reborks_count" integer NOT NULL DEFAULT (0), "earnings" numeric NOT NULL DEFAULT (0), "parent_txid" text, "sender_address" text)`);
        await queryRunner.query(`CREATE TABLE "mentions" ("transaction_txid" text NOT NULL, "user_address" text NOT NULL, "created_at" datetime NOT NULL, "value" numeric NOT NULL, PRIMARY KEY ("transaction_txid", "user_address"))`);
        await queryRunner.query(`CREATE TABLE "follows" ("followed_address" text NOT NULL, "follower_address" text NOT NULL, PRIMARY KEY ("followed_address", "follower_address"))`);
        await queryRunner.query(`CREATE TABLE "blocks" ("blocked_address" text NOT NULL, "blocker_address" text NOT NULL, PRIMARY KEY ("blocked_address", "blocker_address"))`);
        await queryRunner.query(`CREATE TABLE "tx_tags" ("tag_name" text NOT NULL, "transaction_txid" text NOT NULL, PRIMARY KEY ("tag_name", "transaction_txid"))`);
        await queryRunner.query(`CREATE TABLE "temporary_transactions" ("txid" text PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL, "nonce" integer NOT NULL, "type" text NOT NULL, "content" text, "fee" numeric NOT NULL, "comments_count" integer NOT NULL DEFAULT (0), "likes_count" integer NOT NULL DEFAULT (0), "reborks_count" integer NOT NULL DEFAULT (0), "earnings" numeric NOT NULL DEFAULT (0), "parent_txid" text, "sender_address" text, CONSTRAINT "FK_5a45cbd283751f29958e910554f" FOREIGN KEY ("parent_txid") REFERENCES "transactions" ("txid"), CONSTRAINT "FK_13294bcf3bbb5f82e0ba0961857" FOREIGN KEY ("sender_address") REFERENCES "users" ("address"))`);
        await queryRunner.query(`INSERT INTO "temporary_transactions"("txid", "created_at", "nonce", "type", "content", "fee", "comments_count", "likes_count", "reborks_count", "earnings", "parent_txid", "sender_address") SELECT "txid", "created_at", "nonce", "type", "content", "fee", "comments_count", "likes_count", "reborks_count", "earnings", "parent_txid", "sender_address" FROM "transactions"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`ALTER TABLE "temporary_transactions" RENAME TO "transactions"`);
        await queryRunner.query(`CREATE TABLE "temporary_mentions" ("transaction_txid" text NOT NULL, "user_address" text NOT NULL, "created_at" datetime NOT NULL, "value" numeric NOT NULL, CONSTRAINT "FK_28dcba83105b47bdb0232dc4cb9" FOREIGN KEY ("transaction_txid") REFERENCES "transactions" ("txid"), CONSTRAINT "FK_73bf803442939c9f00e57958b3f" FOREIGN KEY ("user_address") REFERENCES "users" ("address"), PRIMARY KEY ("transaction_txid", "user_address"))`);
        await queryRunner.query(`INSERT INTO "temporary_mentions"("transaction_txid", "user_address", "created_at", "value") SELECT "transaction_txid", "user_address", "created_at", "value" FROM "mentions"`);
        await queryRunner.query(`DROP TABLE "mentions"`);
        await queryRunner.query(`ALTER TABLE "temporary_mentions" RENAME TO "mentions"`);
        await queryRunner.query(`CREATE TABLE "temporary_follows" ("followed_address" text NOT NULL, "follower_address" text NOT NULL, CONSTRAINT "FK_896ecc3e22c5f3b9fe89e5f6699" FOREIGN KEY ("followed_address") REFERENCES "users" ("address") ON DELETE CASCADE, CONSTRAINT "FK_735aa5a2ac167c99c74ee24650e" FOREIGN KEY ("follower_address") REFERENCES "users" ("address") ON DELETE CASCADE, PRIMARY KEY ("followed_address", "follower_address"))`);
        await queryRunner.query(`INSERT INTO "temporary_follows"("followed_address", "follower_address") SELECT "followed_address", "follower_address" FROM "follows"`);
        await queryRunner.query(`DROP TABLE "follows"`);
        await queryRunner.query(`ALTER TABLE "temporary_follows" RENAME TO "follows"`);
        await queryRunner.query(`CREATE TABLE "temporary_blocks" ("blocked_address" text NOT NULL, "blocker_address" text NOT NULL, CONSTRAINT "FK_ecba0d996258678e9780ed88b70" FOREIGN KEY ("blocked_address") REFERENCES "users" ("address") ON DELETE CASCADE, CONSTRAINT "FK_de6aa57933625d2ce35c1650908" FOREIGN KEY ("blocker_address") REFERENCES "users" ("address") ON DELETE CASCADE, PRIMARY KEY ("blocked_address", "blocker_address"))`);
        await queryRunner.query(`INSERT INTO "temporary_blocks"("blocked_address", "blocker_address") SELECT "blocked_address", "blocker_address" FROM "blocks"`);
        await queryRunner.query(`DROP TABLE "blocks"`);
        await queryRunner.query(`ALTER TABLE "temporary_blocks" RENAME TO "blocks"`);
        await queryRunner.query(`CREATE TABLE "temporary_tx_tags" ("tag_name" text NOT NULL, "transaction_txid" text NOT NULL, CONSTRAINT "FK_c69bfeedca4bcde56d210dda2d9" FOREIGN KEY ("tag_name") REFERENCES "tags" ("name") ON DELETE CASCADE, CONSTRAINT "FK_c5ddf48c6b7070551360f7b15f0" FOREIGN KEY ("transaction_txid") REFERENCES "transactions" ("txid") ON DELETE CASCADE, PRIMARY KEY ("tag_name", "transaction_txid"))`);
        await queryRunner.query(`INSERT INTO "temporary_tx_tags"("tag_name", "transaction_txid") SELECT "tag_name", "transaction_txid" FROM "tx_tags"`);
        await queryRunner.query(`DROP TABLE "tx_tags"`);
        await queryRunner.query(`ALTER TABLE "temporary_tx_tags" RENAME TO "tx_tags"`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "tx_tags" RENAME TO "temporary_tx_tags"`);
        await queryRunner.query(`CREATE TABLE "tx_tags" ("tag_name" text NOT NULL, "transaction_txid" text NOT NULL, PRIMARY KEY ("tag_name", "transaction_txid"))`);
        await queryRunner.query(`INSERT INTO "tx_tags"("tag_name", "transaction_txid") SELECT "tag_name", "transaction_txid" FROM "temporary_tx_tags"`);
        await queryRunner.query(`DROP TABLE "temporary_tx_tags"`);
        await queryRunner.query(`ALTER TABLE "blocks" RENAME TO "temporary_blocks"`);
        await queryRunner.query(`CREATE TABLE "blocks" ("blocked_address" text NOT NULL, "blocker_address" text NOT NULL, PRIMARY KEY ("blocked_address", "blocker_address"))`);
        await queryRunner.query(`INSERT INTO "blocks"("blocked_address", "blocker_address") SELECT "blocked_address", "blocker_address" FROM "temporary_blocks"`);
        await queryRunner.query(`DROP TABLE "temporary_blocks"`);
        await queryRunner.query(`ALTER TABLE "follows" RENAME TO "temporary_follows"`);
        await queryRunner.query(`CREATE TABLE "follows" ("followed_address" text NOT NULL, "follower_address" text NOT NULL, PRIMARY KEY ("followed_address", "follower_address"))`);
        await queryRunner.query(`INSERT INTO "follows"("followed_address", "follower_address") SELECT "followed_address", "follower_address" FROM "temporary_follows"`);
        await queryRunner.query(`DROP TABLE "temporary_follows"`);
        await queryRunner.query(`ALTER TABLE "mentions" RENAME TO "temporary_mentions"`);
        await queryRunner.query(`CREATE TABLE "mentions" ("transaction_txid" text NOT NULL, "user_address" text NOT NULL, "created_at" datetime NOT NULL, "value" numeric NOT NULL, PRIMARY KEY ("transaction_txid", "user_address"))`);
        await queryRunner.query(`INSERT INTO "mentions"("transaction_txid", "user_address", "created_at", "value") SELECT "transaction_txid", "user_address", "created_at", "value" FROM "temporary_mentions"`);
        await queryRunner.query(`DROP TABLE "temporary_mentions"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME TO "temporary_transactions"`);
        await queryRunner.query(`CREATE TABLE "transactions" ("txid" text PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL, "nonce" integer NOT NULL, "type" text NOT NULL, "content" text, "fee" numeric NOT NULL, "comments_count" integer NOT NULL DEFAULT (0), "likes_count" integer NOT NULL DEFAULT (0), "reborks_count" integer NOT NULL DEFAULT (0), "earnings" numeric NOT NULL DEFAULT (0), "parent_txid" text, "sender_address" text)`);
        await queryRunner.query(`INSERT INTO "transactions"("txid", "created_at", "nonce", "type", "content", "fee", "comments_count", "likes_count", "reborks_count", "earnings", "parent_txid", "sender_address") SELECT "txid", "created_at", "nonce", "type", "content", "fee", "comments_count", "likes_count", "reborks_count", "earnings", "parent_txid", "sender_address" FROM "temporary_transactions"`);
        await queryRunner.query(`DROP TABLE "temporary_transactions"`);
        await queryRunner.query(`DROP TABLE "tx_tags"`);
        await queryRunner.query(`DROP TABLE "blocks"`);
        await queryRunner.query(`DROP TABLE "follows"`);
        await queryRunner.query(`DROP TABLE "mentions"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TABLE "tags"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
