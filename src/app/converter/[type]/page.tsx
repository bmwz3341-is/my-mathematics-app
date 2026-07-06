import { notFound } from "next/navigation";
import { conversionsConfig } from "@/config/conversionsConfig";
import ConverterContainer from "@/components/ConverterContainer";

export default async function ConverterPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const isKnownType = conversionsConfig.some((item) => item.id === type);

  if (!isKnownType) {
    notFound();
  }

  return <ConverterContainer conversionType={type} />;
}
