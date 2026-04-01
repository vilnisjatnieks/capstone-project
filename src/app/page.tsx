import { getCurrentUser } from "@/lib/auth";
import { RecommendationsSection } from "@/components/recommendations-section";
import { HomeSearchBar } from "@/components/home-search-bar";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-4xl font-bold mb-2">
        {user ? `Welcome back, ${user.name}` : "Karson Institute Digital Library"}
      </h1>
      <br></br>
      {user && <RecommendationsSection />}
      <HomeSearchBar />
    </div>
  );
}
