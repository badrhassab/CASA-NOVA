"""
NASA Clinical Decision Support System (CDSS) & HRP Hazards Diagnostic Engine
Aligned with:
- Risks of Human Spaceflight (NASA HRP)
- 5 Hazards of Human Spaceflight (Radiation, Isolation, Distance, Gravity, Environment)
"""

def _diagnose_symptom(message: str):
    msg = message.lower()
    
    # 1. SANS (Spaceflight-Associated Neuro-ocular Syndrome) & Fluid Shifts
    if any(k in msg for k in ['yeux', 'vision', 'flou', 'pression', 'crâne', 'céphalée', 'sans', 'œil', 'orbite']):
        return {
            'hazard': 'GRAVITY (Altered Gravity Fields & Headward Fluid Shift)',
            'triage': 'EVALUATE',
            'explanation': (
                "Symptômes compatibles avec le syndrome SANS (Spaceflight-Associated Neuro-ocular Syndrome). "
                "En microgravité, l'absence de traction hydrostatique déplace ~2L de fluide interstitiel vers la tête, "
                "engendrant une élévation de la pression intracrânienne et un aplatissement du globe oculaire."
            ),
            'countermeasure': (
                "1. Programmer 60 minutes de LBNP (Lower Body Negative Pressure) à -35 mmHg pour attirer les fluides vers les membres inférieurs.\n"
                "2. Effectuer un examen de fond d'œil OCT portable pour évaluer l'œdème papillaire (Frisén score).\n"
                "3. Plafonner l'apport sodique sous 2000 mg/jour pour limiter la rétention hydrique intracrânienne."
            )
        }

    # 2. Altered Immune System & Latent Viral Reactivation
    elif any(k in msg for k in ['éruption', 'bouton', 'peau', 'zona', 'herpès', 'fatigue', 'immunité', 'ganglion']):
        return {
            'hazard': 'ISOLATION & HOSTILE CLOSED ENVIRONMENT (Immune Dysregulation)',
            'triage': 'EVALUATE',
            'explanation': (
                "Risque de réactivation virale latente (EBV ou Varicelle-Zona VZV). "
                "Le confinement prolongé, la perturbation du cycle circadien et le microgravité induisent une "
                "baisse de l'activité cytolytique des lymphocytes T et des cellules NK."
            ),
            'countermeasure': (
                "1. Prélèvement salivaire pour dosage de la charge virale (shedding DNA).\n"
                "2. Supplémentation en antioxydants, polyphénols et 1000 UI de Vitamine D3.\n"
                "3. Antiviral topique/oral en réserve de bord si extension des vésicules."
            )
        }

    # 3. Space Radiation (Cosmic Rays & Light Flashes)
    elif any(k in msg for k in ['flash', 'lumière', 'étoile', 'rayonnement', 'cosmique', 'radiation', 'nausée']):
        return {
            'hazard': 'SPACE RADIATION (Galactic Cosmic Rays & SPEs)',
            'triage': 'URGENT' if 'nausée' in msg else 'ROUTINE',
            'explanation': (
                "Phénomène de phosphènes cosmiques : interaction directe de particules d'ions lourds (HZE) "
                "traversant la rétine de l'astronaute. Risque à long terme de cataracte radio-induite et néoplasie."
            ),
            'countermeasure': (
                "1. Vérifier le dosimètre personnel passif et actif.\n"
                "2. En cas de tempête solaire (SPE), se replier dans le refuge blindé du module de survie.\n"
                "3. Administrer des radioprotecteurs nutritionnels riches en caroténoïdes."
            )
        }

    # 4. Hostile Closed Environment (CO2 Buildup & ECLSS)
    elif any(k in msg for k in ['co2', 'air', 'lourd', 'étouffe', 'respiration', 'dioxyde', 'odeur']):
        return {
            'hazard': 'HOSTILE / CLOSED ENVIRONMENTS (Trace Contaminants & CO2 Spikes)',
            'triage': 'URGENT',
            'explanation': (
                "Hypercapnie cabine débutante. L'accumulation de poches de CO2 non brassées provoque "
                "une vasodilatation cérébrale, des céphalées frontales et aggrave directement le risque SANS."
            ),
            'countermeasure': (
                "1. Forcer la ventilation de cabine et activer le deuxième lit d'adsorption d'amines de l'épurateur CDRA.\n"
                "2. Vérifier les lectures télémétriques de pression partielle de CO2 (doit être < 3.0 mmHg).\n"
                "3. Utiliser un masque O2 temporaire si la saturation SpO2 descend sous 95%."
            )
        }

    # 5. Gravity / Bone & Muscle Loss
    elif any(k in msg for k in ['muscle', 'os', 'douleur', 'jambe', 'dos', 'faiblesse', 'colbert', 'ared']):
        return {
            'hazard': 'GRAVITY FIELDS (Musculoskeletal Deconditioning)',
            'triage': 'ROUTINE',
            'explanation': (
                "Déminéralisation osseuse trabéculaire et atrophie des fibres musculaires posturales (soléaire). "
                "Sans charge mécanique axiale 1G, les ostéoclastes résorbent le calcium osseux."
            ),
            'countermeasure': (
                "1. Compléter la session quotidienne obligatoire de 2h sur le dispositif ARED (charges résistives) et tapis T2.\n"
                "2. Assurer 1200 mg de Calcium et 110g de protéines dans le journal de nutrition du jour.\n"
                "3. Surveillance de l'excrétion urinaire calcique pour prévenir le risque de lithiase rénale."
            )
        }

    # Default Triage
    result = {
        'hazard': 'GENERAL SPACEFLIGHT ADAPTATION',
        'triage': 'ROUTINE',
        'explanation': (
            "Symptôme analysé par l'aide à la décision clinique autonome (CDSS). "
            "Le dossier médical de mission a été mis à jour pour revue par le Médecin de bord (Flight Surgeon)."
        ),
        'countermeasure': (
            "Poursuivre la surveillance des constantes vitales et consigner tout changement dans le portail."
        )
    }
    return result


def diagnose_symptom(message: str, astronaut=None):
    """Return the HRP triage and adapt the wording to the logged-in crew member."""
    result = _diagnose_symptom(message)
    role = getattr(astronaut, 'role', '') or 'membre de l’équipage'
    if any(term in role.lower() for term in ('médecin', 'surgeon', 'medical')):
        result['explanation'] += " Synthèse destinée au professionnel de santé de l’équipage."
    return result
