import { MigrationInterface, QueryRunner } from "typeorm"

export class Init1547340126973 implements MigrationInterface {

	public async up (queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`CREATE TABLE "user" ("address" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "name" text, "bio" text, "birth_block" integer NOT NULL, "avatar_link" text, CONSTRAINT "PK_3122b4b8709577da50e89b68983" PRIMARY KEY ("address"))`)
		await queryRunner.query(`CREATE TYPE "post_type_enum" AS ENUM('post', 'reply', 'repost', 'like', 'profile_update')`)
		await queryRunner.query(`CREATE TABLE "post" ("txid" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "type" "post_type_enum" NOT NULL, "content" text, "value" numeric, "fee" numeric NOT NULL, "parent_txid" text, "sender_address" text, "recipient_address" text, CONSTRAINT "PK_2e18075f8d686687c1b35e5b420" PRIMARY KEY ("txid"))`)
		await queryRunner.query(`ALTER TABLE "post" ADD CONSTRAINT "FK_ed510759141fed905ffbd092940" FOREIGN KEY ("parent_txid") REFERENCES "post"("txid")`)
		await queryRunner.query(`ALTER TABLE "post" ADD CONSTRAINT "FK_a289ff1fd210f3bbf7ba371d4b9" FOREIGN KEY ("sender_address") REFERENCES "user"("address")`)
		await queryRunner.query(`ALTER TABLE "post" ADD CONSTRAINT "FK_37a7c91bbff1d4f870994f84ac1" FOREIGN KEY ("recipient_address") REFERENCES "user"("address")`)
	}

	public async down (queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`ALTER TABLE "post" DROP CONSTRAINT "FK_37a7c91bbff1d4f870994f84ac1"`)
		await queryRunner.query(`ALTER TABLE "post" DROP CONSTRAINT "FK_a289ff1fd210f3bbf7ba371d4b9"`)
		await queryRunner.query(`ALTER TABLE "post" DROP CONSTRAINT "FK_ed510759141fed905ffbd092940"`)
		await queryRunner.query(`DROP TABLE "post"`)
		await queryRunner.query(`DROP TYPE "post_type_enum"`)
		await queryRunner.query(`DROP TABLE "user"`)
	}

}
