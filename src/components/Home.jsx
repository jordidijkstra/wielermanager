import '../css/home.css';
import { howToPlay } from '../data/howToPlay';

export default function Home() {

    const steps = howToPlay.map((step, index) => {
        return (
            <div key={index} className="step-container">
                <img src={step.image} alt={step.imageAlt} />
                <div className="step"> 
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                </div>
            </div>
        );
    });

    function scrollToHowToPlay() {
        const howToPlaySection = document.querySelector('.how-to-play');
        howToPlaySection.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <main className="home-container">
            
            <section className="intro">
                <h1>Welkom bij Wielermanager</h1>
                <p>
                    Wielermanager is jouw ultieme wielerploegenspel voor het seizoen 2026. 
                    Stel, net zoals in de echte wielerwereld, een ploeg samen van 30 renners die over het hele seizoen de meeste punten voor jou moeten scoren.
                </p>
                <button onClick={scrollToHowToPlay}>Ontdek hoe</button>
            </section>

            <section className="how-to-play">
                <div className="steps">
                    {steps}
                </div>
                <button>Maak je ploeg nu!</button>
            </section>

        </main>
    );
}