"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation";
import { ensureMaker } from "@/server/flows";

export type AuthFormState = { error?: string; message?: string };

const SETUP_INCOMPLETE_MESSAGE =
  "サーバーのセットアップが未完了です（Supabaseの環境変数が未設定）。";

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }
  if (!isSupabaseConfigured()) return { error: SETUP_INCOMPLETE_MESSAGE };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/dashboard");
}

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    shopName: formData.get("shopName"),
    displayName: formData.get("displayName"),
    snsUrl: formData.get("snsUrl") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }
  if (!isSupabaseConfigured()) return { error: SETUP_INCOMPLETE_MESSAGE };
  const { email, password, shopName, displayName, snsUrl } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { shop_name: shopName, display_name: displayName },
    },
  });
  if (error) {
    return { error: `登録に失敗しました: ${error.message}` };
  }
  if (data.user) {
    await ensureMaker(getDb(), {
      id: data.user.id,
      shopName,
      displayName,
      snsUrl: snsUrl || null,
    });
  }
  if (!data.session) {
    return {
      message:
        "確認メールを送信しました。メール内のリンクを開いてからログインしてください",
    };
  }
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  if (process.env.MIELA_DEMO === "1") {
    redirect("/");
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
