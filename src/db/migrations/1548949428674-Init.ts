import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1548949428674 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "users" ("address" text NOT NULL, "created_at" TIMESTAMP NOT NULL, "name" text, "bio" text, "birth_block" integer NOT NULL, "avatar_link" text NOT NULL DEFAULT 0, "followers_count" integer NOT NULL DEFAULT 0, "following_count" integer NOT NULL DEFAULT 0, "earnings" numeric NOT NULL DEFAULT 0, CONSTRAINT "PK_b0ec0293d53a1385955f9834d5c" PRIMARY KEY ("address"))`);
        await queryRunner.query(`CREATE TYPE "transactions_type_enum" AS ENUM('bork', 'comment', 'extension', 'follow', 'like', 'rebork', 'set_name', 'set_bio', 'set_avatar', 'unfollow')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("txid" text NOT NULL, "created_at" TIMESTAMP NOT NULL, "nonce" integer NOT NULL, "type" "transactions_type_enum" NOT NULL, "content" text, "value" numeric NOT NULL DEFAULT 0, "fee" numeric NOT NULL, "comments_count" integer NOT NULL DEFAULT 0, "likes_count" integer NOT NULL DEFAULT 0, "reborks_count" integer NOT NULL DEFAULT 0, "earnings" numeric NOT NULL DEFAULT 0, "parent_txid" text, "sender_address" text, "recipient_address" text, CONSTRAINT "PK_2e8d69760b288a0321d79427b10" PRIMARY KEY ("txid"))`);
        await queryRunner.query(`CREATE TABLE "follows" ("followed_address" text NOT NULL, "follower_address" text NOT NULL, CONSTRAINT "PK_91708755e05b10e359b4176867e" PRIMARY KEY ("followed_address", "follower_address"))`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_5a45cbd283751f29958e910554f" FOREIGN KEY ("parent_txid") REFERENCES "transactions"("txid")`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_13294bcf3bbb5f82e0ba0961857" FOREIGN KEY ("sender_address") REFERENCES "users"("address")`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_ff1cb83586be9d8a5e156f2cc13" FOREIGN KEY ("recipient_address") REFERENCES "users"("address")`);
        await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_896ecc3e22c5f3b9fe89e5f6699" FOREIGN KEY ("followed_address") REFERENCES "users"("address") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_735aa5a2ac167c99c74ee24650e" FOREIGN KEY ("follower_address") REFERENCES "users"("address") ON DELETE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_735aa5a2ac167c99c74ee24650e"`);
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_896ecc3e22c5f3b9fe89e5f6699"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_ff1cb83586be9d8a5e156f2cc13"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_13294bcf3bbb5f82e0ba0961857"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_5a45cbd283751f29958e910554f"`);
        await queryRunner.query(`DROP TABLE "follows"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
