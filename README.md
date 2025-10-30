# Fleet Planner - Inteligentny Planer Floty Pojazdów

## Opis projektu

System zarządzania i optymalizacji floty pojazdów transportowych zbudowany na bazie Payload CMS. Projekt obejmuje inteligentne planowanie tras, monitorowanie przebiegów i limitów leasingowych oraz minimalizację dodatkowych kosztów.

## 🚀 Funkcjonalności

- ✅ **Zarządzanie pojazdami**: Pełna historia, limity, serwisy
- ✅ **Lokalizacje i trasy**: Zarządzanie hubami i planowanie tras
- ✅ **Analytics**: Dashboard z KPI i wizualizacją danych
- ✅ **Inteligentny planista**: Automatyczne przypisywanie pojazdów z optymalizacją kosztów
- ✅ **Admin Panel**: Pełny panel administracyjny Payload CMS
- ✅ **Nowoczesny UI**: Dashboard inspirowany v0.dev z Tailwind CSS

## 📋 Wymagania systemowe

- Node.js >= 18.11.0
- MongoDB (lokalna lub zdalna)
- npm, yarn lub pnpm

## 🛠️ Instalacja

1. **Klonowanie i instalacja zależności:**

```bash
cd lsp
npm install
# lub
yarn install
# lub
pnpm install
```

2. **Konfiguracja zmiennych środowiskowych:**

Stwórz plik `.env` w głównym katalogu:

```env
# Payload
PAYLOAD_SECRET=twoj-secret-key-tutaj

# Database
DATABASE_URI=mongodb://localhost:27017/fleet-planner

# Server
PORT=3000
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
```

3. **Uruchomienie serwera deweloperskiego:**

```bash
npm run dev
```

4. **Dostęp do aplikacji:**

- **Dashboard**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

5. **Pierwsze uruchomienie:**

Przy pierwszym uruchomieniu zostaniesz poproszony o utworzenie konta administratora.

## 📁 Struktura projektu

```
lsp/
├── src/
│   ├── collections/          # Kolekcje Payload CMS
│   │   ├── Users.ts
│   │   ├── Vehicles.ts
│   │   ├── Locations.ts
│   │   ├── LocationRelations.ts
│   │   ├── Routes.ts
│   │   └── Segments.ts
│   ├── payload.config.ts     # Konfiguracja Payload
│   └── index.ts              # Entry point serwera
├── public/                   # Statyczne pliki frontend
│   └── index.html           # Dashboard UI
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 Główne kolekcje danych

### Vehicles (Pojazdy)
- Numer rejestracyjny, marka (DAF/Scania/Volvo)
- Limity leasingowe (roczne i łączne)
- Interwały serwisowe
- Aktualny przebieg i lokalizacja

### Locations (Lokalizacje)
- Nazwa lokalizacji
- Współrzędne geograficzne
- Status huba

### LocationRelations (Relacje między lokalizacjami)
- Dystans między lokalizacjami
- Czas przejazdu

### Routes (Trasy)
- Daty rozpoczęcia i zakończenia
- Przypisany pojazd
- Segmenty trasy
- Status realizacji

### Segments (Segmenty tras)
- Sekwencja w trasie
- Lokalizacje startowe i końcowe
- Dystans i czas

## 💡 Funkcjonalności biznesowe

### Ograniczenia (Constraints)
- **Limity roczne**: 150,000 km/rok per pojazd
- **Limity kontraktowe**: łączne km przez cały okres leasingu
- **Zamiany pojazdów**: max 1 zamiana/pojazd/3 miesiące
- **Interwały serwisowe**: według marki pojazdu

### Koszty
- **Przejazd dojazdowy (zamiana)**: 1000 PLN + 1 PLN/km + 150 PLN/h
- **Nadprzebieg**: 0.92 PLN/km

### Marki pojazdów

| Marka  | Interwał serwisowy | Limit kontraktowy |
|--------|-------------------|-------------------|
| DAF    | 120,000 km        | 450,000 km        |
| Scania | 120,000 km        | 750,000 km        |
| Volvo  | 110,000 km        | 450,000 km        |

## 🔧 Skrypty

- `npm run dev` - Uruchomienie serwera deweloperskiego
- `npm run build` - Build projektu
- `npm run start` - Uruchomienie produkcyjne
- `npm run generate:types` - Generowanie typów TypeScript

## 📊 Dashboard

Dashboard oferuje:
- Przegląd aktywnych pojazdów
- Monitoring tras i lokalizacji
- Alerty i powiadomienia
- Wizualizację wykorzystania floty
- Ostatnie aktywności
- Status pojazdów w czasie rzeczywistym

## 🚧 Roadmapa

- [ ] Import danych z CSV
- [ ] Implementacja algorytmu optymalizacji
- [ ] Wizualizacja mapy z trasami
- [ ] Generowanie raportów PDF
- [ ] API REST dla integracji zewnętrznych
- [ ] Notyfikacje email/push
- [ ] Forecast przebiegów na bazie ML

## 🤝 Wsparcie

Projekt stworzony dla rozwiązania wyzwania planowania floty transportowej z optymalizacją kosztów i przestrzeganiem limitów leasingowych.

## 📝 Licencja

MIT
