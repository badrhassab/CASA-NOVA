# NASA ASTRONAUT HEALTH SYSTEM
**NASA Space Apps Challenge & NASA Human Research Program (HRP)**

Monorepo complet pour toute l'équipe : **Frontend React (Vite + Tailwind + Three.js)** + **Backend Django REST Framework** + **Base de données Supabase Cloud**.

---

## 🚀 Démarrage Rapide pour l'Équipe

### 1. Cloner le Projet
```bash
git clone <URL_DU_DEPOT_GITHUB>
cd nasa-health-system
```

### 2. Démarrer le Backend Django
```bash
cd backend

# Créer l'environnement virtuel Python
python -m venv venv

# Activer l'environnement
# Sur Windows :
.\venv\Scripts\activate
# Sur Mac/Linux :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer votre mot de passe Supabase
# Ouvrez le fichier backend/.env et renseignez la ligne :
# SUPABASE_DB_PASSWORD=votre_mot_de_passe_supabase

# Lancer le serveur Django
python manage.py runserver
# --> Le backend tourne sur http://localhost:8000
```

### Définir le mot de passe d'un astronaute

Le login utilise le `full_name` et le champ `password` de la table `astronauts`. Les mots de passe définis avec la commande ci-dessous sont stockés sous forme de hash, jamais en clair :

```bash
cd backend
python manage.py set_astronaut_password
```

La commande demande le nom complet de l'astronaute puis le mot de passe deux fois. Pour une base existante sans cette colonne, exécutez une seule fois `database/add_astronaut_password.sql` dans l'éditeur SQL Supabase.

### 3. Démarrer le Frontend React
Dans un second terminal :
```bash
cd frontend

# Installer les dépendances
npm install

# Lancer l'application React
npm run dev
# --> L'application tourne sur http://localhost:5173
```

---

## 🛰️ Architecture & Conformité Scientifique NASA

- **Étape 1 : Portail Astronaute & Santé** :
  - Connexion par nom complet et mot de passe depuis le profil astronaute.
  - Accueil personnel puis page « Mes missions », filtrée selon les affectations de l'astronaute dans `mission_crew`.
  - Fiche de mission avec code, destination, dates, phase, progression, statut et données d'affectation.

- **Étape 2 : Nutrition & Rations Spatiales** :
  - Suivi des calories, protéines, eau, calcium, vitamine D3.
  - Surveillance stricte du plafond de Sodium (prévention du syndrome SANS).
  - Rations classées en 3 groupes : *Rehydratable*, *Thermostabilized*, *Ready-to-eat*.
  - Détection automatique des carences et moteur de recommandation de repas.

- **Étape 3 : Administration des Missions** :
  - Gestion des profils astronautes et suivi de la dosimétrie carrière en mSv.
  - Gestion des missions et assignation des équipages.
  - Base astrophysique des planètes et destinations.

---

## 🗄️ Base de Données Supabase
- **URL du Projet** : `https://yepykpbpdisfeojfrugb.supabase.co`
- **Host PostgreSQL** : `db.yepykpbpdisfeojfrugb.supabase.co`
- Le script SQL complet avec toutes les données initiales est disponible dans : `database/supabase_schema.sql`.
