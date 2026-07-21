import type { Metadata } from "next";
import { getDb } from "@/db";
import { ensureDemoReady } from "@/server/demo-db";
import { getMaker, getOrderByToken } from "@/server/flows";
import { TOKEN_PATTERN } from "@/lib/tokens";
import { CustomerForm } from "./customer-form";
import { CustomerShell, InvalidLinkCard, MessageCard } from "@/components/customer-shell";

export const metadata: Metadata = { title: "オーダーフォーム" };

export default async function CustomerFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) {
    return (
      <CustomerShell>
        <InvalidLinkCard />
      </CustomerShell>
    );
  }

  await ensureDemoReady();
  const db = getDb();
  const found = await getOrderByToken(db, token, "form");
  if (!found) {
    return (
      <CustomerShell>
        <InvalidLinkCard />
      </CustomerShell>
    );
  }

  const maker = await getMaker(db, found.order.makerId);
  const shopName = maker?.shopName ?? "";

  if (found.order.status === "cancelled") {
    return (
      <CustomerShell shopName={shopName}>
        <MessageCard
          title="この注文はキャンセルされました"
          body="お手数ですが、作家までお問い合わせください。"
        />
      </CustomerShell>
    );
  }

  const alreadySubmitted =
    found.order.status !== "draft" && found.order.status !== "awaiting_form";

  if (alreadySubmitted) {
    return (
      <CustomerShell shopName={shopName}>
        <MessageCard
          title="ご回答ありがとうございました"
          body="内容はすでに送信済みです。変更したい場合は、作家へ直接ご連絡ください。"
        />
      </CustomerShell>
    );
  }

  return (
    <CustomerShell shopName={shopName}>
      <CustomerForm
        token={token}
        initialCustomerName={found.order.customerName ?? ""}
        initialDeliveryDate={found.order.deliveryDate ?? ""}
      />
    </CustomerShell>
  );
}
