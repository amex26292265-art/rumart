import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, Send } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getSiteSettings } from "@/lib/site-settings";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { CredentialViewer } from "@/components/store/CredentialViewer";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { reference }, include: { items: true, credential: true } }),
    getSiteSettings(),
  ]);
  if (!order || order.userId !== userId) notFound();

  const delivered = order.status === "completed" && order.credential.length > 0;
  const productTitle = order.items[0]?.title ?? "Your product";
  const orderDate = order.createdAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Container className="max-w-2xl py-14">
      <Reveal className="text-center">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${
            delivered ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          {delivered ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink-950">
          {delivered ? "Order completed" : "Pending manual fulfillment"}
        </h1>
      </Reveal>

      {/* Order summary */}
      <Reveal delay={0.05} className="mt-8">
        <div className="card divide-y divide-mist-100">
          <Row label="Reference" value={order.reference} mono />
          <Row label="Product" value={productTitle} />
          <Row label="Status" value={delivered ? "Delivered" : "Pending manual fulfillment"} />
          <Row label="Total" value={formatMoney(order.total, order.currency)} />
          <Row label="Delivery time" value={delivered ? "Instant" : "Manual"} />
          <Row label="Order date" value={orderDate} />
        </div>
      </Reveal>

      {delivered ? (
        <Reveal delay={0.1} className="mt-6 space-y-4">
          {order.credential.map((c) => (
            <CredentialViewer key={c.id} productTitle={productTitle} credentials={decryptSecret(c.ciphertext)} />
          ))}
          <div className="text-center">
            <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Send className="h-4 w-4" /> Contact support
              </Button>
            </a>
          </div>
        </Reveal>
      ) : (
        // Payment received, awaiting manual delivery. Only ever show our own
        // Telegram — never any supplier detail.
        <Reveal delay={0.1} className="mt-6">
          <div className="card p-6 text-center">
            <p className="text-ink-600">{settings.supportNote}</p>
            <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block">
              <Button size="lg" variant="accent">
                <Send className="h-4 w-4" /> Contact support on Telegram
              </Button>
            </a>
            <p className="mt-3 text-xs text-ink-400">
              Quote your reference <span className="font-mono">{order.reference}</span> and we’ll deliver right away.
            </p>
          </div>
        </Reveal>
      )}

      <div className="mt-8 text-center">
        <Link href="/marketplace">
          <Button variant="outline">Continue shopping</Button>
        </Link>
      </div>
    </Container>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-sm text-ink-500">{label}</span>
      <span className={`text-right text-sm font-medium text-ink-950 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
