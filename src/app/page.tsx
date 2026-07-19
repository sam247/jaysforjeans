import { ComingSoonLanding } from "@/components/coming-soon-landing";

type HomePageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialStatus =
    params?.status === "success" || params?.status === "error" ? params.status : undefined;

  return <ComingSoonLanding initialStatus={initialStatus} />;
}
