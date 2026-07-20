"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

export interface ConverterContainerProps {
  conversionType: string;
}

export default function ConverterContainer({
  conversionType,
}: ConverterContainerProps) {
  const Converter = useMemo(
    () =>
      dynamic(() => import(`../converters/${conversionType}`), {
        loading: () => <p className="text-right text-gray-500">טוען...</p>,
      }),
    [conversionType]
  );

  return <Converter />;
}
