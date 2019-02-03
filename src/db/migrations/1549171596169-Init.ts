import { MigrationInterface, QueryRunner } from "typeorm"

export class Init1549171596169 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "users" ("address" text NOT NULL, "created_at" TIMESTAMP NOT NULL, "name" text, "bio" text, "birth_block" integer NOT NULL, "avatar_link" text NOT NULL DEFAULT 0, "followers_count" integer NOT NULL DEFAULT 0, "following_count" integer NOT NULL DEFAULT 0, "earnings" numeric NOT NULL DEFAULT 0, CONSTRAINT "PK_b0ec0293d53a1385955f9834d5c" PRIMARY KEY ("address"))`)
        await queryRunner.query(`CREATE TABLE "tags" ("name" text NOT NULL, "created_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_d90243459a697eadb8ad56e9092" PRIMARY KEY ("name"))`)
        await queryRunner.query(`CREATE TYPE "transactions_type_enum" AS ENUM('bork', 'comment', 'extension', 'follow', 'like', 'rebork', 'set_name', 'set_bio', 'set_avatar', 'unfollow')`)
        await queryRunner.query(`CREATE TABLE "transactions" ("txid" text NOT NULL, "created_at" TIMESTAMP NOT NULL, "nonce" integer NOT NULL, "type" "transactions_type_enum" NOT NULL, "content" text, "fee" numeric NOT NULL, "comments_count" integer NOT NULL DEFAULT 0, "likes_count" integer NOT NULL DEFAULT 0, "reborks_count" integer NOT NULL DEFAULT 0, "earnings" numeric NOT NULL DEFAULT 0, "parent_txid" text, "sender_address" text, CONSTRAINT "PK_2e8d69760b288a0321d79427b10" PRIMARY KEY ("txid"))`)
        await queryRunner.query(`CREATE TABLE "mentions" ("transaction_txid" text NOT NULL, "user_address" text NOT NULL, "created_at" TIMESTAMP NOT NULL, "value" numeric NOT NULL, CONSTRAINT "PK_9bda08e84304a971eef8de3ee4f" PRIMARY KEY ("transaction_txid", "user_address"))`)
        await queryRunner.query(`CREATE TABLE "follows" ("followed_address" text NOT NULL, "follower_address" text NOT NULL, CONSTRAINT "PK_91708755e05b10e359b4176867e" PRIMARY KEY ("followed_address", "follower_address"))`)
        await queryRunner.query(`CREATE TABLE "tx_tags" ("tag_name" text NOT NULL, "transaction_txid" text NOT NULL, CONSTRAINT "PK_7a259cdd2be01c4c91729e42f80" PRIMARY KEY ("tag_name", "transaction_txid"))`)
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_5a45cbd283751f29958e910554f" FOREIGN KEY ("parent_txid") REFERENCES "transactions"("txid")`)
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_13294bcf3bbb5f82e0ba0961857" FOREIGN KEY ("sender_address") REFERENCES "users"("address")`)
        await queryRunner.query(`ALTER TABLE "mentions" ADD CONSTRAINT "FK_28dcba83105b47bdb0232dc4cb9" FOREIGN KEY ("transaction_txid") REFERENCES "transactions"("txid")`)
        await queryRunner.query(`ALTER TABLE "mentions" ADD CONSTRAINT "FK_73bf803442939c9f00e57958b3f" FOREIGN KEY ("user_address") REFERENCES "users"("address")`)
        await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_896ecc3e22c5f3b9fe89e5f6699" FOREIGN KEY ("followed_address") REFERENCES "users"("address") ON DELETE CASCADE`)
        await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_735aa5a2ac167c99c74ee24650e" FOREIGN KEY ("follower_address") REFERENCES "users"("address") ON DELETE CASCADE`)
        await queryRunner.query(`ALTER TABLE "tx_tags" ADD CONSTRAINT "FK_c69bfeedca4bcde56d210dda2d9" FOREIGN KEY ("tag_name") REFERENCES "tags"("name") ON DELETE CASCADE`)
        await queryRunner.query(`ALTER TABLE "tx_tags" ADD CONSTRAINT "FK_c5ddf48c6b7070551360f7b15f0" FOREIGN KEY ("transaction_txid") REFERENCES "transactions"("txid") ON DELETE CASCADE`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "tx_tags" DROP CONSTRAINT "FK_c5ddf48c6b7070551360f7b15f0"`)
        await queryRunner.query(`ALTER TABLE "tx_tags" DROP CONSTRAINT "FK_c69bfeedca4bcde56d210dda2d9"`)
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_735aa5a2ac167c99c74ee24650e"`)
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_896ecc3e22c5f3b9fe89e5f6699"`)
        await queryRunner.query(`ALTER TABLE "mentions" DROP CONSTRAINT "FK_73bf803442939c9f00e57958b3f"`)
        await queryRunner.query(`ALTER TABLE "mentions" DROP CONSTRAINT "FK_28dcba83105b47bdb0232dc4cb9"`)
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_13294bcf3bbb5f82e0ba0961857"`)
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_5a45cbd283751f29958e910554f"`)
        await queryRunner.query(`DROP TABLE "tx_tags"`)
        await queryRunner.query(`DROP TABLE "follows"`)
        await queryRunner.query(`DROP TABLE "mentions"`)
        await queryRunner.query(`DROP TABLE "transactions"`)
        await queryRunner.query(`DROP TYPE "transactions_type_enum"`)
        await queryRunner.query(`DROP TABLE "tags"`)
        await queryRunner.query(`DROP TABLE "users"`)
    }

}
