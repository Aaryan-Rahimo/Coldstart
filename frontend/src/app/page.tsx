import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { SocialProof } from '@/components/landing/SocialProof';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { CtaBanner } from '@/components/landing/CtaBanner';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <SocialProof />
        <FeaturesSection />
        <HowItWorksSection />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}

