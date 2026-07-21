"use client";

import { useActionState } from "react";
import {
  createOrderAction,
  type OrderCreateState,
} from "@/server/actions/orders";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OrderCreateState = {};

export default function NewOrderPage() {
  const [state, formAction, pending] = useActionState(
    createOrderAction,
    initialState,
  );

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>新規注文</CardTitle>
          <CardDescription>
            作成すると受注フォームリンクが発行されます。リンクをお客様の
            LINE / DM に送ってください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">管理用タイトル</Label>
              <Input
                id="title"
                name="title"
                placeholder="例: 8/1 ○○さま センイルケーキ"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName">お客様の名前（任意）</Label>
              <Input
                id="customerName"
                name="customerName"
                placeholder="フォームでお客様自身も入力できます"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">引き渡し日（任意）</Label>
              <Input id="deliveryDate" name="deliveryDate" type="date" />
            </div>
            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "作成中..." : "作成してフォームリンクを発行"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
