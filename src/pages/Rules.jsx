import '../css/rules.css';

export default function Rules() {
    return (
        <div className="rules-container">
            <div className="rules-header">
                <h1>Spelregels</h1>
                <p>Alles wat je moet weten over De Patron van de Koers</p>
            </div>

            <div className="rules-content">
                <section className="rule-section">
                    <h2>🎯 Doel van het Spel</h2>
                    <p>
                        Je doel is om een team van wielrenners samen te stellen en punten te verzamelen op basis van hun prestaties in UCI-wedstrijden. 
                        De manager met de meeste punten aan het einde van het seizoen wint!
                    </p>
                </section>

                <section className="rule-section">
                    <h2>📋 Team Samenstelling</h2>
                    <ul>
                        <li><strong>Minimaal 14 renners</strong> - je team moet uit minstens 14 renners bestaan</li>
                        <li><strong>Maximaal 30 renners</strong> - je mag niet meer dan 30 renners hebben</li>
                        <li><strong>Budget van €380.000.000</strong> - je team mag niet meer kosten dan het beschikbare budget</li>
                        <li><strong>Geen beperkingen per renner</strong> - je mag elke renner in je team hebben zolang het budget volstaat</li>
                    </ul>
                </section>

                <section className="rule-section">
                    <h2>🏁 Punten Berekening</h2>
                    <p>Renners verdienen punten op basis van hun eindplaatsen in UCI-wedstrijden:</p>
                    <div className="points-table">
                        <div className="points-row">
                            <span className="points-placement">1ste plaats</span>
                            <span className="points-value">300 punten</span>
                        </div>
                        <div className="points-row">
                            <span className="points-placement">2de plaats</span>
                            <span className="points-value">250 punten</span>
                        </div>
                        <div className="points-row">
                            <span className="points-placement">3de plaats</span>
                            <span className="points-value">200 punten</span>
                        </div>
                        <div className="points-row">
                            <span className="points-placement">4de plaats</span>
                            <span className="points-value">150 punten</span>
                        </div>
                        <div className="points-row">
                            <span className="points-placement">5de plaats</span>
                            <span className="points-value">100 punten</span>
                        </div>
                        <div className="points-row">
                            <span className="points-placement">6de - 10de plaats</span>
                            <span className="points-value">50 punten</span>
                        </div>
                        <div className="points-row">
                            <span className="points-placement">11de - 20de plaats</span>
                            <span className="points-value">25 punten</span>
                        </div>
                    </div>
                </section>

                <section className="rule-section">
                    <h2>🔄 Teamwisselingen</h2>
                    <ul>
                        <li><strong>Voor elke koers</strong> selecteer je je beste renners</li>
                        <li><strong>Deadline</strong> - je moet je selectie indienen vóór het start van de race</li>
                        <li><strong>Vervangingen</strong> - je kunt renners vervangen tussen de koersen, zolang je budget volstaat</li>
                        <li><strong>Geen wijzigingen na deadline</strong> - na de deadline kunnen geen wijzigingen meer worden aangebracht</li>
                    </ul>
                </section>

                <section className="rule-section">
                    <h2>🏆 Klassementen</h2>
                    <ul>
                        <li><strong>Algemeen klassement</strong> - alle punten van alle renners in je team</li>
                        <li><strong>Categorie klassementen</strong> - punten per categorie (sprinters, klimmers, etc.)</li>
                        <li><strong>Per koers klassement</strong> - je punten per individuele wedstrijd</li>
                    </ul>
                </section>

                <section className="rule-section">
                    <h2>⚠️ Speciale Regels</h2>
                    <ul>
                        <li><strong>Stages</strong> - meerdaagse koersen worden als één evenement geteld</li>
                        <li><strong>UCI-wedstrijden</strong> - alleen officiële UCI-wedstrijden tellen mee</li>
                        <li><strong>Disqualificatie</strong> - renners die gediskwalificeerd worden, scoren geen punten</li>
                        <li><strong>DNF/DNS</strong> - renners die niet finishen of niet starten, scoren geen punten</li>
                    </ul>
                </section>

                <section className="rule-section">
                    <h2>📝 Tips & Strategie</h2>
                    <ul>
                        <li><strong>Diversifieer</strong> - neem renners uit verschillende disciplines</li>
                        <li><strong>Volg vorm</strong> - let op recente resultaten van renners</li>
                        <li><strong>Budget beheer</strong> - spaar budget voor belangrijke koersen</li>
                        <li><strong>Injuries checken</strong> - zorg dat je renners fit zijn</li>
                        <li><strong>Koerskalender</strong> - plan je selecties rondom de grootste wedstrijden</li>
                    </ul>
                </section>

                <section className="rule-section faq">
                    <h2>❓ Veelgestelde Vragen</h2>
                    
                    <div className="faq-item">
                        <h3>Kan ik mijn team na de deadline nog wijzigen?</h3>
                        <p>Nee, na de deadline van een koers kunnen geen wijzigingen meer worden aangebracht aan de selectie voor die koers.</p>
                    </div>

                    <div className="faq-item">
                        <h3>Wat gebeurt er met mijn punten als een renner geblesseerd raakt?</h3>
                        <p>De renner verdient geen punten meer totdat hij/zij weer aan de start staat. Je kunt de renner dan vervangen door iemand anders.</p>
                    </div>

                    <div className="faq-item">
                        <h3>Kan ik dezelfde renner meerdere keren in mijn team hebben?</h3>
                        <p>Nee, elke renner kan maar eenmaal in je team voorkomen.</p>
                    </div>

                    <div className="faq-item">
                        <h3>Hoe werkt het budget?</h3>
                        <p>Je hebt een totaalbudget van €380 miljoen. Elke renner heeft een prijs. Je totale teamwaarde mag niet hoger zijn dan je budget.</p>
                    </div>

                    <div className="faq-item">
                        <h3>Tellen trainingskoersen mee?</h3>
                        <p>Nee, alleen officiële UCI-wedstrijden tellen mee voor punten.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
