import HealthCard from "../components/HealthCard";
import "./HomePage.css";

export default function HomePage() {
  return (
    <main className="home">
      <header className="home__header">
        <h1 className="home__title">CampusConnect</h1>
        <p className="home__subtitle">
          La vie étudiante de votre université, au même endroit.
        </p>
      </header>
      <HealthCard />
    </main>
  );
}
