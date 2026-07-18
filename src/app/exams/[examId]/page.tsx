import { notFound } from "next/navigation";
import { getExamById } from "@/lib/exams";
import ExamRunner from "@/components/mathematics/ExamRunner";

export default async function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const exam = getExamById(examId);

  if (!exam) {
    notFound();
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen px-4 py-6 sm:px-8"
      style={{ background: "linear-gradient(160deg, #3d4f8f, #4a2f6b 45%, #3a7a8f 100%)" }}
    >
      <ExamRunner exam={exam} />
    </div>
  );
}
