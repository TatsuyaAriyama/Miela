import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getDb, type Db } from "@/db";
import type { Maker } from "@/db/schema";
import { DEMO_MAKER, IS_DEMO } from "@/lib/demo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDemoReady } from "./demo-db";
import { ensureMaker, getMaker } from "./flows";

export type MakerSession = { user: User; maker: Maker; db: Db };

/** 作家ページ/アクション共通: 未ログインなら /login へ */
export async function requireMaker(): Promise<MakerSession> {
  // デモモード: 固定の作家として扱う（Supabase 認証をスキップ）
  if (IS_DEMO) {
    await ensureDemoReady();
    const db = getDb();
    let maker = await getMaker(db, DEMO_MAKER.id);
    if (!maker) {
      await ensureMaker(db, {
        id: DEMO_MAKER.id,
        shopName: DEMO_MAKER.shopName,
        displayName: DEMO_MAKER.displayName,
      });
      maker = await getMaker(db, DEMO_MAKER.id);
    }
    if (!maker) throw new Error("デモ作家の作成に失敗しました");
    const user = { id: DEMO_MAKER.id, email: "demo@miela.local" } as User;
    return { user, maker, db };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getDb();
  let maker = await getMaker(db, user.id);
  if (!maker) {
    // サインアップ直後に makers 行が無い場合のフォールバック
    await ensureMaker(db, {
      id: user.id,
      shopName:
        (user.user_metadata?.shop_name as string | undefined) ??
        user.email ??
        "マイショップ",
      displayName:
        (user.user_metadata?.display_name as string | undefined) ??
        user.email?.split("@")[0] ??
        "作家",
    });
    maker = await getMaker(db, user.id);
  }
  if (!maker) throw new Error("作家プロフィールの作成に失敗しました");
  return { user, maker, db };
}
