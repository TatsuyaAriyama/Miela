import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "awaiting_form",
  "form_submitted",
  "mock_in_progress",
  "awaiting_approval",
  "needs_revision",
  "approved",
  "completed",
  "cancelled",
]);

export const cakeShapeEnum = pgEnum("cake_shape", ["round", "heart", "square"]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "approved",
  "revision_requested",
]);

export const tokenPurposeEnum = pgEnum("token_purpose", ["form", "review"]);

/** Supabase Auth の user と 1:1（id = auth.users.id） */
export const makers = pgTable("makers", {
  id: uuid("id").primaryKey(),
  shopName: text("shop_name").notNull(),
  displayName: text("display_name").notNull(),
  snsUrl: text("sns_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    makerId: uuid("maker_id")
      .notNull()
      .references(() => makers.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull().default("draft"),
    title: text("title").notNull().default(""),
    customerName: text("customer_name"),
    deliveryDate: date("delivery_date"),
    sizeGo: integer("size_go"),
    shape: cakeShapeEnum("shape"),
    flavor: text("flavor"),
    /** 特定原材料8品目のうち該当するもの（キー配列） */
    allergyItems: jsonb("allergy_items")
      .$type<string[]>()
      .notNull()
      .default([]),
    allergyNote: text("allergy_note"),
    requestText: text("request_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("orders_maker_id_idx").on(t.makerId),
    index("orders_delivery_date_idx").on(t.deliveryDate),
  ],
);

export const orderImages = pgTable(
  "order_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    originalName: text("original_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("order_images_order_id_idx").on(t.orderId)],
);

/** エディタのシーンJSON（スキーマは src/lib/scene.ts の SceneSchema） */
export const mocks = pgTable(
  "mocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    sceneJson: jsonb("scene_json").notNull(),
    pngPath: text("png_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("mocks_order_id_version_uq").on(t.orderId, t.version)],
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mockId: uuid("mock_id")
      .notNull()
      .references(() => mocks.id, { onDelete: "cascade" }),
    status: approvalStatusEnum("status").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("approvals_mock_id_idx").on(t.mockId)],
);

export const shareTokens = pgTable(
  "share_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    purpose: tokenPurposeEnum("purpose").notNull(),
    revoked: boolean("revoked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("share_tokens_token_uq").on(t.token),
    index("share_tokens_order_id_idx").on(t.orderId),
  ],
);

export type Maker = typeof makers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderImage = typeof orderImages.$inferSelect;
export type Mock = typeof mocks.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type ShareToken = typeof shareTokens.$inferSelect;
export type OrderStatus = Order["status"];
export type CakeShape = NonNullable<Order["shape"]>;
