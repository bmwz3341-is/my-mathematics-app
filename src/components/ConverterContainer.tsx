"use client";

import dynamic from "next/dynamic";

export interface ConverterContainerProps {
  conversionType: string;
}

export default function ConverterContainer({
  conversionType,
}: ConverterContainerProps) {
  const Converter = dynamic(() => import(`../converters/${conversionType}`), {
    loading: () => <p className="text-right text-gray-500">טוען...</p>,
  });

  return <Converter />;
}
