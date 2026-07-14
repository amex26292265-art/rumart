import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, Send } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getSiteSettings, telegramContactUrl } from "@/lib/site-settings";
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
  const credentials = order.credential.map((c) => ({
    id: c.id,
    productTitle: c.productTitle,
    text: decryptSecret(c.ciphertext),
  }));

  const itemLines = order.items.map((i) => `• ${i.title}`).join("\n");
  const tgMessage = `Hi! I need help with my Rumart order ${order.reference} (${formatMoney(order.total, order.currency)}):\n${itemLines}`;
  const tgUrl = telegramContactUrl(settings.telegramHandle, tgMessage);

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
          {delivered ? "Order complete" : "Order received — finishing delivery"}
        </h1>
        <p className="mt-2 text-ink-500">
          Reference <span className="font-mono font-medium text-ink-950">{order.reference}</span> ·{" "}
          {formatMoney(order.total, order.currency)}
        </p>
      </Reveal>

      {delivered ? (
        <Reveal delay={0.1} className="mt-8 space-y-4">
          {credentials.map((c) => (
            <CredentialViewer key={c.id} productTitle={c.productTitle} credentials={c.text} />
          ))}
        </Reveal>
      ) : (
        // Manual fallback: auto-delivery didn't complete → contact us on Telegram.
        <Reveal delay={0.1} className="mt-8">
          <div className="card p-6 text-center">
            <p className="text-ink-600">{settings.supportNote}</p>
            <a href={tgUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block">
              <Button size="lg" variant="accent">
                <Send className="h-4 w-4" /> Contact us on Telegram
              </Button>
            </a>
            <p className="mt-3 text-xs text-ink-400">
              Your reference {order.reference} is already in the message — just hit send.
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
