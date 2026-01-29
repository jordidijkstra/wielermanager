import '../css/home.css';
import { howToPlay } from '../data/howToPlay';

export default function Home({ setCurrentPage, setShowLoginModal, user }) {

    const steps = howToPlay.map((step, index) => {
        return (
            <div key={index} className="step-card">
                <div className="step-content">
                    <h3>{step.title}</h3>
                    <div className="step-number"><span>{step.stepNumber}</span></div>
                    <p>{step.description}</p>
                </div>
            </div>
        );
    });

    function scrollToHowToPlay() {
        const howToPlaySection = document.querySelector('.how-to-play');
        howToPlaySection.scrollIntoView({ behavior: 'smooth' });
    }

    function handleMaakEenPloeg() {
        if (user) {
            // User is logged in, go to team page
            setCurrentPage('team');
        } else {
            // User not logged in, show login modal then go to team
            setShowLoginModal(true);
        }
    }

    return (
        <main className="home-container">
            <section className="intro">
                <video autoPlay muted className="bg-video">
                    <source src="/video/bg-video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                <div className="intro-overlay">
                    <h1>Welkom bij Wielermanager</h1>
                    <p>
                        Wielermanager is jouw ultieme wielerploegenspel voor het seizoen 2026. 
                        Stel, net zoals in de echte wielerwereld, een ploeg samen van minstens 14 en maximaal 30 renners die over het hele seizoen de meeste punten voor jou moeten scoren.
                    </p>
                    <button onClick={scrollToHowToPlay}>Ontdek hoe</button>
                </div>
            </section>

            <section className="how-to-play">
                <h2>Hoe het werkt</h2>
                <div className="steps">
                    {steps}
                </div>
                <button onClick={handleMaakEenPloeg}>Maak een ploeg</button>
            </section>

        </main>
    );
}