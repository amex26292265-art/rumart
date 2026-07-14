import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/store/SectionHeader";
import { HowItWorks } from "@/components/store/HowItWorks";
import { Faq } from "@/components/store/Faq";

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <Container className="py-12">
      <SectionHeader title="How it works" subtitle="From click to credentials in seconds" />
      <HowItWorks />
      <div className="py-10" />
      <SectionHeader title="Frequently asked" />
      <Faq />
    </Container>
  );
}
