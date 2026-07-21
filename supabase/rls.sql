-- =============================================================
-- Miela: RLS ポリシー & Storage バケット設定
-- Drizzle マイグレーション適用後に Supabase SQL Editor で実行する
-- =============================================================
--
-- アクセス設計:
--   * アプリのサーバー側（Server Actions / Route Handlers）は DATABASE_URL の
--     直接続で DB を操作する（RLS の対象外。maker_id / トークン検証はコードで行う）。
--   * anon キーで PostgREST から直接テーブルに触られた場合に備え、
--     全テーブルで RLS を有効化し、作家は自分の行のみ読み書き可とする。
--   * 客（未認証）はテーブルへ直接アクセスできない。客側ページは
--     share_tokens を検証する Route Handler 経由（service role）でのみデータに触れる。

-- ---------- RLS 有効化 ----------
alter table public.makers        enable row level security;
alter table public.orders        enable row level security;
alter table public.order_images  enable row level security;
alter table public.mocks         enable row level security;
alter table public.approvals     enable row level security;
alter table public.share_tokens  enable row level security;

-- ---------- makers: 自分の行のみ ----------
drop policy if exists "makers_select_own" on public.makers;
create policy "makers_select_own" on public.makers
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "makers_insert_own" on public.makers;
create policy "makers_insert_own" on public.makers
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "makers_update_own" on public.makers;
create policy "makers_update_own" on public.makers
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------- orders: 自分の maker_id の行のみ ----------
drop policy if exists "orders_all_own" on public.orders;
create policy "orders_all_own" on public.orders
  for all to authenticated
  using (maker_id = (select auth.uid()))
  with check (maker_id = (select auth.uid()));

-- ---------- 注文配下のテーブル: 親 order の所有者のみ ----------
drop policy if exists "order_images_all_own" on public.order_images;
create policy "order_images_all_own" on public.order_images
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.maker_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.maker_id = (select auth.uid())
  ));

drop policy if exists "mocks_all_own" on public.mocks;
create policy "mocks_all_own" on public.mocks
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.maker_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.maker_id = (select auth.uid())
  ));

drop policy if exists "approvals_all_own" on public.approvals;
create policy "approvals_all_own" on public.approvals
  for all to authenticated
  using (exists (
    select 1 from public.mocks m
    join public.orders o on o.id = m.order_id
    where m.id = mock_id and o.maker_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.mocks m
    join public.orders o on o.id = m.order_id
    where m.id = mock_id and o.maker_id = (select auth.uid())
  ));

drop policy if exists "share_tokens_all_own" on public.share_tokens;
create policy "share_tokens_all_own" on public.share_tokens
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.maker_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.maker_id = (select auth.uid())
  ));

-- anon ロールにはどのテーブルのポリシーも定義しない = 直接アクセス全拒否

-- ---------- Storage バケット ----------
-- 参考画像・モックPNG はどちらも非公開バケット。
-- 表示はサーバーで発行する署名付きURL経由（service role）のみ。
insert into storage.buckets (id, name, public)
values ('order-images', 'order-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('mocks', 'mocks', false)
on conflict (id) do nothing;
