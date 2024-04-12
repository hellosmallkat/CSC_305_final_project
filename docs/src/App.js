import "./index.css"
import Hero from "./components/page-sections/Hero"
import CallToAction from "./components/page-sections/CallToAction"
import Footer from "./components/page-sections/Footer"
import Feature1 from "./components/page-sections/Feature1"
import Feature2 from "./components/page-sections/Feature2"

export default function App() {
  return (
    <div>
      <Hero />
      <Feature1 />
      <Feature2 />
      <CallToAction />
      <Footer />
    </div>
  )
}