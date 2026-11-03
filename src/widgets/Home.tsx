import { useState } from "react";
import SplashScreen from "@/components/SplashScreen";

function Home() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return <SplashScreen onComplete={() => setIsLoading(false)} />;
  }

  return <div>Home</div>;
}

export default Home;
