import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Directory } from "@/components/Directory";
import { apiData, getStars } from "@/lib/data";

// Revalidate hourly so the star count refreshes; the API data is baked at build.
export const revalidate = 3600;

export default async function Home() {
  const stars = await getStars();

  return (
    <>
      <Header stars={stars} />
      <main>
        <Hero data={apiData} />
        <Directory data={apiData} />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
