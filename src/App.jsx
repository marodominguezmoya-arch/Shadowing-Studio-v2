import { useEffect } from "react";
import Loader from "./components/Loader";
import Nav from "./components/Nav";
import ScrollProgress from "./components/ScrollProgress";
import StickyCTA from "./components/StickyCTA";
import Hero from "./components/Hero";
import Testimonials from "./components/Testimonials";
import HiddenProblem from "./components/HiddenProblem";
import Cost from "./components/Cost";
import Method from "./components/Method";
import Transformation from "./components/Transformation";
import Included from "./components/Included";
import Offers from "./components/Offers";
import CaseStudies from "./components/CaseStudies";
import About from "./components/About";
import FAQ from "./components/FAQ";
import Application from "./components/Application";
import Footer from "./components/Footer";
import { initAnalytics } from "./lib/analytics";

export default function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-void">
      <Loader />
      <ScrollProgress />
      <Nav />
      <main>
        <Hero />
        <Testimonials />
        <HiddenProblem />
        <Cost />
        <Method />
        <Transformation />
        <Included />
        <Offers />
        <CaseStudies />
        <About />
        <FAQ />
        <Application />
      </main>
      <Footer />
      <StickyCTA />
    </div>
  );
}
