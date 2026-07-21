CREATE TYPE "public"."approval_status" AS ENUM('approved', 'revision_requested');--> statement-breakpoint
CREATE TYPE "public"."cake_shape" AS ENUM('round', 'heart', 'square');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'awaiting_form', 'form_submitted', 'mock_in_progress', 'awaiting_approval', 'needs_revision', 'approved', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."token_purpose" AS ENUM('form', 'review');--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mock_id" uuid NOT NULL,
	"status" "approval_status" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "makers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_name" text NOT NULL,
	"display_name" text NOT NULL,
	"sns_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"scene_json" jsonb NOT NULL,
	"png_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maker_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"customer_name" text,
	"delivery_date" date,
	"size_go" integer,
	"shape" "cake_shape",
	"flavor" text,
	"allergy_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allergy_note" text,
	"request_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"token" text NOT NULL,
	"purpose" "token_purpose" NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_mock_id_mocks_id_fk" FOREIGN KEY ("mock_id") REFERENCES "public"."mocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mocks" ADD CONSTRAINT "mocks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_images" ADD CONSTRAINT "order_images_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_maker_id_makers_id_fk" FOREIGN KEY ("maker_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approvals_mock_id_idx" ON "approvals" USING btree ("mock_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mocks_order_id_version_uq" ON "mocks" USING btree ("order_id","version");--> statement-breakpoint
CREATE INDEX "order_images_order_id_idx" ON "order_images" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_maker_id_idx" ON "orders" USING btree ("maker_id");--> statement-breakpoint
CREATE INDEX "orders_delivery_date_idx" ON "orders" USING btree ("delivery_date");--> statement-breakpoint
CREATE UNIQUE INDEX "share_tokens_token_uq" ON "share_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "share_tokens_order_id_idx" ON "share_tokens" USING btree ("order_id");